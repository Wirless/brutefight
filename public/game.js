// Connect to the WebSocket server
const socket = io.connect(window.location.hostname === 'localhost' ? 'http://localhost' : 'http://127.0.0.1');

// Game variables
let myPlayer = null;
let players = {};
let username = '';
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let minimapCanvas = document.getElementById('minimapCanvas');
let minimapCtx = minimapCanvas.getContext('2d');
let positionInfo = document.getElementById('positionInfo');

// Camera/viewport variables
let cameraX = 0;
let cameraY = 0;
const TILE_SIZE = 64; // Size of floor tiles

// Movement smoothing variables
let lastUpdateTime = 0;
const MOVEMENT_SPEED = 240; // Pixels per second
const keys = { w: false, a: false, s: false, d: false };
const velocity = { x: 0, y: 0 };
let serverUpdateInterval = 0;
const SERVER_UPDATE_RATE = 100; // ms between updates to server

// Movement tracking for chat messages
let distanceMoved = 0;
let lastMovementMessageTime = 0;
const MOVEMENT_MESSAGE_INTERVAL = 30000; // 30 seconds between automated movement messages
const MOVEMENT_DISTANCE_THRESHOLD = 500; // Distance moved before showing a message

// Chat variables
let chatMessages = [];
let currentChatTab = 'all';
let unreadMessages = 0;
let isChatFocused = false;

// Debug info
let debugInfo = document.createElement('div');
debugInfo.style.position = 'absolute';
debugInfo.style.top = '5px';
debugInfo.style.left = '5px';
debugInfo.style.backgroundColor = 'rgba(0,0,0,0.5)';
debugInfo.style.color = 'white';
debugInfo.style.padding = '5px';
debugInfo.style.zIndex = '1000';
debugInfo.style.fontSize = '12px';
document.body.appendChild(debugInfo);

function updateDebugInfo() {
    debugInfo.textContent = `Chat focused: ${isChatFocused}, Keys: W:${keys.w} A:${keys.a} S:${keys.s} D:${keys.d}`;
}

// Floor rendering
const GRASS_TILE_SIZE = 64;
const grassColors = [
    '#3a5e3a', // Dark green
    '#4a7a4a', // Medium green
    '#5c8a5c', // Light green
    '#2e4e2e', // Very dark green
    '#6b9a6b'  // Very light green
];
const grassPatterns = [];

// Ore manager
let oreManager = null;
const PLAYER_COLLISION_RADIUS = 10; // Collision radius from player center

// Player attack
let currentAttack = null;
let availableAttacks = {};

// DOM elements
const loginPanel = document.getElementById('loginPanel');
const gamePanel = document.getElementById('gamePanel');
const usernameInput = document.getElementById('usernameInput');
const loginButton = document.getElementById('loginButton');
const playersListItems = document.getElementById('playersListItems');
const loginStatus = document.getElementById('loginStatus');

// Chat DOM elements
const chatMessages_el = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const chatTabs = document.querySelectorAll('.chatTab');
const chatUnread = document.getElementById('chatUnread');

// Add these variables
let mouseX = 0;
let mouseY = 0;
let attackDirection = 0;
let hitRocks = new Set();
let rockHitTimes = new Map();
const rockHitDuration = 500;
let rockParticles = [];

// Add to variable declarations
let equipmentManager = null;
let selectedTool = null;

// Change from a local variable to a global one
window.selectedTool = null;

// Add to the global variables section
let expOrbManager = null;

// Generate grass patterns (pre-rendered grass patterns for performance)
function generateGrassPatterns() {
    for (let i = 0; i < 5; i++) {
        const pattern = document.createElement('canvas');
        pattern.width = GRASS_TILE_SIZE;
        pattern.height = GRASS_TILE_SIZE;
        const patternCtx = pattern.getContext('2d');
        
        // Fill with base color
        patternCtx.fillStyle = grassColors[0];
        patternCtx.fillRect(0, 0, GRASS_TILE_SIZE, GRASS_TILE_SIZE);
        
        // Add some random grass details
        for (let j = 0; j < 10; j++) {
            const x = Math.random() * GRASS_TILE_SIZE;
            const y = Math.random() * GRASS_TILE_SIZE;
            const size = 2 + Math.random() * 4;
            patternCtx.fillStyle = grassColors[Math.floor(Math.random() * grassColors.length)];
            patternCtx.beginPath();
            patternCtx.arc(x, y, size, 0, Math.PI * 2);
            patternCtx.fill();
        }
        
        grassPatterns.push(pattern);
    }
}

// Call once at start
generateGrassPatterns();

// Local save handling
let localSave = null;
try {
    const savedData = localStorage.getItem('playerSave');
    if (savedData) {
        localSave = JSON.parse(savedData);
        loginStatus.textContent = "Local save found.";
    }
} catch (err) {
    console.error('Error loading local save:', err);
    loginStatus.textContent = "Error loading local save.";
}

// Chat event listeners
chatInput.addEventListener('focus', () => {
    console.log('Chat input focused');
    isChatFocused = true;
    chatInput.style.outline = '2px solid rgb(255, 100, 100)';
    updateDebugInfo();
});

