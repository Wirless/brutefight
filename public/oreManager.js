// Ore Manager for the game
// Handles ore generation, placement, and management
///if player is on rock repel him off from center of it to its borders 
class OreManager {
    constructor() {
        this.ores = [];
        this.ROCK_SPAWN_RADIUS = 800; // Reduced spawn radius for more concentrated ores
        this.ROCK_MIN_SPACING = 100; // Reduced spacing to allow more ores
        this.PLAYER_SAFE_RADIUS = 100; // Minimum distance from player to spawn ores
    }
    
    // Initialize the ore manager
    init() {
        console.log('OreManager initialized with parameters:');
        console.log(`- ROCK_SPAWN_RADIUS: ${this.ROCK_SPAWN_RADIUS}`);
        console.log(`- ROCK_MIN_SPACING: ${this.ROCK_MIN_SPACING}`);
        console.log(`- PLAYER_SAFE_RADIUS: ${this.PLAYER_SAFE_RADIUS}`);
        return this;
    }
    
    // Get all ores
    getOres() {
        return this.ores;
    }
    
    // Generate ores around a position
    generateOresAroundPosition(centerX, centerY, count, playerX, playerY) {
        console.log(`Attempting to generate ${count} ores around (${centerX}, ${centerY}), player at (${playerX}, ${playerY})`);
        
        // Ensure we have the Ores class available
        if (!window.Ores || !window.Ores.Stone) {
            console.error("Error: window.Ores.Stone is not defined!");
            return [];
        }
        
        const newOres = [];
        let attempts = 0;
        const maxAttempts = count * 20; // Increased attempts to ensure we get ores
        
        while (newOres.length < count && attempts < maxAttempts) {
            attempts++;
            
            // Generate random position within spawn radius
            const angle = Math.random() * Math.PI * 2;
            const distance = (this.PLAYER_SAFE_RADIUS + 50) + Math.random() * (this.ROCK_SPAWN_RADIUS - this.PLAYER_SAFE_RADIUS - 50);
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Check if too close to player
            const distToPlayer = Math.sqrt(
                Math.pow(x - playerX, 2) + 
                Math.pow(y - playerY, 2)
            );
            
            if (distToPlayer < this.PLAYER_SAFE_RADIUS) {
                continue; // Too close to player, skip this position
            }
            
            // Check spacing with existing ores (square detection)
            let tooClose = false;
            
            // Check against existing ores in the game
            for (const ore of this.ores) {
                if (Math.abs(x - ore.x) < this.ROCK_MIN_SPACING && 
                    Math.abs(y - ore.y) < this.ROCK_MIN_SPACING) {
                    tooClose = true;
                    break;
                }
            }
            
            // Check against ores we're about to add
            for (const ore of newOres) {
                if (Math.abs(x - ore.x) < this.ROCK_MIN_SPACING && 
                    Math.abs(y - ore.y) < this.ROCK_MIN_SPACING) {
                    tooClose = true;
                    break;
                }
            }
            
            // If too close to another ore, skip this one
            if (tooClose) continue;
            
            try {
                // Create a new Stone ore
                const stone = new window.Ores.Stone(x, y);
                newOres.push(stone);
                console.log(`Created ore at (${Math.round(x)}, ${Math.round(y)})`);
            } catch (error) {
                console.error("Error creating ore:", error);
            }
        }
        
        // Add the new ores to the global ores array
        this.ores.push(...newOres);
        console.log(`Generated ${newOres.length} ores around position (${centerX}, ${centerY}) after ${attempts} attempts`);
        return newOres;
    }
    
    // Check if a point collides with any ore
    checkCollision(x, y, radius) {
        for (const ore of this.ores) {
            // Calculate distance between player and ore center
            const dx = x - ore.x;
            const dy = y - ore.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if player is too close to ore (using ore's width/height as approximation)
            const collisionDistance = radius + Math.max(ore.width, ore.height) / 2;
            
            if (distance < collisionDistance) {
                return true;
            }
            
            // Also check rectangular collision as a fallback
            if (x + radius > ore.collisionBox.left && 
                x - radius < ore.collisionBox.right && 
                y + radius > ore.collisionBox.top && 
                y - radius < ore.collisionBox.bottom) {
                return true;
            }
        }
        return false;
    }
    
    // Remove an ore from the manager
    removeOre(ore) {
        const index = this.ores.indexOf(ore);
        if (index !== -1) {
            this.ores.splice(index, 1);
            return true;
        }
        return false;
    }
    
    // Draw all ores
    drawOres(ctx, cameraX, cameraY) {
        if (this.ores.length === 0) {
            console.warn("No ores to draw!");
            return;
        }
        
        let visibleCount = 0;
        
        for (const ore of this.ores) {
            // Convert world coordinates to screen coordinates
            const screenX = ore.x - Math.floor(cameraX);
            const screenY = ore.y - Math.floor(cameraY);
            
            // Only draw if ore is visible on screen (with some buffer)
            if (screenX < -ore.width || screenX > ctx.canvas.width + ore.width || 
                screenY < -ore.height || screenY > ctx.canvas.height + ore.height) {
                continue;
            }
            
            visibleCount++;
            
            try {
                // Draw the ore - pass cameraX and cameraY as required by the Ore.draw method
                ore.draw(ctx, cameraX, cameraY);
                
                // Draw debug outline
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    screenX - ore.width/2, 
                    screenY - ore.height/2, 
                    ore.width, 
                    ore.height
                );
            } catch (error) {
                console.error("Error drawing ore:", error, ore);
            }
        }
        
        // Log visible ores count occasionally
        if (Math.random() < 0.01) { // Log roughly every 100 frames
            console.log(`Drawing ${visibleCount} visible ores out of ${this.ores.length} total`);
        }
    }
    
    // Handle player collision with ores - push player away from ore
    handlePlayerCollision(playerX, playerY, radius) {
        for (const ore of this.ores) {
            // Calculate distance between player and ore center
            const dx = playerX - ore.x;
            const dy = playerY - ore.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if player is too close to ore
            const collisionDistance = radius + Math.max(ore.width, ore.height) / 2;
            
            if (distance < collisionDistance) {
                // Calculate normalized direction vector from ore to player
                const nx = dx / distance;
                const ny = dy / distance;
                
                // Calculate how far to push the player
                const pushDistance = collisionDistance - distance;
                
                // Return the new position for the player
                return {
                    x: playerX + nx * pushDistance,
                    y: playerY + ny * pushDistance
                };
            }
        }
        
        // No collision, return null
        return null;
    }
}

// Export the ore manager
window.OreManager = OreManager; 