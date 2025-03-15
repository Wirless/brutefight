/**
 * OreManager.js
 * 
 * Manages ore generation, collection, and rendering
 * in the game world.
 */
class OreManager {
    constructor() {
        this.ores = [];
        this.oreTypes = {};
        this.lastOreId = 0;
        
        // Configure ore generation settings
        this.config = {
            // Distance between ores
            minDistance: 64,
            // Distance to consider for ore regeneration
            generationRadius: 1000,
            // How many ores to generate in a batch
            batchSize: 20,
            // Chance weightings for different ore types
            typeWeights: {
                stone: 45,
                copper: 25,
                iron: 15,
                gold: 10,
                diamond: 5
            }
        };
        
        // Make globally available
        window.ores = this.ores;
    }
    
    /**
     * Initialize the ore manager
     * @returns {OreManager} - This instance for chaining
     */
    init() {
        console.log("Initializing OreManager...");
        
        // First try to get constructors from window.Ores (from entities/Ore.js)
        if (window.Ores) {
            console.log("Found window.Ores, checking if it contains constructor functions...");
            
            // Verify if window.Ores contains constructor functions
            let hasValidConstructors = true;
            for (const type in this.config.typeWeights) {
                if (typeof window.Ores[type] !== 'function') {
                    console.warn(`Ore type ${type} is not a constructor function in window.Ores`);
                    hasValidConstructors = false;
                    break;
                }
            }
            
            if (hasValidConstructors) {
                console.log("Using constructor functions from window.Ores");
                this.oreTypes = window.Ores;
            } else {
                console.warn("window.Ores exists but doesn't contain all required constructor functions");
            }
        }
        
        // If we don't have valid constructors yet, try to create them using window.Ore (base class)
        if (!this.oreTypes || Object.keys(this.oreTypes).length === 0) {
            if (window.Ore) {
                console.log("Using window.Ore to create fallback constructors");
                
                // If we have ore data from systems/ores.js, use it for colors
                const oreData = window.OresData ? window.OresData.ORE_DATA : null;
                
                // Create constructor functions using the base Ore class
                this.oreTypes = {
                    stone: (x, y) => new window.Ore({
                        type: 'stone',
                        name: 'Stone',
                        x, y,
                        color: oreData?.ROCK?.color || '#aaa',
                        radius: 20
                    }),
                    copper: (x, y) => new window.Ore({
                        type: 'copper',
                        name: 'Copper',
                        x, y,
                        color: oreData?.COPPER?.color || '#d27d2c',
                        radius: 22
                    }),
                    iron: (x, y) => new window.Ore({
                        type: 'iron',
                        name: 'Iron',
                        x, y,
                        color: oreData?.IRON?.color || '#a19d94',
                        radius: 25
                    }),
                    gold: (x, y) => new window.Ore({
                        type: 'gold',
                        name: 'Gold',
                        x, y,
                        color: oreData?.GOLD?.color || '#ffd700',
                        radius: 18
                    }),
                    diamond: (x, y) => new window.Ore({
                        type: 'diamond',
                        name: 'Diamond',
                        x, y,
                        color: oreData?.DIAMOND?.color || '#88c0ee',
                        radius: 16
                    })
                };
                
                console.log("Created fallback constructors for ore types:", Object.keys(this.oreTypes));
            } else {
                console.error("No valid ore constructors found and no fallback available");
            }
        }
        
        // Log the final ore types we're using
        console.log("Initialized ore types:", Object.keys(this.oreTypes));
        
        return this;
    }
    
    /**
     * Get all ores
     * @returns {Array} - Array of ore objects
     */
    getOres() {
        return this.ores;
    }
    