chatInput.addEventListener('blur', () => {
    console.log('Chat input blurred');
    isChatFocused = false;
    chatInput.style.outline = '2px solid rgb(0, 233, 150)';
    updateDebugInfo();
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
        // Clicking elsewhere after sending a message should return focus to game
        document.activeElement.blur();
        isChatFocused = false;
    }
});

sendButton.addEventListener('click', () => {
    sendChatMessage();
    // Clicking send button should return focus to game
    chatInput.blur();
    isChatFocused = false;
    // Re-enable movement
    canvas.focus();
});

// Add click listener to the game canvas to ensure it gets focus when clicked
canvas.addEventListener('click', () => {
    // Remove focus from chat if it has focus
    if (isChatFocused) {
        chatInput.blur();
        isChatFocused = false;
    }
    // Make canvas focusable
    canvas.setAttribute('tabindex', '0');
    // Focus the canvas to capture keyboard events
    canvas.focus();
});

// Add click listener to the game panel to handle focus transitions
gamePanel.addEventListener('click', (e) => {
    // If the click wasn't on the chat input or its container, return focus to game
    if (!e.target.closest('#chatInputContainer') && isChatFocused) {
        chatInput.blur();
        isChatFocused = false;
        canvas.focus();
    }
});

// Make canvas focusable to receive keyboard events
canvas.setAttribute('tabindex', '0');

// Chat tab switching
chatTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        chatTabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Update current tab
        currentChatTab = tab.dataset.tab;
        
        // Filter messages based on tab
        filterChatMessages();
        
        // Reset unread counter when switching to All tab
        if (currentChatTab === 'all') {
            unreadMessages = 0;
            chatUnread.style.display = 'none';
            chatUnread.textContent = '0';
        }
    });
});

// Send chat message
function sendChatMessage() {
    const message = chatInput.value.trim();
    if (message) {
        // Send message to server
        socket.emit('chatMessage', { 
            username, 
            message,
            type: 'user'
        });
        
        // Clear input
        chatInput.value = '';
    }
}

// Add a message to the chat
function addChatMessage(msg) {
    // Add message to array
    chatMessages.push(msg);
    
    // Limit chat history to 100 messages
    if (chatMessages.length > 100) {
        chatMessages.shift();
    }
    
    // Check if we should increment unread counter
    if (!isChatFocused && currentChatTab !== 'all' && msg.type !== 'system') {
        unreadMessages++;
        chatUnread.textContent = unreadMessages;
        chatUnread.style.display = 'inline-block';
    }
    
    // Update the chat display
    filterChatMessages();
}

// Filter chat messages based on current tab
function filterChatMessages() {
    // Clear chat container
    chatMessages_el.innerHTML = '';
    
    // Filter messages
    const filteredMessages = currentChatTab === 'all' 
        ? chatMessages 
        : chatMessages.filter(msg => msg.type === currentChatTab);
    
    // Add messages to chat container
    filteredMessages.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.className = `chatMessage ${msg.type}`;
        
        switch (msg.type) {
            case 'system':
                messageElement.textContent = msg.message;
                break;
            case 'movement':
                messageElement.textContent = msg.message;
                break;
            default:
                // User message
                const usernameSpan = document.createElement('span');
                usernameSpan.className = msg.username === username ? 'username self' : 'username';
                usernameSpan.textContent = msg.username + ': ';
                
                messageElement.appendChild(usernameSpan);
                messageElement.appendChild(document.createTextNode(msg.message));
        }
        
        chatMessages_el.appendChild(messageElement);
    });
    
    // Scroll to bottom
    chatMessages_el.scrollTop = chatMessages_el.scrollHeight;
}

// Event handlers
loginButton.addEventListener('click', login);
usernameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});

