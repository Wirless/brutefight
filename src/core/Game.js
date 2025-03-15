/**
 * Game.js - Main game controller
 * 
 * This class serves as the central controller for the game,
 * coordinating between different systems and managers.
 */
// Import from index files for consistent approaches
import { LeaderboardUI, MinimapRenderer, EquipmentUI } from '../ui';
import { EquipmentManager } from '../managers';
import Socket from '../network/Socket.js';

class Game {
    /**
     * Initialize the game instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Core systems
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        // Game state
        this.running = false;
        this.lastUpdateTime = 0;
        this.serverUpdateInterval = 0;
        this.SERVER_UPDATE_RATE = 100; // ms between updates to server

        // Player state
        this.myPlayer = null;
        this.players = {};
        this.username = '';

        // Camera variables
        this.cameraX = 0;
        this.cameraY = 0;
        this.TILE_SIZE = 64;

        // Initialize managers
        this.socket = null;
        this.playerManager = null;
        this.oreManager = null;
        this.equipmentManager = null;
        this.inventoryManager = null;
        this.chatManager = null;
        this.uiManager = null;
        this.renderer = null;

        // Input state
        this.keys = { w: false, a: false, s: false, d: false };
        this.velocity = { x: 0, y: 0 };
        this.mouseX = 0;
        this.mouseY = 0;
        this.isChatFocused = false;

        // Initialize the auth system
        this.auth = {
            token: options.authToken || null,
            isLoggedIn: !!options.authToken
        };

        // Debug mode
        this.debug = options.debug || false;

        // Bind methods to this instance
        this.gameLoop = this.gameLoop.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);

        // Initialize UI components
        this.leaderboardUI = null;
        this.minimapRenderer = null;
        
        // Initialize global objects for ore hit effects
        this.initGlobalObjects();
    }
    
    /**
     * Initialize global objects needed for various systems
     */
    initGlobalObjects() {
        // Rock hit effect globals
        if (!window.hitRocks) window.hitRocks = new Set();
        if (!window.rockHitTimes) window.rockHitTimes = new Map();
        if (!window.rockParticles) window.rockParticles = [];
        if (!window.rockHitDuration) window.rockHitDuration = 500; // ms
    }

    /**
     * Initialize game systems and start the game loop
     */
    init() {
        console.log("Initializing game...");

        // Initialize socket connection
        this.initSocket();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize UI components
        this.initUI();
        
        // Initialize global objects (ensure they exist)
        this.initGlobalObjects();

        return this;
    }

    /**
     * Initialize WebSocket connection and set up event handlers
     */
    initSocket() {
        // Create new Socket instance
        this.socket = new Socket(this, { debug: this.debug });
    }

    /**
     * Set up UI components
     */
    initUI() {
        // Create UI elements that aren't part of the DOM initially
        this.createDebugInfo();
        
        // Initialize UI Manager
        this.uiManager = new window.UIManager(this);
        
        // Initialize Leaderboard UI
        this.leaderboardUI = new LeaderboardUI(this);
        
        // Initialize Minimap Renderer
        this.minimapRenderer = new MinimapRenderer(this);
    }

    /**
     * Set up event listeners for keyboard and mouse
     */
    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        // Mouse events
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        
        // Canvas focus
        this.canvas.addEventListener('click', () => {
            if (this.isChatFocused) {
                document.getElementById('chatInput').blur();
                this.isChatFocused = false;
            }
            this.canvas.setAttribute('tabindex', '0');
            this.canvas.focus();
        });

