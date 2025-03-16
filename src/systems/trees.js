/**
 * trees.js
 * 
 * System for managing tree entities, providing integration between
 * the TreeManager and the main game systems.
 */
import TreeManager from '../managers/TreeManager.js';

class TreeSystem {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        
        // Reference to tree manager
        this.treeManager = null;
        
        console.log("Tree System initialized");
    }
    
    /**
     * Initialize the tree system
     * @returns {TreeSystem} - This instance for chaining
     */
    init() {
        try {
            // Initialize tree manager directly using import
            this.treeManager = new TreeManager(this.game);
            this.treeManager.init();
            
            // Make tree manager globally available
            window.treeManager = this.treeManager;
            
            console.log("Tree manager initialized by TreeSystem");
        } catch (error) {
            console.error("Failed to initialize TreeManager:", error);
        }
        
        return this;
    }
    
    /**
     * Update the tree system
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        if (this.treeManager) {
            this.treeManager.update(deltaTime);
        }
    }
    
    /**
     * Draw all trees
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraX, cameraY) {
        if (this.treeManager) {
            this.treeManager.draw(ctx, cameraX, cameraY);
        }
    }
    
    /**
     * Create a tree at the specified position
     * @param {string} type - Tree type (oak, birch, pine, jungle)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Tree} - The created tree
     */
    createTree(type, x, y) {
        if (!this.treeManager) {
            console.error("Cannot create tree: tree manager not available");
            return null;
        }
        return this.treeManager.createTree(type, x, y);
    }
    
    /**
     * Get tree at a specific position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Tree|null} - The tree at the position, or null if none found
     */
    getTreeAt(x, y) {
        return this.treeManager ? this.treeManager.getTreeAt(x, y) : null;
    }
    
    /**
     * Get all trees within a radius of a point
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Search radius
     * @returns {Array} - Array of trees within the radius
     */
    getTreesInRadius(x, y, radius) {
        return this.treeManager ? this.treeManager.getTreesInRadius(x, y, radius) : [];
    }
}

// Make TreeSystem available globally
window.TreeSystem = TreeSystem;

// Debug helper function
export const debugTrees = () => { 
    console.log('Tree Debug', {
        TreeSystem: window.TreeSystem, 
        treeManager: window.treeManager, 
        TreeClass: window.Tree
    }); 
};

export default TreeSystem;

