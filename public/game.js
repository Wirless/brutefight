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

// For grass generation
const grassPatterns = [];
const grassColors = [
    'rgb(0, 233, 150)', // Base green
    'rgb(0, 210, 140)',
    'rgb(10, 220, 130)',
    'rgb(20, 230, 145)',
    'rgb(5, 225, 155)'
];
const GRASS_TILE_SIZE = 16; // Smaller tiles for more detailed grass

// Rock obstacles
const rocks = [];
const ROCK_COUNT = 100; // Number of rocks to generate
const ROCK_MIN_SIZE = { width: 30, height: 45 };
const ROCK_MAX_SIZE = { width: 50, height: 80 };
const ROCK_COLORS = [
    '#555555', // Medium gray
    '#666666', // Light gray
    '#444444', // Dark gray
    '#505050', // Slate gray
    '#595959'  // Charcoal gray
];
const ROCK_SPAWN_RADIUS = 1500; // Spawn rocks within this radius of player
const ROCK_MIN_SPACING = 200; // Minimum spacing between rocks (x and y)
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

// Generate random rocks around a position
function generateRocksAroundPosition(centerX, centerY, count) {
    const newRocks = [];
    let attempts = 0;
    const maxAttempts = count * 10; // Limit attempts to avoid infinite loops
    
    while (newRocks.length < count && attempts < maxAttempts) {
        attempts++;
        
        // Generate random position within spawn radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * ROCK_SPAWN_RADIUS;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        // Random size within constraints
        const width = ROCK_MIN_SIZE.width + Math.random() * (ROCK_MAX_SIZE.width - ROCK_MIN_SIZE.width);
        const height = ROCK_MIN_SIZE.height + Math.random() * (ROCK_MAX_SIZE.height - ROCK_MIN_SIZE.height);
        
        // Check spacing with existing rocks (square detection)
        let tooClose = false;
        
        // Check against existing rocks in the game
        for (const rock of rocks) {
            if (Math.abs(x - rock.x) < ROCK_MIN_SPACING && 
                Math.abs(y - rock.y) < ROCK_MIN_SPACING) {
                tooClose = true;
                break;
            }
        }
        
        // Check against rocks we're about to add
        for (const rock of newRocks) {
            if (Math.abs(x - rock.x) < ROCK_MIN_SPACING && 
                Math.abs(y - rock.y) < ROCK_MIN_SPACING) {
                tooClose = true;
                break;
            }
        }
        
        // If too close to another rock, skip this one
        if (tooClose) continue;
        
        // Random color
        const color = ROCK_COLORS[Math.floor(Math.random() * ROCK_COLORS.length)];
        
        // Generate random shape points (5-8 points)
        const pointCount = 5 + Math.floor(Math.random() * 4);
        const points = [];
        
        for (let j = 0; j < pointCount; j++) {
            // Generate points around the perimeter of the rock
            const pointAngle = (j / pointCount) * Math.PI * 2;
            
            // Add some randomness to the radius to create irregular shapes
            const radiusX = width / 2 * (0.8 + Math.random() * 0.4);
            const radiusY = height / 2 * (0.8 + Math.random() * 0.4);
            
            points.push({
                x: x + Math.cos(pointAngle) * radiusX,
                y: y + Math.sin(pointAngle) * radiusY
            });
        }
        
        // Create rock object
        const rock = {
            x,
            y,
            width,
            height,
            color,
            points,
            // Pre-calculate a simplified collision box
            collisionBox: {
                left: x - width / 2,
                right: x + width / 2,
                top: y - height / 2,
                bottom: y + height / 2
            }
        };
        
        newRocks.push(rock);
    }
    
    // Add the new rocks to the global rocks array
    rocks.push(...newRocks);
    console.log(`Generated ${newRocks.length} rocks around position (${centerX}, ${centerY})`);
    return newRocks;
}