        // Save data before page unload
        window.addEventListener('beforeunload', () => this.savePlayerData());
    }

    /**
     * Create debug info element
     */
    createDebugInfo() {
        this.debugInfo = document.createElement('div');
        this.debugInfo.style.position = 'absolute';
        this.debugInfo.style.top = '5px';
        this.debugInfo.style.left = '5px';
        this.debugInfo.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.debugInfo.style.color = 'white';
        this.debugInfo.style.padding = '5px';
        this.debugInfo.style.zIndex = '1000';
        this.debugInfo.style.fontSize = '12px';
        document.body.appendChild(this.debugInfo);
    }

    /**
     * Update debug info display
     */
    updateDebugInfo() {
        this.debugInfo.textContent = `Chat focused: ${this.isChatFocused}, Keys: W:${this.keys.w} A:${this.keys.a} S:${this.keys.s} D:${this.keys.d}`;
    }

    /**
     * Handle successful login
     * @param {Object} data - Player data from server
     */
    handleLoginSuccess(data) {
        console.log('Login successful:', data);
        
        // Store auth token if provided
        if (data.token) {
            this.auth.token = data.token;
            this.auth.isLoggedIn = true;
            localStorage.setItem('authToken', data.token);
        }
        
        // Hide login panel and show game panel
        document.getElementById('loginPanel').style.display = 'none';
        document.getElementById('gamePanel').style.display = 'block';
        
        // Set player data
        this.myPlayer = data.playerData;
        this.username = data.playerData.username || document.getElementById('usernameInput').value;
        
        // Start the game
        this.startGame();
        
        // Update debug info
        this.updateDebugInfo();
        
        // Request leaderboard data
        this.socket.requestLeaderboard();
    }

    /**
     * Handle login failure
     * @param {Object} data - Error data from server
     */
    handleLoginFailed(data) {
        const loginStatus = document.getElementById('loginStatus');
        loginStatus.textContent = data.message || 'Login failed.';
    }

    /**
     * Initialize all game systems after successful login
     */
    startGame() {
        // Initialize managers
        this.initManagers();
        
        // Generate initial game world
        this.generateInitialWorld();
        
        // Set up auto-save interval
        this.setupAutoSave();
        
        // Start the game loop
        this.lastUpdateTime = performance.now();
        this.running = true;
        requestAnimationFrame(this.gameLoop);
        
        // Add welcome message to chat
        if (this.chatManager && this.chatManager.addMessage) {
            this.chatManager.addMessage({
                type: 'system',
                message: `Welcome to the game, ${this.username}! Use WASD to move and SPACE to attack.`
            });
        } else {
            console.log(`Welcome to the game, ${this.username}! Use WASD to move and SPACE to attack.`);
        }
    }

    /**
     * Initialize all game managers
     */
    initManagers() {
        try {
            // Create managers
            if (window.OreManager) {
                this.oreManager = new window.OreManager().init();
            } else {
                console.error("OreManager not found");
            }
            
            if (window.PlayerManager) {
                this.playerManager = new window.PlayerManager(this);
            } else {
                console.error("PlayerManager not found");
            }
            
            if (window.InventoryManager) {
                this.inventoryManager = new window.InventoryManager(this);
            } else {
                console.error("InventoryManager not found");
            }
            
            if (window.ChatManager) {
                this.chatManager = new window.ChatManager(this);
            } else {
                console.error("ChatManager not found");
            }
            
            if (window.UIManager) {
                this.uiManager = new window.UIManager(this);
            } else {
                console.error("UIManager not found");
            }
            
            if (window.Renderer) {
                this.renderer = new window.Renderer(this);
            } else {
                console.error("Renderer not found");
            }
            
            // Initialize equipment system using imported modules
            try {
                this.equipmentManager = new EquipmentManager(this);
                this.equipmentUI = new EquipmentUI(this.equipmentManager);
                this.equipmentManager.setUI(this.equipmentUI);
            } catch (error) {
                console.error("Error initializing equipment system:", error);
                // Fallback to window objects if available
                if (window.EquipmentManager && window.EquipmentUI) {
                    this.equipmentManager = new window.EquipmentManager(this);
                    this.equipmentUI = new window.EquipmentUI(this.equipmentManager);
                    this.equipmentManager.setUI(this.equipmentUI);
                } else {
                    console.error("EquipmentManager or EquipmentUI not found");
                }
            }
            
            // Initialize leaderboard
            this.leaderboardUI = new LeaderboardUI(this);
            
            // Make managers globally available if needed
            if (this.equipmentManager) window.equipmentManager = this.equipmentManager;
            if (this.inventoryManager && this.inventoryManager.inventory) window.playerInventory = this.inventoryManager.inventory;
            if (this.inventoryManager && this.inventoryManager.ui) window.playerInventoryUI = this.inventoryManager.ui;
            
            if (window.ExperienceOrbManager) {
                window.expOrbManager = new window.ExperienceOrbManager(this);
            } else {
                console.error("ExperienceOrbManager not found");
            }
            
            if (this.oreManager) window.ores = this.oreManager.getOres();
            
            // Connect inventory to equipment manager
            if (this.equipmentManager && this.inventoryManager && this.inventoryManager.inventory) {
                this.equipmentManager.setInventory(this.inventoryManager.inventory);
            }
            
            // Initialize attack system
            this.initAttackSystem();
        } catch (error) {
            console.error("Error initializing managers:", error);
        }
    }

    /**
     * Initialize the attack system
     */
    initAttackSystem() {
        try {
            // Set up available attacks
            if (window.Attacks) {
                this.availableAttacks = {
                    pickaxe: new window.Attacks.PickaxeAttack(this.myPlayer, this.ctx),
                    axe: new window.Attacks.AxeAttack(this.myPlayer, this.ctx)
                };
                this.currentAttack = this.availableAttacks.pickaxe; // Default attack
            } else {
                console.error("Attacks not found");
            }
        } catch (error) {
            console.error("Error initializing attack system:", error);
        }
    }

    /**
     * Generate initial game world content
     */
    generateInitialWorld() {
        console.log(`Generating initial ores around player at (${this.myPlayer.x}, ${this.myPlayer.y})`);
        const initialOres = this.oreManager.generateOresAroundPosition(
            this.myPlayer.x, 
            this.myPlayer.y, 
            20, 
            this.myPlayer.x, 
            this.myPlayer.y
        );
        console.log(`Generated ${initialOres.length} initial ores`);
    }

    /**
     * Set up auto-save system
     */
    setupAutoSave() {
        // Set up auto-save interval (every 60 seconds)
        setInterval(() => this.savePlayerData(), 60000);
    }

    /**
     * Save player data to localStorage and server
     */
    savePlayerData() {
        if (!this.myPlayer) return;
        
        console.log("Saving player data...");
        
        // Save inventory and equipment data to myPlayer object
        if (window.playerInventory) {
            this.myPlayer.inventory = window.playerInventory.items;
        }
        
        if (window.equipmentManager) {
            this.myPlayer.equipped = window.equipmentManager.equipped;
        }
        
        // Save locally
        this.savePlayerDataLocally();
        
        // Send update to server
        if (this.socket && this.socket.connected) {
            this.socket.sendPlayerUpdate({
                experience: this.myPlayer.experience,
                level: this.myPlayer.level,
                maxExperience: this.myPlayer.maxExperience,
                capacity: this.myPlayer.capacity,
                resources: this.myPlayer.resources,
                skills: this.myPlayer.skills,
                inventory: this.myPlayer.inventory,
                equipped: this.myPlayer.equipped
            });
        }
    }

    /**
     * Save player data to localStorage
     */
    savePlayerDataLocally() {
        if (!this.myPlayer) return;
        
        // Prepare save data
        const saveData = {
            username: this.username,
            playerData: this.myPlayer
        };
        
        // Save to localStorage
        localStorage.setItem('playerSave', JSON.stringify(saveData));
        
        // Show save indicator
        this.showSaveIndicator();
    }

    /**
     * Show visual indicator that game has been saved
     */
    showSaveIndicator() {
        // Create or get the save indicator
        let saveIndicator = document.getElementById('saveIndicator');
        
        if (!saveIndicator) {
            saveIndicator = document.createElement('div');
            saveIndicator.id = 'saveIndicator';
            saveIndicator.style.position = 'fixed';
            saveIndicator.style.bottom = '10px';
            saveIndicator.style.right = '10px';
            saveIndicator.style.backgroundColor = 'rgba(0, 233, 150, 0.8)';
            saveIndicator.style.color = 'white';
            saveIndicator.style.padding = '5px 10px';
            saveIndicator.style.borderRadius = '5px';
            saveIndicator.style.fontSize = '12px';
            saveIndicator.style.fontWeight = 'bold';
            saveIndicator.style.zIndex = '9999';
            saveIndicator.style.opacity = '0';
            saveIndicator.style.transition = 'opacity 0.3s ease';
            document.body.appendChild(saveIndicator);
        }
        
        // Update text and show
        saveIndicator.textContent = 'Game Saved!';
        saveIndicator.style.opacity = '1';
        
        // Hide after 2 seconds
        setTimeout(() => {
            saveIndicator.style.opacity = '0';
        }, 2000);
    }

    /**
     * Handle socket event: player list update
     * @param {Object} playersData - Data about all players
     */
    handlePlayerList(playersData) {
        this.players = playersData;
        this.uiManager.updatePlayersList(this.players, this.username);
    }

    /**
     * Handle socket event: player disconnected
     * @param {string} disconnectedUsername - Username of disconnected player
     */
    handlePlayerDisconnected(disconnectedUsername) {
        console.log(`Player disconnected: ${disconnectedUsername}`);
        if (this.uiManager) {
            this.uiManager.updatePlayersList(this.players, this.username);
        }
        
        // Add disconnect message to chat
        if (this.chatManager && this.chatManager.addMessage) {
            this.chatManager.addMessage({
                type: 'system',
                message: `${disconnectedUsername} has left the game.`
            });
        }
    }

    /**
     * Handle socket event: player joined
     * @param {string} joinedUsername - Username of joined player
     */
    handlePlayerJoined(joinedUsername) {
        // Add welcome message to chat
        if (this.chatManager && this.chatManager.addMessage) {
            this.chatManager.addMessage({
                type: 'system',
                message: `${joinedUsername} has joined the game.`
            });
        }
    }

    /**
     * Handle socket event: chat message
     * @param {Object} msg - Chat message data
     */
    handleChatMessage(msg) {
        if (this.chatManager && this.chatManager.addMessage) {
            this.chatManager.addMessage(msg);
        }
    }

    /**
     * Handle socket event: leaderboard data
     * @param {Array} data - Leaderboard data
     */
    handleLeaderboardData(data) {
        if (this.leaderboardUI) {
            this.leaderboardUI.update(data, this.username);
        }
    }

    /**
     * Handle keydown event
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        
        // Only process input if chat is not focused
        if (this.isChatFocused) return;
        
        // Check if it's a movement key
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
            this.keys[key] = true;
            this.updateVelocity();
            this.updateDebugInfo();
        }
        
        // Handle attack (space)
        if (key === ' ' && this.currentAttack) {
            this.handleAttackKey();
        }
        
        // Weapon switching
        if (key === '1' && this.availableAttacks && this.availableAttacks.pickaxe) {
            this.currentAttack = this.availableAttacks.pickaxe;
            if (this.chatManager && this.chatManager.addMessage) {
                this.chatManager.addMessage({
                    type: 'system',
                    message: `${this.username} equips a pickaxe.`
                });
            }
        }
        
        if (key === '2' && this.availableAttacks && this.availableAttacks.axe) {
            this.currentAttack = this.availableAttacks.axe;
            if (this.chatManager && this.chatManager.addMessage) {
                this.chatManager.addMessage({
                    type: 'system',
                    message: `${this.username} equips an axe.`
                });
            }
        }
        
        // Toggle equipment panel with 'E' key
        if (key === 'e') {
            if (window.equipmentManager) {
                window.equipmentManager.toggleEquipmentPanel();
            }
            this.canvas.focus();
        }
        
        // Toggle inventory panel with 'I' key
        if (key === 'i') {
            if (window.playerInventoryUI) {
                window.playerInventoryUI.toggle();
            }
        }
        
        // Handle quick slots (1-9, 0)
        if (!isNaN(parseInt(key)) && key >= '0' && key <= '9') {
            this.handleQuickSlotKey(key);
        }
        
        // Toggle skills window with 'K' key
        if (key === 'k') {
            if (window.skillsManager) {
                window.skillsManager.toggleWindow();
            }
        }
    }

    /**
     * Handle key up event
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        
        // Check if it's a movement key
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
            this.keys[key] = false;
            this.updateVelocity();
            this.updateDebugInfo();
        }
    }

    /**
     * Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        // Get canvas position
        const rect = this.canvas.getBoundingClientRect();
        
        // Calculate mouse position relative to canvas
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
    }

    /**
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        // Only handle left mouse button (button 0)
        if (e.button === 0 && !this.isChatFocused) {
            this.handleAttack(e);
        }
    }

    /**
     * Update velocity based on key states
     */
    updateVelocity() {
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        if (this.keys.w) this.velocity.y -= 1;
        if (this.keys.s) this.velocity.y += 1;
        if (this.keys.a) this.velocity.x -= 1;
        if (this.keys.d) this.velocity.x += 1;
        
        // Normalize diagonal movement
        if (this.velocity.x !== 0 && this.velocity.y !== 0) {
            const length = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            this.velocity.x /= length;
            this.velocity.y /= length;
        }
    }

    /**
     * Handle attack key press
     */
    handleAttackKey() {
        // Calculate attack direction based on movement or last direction
        let direction = this.attackDirection;
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            direction = Math.atan2(this.velocity.y, this.velocity.x);
        }
        
        // Perform attack
        if (this.currentAttack && this.currentAttack.start && this.currentAttack.start(direction)) {
            // Add attack message to chat
            if (this.chatManager && this.chatManager.addMessage) {
                this.chatManager.addMessage({
                    type: 'system',
                    message: `${this.username} swings their ${this.currentAttack === this.availableAttacks.pickaxe ? 'pickaxe' : 'axe'}!`
                });
            }
        }
    }

    /**
     * Handle attack mouse click
     * @param {MouseEvent} e - Mouse event
     */
    handleAttack(e) {
        if (!this.myPlayer) return;
        
        // Calculate attack direction based on mouse position
        const playerScreenX = this.myPlayer.x - Math.floor(this.cameraX);
        const playerScreenY = this.myPlayer.y - Math.floor(this.cameraY);
        this.attackDirection = Math.atan2(this.mouseY - playerScreenY, this.mouseX - playerScreenX);
        
        // Check if we have an attack available
        if (this.currentAttack && this.currentAttack.start) {
            this.performAttack();
        }
    }

    /**
     * Perform attack action
     */
    performAttack() {
        // Use the attack system's start method
        if (this.currentAttack && this.currentAttack.start && this.currentAttack.start(this.attackDirection)) {
            // Add attack message to chat
            if (this.chatManager && this.chatManager.addMessage) {
                this.chatManager.addMessage({
                    type: 'system',
                    message: `${this.username} swings their ${this.currentAttack === this.availableAttacks.pickaxe ? 'pickaxe' : 'axe'}!`
                });
            }
            
            // Visual feedback for attack
            this.createAttackVisualEffects();
        }
    }

    /**
     * Create visual effects for attack
     */
    createAttackVisualEffects() {
        if (!this.myPlayer) return;
        
        // Attack range and position calculation
        const attackRange = 50; // Attack range in pixels
        const attackX = this.myPlayer.x + Math.cos(this.attackDirection) * attackRange;
        const attackY = this.myPlayer.y + Math.sin(this.attackDirection) * attackRange;
        
        // Check each ore for visual hit effects
        const ores = this.oreManager.getOres();
        for (const ore of ores) {
            // Simple distance-based hit detection for visual effects
            const dx = ore.x - attackX;
            const dy = ore.y - attackY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < attackRange) {
                // Visual hit effect only - no damage application
                window.hitRocks.add(ore);
                window.rockHitTimes.set(ore, Date.now());
                
                // Generate visual particles without applying damage
                if (ore.generateParticles) {
                    const particles = ore.generateParticles(false); // Pass false to indicate this is just visual
                    window.rockParticles.push(...particles);
                }
            }
        }
    }

    /**
     * Handle quick slot key press
     * @param {string} key - Key pressed
     */
    handleQuickSlotKey(key) {
        if (window.equipmentManager) {
            window.equipmentManager.handleHotkey(key);
            
            // Update the selected tool
            window.selectedTool = window.equipmentManager.getActiveQuickSlotItem();
            
            // Show the selected tool in debug info
            if (window.selectedTool) {
                this.debugInfo.textContent = `Selected tool: ${window.selectedTool.name} (${window.selectedTool.description})`;
            } else {
                this.debugInfo.textContent = `No tool selected`;
            }
            
            // Wait 2 seconds, then restore debug info
            setTimeout(() => {
                this.updateDebugInfo();
            }, 2000);
        }
    }

    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        if (!this.running) return;
        
        // Calculate time since last frame
        const deltaTime = timestamp - this.lastUpdateTime;
        this.lastUpdateTime = timestamp;
        
        // Update player position based on velocity
        let moved = false;
        
        // Movement check
        if (this.myPlayer && (this.velocity.x !== 0 || this.velocity.y !== 0)) {
            moved = this.updatePlayerPosition(deltaTime);
        }
        
        // Update attack state
        this.updateAttack(deltaTime);
        
        // Update experience orbs
        if (window.expOrbManager && this.myPlayer) {
            window.expOrbManager.update(this.myPlayer.x, this.myPlayer.y, deltaTime);
        }
        
        // Send updates to server at fixed intervals
        this.serverUpdateInterval += deltaTime;
        if (moved && this.serverUpdateInterval >= this.SERVER_UPDATE_RATE) {
            this.updateServerPosition();
            this.serverUpdateInterval = 0;
        }
        
        // Render game
        this.render();
        
        // Schedule the next frame
        requestAnimationFrame(this.gameLoop);
    }

    /**
     * Update player position based on current velocity
     * @param {number} deltaTime - Time since last update in ms
     * @returns {boolean} - Whether player moved
     */
    updatePlayerPosition(deltaTime) {
        if (!this.myPlayer || !this.velocity) return false;
        
        const MOVEMENT_SPEED = 240; // Pixels per second
        const seconds = deltaTime / 1000;
        const moveDistance = MOVEMENT_SPEED * seconds;
        
        let moved = false;
        
        // Check velocity directly
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            // Calculate position before movement
            const oldX = this.myPlayer.x;
            const oldY = this.myPlayer.y;
            
            // Calculate new position
            const newX = this.myPlayer.x + this.velocity.x * moveDistance;
            const newY = this.myPlayer.y + this.velocity.y * moveDistance;
            
            // Check for ore collisions
            const PLAYER_COLLISION_RADIUS = 10;
            if (!this.checkOreCollisions(newX, newY)) {
                // No collision, update position
                this.myPlayer.x = newX;
                this.myPlayer.y = newY;
            } else {
                // Try moving only in X direction
                if (!this.checkOreCollisions(newX, oldY)) {
                    this.myPlayer.x = newX;
                }
                // Try moving only in Y direction
                else if (!this.checkOreCollisions(oldX, newY)) {
                    this.myPlayer.y = newY;
                }
                // If both directions cause collisions, check if we need to push the player
                else {
                    const newPosition = this.oreManager.handlePlayerCollision(oldX, oldY, PLAYER_COLLISION_RADIUS);
                    if (newPosition) {
                        this.myPlayer.x = newPosition.x;
                        this.myPlayer.y = newPosition.y;
                    }
                }
            }
            
            // Update camera position smoothly
            this.cameraX = this.myPlayer.x - this.canvas.width / 2;
            this.cameraY = this.myPlayer.y - this.canvas.height / 2;
            
            moved = true;
        }
        
        return moved;
    }

    /**
     * Check for collisions with ores
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @returns {boolean} - Whether collision occurred
     */
    checkOreCollisions(playerX, playerY) {
        const PLAYER_COLLISION_RADIUS = 10;
        return this.oreManager.checkCollision(playerX, playerY, PLAYER_COLLISION_RADIUS);
    }

    /**
     * Update server position
     */
    updateServerPosition() {
        if (!this.myPlayer || !this.socket) return;
        
        // Send updated position to server using the Socket module
        this.socket.sendMovement(this.myPlayer.x, this.myPlayer.y);
        
        // Save player data locally on server update
        this.savePlayerDataLocally();
    }

    /**
     * Update attack state
     * @param {number} deltaTime - Time since last update in ms
     */
    updateAttack(deltaTime) {
        // Update current attack
        if (this.currentAttack) {
            this.currentAttack.update(deltaTime);
        }
        
        // Update hit rocks visual effect
        this.updateHitRocksEffect();
        
        // Update rock particles
        this.updateRockParticles();
    }

    /**
     * Update hit rocks visual effect
     */
    updateHitRocksEffect() {
        const now = Date.now();
        for (const [oreIndex, hitTime] of window.rockHitTimes.entries()) {
            const timeSinceHit = now - hitTime;
            if (timeSinceHit >= window.rockHitDuration) {
                window.hitRocks.delete(oreIndex);
                window.rockHitTimes.delete(oreIndex);
            }
        }
    }

    /**
     * Update rock particles
     */
    updateRockParticles() {
        const now = Date.now();
        for (let i = window.rockParticles.length - 1; i >= 0; i--) {
            const particle = window.rockParticles[i];
            
            // Update particle position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Apply gravity
            particle.vy += 0.1;
            
            // Check if particle is dead
            if (now - particle.created > particle.life) {
                window.rockParticles.splice(i, 1);
            }
        }
    }

    /**
     * Render the game
     */
    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw floor
        this.renderFloor();
        
        // Draw ores
        this.oreManager.drawOres(this.ctx, this.cameraX, this.cameraY);
        
        // Draw particles
        this.renderParticles();
        
        // Draw experience orbs
        if (window.expOrbManager) {
            window.expOrbManager.draw(this.ctx, this.cameraX, this.cameraY);
        }
        
        // Draw all players
        this.renderPlayers();
        
        // Draw attack effect
        this.renderAttackEffect();
        
        // Update minimap using the dedicated renderer
        if (this.minimapRenderer) {
            this.minimapRenderer.render();
        }
        
        // Update position display
        if (this.myPlayer) {
            document.getElementById('positionInfo').textContent = 
                `Position: ${Math.round(this.myPlayer.x)}, ${Math.round(this.myPlayer.y)}`;
            
            // Add attack cooldown to debug info
            if (this.currentAttack && this.currentAttack.cooldown > 0) {
                this.debugInfo.textContent = 
                    `Chat: ${this.isChatFocused}, Keys: W:${this.keys.w} A:${this.keys.a} S:${this.keys.s} D:${this.keys.d}, Attack: ${Math.round(this.currentAttack.cooldown)}ms`;
            } else {
                this.updateDebugInfo();
            }
        }
    }

    /**
     * Render the floor/ground
     */
    renderFloor() {
        // Base implementation - would be moved to Renderer.js
        // ... floor rendering code ...
    }

    /**
     * Render all particles
     */
    renderParticles() {
        // Base implementation - would be moved to ParticleSystem.js
        // ... particle rendering code ...
    }

    /**
     * Render all players
     */
    renderPlayers() {
        for (const playerName in this.players) {
            const player = this.players[playerName];
            const isCurrentPlayer = playerName === this.username;
            
            // For the current player, use the local position for smoother movement
            const drawX = isCurrentPlayer ? this.myPlayer.x : player.x;
            const drawY = isCurrentPlayer ? this.myPlayer.y : player.y;
            
            this.renderPlayer(
                drawX,
                drawY,
                player.color,
                playerName,
                isCurrentPlayer,
                player.level,
                player.title
            );
        }
    }

    /**
     * Render a single player
     */
    renderPlayer(x, y, color, name, isCurrentPlayer, level, title) {
        // Base implementation - would be moved to Renderer.js
        // ... player rendering code ...
    }

    /**
     * Render attack effect
     */
    renderAttackEffect() {
        if (this.currentAttack) {
            this.currentAttack.draw(this.cameraX, this.cameraY);
        }
    }
}

// Make the Game class globally available
window.Game = Game;

// Initialize the game when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create game instance
    const game = new Game();
    
    // Initialize game
    game.init();
    
    // Make game globally available
    window.game = game;
}); 

export default Game;