// Track mouse position
canvas.addEventListener('mousemove', (e) => {
    // Get canvas position
    const rect = canvas.getBoundingClientRect();
    
    // Calculate mouse position relative to canvas
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

// Add mouse click for attack
canvas.addEventListener('mousedown', (e) => {
    // Only handle left mouse button (button 0)
    if (e.button === 0 && !isChatFocused) {
        handleAttack(e);
    }
});

// Setup keyboard events for smoother movement
window.addEventListener('keydown', function(e) {
    const key = e.key.toLowerCase();
    
    // Check if it's a movement key
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        // Only process movement keys if chat is not focused
        if (!isChatFocused) {
            console.log(`Key pressed: ${key}, chat focused: ${isChatFocused}`);
            keys[key] = true;
            updateVelocity();
            updateDebugInfo();
        }
    }
    
    // Check for attack key (space)
    if (key === ' ' && !isChatFocused && currentAttack) {
        // Calculate attack direction based on movement or last direction
        let direction = attackDirection;
        if (velocity.x !== 0 || velocity.y !== 0) {
            direction = Math.atan2(velocity.y, velocity.x);
        }
        
        // Perform attack
        if (currentAttack.start(direction)) {
            // Add attack message to chat
            addChatMessage({
                type: 'system',
                message: `${username} swings their ${currentAttack === availableAttacks.pickaxe ? 'pickaxe' : 'axe'}!`
            });
        }
    }
    
    // Weapon switching
    if (key === '1' && !isChatFocused) {
        currentAttack = availableAttacks.pickaxe;
        addChatMessage({
            type: 'system',
            message: `${username} equips a pickaxe.`
        });
    }
    
    if (key === '2' && !isChatFocused) {
        currentAttack = availableAttacks.axe;
        addChatMessage({
            type: 'system',
            message: `${username} equips an axe.`
        });
    }
    
    // Toggle equipment panel with 'E' key
    if (key === 'e' && !isChatFocused) {
        if (equipmentManager) {
            equipmentManager.toggleEquipmentPanel();
        }
    }
    
    // Toggle inventory panel with 'I' key
    if (key === 'i' && !isChatFocused) {
        if (window.playerInventoryUI) {
            window.playerInventoryUI.toggle();
        }
    }
    
    // Handle number keys for quick slots (1-0)
    if (!isNaN(parseInt(key)) && key >= '0' && key <= '9' && !isChatFocused) {
        if (equipmentManager) {
            equipmentManager.handleHotkey(key);
            
            // Update the selected tool
            selectedTool = equipmentManager.getActiveQuickSlotItem();
            
            // Show the selected tool in debug info
            if (selectedTool) {
                debugInfo.textContent = `Selected tool: ${selectedTool.name} (${selectedTool.description})`;
            } else {
                debugInfo.textContent = `No tool selected`;
            }
            
            // Wait 2 seconds, then restore debug info
            setTimeout(() => {
                updateDebugInfo();
            }, 2000);
        }
    }
});

window.addEventListener('keyup', function(e) {
    const key = e.key.toLowerCase();
    
    // Check if it's a movement key
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        console.log(`Key released: ${key}`);
        keys[key] = false;
        updateVelocity();
        updateDebugInfo();
    }
});

function updateVelocity() {
    velocity.x = 0;
    velocity.y = 0;
    
    if (keys.w) velocity.y -= 1;
    if (keys.s) velocity.y += 1;
    if (keys.a) velocity.x -= 1;
    if (keys.d) velocity.x += 1;
    
    // Normalize diagonal movement
    if (velocity.x !== 0 && velocity.y !== 0) {
        const length = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        velocity.x /= length;
        velocity.y /= length;
    }
    
    console.log(`Velocity updated: x=${velocity.x}, y=${velocity.y}`);
}

// Handle login
function login() {
    username = usernameInput.value.trim();
    if (username) {
        // Show loading message
        loginStatus.textContent = "Logging in...";
        
        // Send username and local save data for verification
        socket.emit('login', { username, localSave });
    } else {
        loginStatus.textContent = "Please enter a username.";
    }
}

// Save player data locally
function savePlayerDataLocally() {
    if (myPlayer) {
        const saveData = {
            username,
            playerData: myPlayer
        };
        localStorage.setItem('playerSave', JSON.stringify(saveData));
    }
}

// Socket event handlers
socket.on('loginSuccess', (data) => {
    console.log('Login successful:', data);
    
    // Hide login panel and show game panel
    loginPanel.style.display = 'none';
    gamePanel.style.display = 'block';
    
    // Set player data
    myPlayer = data.playerData;
    
    // Initialize the game
    initGame();
    
    // Update debug info
    updateDebugInfo();
});

socket.on('playerList', (playersData) => {
    players = playersData;
    updatePlayersList();
});

socket.on('playerDisconnected', (disconnectedUsername) => {
    console.log(`Player disconnected: ${disconnectedUsername}`);
    updatePlayersList();
    
    // Add disconnect message to chat
    addChatMessage({
        type: 'system',
        message: `${disconnectedUsername} has left the game.`
    });
});

// New socket event for chat messages
socket.on('chatMessage', (msg) => {
    addChatMessage(msg);
});

// New socket event for player join
socket.on('playerJoined', (joinedUsername) => {
    // Add welcome message to chat
    addChatMessage({
        type: 'system',
        message: `${joinedUsername} has joined the game.`
    });
});

// Early in the file, add this function to create the player counter
function createPlayerCountTab() {
    const playerCountTab = document.createElement('div');
    playerCountTab.id = 'playerCountTab';
    playerCountTab.className = 'player-count-tab';
    playerCountTab.style.position = 'fixed';
    playerCountTab.style.top = '0';
    playerCountTab.style.right = '20px';
    playerCountTab.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    playerCountTab.style.color = 'white';
    playerCountTab.style.padding = '5px 15px';
    playerCountTab.style.borderRadius = '0 0 5px 5px';
    playerCountTab.style.fontSize = '14px';
    playerCountTab.style.fontWeight = 'bold';
    playerCountTab.style.cursor = 'pointer';
    playerCountTab.style.zIndex = '100';
    playerCountTab.style.display = 'flex';
    playerCountTab.style.alignItems = 'center';
    playerCountTab.style.gap = '5px';
    
    // Add player icon
    const playerIcon = document.createElement('span');
    playerIcon.textContent = '👥';
    playerIcon.style.fontSize = '16px';
    playerCountTab.appendChild(playerIcon);
    
    // Add player count
    const playerCount = document.createElement('span');
    playerCount.id = 'playerCount';
    playerCount.textContent = '0';
    playerCountTab.appendChild(playerCount);
    
    // When clicked, toggle the player list
    playerCountTab.addEventListener('click', () => {
        const playersList = document.getElementById('playersList');
        if (playersList.style.display === 'none') {
            playersList.style.display = 'block';
        } else {
            playersList.style.display = 'none';
        }
    });
    
    document.body.appendChild(playerCountTab);
}

