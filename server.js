const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');

// Rate limiting for player updates
const playerUpdateRateLimits = new Map();
const RATE_LIMIT_WINDOW = 1000; // 1 second window
const MAX_UPDATES_PER_WINDOW = 5; // Max 5 updates per second

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
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});
//Admin panel
//Login with password thats set in config.json for admin account
/* 
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === config.admin.username && password === config.admin.password) {
    res.json({ success: true, message: 'Login successful' });
  } else {  
    res.json({ success: false, message: 'Login failed' });
  }
});
*/


// Serve static files from the 'public' directory
app.use(express.static('public'));

// Add CORS headers middleware for Express
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Add middleware to parse JSON requests
app.use(express.json());

// Route to handle synchronous player data saves
app.post('/save-player-data', (req, res) => {
  const { username, playerData } = req.body;
  
  if (!username || !playerData) {
    return res.status(400).json({ success: false, message: 'Missing username or player data' });
  }
  
  try {
    // Update player data in memory
    if (players[username]) {
      // Validate the data before saving (similar to socket validation)
      const currentPlayer = players[username];
      
      // Validate resources to prevent cheating
      if (playerData.resources && currentPlayer.resources) {
        Object.keys(playerData.resources).forEach(resourceType => {
          const currentAmount = currentPlayer.resources[resourceType] || 0;
          const newAmount = playerData.resources[resourceType] || 0;
          
          // If resources increased by more than 100, it's suspicious
          if (newAmount > currentAmount + 100) {
            console.log(`SUSPICIOUS EMERGENCY SAVE: ${username} tried to add ${newAmount - currentAmount} ${resourceType}`);
            playerData.resources[resourceType] = currentAmount + 100;
          }
        });
      }
      
      // Ensure inventory data is preserved
      if (playerData.inventory) {
        console.log(`Saving inventory data for ${username} with ${playerData.inventory.filter(i => i !== null).length} items`);
      }
      
      // Update player data with validated values
      players[username] = {
        ...currentPlayer,
        ...playerData,
        // Preserve important server-side values that shouldn't be overwritten
        x: playerData.x || currentPlayer.x,
        y: playerData.y || currentPlayer.y,
        color: currentPlayer.color
      };
      
      // Save to file
      savePlayerToAccount(username);
      
      console.log(`Emergency save for player ${username} successful`);
      return res.json({ success: true, message: 'Player data saved successfully' });
    } else {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }
  } catch (error) {
    console.error(`Error saving player data for ${username}:`, error);
    return res.status(500).json({ success: false, message: 'Error saving player data' });
  }
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
          x: (config.players && config.players.spawnX) || 0,
          y: (config.players && config.players.spawnY) || 0,
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
          speed: (config.players && config.players.defaultSpeed) || 5,
          // Add progression fields
          level: 1,
          experience: 0,
          maxExperience: 100, // Level 1 requires 100 XP
          capacity: 100, // Base capacity
          resources: {
            rocks: 0
          },
          // Add skills
          skills: {
            mining: {
              level: 1,
              experience: 0,
              maxExperience: 100 // Level 1 requires 100 hits
            }
          }
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
  
  // Handle player data updates (experience, level, etc.)
  socket.on('updatePlayerData', (data) => {
    if (socket.username && players[socket.username]) {
      const currentPlayer = players[socket.username];
      
      // Apply rate limiting to prevent spam updates
      const now = Date.now();
      if (!playerUpdateRateLimits.has(socket.username)) {
        playerUpdateRateLimits.set(socket.username, {
          count: 1,
          lastReset: now
        });
      } else {
        const rateLimit = playerUpdateRateLimits.get(socket.username);
        
        // Reset counter if window has passed
        if (now - rateLimit.lastReset > RATE_LIMIT_WINDOW) {
          rateLimit.count = 1;
          rateLimit.lastReset = now;
        } else {
          rateLimit.count++;
          
          // If too many updates, ignore this one
          if (rateLimit.count > MAX_UPDATES_PER_WINDOW) {
            console.log(`Rate limit exceeded for ${socket.username}: ${rateLimit.count} updates in ${RATE_LIMIT_WINDOW}ms`);
            return; // Skip this update
          }
        }
      }
      
      // Validate resource changes to prevent cheating
      if (data.resources) {
        // Check for suspicious resource changes
        if (currentPlayer.resources) {
          Object.keys(data.resources).forEach(resourceType => {
            const currentAmount = currentPlayer.resources[resourceType] || 0;
            const newAmount = data.resources[resourceType] || 0;
            
            // If resources increased by more than 100 in a single update, it's suspicious
            if (newAmount > currentAmount + 100) {
              console.log(`SUSPICIOUS: ${socket.username} tried to add ${newAmount - currentAmount} ${resourceType} in one update`);
              // Cap the increase to a reasonable amount
              data.resources[resourceType] = currentAmount + 100;
              // Could also log this for admin review
            }
            
            // If resources decreased by more than 100 in a single update without crafting, it's suspicious
            if (newAmount < currentAmount - 100 && !data.crafting) {
              console.log(`SUSPICIOUS: ${socket.username} tried to remove ${currentAmount - newAmount} ${resourceType} in one update`);
              // Cap the decrease to a reasonable amount
              data.resources[resourceType] = currentAmount - 100;
            }
          });
        }
      }
      
      // Validate experience changes
      if (data.experience !== undefined && currentPlayer.experience !== undefined) {
        const expIncrease = data.experience - currentPlayer.experience;
        // If experience increased by more than 500 in a single update, it's suspicious
        if (expIncrease > 500) {
          console.log(`SUSPICIOUS: ${socket.username} tried to add ${expIncrease} experience in one update`);
          // Cap the increase to a reasonable amount
          data.experience = currentPlayer.experience + 500;
        }
      }
      
      // Validate level changes
      if (data.level !== undefined && currentPlayer.level !== undefined) {
        // If level jumped by more than 1, it's suspicious
        if (data.level > currentPlayer.level + 1) {
          console.log(`SUSPICIOUS: ${socket.username} tried to jump from level ${currentPlayer.level} to ${data.level}`);
          // Cap the increase to 1 level
          data.level = currentPlayer.level + 1;
        }
      }
      
      // Update specific fields from the data after validation
      if (data.experience !== undefined) currentPlayer.experience = data.experience;
      if (data.level !== undefined) currentPlayer.level = data.level;
      if (data.maxExperience !== undefined) currentPlayer.maxExperience = data.maxExperience;
      if (data.capacity !== undefined) currentPlayer.capacity = data.capacity;
      if (data.resources !== undefined) currentPlayer.resources = data.resources;
      if (data.skills !== undefined) currentPlayer.skills = data.skills;
      
      // IMPORTANT: Save inventory if it exists
      if (data.inventory) {
        currentPlayer.inventory = data.inventory;
        const itemCount = data.inventory.filter(i => i !== null).length;
        console.log(`Updated inventory for ${socket.username} with ${itemCount} items`);
      }
      
      // IMPORTANT: Save equipped items if they exist
      if (data.equipped) {
        currentPlayer.equipped = data.equipped;
        console.log(`Updated equipped items for ${socket.username}`);
      }
      
      // Save the updated player data
      savePlayerToAccount(socket.username);
      console.log(`Updated player data for ${socket.username} (Level: ${currentPlayer.level}, XP: ${currentPlayer.experience})`);
      
      // Log skills data if available
      if (data.skills && data.skills.mining) {
        console.log(`Mining skill: Level ${data.skills.mining.level}, XP: ${data.skills.mining.experience}/${data.skills.mining.maxExperience}`);
      }
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
const PORT = 800;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open your browser and go to http://localhost:${PORT} or http://127.0.0.1:${PORT}`);
  console.log(`Show offline players: ${config.features.showOfflinePlayers ? 'Enabled' : 'Disabled'}`);
}); 