    /**
     * Generate ores around a position
     * @param {number} centerX - Center X position
     * @param {number} centerY - Center Y position
     * @param {number} count - Number of ores to generate
     * @param {number} playerX - Player X position (to avoid generating too close)
     * @param {number} playerY - Player Y position (to avoid generating too close)
     * @returns {Array} - Array of generated ores
     */
    generateOresAroundPosition(centerX, centerY, count = 20, playerX = 0, playerY = 0) {
        if (!this.oreTypes || Object.keys(this.oreTypes).length === 0) {
            console.error("No ore types available for generation");
            return [];
        }
        
        const generatedOres = [];
        const safetyCounter = count * 5; // To prevent infinite loops
        let attempts = 0;
        
        // Distance to avoid generating ores too close to the player
        const playerSafeZone = 150;
        
        while (generatedOres.length < count && attempts < safetyCounter) {
            attempts++;
            
            // Generate random position within the radius
            const radius = Math.random() * this.config.generationRadius;
            const angle = Math.random() * Math.PI * 2;
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // Check if too close to player
            const distToPlayer = Math.sqrt(
                Math.pow(x - playerX, 2) + 
                Math.pow(y - playerY, 2)
            );
            
            if (distToPlayer < playerSafeZone) {
                continue; // Too close to player, retry
            }
            
            // Check if too close to other ores
            if (this.isTooCloseToOtherOres(x, y)) {
                continue; // Too close to other ores, retry
            }
            
            // Choose an ore type based on weights
            const oreType = this.chooseOreType();
            if (!oreType) {
                console.error("Failed to select an ore type");
                continue;
            }
            
            // Create the ore using the correct constructor
            try {
                // Get the constructor function from the oreTypes object
                const OreConstructor = this.oreTypes[oreType];
                
                // Make sure it's a constructor function or factory function
                if (typeof OreConstructor !== 'function') {
                    console.error(`Invalid ore type: ${oreType} is not a constructor`);
                    continue;
                }
                
                // Create a new ore instance
                const ore = OreConstructor(x, y);
                
                if (!ore) {
                    console.error(`Failed to create ore of type ${oreType}`);
                    continue;
                }
                
                ore.id = ++this.lastOreId;
                this.ores.push(ore);
                generatedOres.push(ore);
            } catch (error) {
                console.error(`Error creating ore of type ${oreType}:`, error);
            }
        }
        
        if (attempts >= safetyCounter) {
            console.warn(`Hit safety limit when generating ores. Generated ${generatedOres.length} of ${count} requested.`);
        }
        
        console.log(`Generated ${generatedOres.length} ores after ${attempts} attempts.`);
        return generatedOres;
    }
    