// Modify the updatePlayersList function to update the player count
function updatePlayersList() {
    // Update the player count in the tab
    const playerCount = document.getElementById('playerCount');
    const count = Object.keys(players).length;
    playerCount.textContent = count;
    
    // Update the player list itself
    playersListItems.innerHTML = '';
    for (const playerName in players) {
        const li = document.createElement('li');
        li.textContent = playerName;
        if (playerName === username) {
            li.textContent += ' (You)';
            li.style.fontWeight = 'bold';
            li.style.color = 'rgb(255, 100, 100)';
        }
        playersListItems.appendChild(li);
    }
}

// Modify the player list style when document loads
document.addEventListener('DOMContentLoaded', function() {
    // Create the player count tab
    createPlayerCountTab();
    
    // Style the existing player list
    const playersList = document.getElementById('playersList');
    if (playersList) {
        playersList.style.position = 'fixed';
        playersList.style.top = '30px'; // Position below the tab
        playersList.style.right = '20px';
        playersList.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        playersList.style.border = '1px solid #444';
        playersList.style.borderRadius = '5px';
        playersList.style.padding = '10px';
        playersList.style.minWidth = '150px';
        playersList.style.maxHeight = '300px';
        playersList.style.overflowY = 'auto';
        playersList.style.zIndex = '99';
        playersList.style.display = 'none'; // Hidden by default
    }
    
    // Preload sprites
    preloadSprites();
});

// Check for ore collisions
function checkOreCollisions(playerX, playerY) {
    return oreManager.checkCollision(playerX, playerY, PLAYER_COLLISION_RADIUS);
}

// Update the drawRocks function to use ores
function drawOres() {
    oreManager.drawOres(ctx, cameraX, cameraY);
}

// Move player based on current velocity
function updatePlayerPosition(deltaTime) {
    if (!myPlayer || !velocity) return false;
    
    const seconds = deltaTime / 1000;
    const moveDistance = MOVEMENT_SPEED * seconds;
    
    let moved = false;
    
    // Always check velocity directly, don't rely on isChatFocused
    if (velocity.x !== 0 || velocity.y !== 0) {
        // Calculate position before movement
        const oldX = myPlayer.x;
        const oldY = myPlayer.y;
        
        // Calculate new position
        const newX = myPlayer.x + velocity.x * moveDistance;
        const newY = myPlayer.y + velocity.y * moveDistance;
        
        // Check for ore collisions
        if (!checkOreCollisions(newX, newY)) {
            // No collision, update position
            myPlayer.x = newX;
            myPlayer.y = newY;
        } else {
            // Try moving only in X direction
            if (!checkOreCollisions(newX, oldY)) {
                myPlayer.x = newX;
            }
            // Try moving only in Y direction
            else if (!checkOreCollisions(oldX, newY)) {
                myPlayer.y = newY;
            }
            // If both directions cause collisions, check if we need to push the player
            else {
                const newPosition = oreManager.handlePlayerCollision(oldX, oldY, PLAYER_COLLISION_RADIUS);
                if (newPosition) {
                    myPlayer.x = newPosition.x;
                    myPlayer.y = newPosition.y;
                }
            }
        }
        
        // Calculate distance moved
        const dx = myPlayer.x - oldX;
        const dy = myPlayer.y - oldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Accumulate distance for movement messages
        distanceMoved += distance;
        
        // Update camera position smoothly
        cameraX = myPlayer.x - canvas.width / 2;
        cameraY = myPlayer.y - canvas.height / 2;
        
        // Check if we should generate more ores
        // Every 500 units of movement, generate some new ores
        if (Math.floor(distanceMoved / 500) > 0) {
            oreManager.generateOresAroundPosition(myPlayer.x, myPlayer.y, 5, myPlayer.x, myPlayer.y);
            distanceMoved = distanceMoved % 500;
        }
        
        // Check if we should show a movement message
        const now = Date.now();
        if (distanceMoved > MOVEMENT_DISTANCE_THRESHOLD && now - lastMovementMessageTime > MOVEMENT_MESSAGE_INTERVAL) {
            // Generate a movement message
            const directions = [];
            if (keys.w) directions.push('north');
            if (keys.s) directions.push('south');
            if (keys.a) directions.push('west');
            if (keys.d) directions.push('east');
            
            let direction = directions.join('-');
            if (!direction) direction = 'around';
            
            const messages = [
                `${username} is traveling ${direction}...`,
                `${username} has moved ${Math.round(distanceMoved)} units since last update.`,
                `${username} continues their journey across the world.`,
                `${username}'s position: [${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)}]`
            ];
            
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            // Add movement message to chat
            addChatMessage({
                type: 'movement',
                message: randomMessage
            });
            
            // Reset tracking
            distanceMoved = 0;
            lastMovementMessageTime = now;
        }
        
        moved = true;
    }
    
    return moved;
}

