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
    maxValue: 500, // Maximum XP value
    collectRadius: 20, // Radius for collection
    minSize: 4,
    maxSize: 12
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
        this.vx = 0;
        this.vy = 0;
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
export function createExperienceOrb(x, y, amount = 1) {
    // Validate and normalize inputs
    x = x || 0;
    y = y || 0;
    amount = Math.max(1, Math.min(amount, XP_ORB_CONFIG.maxValue));
    
    // Calculate size based on experience amount
    const minSize = XP_ORB_CONFIG.minSize;
    const maxSize = XP_ORB_CONFIG.maxSize;
    const sizeRange = maxSize - minSize;
    
    // Logarithmic scale for size based on amount
    const normalizedAmount = Math.log(amount) / Math.log(XP_ORB_CONFIG.maxValue);
    const size = minSize + sizeRange * Math.min(1, normalizedAmount);
    
    // Create the orb object
    return {
        x,
        y,
        amount,
        size,
        scale: 1.0, // For pulsing animation
        opacity: 1.0,
        collected: false,
        expired: false,
        creationTime: Date.now(), // Add creationTime property
        vx: 0,
        vy: 0,
        createdAt: Date.now()
    };
}

/**
 * Generate a unique ID for an orb
 * @returns {string} - Unique ID
 */
function generateOrbId() {
    return 'orb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

/**
 * Update the experience orb
 * @param {Object} orb - Experience orb to update
 * @param {Object} player - Player position
 * @param {number} deltaTime - Time elapsed since last update
 * @returns {boolean} - Whether the orb should be removed
 */
function updateExperienceOrb(orb, player, deltaTime) {
    // If already collected, update animation
    if (orb.collected) {
        orb.collectAnimation += deltaTime * 0.01;
        
        // Remove after collection animation completes
        if (orb.collectAnimation >= 1) {
            // Orb is fully collected now, return true to remove it and add experience
            return true;
        }
        
        // Fade out the orb
        orb.opacity = 1 - orb.collectAnimation;
        
        // Update the orb position (move toward player as it collects)
        orb.x = orb.collectedX + (player.x - orb.collectedX) * orb.collectAnimation;
        orb.y = orb.collectedY + (player.y - orb.collectedY) * orb.collectAnimation;
        
        // Still animating collection, don't remove yet
        return false;
    }
    
    // Check for expiration
    if (orb.creationTime && Date.now() - orb.creationTime > XP_ORB_CONFIG.lifetime) {
        orb.expired = true;
        return true;
    }
    
    // Calculate distance to player
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    // Magnetize to player if within range (50 pixels)
    const magnetRadius = 50;
    
    if (distanceToPlayer <= magnetRadius) {
        // Normalize direction vector
        const length = Math.max(0.1, distanceToPlayer);
        const ndx = dx / length;
        const ndy = dy / length;
        
        // Calculate the acceleration based on distance (stronger pull when closer)
        const acceleration = 0.1 + (1 - (distanceToPlayer / magnetRadius)) * 0.4;
        
        // Accelerate towards player
        orb.vx += ndx * acceleration * (deltaTime / 16);
        orb.vy += ndy * acceleration * (deltaTime / 16);
        
        // Cap maximum velocity
        const maxSpeed = 5;
        const speed = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy);
        if (speed > maxSpeed) {
            orb.vx = (orb.vx / speed) * maxSpeed;
            orb.vy = (orb.vy / speed) * maxSpeed;
        }
    } else {
        // Slow down when not magnetized
        orb.vx *= 0.98;
        orb.vy *= 0.98;
        
        // Add some gentle floating motion
        orb.vx += (Math.random() - 0.5) * 0.05;
        orb.vy += (Math.random() - 0.5) * 0.05;
    }
    
    // Apply velocity
    orb.x += orb.vx * (deltaTime / 16);
    orb.y += orb.vy * (deltaTime / 16);
    
    // Check for collection (player touching orb)
    if (distanceToPlayer < XP_ORB_CONFIG.collectRadius) {
        // Mark as collected and store collection position
        orb.collected = true;
        orb.collectedX = orb.x;
        orb.collectedY = orb.y;
        orb.collectAnimation = 0;
        
        // Play sound effect
        playCollectionSound(orb.amount);
        
        // Don't remove yet, let the collection animation play
        return false;
    }
    
    // Not collected, don't remove
    return false;
}

