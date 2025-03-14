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
        // Initialize ore types from the global Ores object
        if (window.Ores) {
            this.oreTypes = window.Ores;
            console.log("Initialized ore types:", Object.keys(this.oreTypes));
        } else {
            console.error("Ore types not available. Make sure Ores are defined globally.");
        }
        
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
        const safetyCounter = count * 3; // Prevent infinite loops
        let attempts = 0;
        
        while (generatedOres.length < count && attempts < safetyCounter) {
            attempts++;
            
            // Calculate random position within generation radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.config.generationRadius;
            
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Check if position is far enough from existing ores
            if (this.isPositionValid(x, y, this.config.minDistance)) {
                // Check if position is not too close to player
                const distToPlayer = Math.sqrt(
                    Math.pow(x - playerX, 2) + 
                    Math.pow(y - playerY, 2)
                );
                
                if (distToPlayer < 100) {
                    // Too close to player, try again
                    continue;
                }
                
                // Choose an ore type based on weights
                const oreType = this.chooseOreType();
                if (!oreType) {
                    console.error("Failed to select an ore type");
                    continue;
                }
                
                // Create the ore
                try {
                    const ore = new this.oreTypes[oreType](x, y);
                    ore.id = ++this.lastOreId;
                    this.ores.push(ore);
                    generatedOres.push(ore);
                } catch (error) {
                    console.error(`Error creating ore of type ${oreType}:`, error);
                }
            }
        }
        
        if (attempts >= safetyCounter) {
            console.warn(`Reached maximum attempts (${safetyCounter}) when generating ores.`);
        }
        
        // Update global reference
        window.ores = this.ores;
        
        return generatedOres;
    }
    
    /**
     * Choose a random ore type based on weights
     * @returns {string} - The selected ore type
     */
    chooseOreType() {
        // Calculate total weight
        let totalWeight = 0;
        for (const type in this.config.typeWeights) {
            totalWeight += this.config.typeWeights[type];
        }
        
        // Generate random number between 0 and totalWeight
        const random = Math.random() * totalWeight;
        
        // Find which ore type the random number falls into
        let cumulativeWeight = 0;
        for (const type in this.config.typeWeights) {
            cumulativeWeight += this.config.typeWeights[type];
            if (random <= cumulativeWeight) {
                return type;
            }
        }
        
        // Fallback to stone if something goes wrong
        return "stone";
    }
    
    /**
     * Check if position is valid for a new ore
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} minDistance - Minimum distance from other ores
     * @returns {boolean} - Whether position is valid
     */
    isPositionValid(x, y, minDistance) {
        for (const ore of this.ores) {
            const distance = Math.sqrt(
                Math.pow(x - ore.x, 2) + 
                Math.pow(y - ore.y, 2)
            );
            
            if (distance < minDistance) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Check for collision with any ore
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Collision radius
     * @returns {boolean} - Whether there is a collision
     */
    checkCollision(x, y, radius) {
        for (const ore of this.ores) {
            if (!ore.broken) {
                const distance = Math.sqrt(
                    Math.pow(x - ore.x, 2) + 
                    Math.pow(y - ore.y, 2)
                );
                
                if (distance < radius + ore.radius) {
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * Handle collision between player and ores
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @param {number} playerRadius - Player collision radius
     * @returns {Object|null} - New position if pushing needed, or null
     */
    handlePlayerCollision(playerX, playerY, playerRadius) {
        // Find nearest colliding ore
        let nearestOre = null;
        let nearestDistance = Infinity;
        
        for (const ore of this.ores) {
            if (ore.broken) continue;
            
            const distance = Math.sqrt(
                Math.pow(playerX - ore.x, 2) + 
                Math.pow(playerY - ore.y, 2)
            );
            
            if (distance < playerRadius + ore.radius && distance < nearestDistance) {
                nearestOre = ore;
                nearestDistance = distance;
            }
        }
        
        if (nearestOre) {
            // Calculate direction from ore to player
            const dx = playerX - nearestOre.x;
            const dy = playerY - nearestOre.y;
            
            // Normalize direction
            const length = Math.sqrt(dx * dx + dy * dy);
            const ndx = dx / length;
            const ndy = dy / length;
            
            // Calculate how much we need to push the player outward
            const pushDistance = (playerRadius + nearestOre.radius) - length;
            
            // Calculate new position
            const newX = playerX + ndx * pushDistance;
            const newY = playerY + ndy * pushDistance;
            
            return { x: newX, y: newY };
        }
        
        return null;
    }
    
    /**
     * Get ore at a position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Search radius
     * @returns {Object|null} - The ore at the position, or null
     */
    getOreAt(x, y, radius = 10) {
        for (const ore of this.ores) {
            if (ore.broken) continue;
            
            const distance = Math.sqrt(
                Math.pow(x - ore.x, 2) + 
                Math.pow(y - ore.y, 2)
            );
            
            if (distance < radius + ore.radius) {
                return ore;
            }
        }
        return null;
    }
    
    /**
     * Mine an ore at a position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} damage - Damage to apply
     * @param {number} radius - Search radius
     * @returns {Object|boolean} - The mined ore or false if no ore found
     */
    mineOreAt(x, y, damage, radius = 30) {
        const ore = this.getOreAt(x, y, radius);
        
        if (ore) {
            ore.health -= damage;
            
            // Generate particles
            if (ore.generateParticles) {
                const particles = ore.generateParticles(true);
                window.rockParticles.push(...particles);
            }
            
            // Check if ore is destroyed
            if (ore.health <= 0 && !ore.broken) {
                ore.broken = true;
                
                // Generate experience orbs if the function exists
                if (window.expOrbManager && window.expOrbManager.createExpOrb) {
                    const expValue = ore.expValue || 5; // Default to 5 if not specified
                    window.expOrbManager.createExpOrb(ore.x, ore.y, expValue);
                }
                
                // Respawn ore after delay
                setTimeout(() => {
                    ore.health = ore.maxHealth;
                    ore.broken = false;
                }, ore.respawnTime || 60000); // Default 60 seconds if not specified
            }
            
            return ore;
        }
        
        return false;
    }
    
    /**
     * Draw all ores
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    drawOres(ctx, cameraX, cameraY) {
        for (const ore of this.ores) {
            if (ore.broken) continue;
            
            // Convert world coordinates to screen coordinates
            const screenX = ore.x - Math.floor(cameraX);
            const screenY = ore.y - Math.floor(cameraY);
            
            // Only draw if ore is visible on screen
            if (screenX < -ore.radius * 2 || screenX > ctx.canvas.width + ore.radius * 2 || 
                screenY < -ore.radius * 2 || screenY > ctx.canvas.height + ore.radius * 2) {
                continue;
            }
            
            // Draw ore
            if (ore.draw) {
                ore.draw(ctx, screenX, screenY);
            } else {
                // Default drawing if ore doesn't have its own draw method
                this.drawDefaultOre(ctx, screenX, screenY, ore);
            }
            
            // Draw hit effect
            if (window.hitRocks && window.hitRocks.has(ore)) {
                this.drawHitEffect(ctx, screenX, screenY, ore);
            }
        }
    }
    
    /**
     * Draw a default ore
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {Object} ore - The ore object
     */
    drawDefaultOre(ctx, screenX, screenY, ore) {
        // Draw base shape
        ctx.fillStyle = ore.color || '#888';
        ctx.beginPath();
        ctx.arc(screenX, screenY, ore.radius || 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw health bar if ore is damaged
        if (ore.health < ore.maxHealth) {
            const healthPercent = ore.health / ore.maxHealth;
            const barWidth = ore.radius * 2;
            const barHeight = 6;
            
            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(
                screenX - barWidth / 2,
                screenY - ore.radius - 15,
                barWidth,
                barHeight
            );
            
            // Health
            ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : (healthPercent > 0.25 ? '#ff0' : '#f00');
            ctx.fillRect(
                screenX - barWidth / 2,
                screenY - ore.radius - 15,
                barWidth * healthPercent,
                barHeight
            );
        }
    }
    
    /**
     * Draw hit effect for an ore
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {Object} ore - The ore object
     */
    drawHitEffect(ctx, screenX, screenY, ore) {
        // Draw glow effect
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
            screenX, screenY, ore.radius * 0.5,
            screenX, screenY, ore.radius * 1.5
        );
        
        gradient.addColorStop(0, 'rgba(255, 255, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.arc(screenX, screenY, ore.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw cracks
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 2;
        
        const crackCount = 3 + Math.floor(3 * (1 - ore.health / ore.maxHealth));
        
        for (let i = 0; i < crackCount; i++) {
            const angle = (Math.PI * 2 * i / crackCount) + 
                          (0.2 * Math.sin(Date.now() / 100 + i));
            
            ctx.beginPath();
            ctx.moveTo(
                screenX + Math.cos(angle) * ore.radius * 0.3,
                screenY + Math.sin(angle) * ore.radius * 0.3
            );
            ctx.lineTo(
                screenX + Math.cos(angle) * ore.radius * 0.9,
                screenY + Math.sin(angle) * ore.radius * 0.9
            );
            ctx.stroke();
        }
    }
    
    /**
     * Clean up broken ores
     */
    cleanupBrokenOres() {
        this.ores = this.ores.filter(ore => !ore.broken);
        
        // Update global reference
        window.ores = this.ores;
    }
    
    /**
     * Clear all ores
     */
    clearAllOres() {
        this.ores = [];
        window.ores = this.ores;
    }
}

// Make the OreManager class globally available
window.OreManager = OreManager; 