// Send position updates to server at fixed intervals
function updateServerPosition() {
    if (!myPlayer) return;
    
    // Send updated position to server
    socket.emit('move', {
        x: myPlayer.x,
        y: myPlayer.y
    });
    
    // Save player data locally on server update
    savePlayerDataLocally();
}

// Draw the infinite floor grid with grass-like appearance
function drawFloor() {
    // Calculate visible tile range for larger grid
    const startTileX = Math.floor(cameraX / TILE_SIZE);
    const startTileY = Math.floor(cameraY / TILE_SIZE);
    const endTileX = startTileX + Math.ceil(canvas.width / TILE_SIZE) + 1;
    const endTileY = startTileY + Math.ceil(canvas.height / TILE_SIZE) + 1;
    
    // Calculate visible grass tile range
    const startGrassTileX = Math.floor(cameraX / GRASS_TILE_SIZE);
    const startGrassTileY = Math.floor(cameraY / GRASS_TILE_SIZE);
    const endGrassTileX = startGrassTileX + Math.ceil(canvas.width / GRASS_TILE_SIZE) + 1;
    const endGrassTileY = startGrassTileY + Math.ceil(canvas.height / GRASS_TILE_SIZE) + 1;

    // First draw the base color
    ctx.fillStyle = grassColors[0];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grass tiles with variation
    for (let x = startGrassTileX; x <= endGrassTileX; x++) {
        for (let y = startGrassTileY; y <= endGrassTileY; y++) {
            const screenX = x * GRASS_TILE_SIZE - Math.floor(cameraX);
            const screenY = y * GRASS_TILE_SIZE - Math.floor(cameraY);
            
            // Use a deterministic but varied pattern based on position
            const patternIndex = Math.abs((x * 7 + y * 13) % grassPatterns.length);
            ctx.drawImage(grassPatterns[patternIndex], screenX, screenY, GRASS_TILE_SIZE, GRASS_TILE_SIZE);
        }
    }
    
    // Draw grid lines - make them more subtle for grass
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let x = startTileX; x <= endTileX; x++) {
        const screenX = x * TILE_SIZE - Math.floor(cameraX);
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = startTileY; y <= endTileY; y++) {
        const screenY = y * TILE_SIZE - Math.floor(cameraY);
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
    }
}

// Draw a player on the canvas
function drawPlayer(x, y, color, name, isCurrentPlayer) {
    // Convert world coordinates to screen coordinates
    const screenX = x - Math.floor(cameraX);
    const screenY = y - Math.floor(cameraY);
    
    // Only draw if player is visible on screen (with some buffer)
    const playerSize = 32;
    if (screenX < -playerSize || screenX > canvas.width + playerSize || 
        screenY < -playerSize || screenY > canvas.height + playerSize) {
        return;
    }
    
    // Draw player square
    ctx.fillStyle = isCurrentPlayer ? 'red' : color;
    ctx.fillRect(screenX - playerSize/2, screenY - playerSize/2, playerSize, playerSize);
    
    // Draw player border
    ctx.strokeStyle = isCurrentPlayer ? '#000' : '#555';
    ctx.lineWidth = isCurrentPlayer ? 3 : 1;
    ctx.strokeRect(screenX - playerSize/2, screenY - playerSize/2, playerSize, playerSize);
    
    // Draw player name
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = isCurrentPlayer ? 'white' : 'black';
    
    // Create an outline effect for the name
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.strokeText(name, screenX, screenY - 25);
    ctx.fillText(name, screenX, screenY - 25);
    
    // Draw indicator for current player
    if (isCurrentPlayer) {
        ctx.font = '12px Arial';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeText('(You)', screenX, screenY - 10);
        ctx.fillStyle = 'white';
        ctx.fillText('(You)', screenX, screenY - 10);
    }
}

