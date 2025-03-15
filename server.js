import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

// Get current directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const saltRounds = 10;

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
  if (existsSync('config.json')) {
    const configData = readFileSync('config.json', 'utf8');
    config = JSON.parse(configData);
    console.log('Loaded configuration from config.json');
  } else {
    console.log('No config.json found, using default configuration');
    // Create default config file
    writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf8');
    console.log('Created default config.json');
  }
} catch (err) {
  console.error('Error loading configuration:', err);
}

// Create express app and http server
const app = express();
const server = createServer(app);

// Configure Socket.io with CORS settings
const io = new Server(server, {
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

// Serve src directory for ES modules
app.use('/src', express.static('src', {
    setHeaders: (res, path) => {
        // Set proper MIME type for JavaScript modules
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Add middleware to handle directory requests and serve index.js files
app.get('/src/*/', (req, res, next) => {
    const path = req.path;
    const indexPath = join(__dirname, path, 'index.js');
    
    if (existsSync(indexPath)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(indexPath);
    } else {
        next();
    }
});

// Add CORS headers middleware for Express
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Add middleware to parse JSON requests
app.use(express.json());

// Load accounts data
let accounts = {};
try {
  if (existsSync('accounts.json')) {
    const accountsData = readFileSync('accounts.json', 'utf8');
    accounts = JSON.parse(accountsData);
    console.log('Loaded accounts data from accounts.json');
  } else {
    console.log('No accounts.json found, using empty accounts data');
    // Create default accounts file
    writeFileSync('accounts.json', JSON.stringify(accounts, null, 2), 'utf8');
    console.log('Created default accounts.json');
  }
} catch (err) {
  console.error('Error loading accounts data:', err);
}

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
    writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf8');
    
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
const accountsDir = join(__dirname, 'accounts');
if (!existsSync(accountsDir)) {
  mkdirSync(accountsDir, { recursive: true });
  console.log('Created accounts directory');
}

// Load players data from JSON file if it exists
try {
  if (existsSync('playername.json')) {
    const data = readFileSync('playername.json', 'utf8');
    players = JSON.parse(data);
    console.log('Loaded player data from playername.json');
  }
} catch (err) {
  console.error('Error loading player data:', err);
}

// Save players data to JSON file
function savePlayersData() {
  try {
    writeFileSync('playername.json', JSON.stringify(players), 'utf8');
    console.log('Player data saved to playername.json');
  } catch (err) {
    console.error('Error saving player data:', err);
  }
}

// Save individual player data to accounts directory
function savePlayerToAccount(username) {
  try {
    if (players[username]) {
      const playerFilePath = join(accountsDir, `${username}.json`);
      writeFileSync(playerFilePath, JSON.stringify(players[username]), 'utf8');
      console.log(`Saved player data for ${username} to ${playerFilePath}`);
    }
  } catch (err) {
    console.error(`Error saving player data for ${username}:`, err);
  }
}

// Load player data from accounts directory
function loadPlayerFromAccount(username) {
  try {
    const playerFilePath = join(accountsDir, `${username}.json`);
    if (existsSync(playerFilePath)) {
      const data = readFileSync(playerFilePath, 'utf8');
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
  socket.on('login', async (data) => {
    const { username, password, localSave, token } = data;
    console.log(`Player ${username} attempting to login`);
    
    // Check if the account exists and verify credentials
    let isAuthenticated = false;
    let playerTitle = 'Newcomer'; // Default title
    
    if (accounts[username]) {
      // Check if token is provided (for reconnects)
      if (token && token.startsWith(username + '_')) {
        isAuthenticated = true;
      } 
      // If password is provided, verify it
      else if (password) {
        try {
          const match = await bcrypt.compare(password, accounts[username].password);
          isAuthenticated = match;
        } catch (error) {
          console.error('Error verifying password:', error);
        }
      }
      
      if (isAuthenticated) {
        // Update last login
        accounts[username].lastLogin = Date.now();
        writeFileSync('accounts.json', JSON.stringify(accounts, null, 2), 'utf8');
        
        // Get player title
        playerTitle = accounts[username].title || 'Newcomer';
      } else {
        socket.emit('loginFailed', { message: 'Invalid credentials' });
        return;
      }
    } else if (config.game && config.game.allowAnonymousLogins) {
      // Allow login without account if configured to allow anonymous logins
      isAuthenticated = true;
    } else {
      socket.emit('loginFailed', { message: 'Account does not exist' });
      return;
    }
    
    if (!isAuthenticated) {
      socket.emit('loginFailed', { message: 'Authentication failed' });
      return;
    }
    
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
          // Add title and account info
          title: playerTitle,
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
    
    // Add or update title
    players[username].title = playerTitle;
    
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
      if (data.title !== undefined) currentPlayer.title = data.title;
      
      // If account info exists, update title in accounts data too
      if (data.title !== undefined && accounts[socket.username]) {
        accounts[socket.username].title = data.title;
        try {
          writeFileSync('accounts.json', JSON.stringify(accounts, null, 2), 'utf8');
          console.log(`Updated title for ${socket.username}: ${data.title}`);
        } catch (err) {
          console.error(`Error updating title in accounts: ${err}`);
        }
      }
      
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
      
      // Notify all clients about the update if the level or title changed
      if (data.level !== undefined || data.title !== undefined) {
        // Send updated player list that includes titles and levels
        io.emit('playerList', getVisiblePlayers());
        
        // Update leaderboard for all clients
        io.emit('leaderboardData', [...activePlayers].map(playerName => ({
          username: playerName,
          level: players[playerName].level,
          experience: players[playerName].experience,
          title: players[playerName].title || 'Newcomer'
        })).sort((a, b) => b.level - a.level || b.experience - a.experience));
      }
    }
  });

  // Handle player request for leaderboard data
  socket.on('requestLeaderboard', () => {
    // Create sorted list of active players by level
    const leaderboardPlayers = [...activePlayers].map(username => ({
      username,
      level: players[username].level,
      experience: players[username].experience,
      title: players[username].title || 'Newcomer'
    })).sort((a, b) => b.level - a.level || b.experience - a.experience);
    
    // Send leaderboard data back to the client
    socket.emit('leaderboardData', leaderboardPlayers);
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

// Add routes for account management
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  
  // Basic validation
  if (!username || !password || !email) {
    return res.status(400).json({ success: false, message: 'Missing username, password, or email' });
  }
  
  // Check if username already exists
  if (accounts[username]) {
    return res.status(400).json({ success: false, message: 'Username already exists' });
  }
  
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new account
    accounts[username] = {
      username,
      password: hashedPassword,
      email,
      created: Date.now(),
      lastLogin: null,
      title: 'Newcomer' // Default title
    };
    
    // Save accounts data
    writeFileSync('accounts.json', JSON.stringify(accounts, null, 2), 'utf8');
    
    return res.json({ success: true, message: 'Account created successfully' });
  } catch (error) {
    console.error('Error creating account:', error);
    return res.status(500).json({ success: false, message: 'Error creating account' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Missing username or password' });
  }
  
  // Check if username exists
  if (!accounts[username]) {
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  }
  
  try {
    // Compare password
    const match = await bcrypt.compare(password, accounts[username].password);
    
    if (match) {
      // Update last login
      accounts[username].lastLogin = Date.now();
      writeFileSync('accounts.json', JSON.stringify(accounts, null, 2), 'utf8');
      
      // Generate auth token (in a real app, use a more secure method)
      const token = username + '_' + Date.now();
      
      return res.json({ 
        success: true, 
        message: 'Login successful',
        token
      });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ success: false, message: 'Error logging in' });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open your browser and go to http://localhost:${PORT} or http://127.0.0.1:${PORT}`);
  console.log(`Show offline players: ${config.features.showOfflinePlayers ? 'Enabled' : 'Disabled'}`);
});