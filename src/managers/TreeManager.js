/**
 * TreeManager.js
 * 
 * Manages tree entities in the game, handling spawning, rendering,
 * and interactions with trees.
 */
class TreeManager {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        this.trees = [];
        this.lastTreeId = 0;
        
        // Initialize tree types
        this.initTreeTypes();
        
        // Tree spawning properties
        this.maxTrees = 50;
        this.spawnRadius = 800;
        this.minDistanceBetweenTrees = 150;
        this.minDistanceToOtherObjects = 100;
        this.spawnInterval = 60000; // Spawn trees every minute
        this.lastSpawnTime = 0;
        
        // Chance weightings for different tree types
        this.typeWeights = {
            oak: 40,
            birch: 30,
            pine: 20,
            jungle: 10
        };
        
        console.log("TreeManager initialized");
    }
    
    /**
     * Initialize tree types
     */
    initTreeTypes() {
        // Check if tree types are already defined globally
        if (window.Trees) {
            this.treeTypes = window.Trees;
        } 
        // Define tree types if Tree classes are available
        else if (window.OakTree && window.BirchTree && window.PineTree && window.JungleTree) {
            this.treeTypes = {
                oak: (x, y) => new window.OakTree(x, y),
                birch: (x, y) => new window.BirchTree(x, y),
                pine: (x, y) => new window.PineTree(x, y),
                jungle: (x, y) => new window.JungleTree(x, y)
            };
            
            // Make tree types available globally
            window.Trees = this.treeTypes;
        }
        // Fallback if no tree classes are found
        else {
            console.error("Tree classes not found, trees will not spawn");
            this.treeTypes = {};
        }
    }
    
    /**
     * Initialize the manager
     */
    init() {
        // Generate initial trees
        this.generateInitialTrees();
        
        // Start spawning loop
        this.startSpawning();
        
        return this;
    }
    
    /**
     * Generate initial trees in the world
     */
    generateInitialTrees() {
        const initialCount = 20; // Initial tree count
        const playerX = this.game.myPlayer ? this.game.myPlayer.x : 0;
        const playerY = this.game.myPlayer ? this.game.myPlayer.y : 0;
        
        console.log(`Generating ${initialCount} initial trees around player at (${playerX}, ${playerY})`);
        
        // Generate trees randomly distributed around the player
        for (let i = 0; i < initialCount; i++) {
            // Try multiple positions to find a valid spawn point
            for (let attempt = 0; attempt < 10; attempt++) {
                const distance = Math.random() * this.spawnRadius * 0.8;
                const angle = Math.random() * Math.PI * 2;
                const x = playerX + Math.cos(angle) * distance;
                const y = playerY + Math.sin(angle) * distance;
                
                if (this.isValidSpawnPosition(x, y)) {
                    this.createRandomTree(x, y);
                    break; // Success! Break the attempt loop
                }
            }
        }
        
        console.log(`Generated ${this.trees.length} initial trees`);
    }
    
    /**
     * Start the tree spawning loop
     */
    startSpawning() {
        // Initialize the spawn timer
        this.lastSpawnTime = Date.now();
    }
    
    /**
     * Update all trees
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update existing trees
        for (let i = this.trees.length - 1; i >= 0; i--) {
            const tree = this.trees[i];
            tree.update(deltaTime);
        }
        
        // Check if it's time to spawn new trees
        const now = Date.now();
        if (now - this.lastSpawnTime > this.spawnInterval) {
            this.spawnNewTrees();
            this.lastSpawnTime = now;
        }
        
        // Check if we need to generate more trees around the player
        this.ensureTreesAroundPlayer();
    }
    
    /**
     * Ensure there are enough trees around the player
     */
    ensureTreesAroundPlayer() {
        if (!this.game.myPlayer) return;
        
        const playerX = this.game.myPlayer.x;
        const playerY = this.game.myPlayer.y;
        
        // Count trees within view distance
        const viewRadius = 1000;
        const treesInView = this.getTreesInRadius(playerX, playerY, viewRadius);
        
        // If fewer than 15 trees in view, generate more
        if (treesInView.length < 15 && this.trees.length < this.maxTrees) {
            const treesToGenerate = Math.min(5, this.maxTrees - this.trees.length);
            
            for (let i = 0; i < treesToGenerate; i++) {
                // Generate trees at the edge of the view
                const distance = viewRadius * 0.7 + Math.random() * viewRadius * 0.3;
                const angle = Math.random() * Math.PI * 2;
                const x = playerX + Math.cos(angle) * distance;
                const y = playerY + Math.sin(angle) * distance;
                
                if (this.isValidSpawnPosition(x, y)) {
                    this.createRandomTree(x, y);
                }
            }
        }
    }
    
    /**
     * Spawn new trees around the player
     */
    spawnNewTrees() {
        // If we're already at max trees, don't spawn more
        if (this.trees.length >= this.maxTrees) return;
        
        // Get player position
        const playerX = this.game.myPlayer ? this.game.myPlayer.x : 0;
        const playerY = this.game.myPlayer ? this.game.myPlayer.y : 0;
        
        // Try to spawn 1-3 trees
        const spawnCount = 1 + Math.floor(Math.random() * 3);
        let treesSpawned = 0;
        
        for (let i = 0; i < spawnCount; i++) {
            // Try up to 10 positions to find a valid spawn point
            for (let attempt = 0; attempt < 10; attempt++) {
                // Generate a random position around the player
                const distance = 400 + Math.random() * (this.spawnRadius - 400);
                const angle = Math.random() * Math.PI * 2;
                const x = playerX + Math.cos(angle) * distance;
                const y = playerY + Math.sin(angle) * distance;
                
                // Check if position is valid
                if (this.isValidSpawnPosition(x, y)) {
                    this.createRandomTree(x, y);
                    treesSpawned++;
                    break; // Success! Break the attempt loop
                }
            }
        }
        
        if (treesSpawned > 0) {
            console.log(`Spawned ${treesSpawned} new trees around player at (${playerX}, ${playerY})`);
        }
    }
    
    /**
     * Check if a position is valid for spawning a tree
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {boolean} - Whether the position is valid
     */
    isValidSpawnPosition(x, y) {
        // Check distance to other trees
        for (const tree of this.trees) {
            const dx = tree.x - x;
            const dy = tree.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.minDistanceBetweenTrees) {
                return false;
            }
        }
        
        // Check distance to ores/rocks
        if (window.oreManager || window.ores) {
            const ores = window.oreManager ? window.oreManager.getOres() : window.ores;
            if (ores && ores.length) {
                for (const ore of ores) {
                    const dx = ore.x - x;
                    const dy = ore.y - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < this.minDistanceToOtherObjects) {
                        return false;
                    }
                }
            }
        }
        
        // Check distance to player
        if (this.game.myPlayer) {
            const dx = this.game.myPlayer.x - x;
            const dy = this.game.myPlayer.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Don't spawn trees too close to player
            if (distance < 100) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Create a random tree at the specified position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Tree} - The created tree
     */
    createRandomTree(x, y) {
        // Choose a random tree type based on weights
        const treeType = this.chooseTreeType();
        
        // Create the tree
        const treeCreator = this.treeTypes[treeType];
        if (!treeCreator) {
            console.error(`Invalid tree type: ${treeType}`);
            return null;
        }
        
        const tree = treeCreator(x, y);
        tree.id = ++this.lastTreeId;
        this.trees.push(tree);
        
        return tree;
    }
    
    /**
     * Choose a tree type based on weight
     * @returns {string} - The chosen tree type
     */
    chooseTreeType() {
        // Calculate total weight
        let totalWeight = 0;
        for (const type in this.typeWeights) {
            totalWeight += this.typeWeights[type];
        }
        
        // Random value between 0 and total weight
        let random = Math.random() * totalWeight;
        
        // Find the selected type
        for (const type in this.typeWeights) {
            random -= this.typeWeights[type];
            if (random <= 0) {
                return type;
            }
        }
        
        // Fallback to oak
        return 'oak';
    }
    
    /**
     * Create a specific type of tree at the specified position
     * @param {string} type - Tree type (oak, birch, pine, jungle)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Tree} - The created tree
     */
    createTree(type, x, y) {
        const treeCreator = this.treeTypes[type];
        if (!treeCreator) {
            console.error(`Invalid tree type: ${type}`);
            return null;
        }
        
        const tree = treeCreator(x, y);
        tree.id = ++this.lastTreeId;
        this.trees.push(tree);
        
        return tree;
    }
    
    /**
     * Get tree at a specific position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Tree|null} - The tree at the position, or null if none found
     */
    getTreeAt(x, y) {
        for (const tree of this.trees) {
            if (tree.containsPoint(x, y)) {
                return tree;
            }
        }
        
        return null;
    }
    
    /**
     * Get all trees within a radius of a point
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Search radius
     * @returns {Array} - Array of trees within the radius
     */
    getTreesInRadius(x, y, radius) {
        const result = [];
        const radiusSquared = radius * radius;
        
        for (const tree of this.trees) {
            const dx = tree.x - x;
            const dy = tree.y - y;
            const distanceSquared = dx * dx + dy * dy;
            
            if (distanceSquared <= radiusSquared) {
                result.push(tree);
            }
        }
        
        return result;
    }
    
    /**
     * Get all trees
     * @returns {Array} - Array of all trees
     */
    getTrees() {
        return this.trees;
    }
    
    /**
     * Remove a tree from the world
     * @param {Object} tree - The tree to remove
     */
    removeTree(tree) {
        const index = this.trees.findIndex(t => t.id === tree.id);
        if (index !== -1) {
            this.trees.splice(index, 1);
        }
    }
    
    /**
     * Draw all trees
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraX, cameraY) {
        console.log(`Drawing ${this.trees.length} trees`);
        
        if (this.trees.length === 0) {
            console.warn("No trees to draw! Trying to create some now...");
            // Try to generate some trees right away if none exist
            this.generateInitialTrees();
        }
        
        for (const tree of this.trees) {
            if (tree.chopped) continue;
            
            const screenX = Math.floor(tree.x - cameraX);
            const screenY = Math.floor(tree.y - cameraY);
            
            // Only draw if on screen (with larger margin to make sure trees are visible)
            if (screenX < -200 || screenX > ctx.canvas.width + 200 || 
                screenY < -200 || screenY > ctx.canvas.height + 200) {
                continue;
            }
            
            try {
                // Draw tree with standard method if available
                if (typeof tree.draw === 'function') {
                    tree.draw(ctx, screenX, screenY);
                } else {
                    // Fallback rendering if tree.draw is not available
                    this.drawDefaultTree(ctx, tree, screenX, screenY);
                }
            } catch (error) {
                console.error("Error drawing tree:", error);
                // Fallback rendering in case of error
                this.drawDefaultTree(ctx, tree, screenX, screenY);
            }
        }
    }
    
    /**
     * Draw a default tree representation
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} tree - The tree to draw
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawDefaultTree(ctx, tree, screenX, screenY) {
        // Basic square representation for trees
        const size = 40;
        
        // Tree shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + size/2, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tree trunk (brown rectangle)
        ctx.fillStyle = tree.trunkColor || '#8B4513';
        ctx.fillRect(screenX - size/4, screenY - size/4, size/2, size);
        
        // Tree leaves (green circle)
        ctx.fillStyle = tree.leavesColor || '#2E8B57';
        ctx.beginPath();
        ctx.arc(screenX, screenY - size/2, size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add tree type label
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(tree.name || 'Tree', screenX, screenY);
    }
    
    /**
     * Remove all trees
     */
    clear() {
        this.trees = [];
    }
}

// Make TreeManager available globally
window.TreeManager = TreeManager;

export default TreeManager; 