// Draw the minimap
function drawMinimap() {
    const mapWidth = minimapCanvas.width;
    const mapHeight = minimapCanvas.height;
    
    // Scale factor for the minimap (1 pixel = 50 world units)
    const scale = 50;
    
    // Clear minimap
    minimapCtx.fillStyle = 'rgba(0, 150, 80, 0.3)';
    minimapCtx.fillRect(0, 0, mapWidth, mapHeight);
    
    // Add some grass texture to minimap
    minimapCtx.globalAlpha = 0.3;
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * mapWidth;
        const y = Math.random() * mapHeight;
        const size = 1 + Math.random() * 3;
        minimapCtx.fillStyle = grassColors[Math.floor(Math.random() * grassColors.length)];
        minimapCtx.beginPath();
        minimapCtx.arc(x, y, size, 0, Math.PI * 2);
        minimapCtx.fill();
    }
    minimapCtx.globalAlpha = 1.0;
    
    // Calculate the center of the minimap
    const centerX = mapWidth / 2;
    const centerY = mapHeight / 2;
    
    // Draw minimap grid (optional)
    minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    minimapCtx.lineWidth = 1;
    
    // Draw grid lines
    for (let x = 0; x <= mapWidth; x += 10) {
        minimapCtx.beginPath();
        minimapCtx.moveTo(x, 0);
        minimapCtx.lineTo(x, mapHeight);
        minimapCtx.stroke();
    }
    
    for (let y = 0; y <= mapHeight; y += 10) {
        minimapCtx.beginPath();
        minimapCtx.moveTo(0, y);
        minimapCtx.lineTo(mapWidth, y);
        minimapCtx.stroke();
    }
    
    // Draw all players on minimap
    for (const playerName in players) {
        const player = players[playerName];
        const isCurrentPlayer = playerName === username;
        
        // Convert world position to minimap position (relative to the current player)
        const playerX = centerX + (player.x - myPlayer.x) / scale;
        const playerY = centerY + (player.y - myPlayer.y) / scale;
        
        // Only draw if within minimap bounds
        if (playerX >= 0 && playerX <= mapWidth && playerY >= 0 && playerY <= mapHeight) {
            // Draw player dot
            minimapCtx.fillStyle = isCurrentPlayer ? 'red' : player.color;
            minimapCtx.beginPath();
            minimapCtx.arc(playerX, playerY, isCurrentPlayer ? 4 : 3, 0, Math.PI * 2);
            minimapCtx.fill();
            
            // Draw player name on minimap (only if it's the current player)
            if (isCurrentPlayer) {
                minimapCtx.fillStyle = 'white';
                minimapCtx.font = '8px Arial';
                minimapCtx.textAlign = 'center';
                minimapCtx.fillText('YOU', playerX, playerY - 5);
            }
        }
    }
    
    // Draw a border around the viewport area
    const viewportWidth = canvas.width / scale;
    const viewportHeight = canvas.height / scale;
    minimapCtx.strokeStyle = 'white';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(
        centerX - viewportWidth / 2,
        centerY - viewportHeight / 2,
        viewportWidth,
        viewportHeight
    );
}

// Draw attack effect
function drawAttackEffect() {
    if (currentAttack) {
        currentAttack.draw(cameraX, cameraY);
    }
}

// Update the game loop to include experience orbs
function startGameLoop() {
    function gameLoop(timestamp) {
        // Calculate time since last frame
        const deltaTime = timestamp - lastUpdateTime;
        lastUpdateTime = timestamp;
        
        // Update player position based on velocity
        let moved = false;
        
        // Simplified movement check - don't rely solely on isChatFocused
        if (myPlayer && (velocity.x !== 0 || velocity.y !== 0)) {
            moved = updatePlayerPosition(deltaTime);
        }
        
        // Update attack state
        updateAttack(deltaTime);
        
        // Update experience orbs
        if (expOrbManager && myPlayer) {
            expOrbManager.update(myPlayer.x, myPlayer.y, deltaTime);
        }
        
        // Send updates to server at fixed intervals
        serverUpdateInterval += deltaTime;
        if (moved && serverUpdateInterval >= SERVER_UPDATE_RATE) {
            updateServerPosition();
            serverUpdateInterval = 0;
        }
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw floor
        drawFloor();
        
        // Draw ores
        drawOres();
        
        // Draw particles
        drawParticles();
        
        // Draw experience orbs
        if (expOrbManager) {
            expOrbManager.draw(ctx, cameraX, cameraY);
        }
        
        // Draw all players
        for (const playerName in players) {
            const player = players[playerName];
            const isCurrentPlayer = playerName === username;
            
            // For the current player, use the local position for smoother movement
            const drawX = isCurrentPlayer ? myPlayer.x : player.x;
            const drawY = isCurrentPlayer ? myPlayer.y : player.y;
            
            drawPlayer(
                drawX,
                drawY,
                player.color,
                playerName,
                isCurrentPlayer
            );
        }
        
        // Draw attack effect
        drawAttackEffect();
        
        // Update minimap
        drawMinimap();
        
        // Update position display
        if (myPlayer) {
            positionInfo.textContent = `Position: ${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)}`;
            
            // Add attack cooldown to debug info
            if (currentAttack && currentAttack.cooldown > 0) {
                debugInfo.textContent = `Chat: ${isChatFocused}, Keys: W:${keys.w} A:${keys.a} S:${keys.s} D:${keys.d}, Attack: ${Math.round(currentAttack.cooldown)}ms`;
            } else {
                updateDebugInfo();
            }
        }
        
        // Schedule the next frame
        requestAnimationFrame(gameLoop);
    }
    
    // Start the loop
    requestAnimationFrame(gameLoop);
}

// Update attack state
function updateAttack(deltaTime) {
    // Update current attack
    if (currentAttack) {
        currentAttack.update(deltaTime);
        
        // Update hit rocks visual effect
        const now = Date.now();
        for (const [oreIndex, hitTime] of rockHitTimes.entries()) {
            const timeSinceHit = now - hitTime;
            if (timeSinceHit >= rockHitDuration) {
                hitRocks.delete(oreIndex);
                rockHitTimes.delete(oreIndex);
            }
        }
        
        // Update rock particles
        for (let i = rockParticles.length - 1; i >= 0; i--) {
            const particle = rockParticles[i];
            
            // Update particle position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Apply gravity
            particle.vy += 0.1;
            
            // Check if particle is dead
            if (now - particle.created > particle.life) {
                rockParticles.splice(i, 1);
            }
        }
    }
}

