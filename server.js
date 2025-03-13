const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');

// Load configuration
let config = {
  features: {
    showOfflinePlayers: false  // Default value if config.json doesn't exist
  }
};

try {
  if (fs.existsSync('config.json')) {
    const configData = fs.readFileSync('config.json', 'utf8');
    config = JSON.parse(configData);
    console.log('Loaded configuration from config.json');
  } else {
    console.log('No config.json found, using default configuration');
    // Create default config file
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf8');
    console.log('Created default config.json');
  }
} catch (err) {
  console.error('Error loading configuration:', err);
}

// Create express app and http server
const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS settings
const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:80", "http://127.0.0.1:80", "http://localhost", "http://127.0.0.1"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Add CORS headers middleware for Express
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Admin API routes
app.get('/admin/config', (req, res) => {
  // In a production environment, you should add authentication here
  res.json(config);
});

app.post('/admin/config', express.json(), (req, res) => {
  // In a production environment, you should add authentication here
  try {
    // Update config with posted data
    config = req.body;
    
    // Save the configuration to file
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf8');
    
    console.log('Configuration updated through admin panel');
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (err) {
    console.error('Error updating configuration:', err);
    res.status(500).json({ success: false, message: 'Error updating configuration' });
  }
});

// Players data
let players = {};
// Track active player connections
let activePlayers = new Set();

// Ensure accounts directory exists
const accountsDir = path.join(__dirname, 'accounts');
if (!fs.existsSync(accountsDir)) {
  fs.mkdirSync(accountsDir, { recursive: true });
  console.log('Created accounts directory');
}

// Load players data from JSON file if it exists
try {
  if (fs.existsSync('playername.json')) {
    const data = fs.readFileSync('playername.json', 'utf8');
    players = JSON.parse(data);
    console.log('Loaded player data from playername.json');
  }
} catch (err) {
  console.error('Error loading player data:', err);
}

// Save players data to JSON file
function savePlayersData() {
  try {
    fs.writeFileSync('playername.json', JSON.stringify(players), 'utf8');
    console.log('Player data saved to playername.json');
  } catch (err) {
    console.error('Error saving player data:', err);
  }
}

// Save individual player data to accounts directory
function savePlayerToAccount(username) {
  try {
    if (players[username]) {
      const playerFilePath = path.join(accountsDir, `${username}.json`);
      fs.writeFileSync(playerFilePath, JSON.stringify(players[username]), 'utf8');
      console.log(`Saved player data for ${username} to ${playerFilePath}`);
    }
  } catch (err) {
    console.error(`Error saving player data for ${username}:`, err);
  }
}

// Load player data from accounts directory
function loadPlayerFromAccount(username) {
  try {
    const playerFilePath = path.join(accountsDir, `${username}.json`);
    if (fs.existsSync(playerFilePath)) {
      const data = fs.readFileSync(playerFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error loading player data for ${username}:`, err);
  }
  return null;
}

// Get currently active players based on config
function getVisiblePlayers() {
  if (config.features.showOfflinePlayers) {
    // If offline players should be shown, return all players
    return players;
  } else {
    // Otherwise, only return active players
    const visiblePlayers = {};
    for (const username of activePlayers) {
      if (players[username]) {
        visiblePlayers[username] = players[username];
      }
    }
    return visiblePlayers;
  }
}

// Handle socket connections
io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);

  // Handle player login
  socket.on('login', (data) => {
    const { username, localSave } = data;
    console.log(`Player ${username} attempting to login`);
    
    let cloudSaveForced = false;
    
    // Load player from accounts if exists
    const accountData = loadPlayerFromAccount(username);
    
    // Create or update player data
    if (!players[username]) {
      if (accountData) {
        // Player exists in accounts but not in memory
        players[username] = accountData;
        console.log(`Loaded player ${username} from account file`);
      } else {
        // New player, create with default values
        players[username] = {
          x: config.players?.spawnX || 5000, // Use config or default to 5000
          y: config.players?.spawnY || 5000, // Use config or default to 5000
          color: getRandomColor(),
          hp: 100,
          maxhp: 100,
          mana: 50,
          maxmana: 50,
          melee: 1,
          distance: 1,
          magic: 1,
          defense: 1,
          intelligence: 1,
          agility: 1,
          dexterity: 1,
          strength: 1,
          luck: 1,
          speed: config.players?.defaultSpeed || 5
        };
        console.log(`Created new player ${username}`);
      }
    }
    
    // Mark player as active
    activePlayers.add(username);
    
    // Check if local save matches server save
    if (localSave && localSave.username === username) {
      const localPlayerData = localSave.playerData;
      
      // Very basic integrity check - you could make this more sophisticated
      if (JSON.stringify(localPlayerData) !== JSON.stringify(players[username])) {
        console.log(`Save mismatch for ${username}, forcing cloud save`);
        cloudSaveForced = true;
      } else {
        console.log(`Local save matches cloud save for ${username}`);
      }
    } else if (localSave) {
      console.log(`Username mismatch in local save, forcing cloud save`);
      cloudSaveForced = true;
    }
    
    // Associate socket with username
    socket.username = username;
    
    // Send player their own data and save status
    socket.emit('loginSuccess', {
      playerData: players[username],
      cloudSaveForced
    });
    
    // Notify all clients about the visible player list (may exclude offline players)
    io.emit('playerList', getVisiblePlayers());
    
    // Save the updated player data
    savePlayersData();
    savePlayerToAccount(username);
  });

  // Handle player movement
  socket.on('move', (data) => {
    if (socket.username && players[socket.username]) {
      // Update player position
      players[socket.username].x = data.x;
      players[socket.username].y = data.y;
      
      // Broadcast the updated player list to all clients
      io.emit('playerList', getVisiblePlayers());
      
      // Save player data periodically
      // To reduce disk I/O, we could implement a throttled save
      if (Math.random() < 0.1) { // Save approximately every 10 moves
        savePlayerToAccount(socket.username);
      }
    }
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Save player data on disconnect
    if (socket.username) {
      // Remove player from active players list
      activePlayers.delete(socket.username);
      
      // Save player data
      savePlayerToAccount(socket.username);
      
      // Notify clients about the disconnection
      io.emit('playerDisconnected', socket.username);
      
      // If we're not showing offline players, send updated player list
      if (!config.features.showOfflinePlayers) {
        io.emit('playerList', getVisiblePlayers());
      }
    }
  });

  // Handle chat messages
  socket.on('chatMessage', (msg) => {
    if (socket.username) {
      // Validate and sanitize the message
      let sanitizedMsg = {
        username: socket.username,
        message: msg.message.substring(0, 200), // Limit message length
        type: msg.type || 'user',
        timestamp: Date.now()
      };
      
      // Broadcast the message to all connected clients
      io.emit('chatMessage', sanitizedMsg);
      
      console.log(`Chat message from ${socket.username}: ${sanitizedMsg.message}`);
    }
  });
});

// Helper function to generate random color
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Start the server
const PORT = process.env.PORT || config.game?.port || 80;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open your browser and go to http://localhost:${PORT} or http://127.0.0.1:${PORT}`);
  console.log(`Show offline players: ${config.features.showOfflinePlayers ? 'Enabled' : 'Disabled'}`);
}); 