/**
 * Play a sound effect when collecting an orb
 * @param {number} amount - Experience amount
 */
function playCollectionSound(amount) {
    try {
        const isLargeAmount = amount >= 10;
        
        if (window.game && window.game.assetLoader) {
            // Use game's asset loader for sounds
            window.game.assetLoader.playSound(isLargeAmount ? 'levelUp' : 'expPickup', 0.3);
        } else if (window.audioContext) {
            // Fallback to direct audio playing
            const soundName = isLargeAmount ? 'sounds/levelup.mp3' : 'sounds/collect.mp3';
            const sound = window.soundsCache && window.soundsCache[soundName] ? 
                window.soundsCache[soundName].cloneNode() : new Audio(soundName);
            sound.volume = 0.3;
            sound.play().catch(err => console.log('Sound play failed:', err));
        }
    } catch (error) {
        console.error("Error playing collection sound:", error);
    }
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
                if (orb.collected && !orb.expired) {
                    // Try to use the global addExperience function first
                    if (window.addExperience) {
                        window.addExperience(orb.amount);
                    }
                    // Fall back to updating the player directly
                    else if (this.game && this.game.myPlayer) {
                        if (this.game.addExperience) {
                            this.game.addExperience(orb.amount);
                        } else {
                            this.game.myPlayer.experience = (this.game.myPlayer.experience || 0) + orb.amount;
                        }
                    }
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

    /**
     * Create an orb burst at a position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} count - Number of orbs to create
     * @param {number} totalExp - Total experience to distribute
     * @returns {Array} - Array of created orbs
     */
    createOrbBurst(x, y, count, totalExp) {
        const orbs = [];
        
        // Make sure count and totalExp are valid
        count = Math.max(1, count || 3);
        totalExp = Math.max(1, totalExp || 10);
        
        // Create a distribution of experience amounts
        let remainingExp = totalExp;
        let remainingOrbs = count;
        
        // Create first orb as the largest (30-50% of total)
        let firstOrbExp = Math.ceil(totalExp * (0.3 + Math.random() * 0.2));
        let firstOrb = this.createOrb(x, y, firstOrbExp);
        remainingExp -= firstOrbExp;
        remainingOrbs--;
        orbs.push(firstOrb);
        
        // Create orbs in a circular pattern
        for (let i = 0; i < remainingOrbs; i++) {
            // Calculate how much experience this orb should get
            let orbExp;
            
            if (i === remainingOrbs - 1) {
                // Last orb gets all remaining experience
                orbExp = remainingExp;
            } else {
                // Randomize experience distribution for visual appeal
                const avgExpPerOrb = remainingExp / remainingOrbs;
                orbExp = Math.max(1, Math.floor(avgExpPerOrb * (0.5 + Math.random())));
            }
            
            // Ensure we don't exceed remaining experience
            orbExp = Math.min(orbExp, remainingExp);
            
            // Calculate position in a circular pattern
            const angle = (i / remainingOrbs) * Math.PI * 2;
            const distance = 5 + Math.random() * 15;
            const orbX = x + Math.cos(angle) * distance;
            const orbY = y + Math.sin(angle) * distance;
            
            // Create the orb with calculated experience
            const orb = this.createOrb(orbX, orbY, orbExp);
            
            // Add some initial velocity away from center
            orb.vx = Math.cos(angle) * (1 + Math.random() * 2);
            orb.vy = Math.sin(angle) * (1 + Math.random() * 2);
            
            orbs.push(orb);
            
            // Update remaining values
            remainingExp -= orbExp;
            remainingOrbs--;
        }
        
        return orbs;
    }
}

// Make experienceOrbs available globally for backward compatibility
window.ExperienceOrbs = experienceOrbs;
window.ExperienceOrbManager = ExperienceOrbManager;

// Export the experienceOrbs object as default
export default experienceOrbs;   