// Draw rock particles
function drawParticles() {
    const now = Date.now();
    
    for (const particle of rockParticles) {
        const screenX = particle.x - Math.floor(cameraX);
        const screenY = particle.y - Math.floor(cameraY);
        
        // Skip if off-screen
        if (screenX < 0 || screenX > canvas.width || screenY < 0 || screenY > canvas.height) {
            continue;
        }
        
        // Calculate opacity based on remaining life
        const lifeRatio = 1 - (now - particle.created) / particle.life;
        const alpha = lifeRatio;
        
        // Set fill style with proper alpha
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = alpha;
        
        // Draw particle based on shape
        if (particle.shape === 'square') {
            // Draw square particle
            const halfSize = particle.size / 2;
            ctx.fillRect(screenX - halfSize, screenY - halfSize, particle.size, particle.size);
        } else {
            // Draw circular particle (default)
            ctx.beginPath();
            ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Reset global alpha
        ctx.globalAlpha = 1.0;
    }
}

// Make ores accessible to the attack system
window.ores = ores;
window.rockParticles = rockParticles;
window.hitRocks = hitRocks;
window.rockHitTimes = rockHitTimes;
window.rockHitDuration = rockHitDuration;

// Preload sounds
function preloadSounds() {
    // Create sounds directory if it doesn't exist
    console.log('Preloading sounds...');
    
    // Check if sounds directory exists, if not, show a warning
    const hitSound = new Audio('sounds/hit.mp3');
    hitSound.addEventListener('error', () => {
        console.warn('Sound file "sounds/hit.mp3" not found. Please create a sounds directory and add hit.mp3.');
    });
}

// Call preloadSounds during initialization
preloadSounds();

// Add this function to preload sprites
function preloadSprites() {
    const sprites = [
        'sprites/axe.png',
        'sprites/pickaxe_placeholder.png'
    ];
    
    console.log('Preloading sprites...');
    
    sprites.forEach(spritePath => {
        const img = new Image();
        img.src = spritePath;
        img.onload = () => console.log(`Loaded sprite: ${spritePath}`);
        img.onerror = () => console.warn(`Failed to load sprite: ${spritePath}`);
    });
}

// Call this function during initialization
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Preload sprites
    preloadSprites();
});

// Update the handle attack function to create exp orbs when a rock is destroyed
function handleAttack(e) {
    if (isChatFocused || !myPlayer) return;
    
    // Calculate attack direction based on mouse position
    const playerScreenX = myPlayer.x - Math.floor(cameraX);
    const playerScreenY = myPlayer.y - Math.floor(cameraY);
    attackDirection = Math.atan2(mouseY - playerScreenY, mouseX - playerScreenX);
    
    // Check if we have an attack available
    if (currentAttack && currentAttack.start) {
        // Use the attack system's start method
        if (currentAttack.start(attackDirection)) {
            // Add attack message to chat
            addChatMessage({
                type: 'system',
                message: `${username} swings their ${currentAttack === availableAttacks.pickaxe ? 'pickaxe' : 'axe'}!`
            });
            
            // Check for ore hits
            const attackRange = 50; // Attack range in pixels
            const attackX = myPlayer.x + Math.cos(attackDirection) * attackRange;
            const attackY = myPlayer.y + Math.sin(attackDirection) * attackRange;
            
            // Check each ore for a hit
            const ores = oreManager.getOres();
            for (const ore of ores) {
                // Simple distance-based hit detection
                const dx = ore.x - attackX;
                const dy = ore.y - attackY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < attackRange) {
                    // Hit the ore
                    hitRocks.add(ore);
                    rockHitTimes.set(ore, Date.now());
                    
                    // Apply damage based on the tool
                    let damage = 10; // Default damage
                    
                    // If we have a tool selected, use its damage
                    if (selectedTool && selectedTool.stats && selectedTool.stats.strength) {
                        damage = selectedTool.stats.strength;
                        console.log(`Using ${selectedTool.name} with strength ${damage}`);
                    }
                    
                    // Apply damage to the ore
                    ore.health -= damage;
                    
                    // Generate particles
                    if (ore.generateParticles) {
                        const particles = ore.generateParticles();
                        rockParticles.push(...particles);
                    }
                    
                    // Check if the ore is destroyed
                    if (ore.health <= 0) {
                        // Get drops from the ore
                        const drops = ore.getDrops ? ore.getDrops() : [];
                        console.log(`Ore destroyed! Drops:`, drops);
                        
                        // Create experience orbs
                        if (expOrbManager && drops.experience) {
                            // Create multiple orbs based on experience amount (1 orb per exp point)
                            const orbCount = Math.min(drops.experience, 10); // Cap at 10 orbs
                            expOrbManager.createOrbBurst(ore.x, ore.y, orbCount, drops.experience);
                            
                            // Don't add experience directly, let the orbs handle it
                            // Instead, just add a message
                            addChatMessage({
                                type: 'system',
                                message: `Experience orbs released from the broken rock!`
                            });
                        }
                        
                        // Add resources to inventory or player
                        if (window.playerProgression && drops && drops.resources) {
                            for (const resource of drops.resources) {
                                // Try to add directly to player resources
                                const result = window.playerProgression.addResource(resource.type, resource.amount);
                                
                                // If player's inventory is full, try to add to inventory
                                if (result.capacityExceeded && result.remaining > 0 && window.playerInventory) {
                                    // Create a new BagItem for the inventory
                                    const resourceItem = new window.Equipment.BagItem({
                                        name: resource.name || resource.type,
                                        description: resource.description || `${resource.type} resource`,
                                        type: 'resource',
                                        icon: resource.icon,
                                        value: 1,
                                        stackable: true,
                                        count: result.remaining,
                                        isResource: true
                                    });
                                    
                                    // Try to add to inventory
                                    const slotIndex = window.playerInventory.addItem(resourceItem);
                                    
                                    if (slotIndex === -1) {
                                        // Couldn't add to inventory either
                                        addChatMessage({
                                            type: 'system',
                                            message: `You couldn't carry all the ${resource.name || resource.type}!`
                                        });
                                    } else {
                                        addChatMessage({
                                            type: 'system',
                                            message: `${result.remaining} ${resource.name || resource.type} added to inventory.`
                                        });
                                    }
                                } else if (!result.capacityExceeded) {
                                    // Successfully added to player resources
                                    addChatMessage({
                                        type: 'system',
                                        message: `You collected ${result.added} ${resource.name || resource.type}.`
                                    });
                                }
                            }
                        }
                        
                        // Remove the ore from the manager
                        oreManager.removeOre(ore);
                    }
                }
            }
        }
    }
}

