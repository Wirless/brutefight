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
        this.controlsEnabled = true;

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
        // Initialize global variables for rock hit effects
        window.hitRocks = window.hitRocks || new Set();
        window.rockHitTimes = window.rockHitTimes || new Map();
        window.rockHitDuration = window.rockHitDuration || 500; // How long rocks show hit effect (ms)
        window.rockParticles = window.rockParticles || [];

        // Set the global addExperience function so other systems can use it
        window.addExperience = (amount) => {
            if (this.addExperience) {
                return this.addExperience(amount);
            }
            return false;
        };

        // Load tree classes if not already loaded
        try {
            if (!window.Tree || !window.Trees) {
                import('../entities/Tree.js').then(module => {
                    console.log("Successfully imported Tree.js module");
                    // These should already be set by the module, but let's ensure they're available
                    window.Tree = module.Tree || module.default;
                    window.OakTree = module.OakTree;
                    window.BirchTree = module.BirchTree;
                    window.PineTree = module.PineTree;
                    window.JungleTree = module.JungleTree;

                    if (!window.Trees) {
                        window.Trees = {
                            oak: (x, y) => new window.OakTree(x, y),
                            birch: (x, y) => new window.BirchTree(x, y),
                            pine: (x, y) => new window.PineTree(x, y),
                            jungle: (x, y) => new window.JungleTree(x, y)
                        };
                    }
                }).catch(error => {
                    console.error("Failed to import Tree.js module:", error);
                });
            }
        } catch (error) {
            console.error("Error loading tree classes:", error);
        }

        // Initialize sounds if Web Audio API is available
        try {
            window.audioEnabled = true;
            
            // Create audio context if not already created
            if (!window.audioContext) {
                window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Preload common sound effects
            this.preloadSounds();
        } catch (e) {
            console.error("Audio API not available:", e);
            window.audioEnabled = false;
        }
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
        
        // Initialize the world
        this.initWorld();

        // Load tree system if available in systems module
        if (window.systems && window.systems.TreeSystem) {
            console.log("Loading TreeSystem from systems module");
            window.TreeSystem = window.systems.TreeSystem;
        }

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
        
        // Map server properties to client properties if needed
        if (this.myPlayer.hp !== undefined && this.myPlayer.health === undefined) {
            this.myPlayer.health = this.myPlayer.hp;
        }
        if (this.myPlayer.maxhp !== undefined && this.myPlayer.maxHealth === undefined) {
            this.myPlayer.maxHealth = this.myPlayer.maxhp;
        }
        
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
     * Initialize the game after login
     */
    startGame() {
        console.log("Starting game...");
        
        // Hide login panel and show game panel
        document.getElementById('loginPanel').style.display = 'none';
        document.getElementById('registerPanel').style.display = 'none';
        document.getElementById('gamePanel').style.display = 'block';
        
        // Initialize managers
        this.initManagers();
        
        // Create experience bar
        this.initExperienceBar();
        
        // Stats display
        this.createStatsDisplay();
        
        // Set up auto-save
        this.setupAutoSave();
        
        // Create initial world
        this.generateInitialWorld();
        
        // Set up keyboard focus
        this.canvas.focus();
        
        // Start the game loop
        this.lastUpdateTime = performance.now();
        this.running = true;
        requestAnimationFrame(this.gameLoop.bind(this));
        
        // Add welcome message to chat
        if (this.chatManager && this.chatManager.addMessage) {
            this.chatManager.addMessage({
                type: 'system',
                message: `Welcome to the game, ${this.username}! Use WASD to move and MOUSE to attack. Press 1-3 to switch weapons.`
            });
        } else {
            console.log(`Welcome to the game, ${this.username}! Use WASD to move and MOUSE to attack. Press 1-3 to switch weapons.`);
        }
    }

    /**
     * Initialize experience bar UI
     */
    initExperienceBar() {
        try {
            // Check if PlayerProgression exists
            if (window.PlayerProgression && window.PlayerProgression.ExperienceBar) {
                // Create experience bar UI
                this.experienceBar = new window.PlayerProgression.ExperienceBar(this.myPlayer, {
                    containerId: 'gamePanel',
                    width: '60%',
                    height: '18px',
                    fontSize: '12px'
                });
                
                // Make the experience bar globally available
                window.experienceBar = this.experienceBar;
                
                console.log("Experience bar initialized successfully");
            } else {
                console.error("PlayerProgression.ExperienceBar not found");
            }
        } catch (error) {
            console.error("Error initializing experience bar:", error);
        }
    }
    
    /**
     * Add experience to the player
     * @param {number} amount - Amount of experience to add
     * @returns {boolean} - Whether the player leveled up
     */
    addExperience(amount) {
        if (!this.myPlayer) return false;
        
        // If we have the experience bar, use it
        if (this.experienceBar) {
            return this.experienceBar.addExperience(amount);
        } 
        // Otherwise update the player's experience directly
        else {
            const oldExp = this.myPlayer.experience || 0;
            const oldLevel = window.PlayerProgression ? 
                window.PlayerProgression.calculateLevelFromExperience(oldExp) : 1;
            
            this.myPlayer.experience = oldExp + amount;
            
            // Calculate new level
            const newLevel = window.PlayerProgression ? 
                window.PlayerProgression.calculateLevelFromExperience(this.myPlayer.experience) : 1;
            
            return newLevel > oldLevel;
        }
    }

    /**
     * Initialize all game managers
     */
    initManagers() {
        try {
            // Create managers
            if (window.OreManager) {
                try {
                    this.oreManager = new window.OreManager(this);
                    if (this.oreManager && typeof this.oreManager.init === 'function') {
                        this.oreManager = this.oreManager.init();
                    }
                    
                    // Verify oreManager has necessary methods
                    if (!this.oreManager || typeof this.oreManager.update !== 'function') {
                        console.error("OreManager missing required methods");
                        // Create a fallback update method if missing
                        if (this.oreManager && typeof this.oreManager.update !== 'function') {
                            this.oreManager.update = function(deltaTime) {
                                console.log("Using fallback OreManager update method");
                            };
                        }
                    }
                } catch (err) {
                    console.error("Error initializing OreManager:", err);
                }
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
                // Only initialize once if not already done
                if (!this.equipmentManager) {
                    this.equipmentManager = new EquipmentManager(this);
                    this.equipmentUI = new EquipmentUI(this.equipmentManager);
                    this.equipmentManager.setUI(this.equipmentUI);
                    
                    // No need to auto-open equipment UI on start
                    // this.equipmentUI.show();
                }
            } catch (error) {
                console.error("Error initializing equipment system:", error);
                // Fallback to window objects if available
                if (!this.equipmentManager && window.EquipmentManager && window.EquipmentUI) {
                    this.equipmentManager = new window.EquipmentManager(this);
                    this.equipmentUI = new window.EquipmentUI(this.equipmentManager);
                    this.equipmentManager.setUI(this.equipmentUI);
                } else {
                    console.error("EquipmentManager or EquipmentUI not found");
                }
            }
            
            // Initialize SkillsManager
            if (!this.skillsManager && window.SkillsManager) {
                this.skillsManager = new window.SkillsManager(this.myPlayer);
                window.skillsManager = this.skillsManager;
            }
            
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

            // Initialize tree system
            if (window.TreeSystem) {
                this.treeSystem = new window.TreeSystem(this);
                this.treeSystem.init();
            } else {
                console.warn("TreeSystem not available, trees will not be visible");
            }
            
            // Update ore manager initially
            if (this.oreManager) {
                this.oreManager.update(0);
            }
            
            // Make tree system globally available
            if (this.treeSystem) {
                window.treeSystem = this.treeSystem;
            }
            
            // Add debug console command to spawn trees
            window.spawnTree = (type, count = 1) => {
                if (!this.treeSystem) {
                    console.error("Tree system not available");
                    return;
                }
                
                const validTypes = ['oak', 'birch', 'pine', 'jungle'];
                const treeType = validTypes.includes(type) ? type : validTypes[Math.floor(Math.random() * validTypes.length)];
                
                console.log(`Spawning ${count} ${treeType} trees near player`);
                
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 50 + Math.random() * 150;
                    const x = this.myPlayer.x + Math.cos(angle) * distance;
                    const y = this.myPlayer.y + Math.sin(angle) * distance;
                    
                    this.treeSystem.createTree(treeType, x, y);
                }
                
                return `Spawned ${count} ${treeType} trees`;
            };

            // Add test command to check tree system status
            window.checkTrees = () => {
                console.log({
                    treeSystemExists: !!this.treeSystem,
                    treeManagerExists: this.treeSystem ? !!this.treeSystem.treeManager : false,
                    treesCount: this.treeSystem && this.treeSystem.treeManager ? this.treeSystem.treeManager.trees.length : 0,
                    treeTypes: window.Trees ? Object.keys(window.Trees) : [],
                    treeClasses: {
                        Tree: !!window.Tree,
                        OakTree: !!window.OakTree,
                        BirchTree: !!window.BirchTree,
                        PineTree: !!window.PineTree,
                        JungleTree: !!window.JungleTree
                    }
                });
                
                // Force spawn a tree for testing
                if (this.treeSystem && this.treeSystem.treeManager) {
                    const x = this.myPlayer.x;
                    const y = this.myPlayer.y + 50;
                    const tree = this.treeSystem.createTree('oak', x, y);
                    console.log("Test tree created:", tree);
                    return "Test tree created in front of player";
                } else {
                    return "Tree system not properly initialized";
                }
            };

            // Add diagnostic function to check system status
            window.diagnoseGameSystems = () => {
                console.group("Game Systems Diagnostic");
                
                // Check Tree System
                console.group("Tree System");
                console.log("TreeSystem global:", !!window.TreeSystem);
                console.log("TreeSystem instance:", !!this.treeSystem);
                console.log("TreeManager instance:", this.treeSystem ? !!this.treeSystem.treeManager : false);
                console.log("Tree classes:", {
                    Tree: !!window.Tree,
                    OakTree: !!window.OakTree,
                    BirchTree: !!window.BirchTree,
                    PineTree: !!window.PineTree,
                    JungleTree: !!window.JungleTree
                });
                if (this.treeSystem && this.treeSystem.treeManager) {
                    console.log("Trees count:", this.treeSystem.treeManager.trees.length);
                    console.log("Trees:", this.treeSystem.treeManager.trees);
                }
                console.groupEnd();
                
                // Check Ore System
                console.group("Ore System");
                console.log("OreManager global:", !!window.OreManager);
                console.log("OreManager instance:", !!this.oreManager);
                console.log("Ores global array:", !!window.ores);
                if (this.oreManager) {
                    const methods = {
                        getOres: typeof this.oreManager.getOres === 'function',
                        update: typeof this.oreManager.update === 'function',
                        drawOres: typeof this.oreManager.drawOres === 'function'
                    };
                    console.log("OreManager methods:", methods);
                    
                    if (methods.getOres) {
                        const ores = this.oreManager.getOres();
                        console.log("Ores count:", ores ? ores.length : 0);
                    }
                }
                console.groupEnd();
                
                console.groupEnd();
                
                return "Diagnostic complete - check console for results";
            };
        } catch (error) {
            console.error("Error initializing managers:", error);
        }
    }

    /**
     * Initialize attack system
     */
    initAttackSystem() {
        try {
            // Set up available attacks
            if (window.Attacks) {
                this.availableAttacks = {
                    fist: new window.Attacks.FistAttack(this.myPlayer, this.ctx),
                    pickaxe: null,  // Start with no pickaxe
                    axe: null       // Start with no axe
                };
                
                // Only fists available at start
                this.currentAttack = this.availableAttacks.fist;
                
                // Track currently selected weapon for UI and switching
                this.selectedWeapon = 'fist';
                
                // Show initial weapon selection message
                if (this.chatManager) {
                    this.chatManager.addMessage({
                        type: 'system',
                        message: `Using your fists to start. Find tools to mine and chop more efficiently!`
                    });
                }
            } else {
                console.error("Attacks not found");
            }
        } catch (error) {
            console.error("Error initializing attack system:", error);
        }
    }
    
    /**
     * Switch to a different weapon
     * @param {string} weaponType - Type of weapon to switch to ('fist', 'pickaxe', 'axe')
     */
    switchWeapon(weaponType) {
        // Check if weapon type exists
        if (!this.availableAttacks || !(weaponType in this.availableAttacks)) {
            console.error(`Weapon type '${weaponType}' not defined`);
            return;
        }
        
        // Check if player has the weapon
        if (weaponType !== 'fist' && !this.availableAttacks[weaponType]) {
            // If trying to switch to a weapon that hasn't been found yet
            if (this.chatManager) {
                this.chatManager.addMessage({
                    type: 'system',
                    message: `You don't have a ${weaponType} yet! Find one first.`
                });
            }
            return;
        }
        
        this.currentAttack = this.availableAttacks[weaponType];
        this.selectedWeapon = weaponType;
        
        // Show weapon switch message
        if (this.chatManager) {
            const weaponNames = {
                'fist': 'Fists',
                'pickaxe': 'Pickaxe',
                'axe': 'Axe'
            };
            
            this.chatManager.addMessage({
                type: 'system',
                message: `Switched to ${weaponNames[weaponType]}`
            });
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
        
        // Generate initial trees
        if (this.treeSystem) {
            console.log("Manually triggering initial tree generation");
            // Force tree generation close to player
            const initialTreeCount = 15;
            for (let i = 0; i < initialTreeCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 100 + Math.random() * 300; // 100-400 units from player
                const x = this.myPlayer.x + Math.cos(angle) * distance;
                const y = this.myPlayer.y + Math.sin(angle) * distance;
                const treeType = ['oak', 'birch', 'pine', 'jungle'][Math.floor(Math.random() * 4)];
                
                // Create tree
                this.treeSystem.createTree(treeType, x, y);
            }
            console.log(`Manually generated ${initialTreeCount} trees around player`);
        }
        
        // Setup experience orb style toggle in settings
        if (this.experienceOrbManager) {
            // Add setting to toggle between modern and classic experience orb visuals
            if (window.settings && typeof window.settings.addSetting === 'function') {
                window.settings.addSetting({
                    id: 'expOrbStyle',
                    name: 'Experience Orb Style',
                    type: 'select',
                    options: [
                        { value: 'modern', label: 'Modern' },
                        { value: 'classic', label: 'Classic' }
                    ],
                    defaultValue: 'modern',
                    onChange: (value) => {
                        this.experienceOrbManager.setVisualStyle(value);
                    }
                });
                
                // Add setting to toggle fuzzy particles
                window.settings.addSetting({
                    id: 'expOrbParticles',
                    name: 'Experience Orb Particles',
                    type: 'checkbox',
                    defaultValue: true,
                    onChange: (value) => {
                        // Toggle fuzzy particles if the manager has the method
                        if (this.experienceOrbManager.setFuzzyParticlesEnabled) {
                            this.experienceOrbManager.setFuzzyParticlesEnabled(value);
                        }
                        
                        // Also update the config if using the other implementation
                        if (window.ExperienceOrbs && window.ExperienceOrbs.XP_ORB_CONFIG) {
                            window.ExperienceOrbs.XP_ORB_CONFIG.fuzzyParticlesEnabled = value;
                        }
                    }
                });
            }
            
            // Add console command for debugging
            if (window.consoleCommands) {
                window.consoleCommands.register('expOrbStyle', (style) => {
                    if (!style || (style !== 'modern' && style !== 'classic')) {
                        console.log('Usage: expOrbStyle [modern|classic]');
                        return;
                    }
                    this.experienceOrbManager.setVisualStyle(style);
                    return `Experience orb visual style set to: ${style}`;
                }, 'Toggle experience orb visual style (modern/classic)');
                
                // Add command to toggle fuzzy particles
                window.consoleCommands.register('expOrbParticles', (enabled) => {
                    const boolValue = enabled === 'true' || enabled === '1' || enabled === 'on';
                    
                    // Toggle in the manager if method exists
                    if (this.experienceOrbManager.setFuzzyParticlesEnabled) {
                        this.experienceOrbManager.setFuzzyParticlesEnabled(boolValue);
                    }
                    
                    // Also update the config if using the other implementation
                    if (window.ExperienceOrbs && window.ExperienceOrbs.XP_ORB_CONFIG) {
                        window.ExperienceOrbs.XP_ORB_CONFIG.fuzzyParticlesEnabled = boolValue;
                    }
                    
                    return `Experience orb particles ${boolValue ? 'enabled' : 'disabled'}`;
                }, 'Toggle experience orb fuzzy particles (on/off)');
            }
        }
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
     * Handle socket event: world update
     * @param {Object} data - World update data
     */
    handleWorldUpdate(data) {
        // Update player data if available
        if (data.players && data.players[this.username]) {
            const serverPlayerData = data.players[this.username];
            
            // Update player properties
            if (serverPlayerData.hp !== undefined) {
                this.myPlayer.health = serverPlayerData.hp;
                this.myPlayer.hp = serverPlayerData.hp;
            }
            
            if (serverPlayerData.maxhp !== undefined) {
                this.myPlayer.maxHealth = serverPlayerData.maxhp;
                this.myPlayer.maxhp = serverPlayerData.maxhp;
            }
            
            // Update other players
            this.players = data.players;
            
            // Update UI
            this.updateStatsDisplay();
        }
    }

    /**
     * Enable movement controls
     */
    enableMovementControls() {
        this.controlsEnabled = true;
    }

    /**
     * Disable movement controls
     */
    disableMovementControls() {
        this.controlsEnabled = false;
        // Reset key states
        this.keys = { w: false, a: false, s: false, d: false };
        this.updateVelocity();
    }

    /**
     * Handle keydown event
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        
        // Only process input if chat is not focused
        if (this.isChatFocused || !this.controlsEnabled) return;
        
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
        if (key === '1' && this.availableAttacks && this.availableAttacks.fist) {
            this.switchWeapon('fist');
        }
        
        if (key === '2' && this.availableAttacks && this.availableAttacks.pickaxe) {
            this.switchWeapon('pickaxe');
        }
        
        if (key === '3' && this.availableAttacks && this.availableAttacks.axe) {
            this.switchWeapon('axe');
        }
        
        // Toggle equipment panel with 'E' key
        if (key === 'e') {
            if (window.equipmentManager) {
                window.equipmentManager.toggleEquipmentPanel();
            }
            this.canvas.focus();
        }
        
        // Toggle inventory with 'i' key
        if (key === 'i') {
            if (this.inventoryUI) {
                this.inventoryUI.toggle();
            } else if (this.inventoryManager && this.inventoryManager.ui) {
                this.inventoryManager.ui.toggle();
                console.log("Toggling inventory UI");
            } else if (window.playerInventoryUI) {
                window.playerInventoryUI.toggle();
                console.log("Toggling global playerInventoryUI");
            } else {
                console.error("No inventory UI found to toggle");
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
        
        // If controls are disabled, don't respond to key up events
        if (!this.controlsEnabled) return;
        
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
        
        // Update tree system
        if (this.treeSystem) {
            this.treeSystem.update(this.deltaTime);
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
                // Determine the weapon name based on the current attack
                let weaponName = 'weapon';
                if (this.currentAttack === this.availableAttacks.fist) {
                    weaponName = 'fists';
                } else if (this.currentAttack === this.availableAttacks.pickaxe) {
                    weaponName = 'pickaxe';
                } else if (this.currentAttack === this.availableAttacks.axe) {
                    weaponName = 'axe';
                }
                
                this.chatManager.addMessage({
                    type: 'system',
                    message: `${this.username} swings their ${weaponName}!`
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
                // Determine the weapon name based on the current attack
                let weaponName = 'weapon';
                if (this.currentAttack === this.availableAttacks.fist) {
                    weaponName = 'fists';
                } else if (this.currentAttack === this.availableAttacks.pickaxe) {
                    weaponName = 'pickaxe';
                } else if (this.currentAttack === this.availableAttacks.axe) {
                    weaponName = 'axe';
                }
                
                this.chatManager.addMessage({
                    type: 'system',
                    message: `${this.username} swings their ${weaponName}!`
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
        
        // Update experience bar if it exists
        if (this.experienceBar) {
            this.experienceBar.update();
        }
        
        // Send updates to server at fixed intervals
        this.serverUpdateInterval += deltaTime;
        if (moved && this.serverUpdateInterval >= this.SERVER_UPDATE_RATE) {
            this.updateServerPosition();
            this.serverUpdateInterval = 0;
        }
        
        // Update tree system
        if (this.treeSystem) {
            this.treeSystem.update(deltaTime);
        }
        
        // Update debug info periodically
        if (this.debug && timestamp % 500 < 16) {
            this.updateDebugInfo();
        }
        
        // Render the game
        this.render();
        
        // Continue the game loop
        if (this.running) {
            requestAnimationFrame(this.gameLoop);
        }
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
            
            // Check for collisions with both ores and trees
            const PLAYER_COLLISION_RADIUS = 10;
            const hasOreCollision = this.checkOreCollisions(newX, newY);
            const hasTreeCollision = this.checkTreeCollisions(newX, newY);
            
            if (!hasOreCollision && !hasTreeCollision) {
                // No collision, update position
                this.myPlayer.x = newX;
                this.myPlayer.y = newY;
            } else {
                // Try moving only in X direction
                const hasXOreCollision = this.checkOreCollisions(newX, oldY);
                const hasXTreeCollision = this.checkTreeCollisions(newX, oldY);
                
                if (!hasXOreCollision && !hasXTreeCollision) {
                    this.myPlayer.x = newX;
                }
                // Try moving only in Y direction
                else {
                    const hasYOreCollision = this.checkOreCollisions(oldX, newY);
                    const hasYTreeCollision = this.checkTreeCollisions(oldX, newY);
                    
                    if (!hasYOreCollision && !hasYTreeCollision) {
                        this.myPlayer.y = newY;
                    }
                    // If both directions cause collisions, check if we need to push the player
                    else if (hasOreCollision) {
                        const newPosition = this.oreManager.handlePlayerCollision(oldX, oldY, PLAYER_COLLISION_RADIUS);
                        if (newPosition) {
                            this.myPlayer.x = newPosition.x;
                            this.myPlayer.y = newPosition.y;
                        }
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
        return this.oreManager && this.oreManager.checkCollision(playerX, playerY, PLAYER_COLLISION_RADIUS);
    }
    
    /**
     * Check for collisions with trees
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @returns {boolean} - Whether collision occurred
     */
    checkTreeCollisions(playerX, playerY) {
        if (!this.treeSystem) return false;
        
        const PLAYER_COLLISION_RADIUS = 15;
        const nearbyTrees = this.treeSystem.getTreesInRadius(playerX, playerY, PLAYER_COLLISION_RADIUS + 30);
        
        for (const tree of nearbyTrees) {
            if (tree.chopped) continue;
            
            // Check if player is colliding with tree trunk (simpler collision check)
            if (playerX + PLAYER_COLLISION_RADIUS > tree.x - tree.trunkWidth/2 &&
                playerX - PLAYER_COLLISION_RADIUS < tree.x + tree.trunkWidth/2 &&
                playerY + PLAYER_COLLISION_RADIUS > tree.y &&
                playerY - PLAYER_COLLISION_RADIUS < tree.y + tree.trunkHeight) {
                return true;
            }
        }
        
        return false;
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
        this.updateHitRocksEffect(deltaTime);
        
        // Update rock particles
        this.updateRockParticles();
    }

    /**
     * Update hit rocks visual effect
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateHitRocksEffect(deltaTime) {
        // Make sure hitRocks is initialized
        if (!window.hitRocks) {
            window.hitRocks = new Set();
            window.rockHitTimes = new Map();
            window.rockHitDuration = 500; // ms
            return;
        }
        
        const currentTime = Date.now();
        
        // Check each hit rock
        for (const rock of window.hitRocks) {
            // If the rock doesn't have a hit time or is no longer valid, remove it
            if (!window.rockHitTimes.has(rock) || !rock) {
                window.hitRocks.delete(rock);
                continue;
            }
            
            // Get hit time and check if effect duration has elapsed
            const hitTime = window.rockHitTimes.get(rock);
            if (currentTime - hitTime > window.rockHitDuration) {
                window.hitRocks.delete(rock);
                window.rockHitTimes.delete(rock);
            }
        }
    }

    /**
     * Draw hit effect for rocks/ores
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} rock - Rock object
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {number} progress - Effect progress (0-1)
     */
    drawRockHitEffect(ctx, rock, screenX, screenY, progress) {
        // Outer glow
        const radius = rock.radius || 20;
        const glowRadius = radius * (1.2 + progress * 0.3);
        const gradient = ctx.createRadialGradient(
            screenX, screenY, radius,
            screenX, screenY, glowRadius
        );
        
        // White flash that fades to rock color
        gradient.addColorStop(0, `rgba(255, 255, 255, ${0.7 * (1 - progress)})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Create cracks/fracture lines
        if (progress < 0.5) {
            const crackCount = 4;
            const maxLength = radius * 1.5;
            const fadeAlpha = 0.8 * (1 - progress * 2); // Fade out cracks
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${fadeAlpha})`;
            ctx.lineWidth = 2;
            
            for (let i = 0; i < crackCount; i++) {
                const angle = (Math.PI * 2 * i / crackCount) + 
                            (rock.id % 100) / 100 * Math.PI; // Randomize based on rock ID
                
                const length = maxLength * (0.7 + 0.3 * Math.sin(rock.id + i));
                
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(
                    screenX + Math.cos(angle) * length,
                    screenY + Math.sin(angle) * length
                );
                ctx.stroke();
            }
        }
    }

    /**
     * Draw hit effect for trees
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} tree - Tree object
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {number} progress - Effect progress (0-1)
     */
    drawTreeHitEffect(ctx, tree, screenX, screenY, progress) {
        // Get tree dimensions - try to read from the object, or use defaults
        const trunkWidth = tree.trunkWidth || 20;
        const trunkHeight = tree.trunkHeight || 60;
        const leavesRadius = tree.leavesRadius || 40;
        
        // Determine hit point (approximately middle of the trunk)
        const hitX = screenX;
        const hitY = screenY + (trunkHeight / 4);
        
        // Draw hit flash
        const intensity = 1 - progress;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * intensity})`;
        
        // Flash ellipse around trunk
        ctx.beginPath();
        ctx.ellipse(
            hitX, 
            hitY,
            trunkWidth * (1 + intensity * 0.5),
            trunkHeight * 0.4 * (1 + intensity * 0.5),
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Add wood chip particles
        if (progress < 0.3) {
            const chipCount = 3;
            const chipSize = 3;
            const maxDistance = trunkWidth * (progress * 3 + 1);
            
            ctx.fillStyle = tree.trunkColor || '#8B4513';
            
            for (let i = 0; i < chipCount; i++) {
                const angle = Math.PI * 0.75 + (Math.PI * 0.5 * i / chipCount) - (Math.PI * 0.25);
                const distance = maxDistance * (0.5 + Math.random() * 0.5);
                
                ctx.beginPath();
                ctx.arc(
                    hitX + Math.cos(angle) * distance,
                    hitY + Math.sin(angle) * distance,
                    chipSize * (1 - progress),
                    0, Math.PI * 2
                );
                ctx.fill();
            }
        }
        
        // Draw cracks in trunk
        if (progress < 0.7) {
            const fadeAlpha = 0.7 * (1 - progress / 0.7);
            ctx.strokeStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
            ctx.lineWidth = 2;
            
            // One main crack
            ctx.beginPath();
            ctx.moveTo(hitX, hitY);
            ctx.lineTo(
                hitX + (tree.id % 2 ? 1 : -1) * trunkWidth * 0.4,
                hitY + trunkHeight * 0.3
            );
            ctx.stroke();
            
            // Optional secondary cracks
            if (tree.health && tree.maxHealth && tree.health < tree.maxHealth * 0.7) {
                ctx.beginPath();
                ctx.moveTo(hitX, hitY);
                ctx.lineTo(
                    hitX + (tree.id % 2 ? -1 : 1) * trunkWidth * 0.3,
                    hitY + trunkHeight * 0.2
                );
                ctx.stroke();
            }
        }
    }

    drawRockHealthBar(ctx, rock, x, y) {
        // Only draw if rock has health
        if (!rock.health || !rock.maxHealth) return;
        
        // If rock is at full health, don't show the bar
        if (rock.health >= rock.maxHealth && !window.hitRocks.has(rock)) return;
        
        // Health bar dimensions
        const barWidth = rock.radius * 2;
        const barHeight = 6;
        const barY = y - rock.radius - 15;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - barWidth/2, barY, barWidth, barHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - barWidth/2, barY, barWidth, barHeight);
        
        // Calculate health percentage
        const healthPercent = rock.health / rock.maxHealth;
        
        // Choose color based on health percentage
        let barColor;
        if (healthPercent > 0.6) {
            barColor = 'rgba(0, 255, 0, 0.8)'; // Green
        } else if (healthPercent > 0.3) {
            barColor = 'rgba(255, 255, 0, 0.8)'; // Yellow
        } else {
            barColor = 'rgba(255, 0, 0, 0.8)'; // Red
        }
        
        // Fill health bar
        ctx.fillStyle = barColor;
        ctx.fillRect(
            x - barWidth/2, 
            barY, 
            barWidth * healthPercent, 
            barHeight
        );
        
        // Highlight on top of health bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(
            x - barWidth/2, 
            barY, 
            barWidth * healthPercent, 
            barHeight/2
        );
    }

    /**
     * Render all game elements
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render ground
        this.renderGround();
        
        // Render rock hit effects
        this.renderHitRocks();
        
        // Draw ores
        if (this.oreManager && this.oreManager.drawOres) {
            this.oreManager.drawOres(this.ctx, this.cameraX, this.cameraY);
        }
        
        // Draw trees
        if (this.treeSystem) {
            this.treeSystem.draw(this.ctx, this.cameraX, this.cameraY);
        }
        
        // Render particles
        this.renderParticles();
        
        // Render floating text particles (like damage numbers)
        this.renderTextParticles();
        
        // Draw experience orbs
        if (window.expOrbManager && window.expOrbManager.draw) {
            window.expOrbManager.draw(this.ctx, this.cameraX, this.cameraY);
        }
        
        // Render players
        this.renderPlayers();
        
        // Render attack effect
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
    renderGround() {
        // Base implementation - would be moved to Renderer.js
        // ... floor rendering code ...
    }

    /**
     * Render all particles
     */
    renderParticles() {
        if (!window.rockParticles || window.rockParticles.length === 0) return;
        
        // Get context for rendering
        const ctx = this.ctx;
        
        // Render each particle
        for (const particle of window.rockParticles) {
            // Skip invalid particles
            if (!particle || particle.opacity <= 0) continue;
            
            // Convert to screen coordinates
            const screenX = particle.x - Math.floor(this.cameraX);
            const screenY = particle.y - Math.floor(this.cameraY);
            
            // Skip if offscreen
            if (screenX < -20 || screenX > this.canvas.width + 20 || 
                screenY < -20 || screenY > this.canvas.height + 20) {
                continue;
            }
            
            // Set opacity
            ctx.globalAlpha = particle.opacity;
            
            // Draw particle
            ctx.fillStyle = particle.color || '#A9A9A9';
            ctx.beginPath();
            ctx.arc(screenX, screenY, particle.size || 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Reset opacity
        ctx.globalAlpha = 1;
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
        // Get screen coordinates
        const screenX = x - Math.floor(this.cameraX);
        const screenY = y - Math.floor(this.cameraY);
        
        // Get context for rendering
        const ctx = this.ctx;
        
        // Check if the player is visible on screen (with margin)
        if (screenX < -50 || screenX > this.canvas.width + 50 || 
            screenY < -50 || screenY > this.canvas.height + 50) {
            return;
        }
        
        // Determine player radius (current player slightly bigger)
        const radius = isCurrentPlayer ? 15 : 12;
        
        // Determine if player is attacking
        const isAttacking = isCurrentPlayer && this.currentAttack && this.currentAttack.isActive;
        
        // Save current context state
        ctx.save();
        
        // Draw player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + radius * 0.8, radius * 0.8, radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player body
        ctx.fillStyle = color || '#3498db';
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight to create 3D effect
        const gradient = ctx.createRadialGradient(
            screenX - radius * 0.3, screenY - radius * 0.3, 0,
            screenX, screenY, radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player border
        ctx.strokeStyle = isCurrentPlayer ? '#2980b9' : '#2c3e50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // If attacking, draw attack indicator (a small triangle in attack direction)
        if (isAttacking) {
            const attackDirection = this.currentAttack.direction;
            const indicatorDistance = radius + 5;
            
            const indicatorX = screenX + Math.cos(attackDirection) * indicatorDistance;
            const indicatorY = screenY + Math.sin(attackDirection) * indicatorDistance;
            
            // Draw attack direction indicator
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.moveTo(
                indicatorX + Math.cos(attackDirection) * 8,
                indicatorY + Math.sin(attackDirection) * 8
            );
            ctx.lineTo(
                indicatorX + Math.cos(attackDirection + Math.PI * 0.8) * 5,
                indicatorY + Math.sin(attackDirection + Math.PI * 0.8) * 5
            );
            ctx.lineTo(
                indicatorX + Math.cos(attackDirection - Math.PI * 0.8) * 5,
                indicatorY + Math.sin(attackDirection - Math.PI * 0.8) * 5
            );
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw player name
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Add shadow to make text readable
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Draw name above player
        ctx.fillText(name, screenX, screenY - radius - 5);
        
        // If player has a title, draw it below the name
        if (title) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#f1c40f'; // Gold color
            ctx.fillText(title, screenX, screenY - radius - 20);
        }
        
        // If player has a level, draw it
        if (level) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#2ecc71'; // Green color
            ctx.fillText(`Lv.${level}`, screenX, screenY - radius - 35);
        }
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Restore context state
        ctx.restore();
    }

    /**
     * Render attack effect
     */
    renderAttackEffect() {
        if (this.currentAttack) {
            this.currentAttack.draw(this.cameraX, this.cameraY);
        }
    }

    // Method to preload common sound effects
    preloadSounds() {
        // Only preload if audio is enabled
        if (!window.audioEnabled) return;
        
        // Sound paths
        const soundPaths = [
            'sounds/hit.mp3',
            'sounds/hit2.mp3',
            'sounds/collect.mp3',
            'sounds/levelup.mp3'
        ];
        
        // Create a sounds cache if it doesn't exist
        window.soundsCache = window.soundsCache || {};
        
        // Preload each sound
        soundPaths.forEach(path => {
            try {
                const audio = new Audio(path);
                audio.load(); // Start loading
                window.soundsCache[path] = audio;
            } catch (e) {
                console.error(`Failed to preload sound: ${path}`, e);
            }
        });
    }

    // Update renderGround method to include grid and grass-like colors
    renderGround() {
        const ctx = this.ctx;
        const cameraX = this.cameraX;
        const cameraY = this.cameraY;
        
        // Calculate visible tiles based on camera position
        const startTileX = Math.floor(cameraX / this.groundTileSize);
        const startTileY = Math.floor(cameraY / this.groundTileSize);
        const endTileX = startTileX + Math.ceil(this.canvas.width / this.groundTileSize) + 1;
        const endTileY = startTileY + Math.ceil(this.canvas.height / this.groundTileSize) + 1;
        
        // Fill background with base green color
        ctx.fillStyle = '#3a5e3a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // For each visible tile
        for (let tileY = startTileY; tileY < endTileY; tileY++) {
            for (let tileX = startTileX; tileX < endTileX; tileX++) {
                // Get screen coordinates for this tile
                const screenX = tileX * this.groundTileSize - Math.floor(cameraX);
                const screenY = tileY * this.groundTileSize - Math.floor(cameraY);
                
                // Use a deterministic but seemingly random color based on position
                const colorIndex = Math.abs((tileX * 31 + tileY * 17) % this.groundColors.length);
                const tileColor = this.groundColors[colorIndex];
                
                // Draw the grass tile
                ctx.fillStyle = tileColor;
                ctx.fillRect(screenX, screenY, this.groundTileSize, this.groundTileSize);
                
                // Draw the grid lines
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX, screenY, this.groundTileSize, this.groundTileSize);
                
                // Add some random grass detail (dots)
                const grassDetailCount = (tileX * tileY) % 5 + 2; // 2-6 details per tile
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                
                for (let i = 0; i < grassDetailCount; i++) {
                    // Use deterministic positions based on tile coordinates
                    const detailX = screenX + ((tileX * 31 + i * 7) % this.groundTileSize);
                    const detailY = screenY + ((tileY * 17 + i * 13) % this.groundTileSize);
                    const detailSize = (((tileX + tileY) * i) % 3) + 1; // 1-3 pixel size
                    
                    ctx.beginPath();
                    ctx.arc(detailX, detailY, detailSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    initWorld() {
        // Define a simple default World class if worldClass isn't defined
        if (!this.worldClass) {
            // Simple default world class
            class DefaultWorld {
                constructor(width, height) {
                    this.width = width;
                    this.height = height;
                    this.chunks = new Map();
                    console.log("Created default world:", width, height);
                }
                
                getChunk(x, y) {
                    const key = `${x},${y}`;
                    if (!this.chunks.has(key)) {
                        this.chunks.set(key, {
                            x, y,
                            tiles: []
                        });
                    }
                    return this.chunks.get(key);
                }
            }
            
            this.worldClass = DefaultWorld;
            console.log("Using default world class");
        }

        // Initialize the world objects
        this.world = new this.worldClass(this.canvas.width, this.canvas.height);
        
        // Initialize WorldGenerator if defined, otherwise use dummy function
        if (window.WorldGenerator) {
            this.worldGen = new WorldGenerator(this.world);
            this.worldGen.generateInitialChunks();
        } else {
            console.warn("WorldGenerator not found, using default");
            this.worldGen = {
                generateInitialChunks: () => console.log("Default world generator - no chunks created")
            };
        }

        // Setup ground rendering properties
        this.groundTileSize = this.TILE_SIZE;
        this.groundColors = [
            '#7CFC00', // LawnGreen
            '#32CD32', // LimeGreen
            '#228B22', // ForestGreen
            '#006400', // DarkGreen
            '#556B2F'  // DarkOliveGreen
        ];
    }

    /**
     * Render floating text particles like damage numbers
     */
    renderTextParticles() {
        if (!this.textParticles) this.textParticles = [];
        
        const ctx = this.ctx;
        const now = Date.now();
        
        // Render and update each text particle
        for (let i = this.textParticles.length - 1; i >= 0; i--) {
            const particle = this.textParticles[i];
            
            // Skip invalid particles
            if (!particle) {
                this.textParticles.splice(i, 1);
                continue;
            }
            
            // Check if particle has expired
            if (now - particle.created > particle.lifetime) {
                this.textParticles.splice(i, 1);
                continue;
            }
            
            // Calculate opacity based on lifetime
            const age = now - particle.created;
            const lifeProgress = age / particle.lifetime;
            const opacity = particle.opacity * (1 - lifeProgress);
            
            // Calculate screen position
            const screenX = particle.x - Math.floor(this.cameraX);
            const screenY = particle.y - Math.floor(this.cameraY);
            
            // Skip if offscreen
            if (screenX < -50 || screenX > this.canvas.width + 50 || 
                screenY < -50 || screenY > this.canvas.height + 50) {
                continue;
            }
            
            // Update position
            particle.x += particle.vx || 0;
            particle.y += particle.vy || 0;
            
            // Draw text
            ctx.save();
            ctx.font = `bold ${particle.size || 14}px Arial`;
            ctx.fillStyle = `rgba(${particle.color === 'red' ? '255, 0, 0' : '255, 255, 255'}, ${opacity})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Add shadow to make text more visible
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            ctx.fillText(particle.text, screenX, screenY);
            ctx.restore();
        }
    }

    renderHitRocks() {
        // Make sure hitRocks is initialized
        if (!window.hitRocks || !window.rockHitTimes) return;
        
        // Get context for rendering
        const ctx = this.ctx;
        const now = Date.now();
        
        // Check each hit object (rock or tree)
        for (const object of window.hitRocks) {
            // Skip if invalid
            if (!object || !window.rockHitTimes.has(object)) continue;
            
            // Calculate hit effect progress (0 to 1)
            const hitTime = window.rockHitTimes.get(object);
            const progress = Math.min(1, (now - hitTime) / window.rockHitDuration);
            
            // Convert to screen coordinates
            const screenX = object.x - Math.floor(this.cameraX);
            const screenY = object.y - Math.floor(this.cameraY);
            
            // Skip if offscreen
            if (screenX < -50 || screenX > this.canvas.width + 50 || 
                screenY < -50 || screenY > this.canvas.height + 50) {
                continue;
            }
            
            // Save context for this object's effects
            ctx.save();
            
            // Determine if this is a tree or rock based on properties
            const isTree = object.trunkHeight !== undefined || object.leavesColor !== undefined;
            
            if (isTree) {
                // Draw tree hit effect
                this.drawTreeHitEffect(ctx, object, screenX, screenY, progress);
            } else {
                // Draw regular rock/ore hit effect
                this.drawRockHitEffect(ctx, object, screenX, screenY, progress);
            }
            
            // Draw health bar if object has health
            if (object.health !== undefined && object.maxHealth !== undefined) {
                this.drawRockHealthBar(ctx, object, screenX, screenY);
            }
            
            ctx.restore();
        }
    }

    drawRockHealthBar(ctx, rock, x, y) {
        // Only draw if rock has health
        if (!rock.health || !rock.maxHealth) return;
        
        // If rock is at full health, don't show the bar
        if (rock.health >= rock.maxHealth && !window.hitRocks.has(rock)) return;
        
        // Health bar dimensions
        const barWidth = rock.radius * 2;
        const barHeight = 6;
        const barY = y - rock.radius - 15;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - barWidth/2, barY, barWidth, barHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - barWidth/2, barY, barWidth, barHeight);
        
        // Calculate health percentage
        const healthPercent = rock.health / rock.maxHealth;
        
        // Choose color based on health percentage
        let barColor;
        if (healthPercent > 0.6) {
            barColor = 'rgba(0, 255, 0, 0.8)'; // Green
        } else if (healthPercent > 0.3) {
            barColor = 'rgba(255, 255, 0, 0.8)'; // Yellow
        } else {
            barColor = 'rgba(255, 0, 0, 0.8)'; // Red
        }
        
        // Fill health bar
        ctx.fillStyle = barColor;
        ctx.fillRect(
            x - barWidth/2, 
            barY, 
            barWidth * healthPercent, 
            barHeight
        );
        
        // Highlight on top of health bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(
            x - barWidth/2, 
            barY, 
            barWidth * healthPercent, 
            barHeight/2
        );
    }

    /**
     * Update rock particles
     */
    updateRockParticles() {
        // Make sure rockParticles is initialized
        if (!window.rockParticles) {
            window.rockParticles = [];
            return;
        }

        // Update only if we have particles
        if (window.rockParticles.length > 0) {
            const now = Date.now();
            
            // Update each particle and remove expired ones
            for (let i = window.rockParticles.length - 1; i >= 0; i--) {
                const particle = window.rockParticles[i];
                
                // Skip if invalid
                if (!particle) {
                    window.rockParticles.splice(i, 1);
                    continue;
                }
                
                // Check if particle has expired
                if (particle.created && particle.lifetime) {
                    if (now - particle.created > particle.lifetime) {
                        window.rockParticles.splice(i, 1);
                        continue;
                    }
                    
                    // Fade out particles as they get older
                    const age = now - particle.created;
                    const lifeProgress = age / particle.lifetime;
                    
                    // Only fade in last 30% of lifetime
                    if (lifeProgress > 0.7) {
                        particle.opacity = 0.8 * (1 - ((lifeProgress - 0.7) / 0.3));
                    }
                }
                
                // Update particle velocity
                if (particle.vx !== undefined && particle.vy !== undefined) {
                    // Update position based on velocity
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    
                    // Apply gravity
                    particle.vy += 0.05;
                    
                    // Apply drag/friction
                    particle.vx *= 0.98;
                    particle.vy *= 0.98;
                }
            }
        }
    }

    /**
     * Create a player stats display UI
     */
    createStatsDisplay() {
        // Create container for player stats
        const statsContainer = document.createElement('div');
        statsContainer.id = 'statsDisplay';
        statsContainer.style.position = 'absolute';
        statsContainer.style.top = '50px';
        statsContainer.style.left = '10px';
        statsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        statsContainer.style.padding = '10px';
        statsContainer.style.borderRadius = '5px';
        statsContainer.style.color = 'white';
        statsContainer.style.fontSize = '14px';
        statsContainer.style.zIndex = '100';
        statsContainer.style.fontFamily = 'monospace';
        statsContainer.style.border = '1px solid rgb(0, 233, 150)';
        statsContainer.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.3)';
        
        // Add to game panel
        const gamePanel = document.getElementById('gamePanel');
        if (gamePanel) {
            gamePanel.appendChild(statsContainer);
        }
        
        this.statsDisplay = statsContainer;
        this.updateStatsDisplay();
        
        // Update stats display every second
        setInterval(() => this.updateStatsDisplay(), 1000);
    }
    
    /**
     * Update the player stats display
     */
    updateStatsDisplay() {
        if (!this.statsDisplay || !this.myPlayer) return;
        
        // Format CPS value
        const cps = this.availableAttacks?.fist?.clicksPerSecond || 0;
        const cpsBonus = Math.min(0.5, cps * 0.05);
        
        // Ensure experience values are available
        const totalExperience = this.myPlayer.experience || 0;
        
        // Create stats HTML string
        const statsHTML = `
            <div style="text-align: center; margin-bottom: 5px; color: rgb(0, 233, 150);">Player Stats</div>
            <div>Level: ${this.myPlayer.level}</div>
            <div>Health: ${Math.floor(this.myPlayer.health)}/${this.myPlayer.maxHealth}</div>
            <div style="border-bottom: 1px solid #444; padding-bottom: 5px;">
                Total EXP: ${totalExperience}
            </div>
            <div style="color: #ff9966;">STR: ${this.myPlayer.strength}</div>
            <div style="color: #99ccff;">DEF: ${this.myPlayer.defense}</div>
            <div style="color: #99ff99;">DEX: ${this.myPlayer.dexterity}</div>
            <div style="color: #ffff99;">AGI: ${this.myPlayer.agility}</div>
            <div style="color: #cc99ff;">INT: ${this.myPlayer.intelligence}</div>
            <div style="color: #ff99cc;">LUK: ${this.myPlayer.luck}</div>
            <div style="border-top: 1px solid #444; padding-top: 5px;">
                Weapon: ${this.selectedWeapon ? this.selectedWeapon.charAt(0).toUpperCase() + this.selectedWeapon.slice(1) : "None"}
            </div>
            <div>
                Clicks/s: ${cps} <span style="color: #ff9999;">(+${Math.floor(cpsBonus * 100)}% crit)</span>
            </div>
        `;
        
        this.statsDisplay.innerHTML = statsHTML;
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