/**
 * Experience Orbs System
 * 
 * Manages the creation, movement, and collection of experience orbs
 */

// Configuration constants
export const XP_ORB_CONFIG = {
    // Visual properties
    size: 8,
    baseColor: '#00FF00',
    glowColor: 'rgba(0, 255, 0, 0.3)',
    pulseFrequency: 1000, // ms
    
    // Movement properties
    magnetDistance: 150, // Distance from player where orb gets attracted
    moveSpeed: 120, // Pixels per second
    accelerationRate: 2.5, // How quickly orbs accelerate toward player
    
    // Lifetime properties
    lifetime: 30000, // 30 seconds
    fadeOutTimeMs: 5000, // 5 seconds fade out before disappearing
    
    // Collection properties
    mergeDistance: 30, // Distance at which orbs merge
    collectionDistance: 10, // Distance from player to collect the orb
    
    // Value properties
    minValue: 10, // Minimum XP value
    maxValue: 500 // Maximum XP value
};

/**
 * Experience Orb class
 */
class ExperienceOrb {
    /**
     * Create a new experience orb
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} amount - Amount of experience
     */
    constructor(x, y, amount) {
        this.id = generateOrbId();
        this.x = x;
        this.y = y;
        this.amount = amount || Math.floor(Math.random() * (XP_ORB_CONFIG.maxValue - XP_ORB_CONFIG.minValue)) + XP_ORB_CONFIG.minValue;
        this.collected = false;
        this.expiresAt = Date.now() + XP_ORB_CONFIG.lifetime;
        this.velocityX = 0;
        this.velocityY = 0;
        this.createdAt = Date.now();
        
        // Visual properties
        this.size = XP_ORB_CONFIG.size;
        this.scale = 1;
        this.opacity = 1;
        
        // Movement state
        this.isMovingToPlayer = false;
    }
}

/**
 * Create a new experience orb
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} amount - Amount of experience (optional)
 * @returns {Object} - Experience orb object
 */
export function createExperienceOrb(x, y, amount) {
    return new ExperienceOrb(x, y, amount);
}

/**
 * Generate a unique ID for an orb
 * @returns {string} - Unique ID
 */