// Update the initGame function to initialize the exp orb manager
function initGame() {
    console.log("Initializing game...");
    
    // Initialize ore manager
    oreManager = new window.OreManager().init();
    console.log("Ore manager initialized");
    
    // Initialize experience orb manager
    expOrbManager = new window.ExperienceOrbManager();
    console.log("Experience orb manager initialized");
    
    // Test creating a single ore directly
    try {
        if (window.Ores && window.Ores.Stone) {
            const testOre = new window.Ores.Stone(myPlayer.x + 100, myPlayer.y + 100);
            oreManager.ores.push(testOre);
            console.log("Test ore created successfully at", testOre.x, testOre.y);
        } else {
            console.error("window.Ores.Stone is not available for test ore");
        }
    } catch (error) {
        console.error("Error creating test ore:", error);
    }
    
    // Generate initial ores around player
    console.log(`Generating initial ores around player at (${myPlayer.x}, ${myPlayer.y})`);
    const initialOres = oreManager.generateOresAroundPosition(myPlayer.x, myPlayer.y, 20, myPlayer.x, myPlayer.y);
    console.log(`Generated ${initialOres.length} initial ores`);
    
    // Make ores accessible to the attack system
    window.ores = oreManager.getOres();
    console.log(`Total ores in manager: ${window.ores.length}`);
    
    // Initialize equipment manager
    equipmentManager = new window.Equipment.EquipmentManager(myPlayer);
    window.equipmentManager = equipmentManager;
    
    // Create player inventory
    const playerInventory = new window.Equipment.Inventory(24);
    window.playerInventory = playerInventory;
    
    // Create inventory UI
    const playerInventoryUI = new window.Equipment.InventoryUI(playerInventory);
    window.playerInventoryUI = playerInventoryUI;
    
    // Connect inventory to equipment manager
    equipmentManager.setInventory(playerInventory);
    
    // Initialize player progression system
    const playerProgression = new window.PlayerProgression(myPlayer);
    window.playerProgression = playerProgression;
    
    // Add some example items to inventory
    playerInventory.addItem(window.Equipment.EQUIPMENT_EXAMPLES.woodenPickaxe);
    playerInventory.addItem(window.Equipment.EQUIPMENT_EXAMPLES.stonePickaxe);
    playerInventory.addItem(window.Equipment.EQUIPMENT_EXAMPLES.ironPickaxe);
    playerInventory.addItem(window.Equipment.EQUIPMENT_EXAMPLES.woodenAxe);
    playerInventory.addItem(window.Equipment.EQUIPMENT_EXAMPLES.smallBag);
    
    // Initialize attacks
    availableAttacks = {
        pickaxe: new window.Attacks.PickaxeAttack(myPlayer, ctx),
        axe: new window.Attacks.AxeAttack(myPlayer, ctx)
    };
    currentAttack = availableAttacks.pickaxe; // Default attack
    
    // Start the game loop
    lastUpdateTime = performance.now();
    startGameLoop();
    
    // Add welcome message to chat
    addChatMessage({
        type: 'system',
        message: `Welcome to the game, ${username}! Use WASD to move and SPACE to attack.`
    });
} 