    /**
     * Check if a position is too close to other ores
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {boolean} - True if too close
     */
    isTooCloseToOtherOres(x, y) {
        for (let i = 0; i < this.ores.length; i++) {
            const ore = this.ores[i];
            const distance = Math.sqrt(
                Math.pow(x - ore.x, 2) + 
                Math.pow(y - ore.y, 2)
            );
            
            if (distance < this.config.minDistance) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Choose an ore type based on weight
     * @returns {string} - The chosen ore type
     */
    chooseOreType() {
        // Calculate total weight
        let totalWeight = 0;
        for (const type in this.config.typeWeights) {
            totalWeight += this.config.typeWeights[type];
        }
        
        // Random value between 0 and total weight
        let random = Math.random() * totalWeight;
        
        // Find the selected type
        for (const type in this.config.typeWeights) {
            random -= this.config.typeWeights[type];
            if (random <= 0) {
                return type;
            }
        }
        
        // Fallback to stone
        return 'stone';
    }
    
    /**
     * Check if a position collides with any ore
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Collision radius
     * @returns {boolean} - True if collision occurs
     */
    checkCollision(x, y, radius) {
        for (let i = 0; i < this.ores.length; i++) {
            const ore = this.ores[i];
            const oreRadius = ore.radius || 20;
            
            const distance = Math.sqrt(
                Math.pow(x - ore.x, 2) + 
                Math.pow(y - ore.y, 2)
            );
            
            if (distance < radius + oreRadius) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Handle player collision with ores
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @param {number} radius - Player collision radius
     * @returns {Object|null} - New position or null if no collision
     */
    handlePlayerCollision(playerX, playerY, radius) {
        for (let i = 0; i < this.ores.length; i++) {
            const ore = this.ores[i];
            const oreRadius = ore.radius || 20;
            
            const dx = playerX - ore.x;
            const dy = playerY - ore.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If player is inside ore
            if (distance < radius + oreRadius) {
                // Calculate push direction (away from ore center)
                const pushDistance = (radius + oreRadius) - distance;
                const angle = Math.atan2(dy, dx);
                
                // Calculate new position
                const newX = playerX + Math.cos(angle) * pushDistance;
                const newY = playerY + Math.sin(angle) * pushDistance;
                
                return { x: newX, y: newY };
            }
        }
        
        return null; // No collision
    }
    
    /**
     * Remove an ore from the world
     * @param {Object} ore - The ore to remove
     */
    removeOre(ore) {
        const index = this.ores.findIndex(o => o.id === ore.id);
        if (index !== -1) {
            this.ores.splice(index, 1);
        }
    }
    
    /**
     * Draw all ores on the screen
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    drawOres(ctx, cameraX, cameraY) {
        for (let i = 0; i < this.ores.length; i++) {
            const ore = this.ores[i];
            
            // Calculate screen position
            const screenX = ore.x - cameraX;
            const screenY = ore.y - cameraY;
            
            // Skip if the ore is off-screen
            const viewportMargin = 100; // Extra margin to draw ores just outside viewport
            const screenWidth = ctx.canvas.width + viewportMargin * 2;
            const screenHeight = ctx.canvas.height + viewportMargin * 2;
            
            if (
                screenX < -viewportMargin ||
                screenY < -viewportMargin ||
                screenX > screenWidth ||
                screenY > screenHeight
            ) {
                continue;
            }
            
            // Draw the ore
            if (ore.draw) {
                ore.draw(ctx, screenX, screenY);
            } else {
                this.drawDefaultOre(ctx, ore, screenX, screenY);
            }
        }
    }
    
    /**
     * Draw a default ore representation
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} ore - The ore to draw
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawDefaultOre(ctx, ore, screenX, screenY) {
        const radius = ore.radius || 20;
        
        // Determine if the ore is being hit
        const isHit = window.hitRocks && window.hitRocks.has(ore);
        
        // Draw basic ore shape
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        
        if (isHit) {
            // Use hit color
            ctx.fillStyle = '#ff6666';
        } else {
            // Use ore's color
            ctx.fillStyle = ore.color || '#888';
        }
        
        ctx.fill();
        ctx.strokeStyle = ore.borderColor || '#666';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    /**
     * Update all ores
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update each ore
        for (let i = 0; i < this.ores.length; i++) {
            const ore = this.ores[i];
            
            // Skip invalid ores
            if (!ore) {
                this.ores.splice(i, 1);
                i--;
                continue;
            }
            
            // Call the ore's update method if it exists
            if (ore.update) {
                ore.update(deltaTime);
            }
            
            // Regenerate health if needed
            if (ore.regenerateHealth) {
                ore.regenerateHealth(deltaTime);
            }
        }
    }
    
    /**
     * Check if an ore can be hit at a specific position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} range - Hit range
     * @param {number} damage - Amount of damage to deal
     * @param {Object} source - Source of the damage
     * @returns {Object|null} - The hit ore or null if none hit
     */
    hitOreAt(x, y, range, damage, source) {
        // Find ore closest to the hit position within range
        let closestOre = null;
        let closestDistance = range;
        
        for (let i = 0; i < this.ores.length; i++) {
            const ore = this.ores[i];
            
            // Skip if ore has no health (already broken)
            if (ore.health === 0) continue;
            
            // Calculate distance
            const dx = ore.x - x;
            const dy = ore.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if within range and closer than previous matches
            if (distance < closestDistance) {
                closestOre = ore;
                closestDistance = distance;
            }
        }
        
        // If we found an ore, hit it
        if (closestOre) {
            console.log(`Hitting ore at (${closestOre.x}, ${closestOre.y}) with ${damage} damage`);
            
            // Register ore as hit for visual effects
            if (!window.hitRocks) window.hitRocks = new Set();
            if (!window.rockHitTimes) window.rockHitTimes = new Map();
            
            window.hitRocks.add(closestOre);
            window.rockHitTimes.set(closestOre, Date.now());
            
            // Check if ore has hit method
            if (typeof closestOre.hit === 'function') {
                const destroyed = closestOre.hit(damage, source);
                return closestOre;
            } 
            // Simple fallback if ore doesn't have hit method
            else if (closestOre.health !== undefined) {
                closestOre.health -= damage;
                if (closestOre.health <= 0) {
                    closestOre.health = 0;
                }
                return closestOre;
            }
        }
        
        return null;
    }
}

// Make the OreManager class globally available
window.OreManager = OreManager;

// Add default export
export default OreManager;