// Call once at start
generateGrassPatterns();
// We'll generate rocks dynamically as the player moves

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
    if (e.button === 0 && !isChatFocused && currentAttack) {
        // Calculate attack direction based on mouse position
        const playerScreenX = myPlayer.x - Math.floor(cameraX);
        const playerScreenY = myPlayer.y - Math.floor(cameraY);
        const direction = Math.atan2(mouseY - playerScreenY, mouseX - playerScreenX);
        
        // Perform attack
        if (currentAttack.start(direction)) {
            // Add attack message to chat
            addChatMessage({
                type: 'system',
                message: `${username} swings their ${currentAttack === availableAttacks.pickaxe ? 'pickaxe' : 'axe'}!`
            });
        }
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
    myPlayer = data.playerData;
    
    // If server sent a cloud save due to mismatch
    if (data.cloudSaveForced) {
        alert('Your local save was outdated or invalid. The server save has been downloaded.');
        savePlayerDataLocally();
    }
    
    // Center camera on player
    cameraX = myPlayer.x - canvas.width / 2;
    cameraY = myPlayer.y - canvas.height / 2;
    
    // Generate initial rocks around player
    generateRocksAroundPosition(myPlayer.x, myPlayer.y, 20);
    
    // Switch from login panel to game panel
    loginPanel.style.display = 'none';
    gamePanel.style.display = 'block';
    
    // Add welcome message to chat
    addChatMessage({
        type: 'system',
        message: `Welcome to the game, ${username}! Use WASD to move and SPACE to attack.`
    });
    
    // Start the game loop
    lastUpdateTime = performance.now();
    startGameLoop();
    
    // Initialize attacks
    availableAttacks = {
        pickaxe: new window.Attacks.PickaxeAttack(myPlayer, ctx),
        axe: new window.Attacks.AxeAttack(myPlayer, ctx)
    };
    currentAttack = availableAttacks.pickaxe; // Default attack
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

// Update the list of connected players
function updatePlayersList() {
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

// Check if player collides with any rocks
function checkRockCollisions(newX, newY) {
    // Quick check using player collision radius
    for (const rock of rocks) {
        // First do a quick bounding box check
        if (newX + PLAYER_COLLISION_RADIUS > rock.collisionBox.left &&
            newX - PLAYER_COLLISION_RADIUS < rock.collisionBox.right &&
            newY + PLAYER_COLLISION_RADIUS > rock.collisionBox.top &&
            newY - PLAYER_COLLISION_RADIUS < rock.collisionBox.bottom) {
            
            // For more accurate collision, check distance to center
            const dx = newX - rock.x;
            const dy = newY - rock.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If player is too close to rock center, collision detected
            if (distance < (rock.width + rock.height) / 4 + PLAYER_COLLISION_RADIUS) {
                return true; // Collision detected
            }
        }
    }
    
    return false; // No collision
}

// Draw rocks on the canvas
function drawRocks() {
    const now = Date.now();
    
    // Only draw rocks that are visible on screen
    for (let i = 0; i < rocks.length; i++) {
        const rock = rocks[i];
        
        // Check if rock is visible on screen (with some buffer)
        const screenX = rock.x - Math.floor(cameraX);
        const screenY = rock.y - Math.floor(cameraY);
        
        if (screenX + rock.width / 2 < 0 || screenX - rock.width / 2 > canvas.width ||
            screenY + rock.height / 2 < 0 || screenY - rock.height / 2 > canvas.height) {
            continue; // Skip rocks that are off-screen
        }
        
        // Draw the rock shape
        ctx.fillStyle = rock.color;
        ctx.beginPath();
        
        // Draw the rock shape using its points
        if (rock.points.length > 0) {
            const firstPoint = rock.points[0];
            ctx.moveTo(
                firstPoint.x - Math.floor(cameraX),
                firstPoint.y - Math.floor(cameraY)
            );
            
            for (let j = 1; j < rock.points.length; j++) {
                const point = rock.points[j];
                ctx.lineTo(
                    point.x - Math.floor(cameraX),
                    point.y - Math.floor(cameraY)
                );
            }
            
            // Close the path back to the first point
            ctx.closePath();
        }
        
        // Fill and stroke the rock
        ctx.fill();
        
        // Add a darker stroke for definition
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add some texture/detail to the rock
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let j = 0; j < 5; j++) {
            const detailX = rock.x - rock.width / 3 + Math.random() * rock.width / 1.5 - Math.floor(cameraX);
            const detailY = rock.y - rock.height / 3 + Math.random() * rock.height / 1.5 - Math.floor(cameraY);
            const detailSize = 2 + Math.random() * 5;
            
            ctx.beginPath();
            ctx.arc(detailX, detailY, detailSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Check if rock was hit recently
        if (hitRocks.has(i)) {
            const hitTime = rockHitTimes.get(i);
            const timeSinceHit = now - hitTime;
            
            if (timeSinceHit < rockHitDuration) {
                // Draw hit effect (red glow)
                const alpha = 0.7 * (1 - timeSinceHit / rockHitDuration);
                
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                
                // Draw glow effect
                if (rock.points.length > 0) {
                    ctx.beginPath();
                    const firstPoint = rock.points[0];
                    ctx.moveTo(
                        firstPoint.x - Math.floor(cameraX),
                        firstPoint.y - Math.floor(cameraY)
                    );
                    
                    for (let j = 1; j < rock.points.length; j++) {
                        const point = rock.points[j];
                        ctx.lineTo(
                            point.x - Math.floor(cameraX),
                            point.y - Math.floor(cameraY)
                        );
                    }
                    
                    ctx.closePath();
                    ctx.fill();
                }
                
                ctx.restore();
            } else {
                // Hit effect expired
                hitRocks.delete(i);
                rockHitTimes.delete(i);
            }
        }
    }
    
    // Draw rock particles
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
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
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
        
        // Check for rock collisions
        if (!checkRockCollisions(newX, newY)) {
            // No collision, update position
            myPlayer.x = newX;
            myPlayer.y = newY;
        } else {
            // Try moving only in X direction
            if (!checkRockCollisions(newX, oldY)) {
                myPlayer.x = newX;
            }
            // Try moving only in Y direction
            else if (!checkRockCollisions(oldX, newY)) {
                myPlayer.y = newY;
            }
            // If both directions cause collisions, player doesn't move
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
        
        // Check if we should generate more rocks
        // Every 500 units of movement, generate some new rocks
        if (Math.floor(distanceMoved / 500) > 0) {
            generateRocksAroundPosition(myPlayer.x, myPlayer.y, 5);
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

// Game rendering loop
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
        
        // Draw rocks
        drawRocks();
        
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
        for (const [rockIndex, hitTime] of rockHitTimes.entries()) {
            const timeSinceHit = now - hitTime;
            if (timeSinceHit >= rockHitDuration) {
                hitRocks.delete(rockIndex);
                rockHitTimes.delete(rockIndex);
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

// Make rocks accessible to the attack system
window.rocks = rocks;
window.rockParticles = rockParticles;
window.hitRocks = hitRocks;
window.rockHitTimes = rockHitTimes;
window.rockHitDuration = rockHitDuration; 