function generateOrbId() {
    return 'orb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

/**
 * Update an experience orb's position and state
 * @param {Object} orb - Experience orb to update
 * @param {Object} player - Player object with x and y properties
 * @param {number} deltaTime - Time since last update in ms
 * @returns {boolean} - Whether the orb was collected
 */
export function updateExperienceOrb(orb, player, deltaTime) {
    // Skip if already collected or expired
    if (orb.collected) return true;
    
    // Check if orb has expired
    if (Date.now() > orb.expiresAt) {
        orb.collected = true;
        return true;
    }
    
    // Calculate distance to player
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    // Pulse size based on time
    const pulsePhase = (Date.now() - orb.createdAt) % XP_ORB_CONFIG.pulseFrequency / XP_ORB_CONFIG.pulseFrequency;
    orb.scale = 1 + 0.2 * Math.sin(pulsePhase * Math.PI * 2);
    
    // Calculate opacity based on remaining lifetime
    orb.opacity = calculateOrbOpacity(orb);
    
    // Check if orb should be collected (player is close enough)
    if (distanceToPlayer <= XP_ORB_CONFIG.collectionDistance) {
        orb.collected = true;
        return true;
    }
    
    // Check if orb should move toward player (magnetism)
    const shouldMoveToPlayer = distanceToPlayer <= XP_ORB_CONFIG.magnetDistance;
    
    // Update velocity
    if (shouldMoveToPlayer) {
        // Calculate direction to player
        const directionX = dx / distanceToPlayer;
        const directionY = dy / distanceToPlayer;
        
        // Calculate speed (accelerate over time)
        let speed = XP_ORB_CONFIG.moveSpeed;
        
        // If orb wasn't previously moving to player, start acceleration
        if (!orb.isMovingToPlayer) {
            orb.isMovingToPlayer = true;
            orb.accelerationStartTime = Date.now();
        }
        
        // Accelerate based on how long we've been moving toward player
        const accelerationTime = (Date.now() - orb.accelerationStartTime) / 1000; // in seconds
        speed *= (1 + accelerationTime * XP_ORB_CONFIG.accelerationRate);
        
        // Update velocity
        orb.velocityX = directionX * speed;
        orb.velocityY = directionY * speed;
    } else {
        // Slow down if not moving toward player
        orb.velocityX *= 0.95;
        orb.velocityY *= 0.95;
        orb.isMovingToPlayer = false;
    }
    
    // Update position
    const seconds = deltaTime / 1000;
    orb.x += orb.velocityX * seconds;
    orb.y += orb.velocityY * seconds;
    
    // Orb wasn't collected
    return false;
}

/**
 * Merge nearby experience orbs of the same type
 * @param {Array} orbs - Array of experience orbs
 * @returns {Array} - Array of merged orbs
 */
export function mergeExperienceOrbs(orbs) {
    // Skip if no orbs or just one
    if (!orbs || orbs.length <= 1) return orbs;
    
    const mergedOrbs = [...orbs];
    let didMerge = false;
    
    // Check each orb against others
    for (let i = 0; i < mergedOrbs.length; i++) {
        const orb1 = mergedOrbs[i];
        if (orb1.collected) continue;
        
        for (let j = i + 1; j < mergedOrbs.length; j++) {
            const orb2 = mergedOrbs[j];
            if (orb2.collected) continue;
            
            // Calculate distance between orbs
            const dx = orb2.x - orb1.x;
            const dy = orb2.y - orb1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Merge if close enough
            if (distance <= XP_ORB_CONFIG.mergeDistance) {
                // Add experience from orb2 to orb1
                orb1.amount += orb2.amount;
                
                // Mark orb2 as collected
                orb2.collected = true;
                didMerge = true;
            }
        }
    }
    
    // If we merged any orbs, filter out collected ones
    if (didMerge) {
        return mergedOrbs.filter(orb => !orb.collected);
    }
    
    return mergedOrbs;
}

/**
 * Calculate the opacity of an orb based on its remaining lifespan
 * @param {Object} orb - Experience orb object
 * @returns {number} - Opacity value between 0 and 1
 */
export function calculateOrbOpacity(orb) {
    const timeRemaining = orb.expiresAt - Date.now();
    
    // If less than fadeOutTime remaining, start fading
    if (timeRemaining < XP_ORB_CONFIG.fadeOutTimeMs) {
        return Math.max(0, timeRemaining / XP_ORB_CONFIG.fadeOutTimeMs);
    }
    
    return 1;
}

// Create an experienceOrbs object that contains all exported classes and functions
const experienceOrbs = {
    XP_ORB_CONFIG,
    ExperienceOrb,
    createExperienceOrb,
    updateExperienceOrb,
    mergeExperienceOrbs,
    calculateOrbOpacity
};

/**
 * ExperienceOrbManager - Manages all experience orbs in the game
 */
class ExperienceOrbManager {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        this.orbs = [];
        console.log("ExperienceOrbManager initialized");
    }
    
    /**
     * Create a new experience orb
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} amount - Amount of experience
     */
    createOrb(x, y, amount) {
        const orb = createExperienceOrb(x, y, amount);
        this.orbs.push(orb);
        return orb;
    }
    
    /**
     * Update all orbs
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(playerX, playerY, deltaTime) {
        // Create dummy player object if we don't have playerManager
        const player = { x: playerX, y: playerY };
        
        // Merge nearby orbs
        this.orbs = mergeExperienceOrbs(this.orbs);
        
        // Update all orbs
        for (let i = this.orbs.length - 1; i >= 0; i--) {
            const orb = this.orbs[i];
            const shouldRemove = updateExperienceOrb(orb, player, deltaTime);
            
            // Remove if necessary
            if (shouldRemove) {
                // If the orb was collected, add XP to player
                if (orb.collected && !orb.expired && this.game && this.game.myPlayer) {
                    this.game.myPlayer.experience += orb.amount;
                }
                
                this.orbs.splice(i, 1);
            }
        }
    }
    
    /**
     * Draw all orbs
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraX, cameraY) {
        for (const orb of this.orbs) {
            this.drawOrb(ctx, orb, cameraX, cameraY);
        }
    }
    
    /**
     * Draw a single orb
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} orb - Experience orb to draw
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    drawOrb(ctx, orb, cameraX, cameraY) {
        const screenX = orb.x - cameraX;
        const screenY = orb.y - cameraY;
        
        // Skip if offscreen
        if (screenX < -50 || screenY < -50 || 
            screenX > ctx.canvas.width + 50 || 
            screenY > ctx.canvas.height + 50) {
            return;
        }
        
        // Draw glow
        ctx.globalAlpha = orb.opacity * 0.5;
        ctx.fillStyle = XP_ORB_CONFIG.glowColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, orb.size * orb.scale * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw orb
        ctx.globalAlpha = orb.opacity;
        ctx.fillStyle = XP_ORB_CONFIG.baseColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, orb.size * orb.scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }
}

// Make experienceOrbs available globally for backward compatibility
window.ExperienceOrbs = experienceOrbs;
window.ExperienceOrbManager = ExperienceOrbManager;

// Export the experienceOrbs object as default
export default experienceOrbs;   