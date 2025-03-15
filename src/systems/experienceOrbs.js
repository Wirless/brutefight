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
    
    // Style options
    renderStyle: 'classic', // 'modern' or 'classic'
    
    // Fuzzy particle options
    fuzzyParticlesEnabled: true,
    fuzzyParticleCount: 4, // Base number of particles per orb
    fuzzyParticleSize: { min: 0.5, max: 1.5 },
    fuzzyParticleAlpha: { min: 0.3, max: 0.7 },
    fuzzyParticleLifetime: { min: 1000, max: 3000 },
    
    // Movement properties
    magnetDistance: 150, // Distance from player where orb gets attracted
    moveSpeed: 120, // Pixels per second
    accelerationRate: 2.5, // How quickly orbs accelerate toward player
    
    // Lifetime properties
    lifetime: 30000, // 30 seconds
    fadeOutTimeMs: 5000, // 5 seconds fade out before disappearing
    
    // Collection properties
    mergeDistance: 20, // Distance at which orbs merge (updated to 20)
    collectionDistance: 10, // Distance from player to collect the orb
    
    // Value properties
    minValue: 10, // Minimum XP value
    maxValue: 500, // Maximum XP value
    collectRadius: 20, // Radius for collection
    minSize: 4,
    maxSize: 12,
    
    // Classic style properties
    classicBaseColor: 'rgb(0, 240, 100)',
    classicGlowColor: 'rgba(0, 255, 100, 0.5)'
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
    
    // For 1 XP orbs, make them smaller than the minimum size
    let size;
    if (amount <= 1) {
        size = minSize * 0.7; // 70% of minimum size for 1 XP orbs
    } else {
        // Logarithmic scale for size based on amount for larger orbs
        const normalizedAmount = Math.log(amount) / Math.log(XP_ORB_CONFIG.maxValue);
        size = minSize + sizeRange * Math.min(1, normalizedAmount);
    }
    
    // Create the orb object
    const orb = {
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
        createdAt: Date.now(),
        
        // Fuzzy particles
        fuzzyParticles: [],
        lastFuzzyParticleTime: Date.now()
    };
    
    // Initialize fuzzy particles if enabled
    if (XP_ORB_CONFIG.fuzzyParticlesEnabled) {
        initFuzzyParticles(orb);
    }
    
    return orb;
}

/**
 * Generate a unique ID for an orb
 * @returns {string} - Unique ID
 */
function generateOrbId() {
    return 'orb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

/**
 * Calculate distance from orb to player
 * @param {Object} orb - Experience orb
 * @param {Object} player - Player object with position
 * @returns {number} - Distance between orb and player
 */
function distanceToPlayer(orb, player) {
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    return Math.sqrt(dx * dx + dy * dy);
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
    
    // Handle merge animation if this orb is merging with another orb
    if (orb.merging && orb.mergeTarget) {
        const now = Date.now();
        const elapsed = now - orb.mergeStartTime;
        const progress = Math.min(1, elapsed / orb.mergeDuration);
        
        // Move this orb toward the target orb with a slight arc
        const targetX = orb.mergeTarget.x;
        const targetY = orb.mergeTarget.y;
        
        // Calculate arc path
        const arcHeight = 15; // Maximum height of the arc
        const arcOffset = Math.sin(progress * Math.PI) * arcHeight;
        
        // Update position - linear movement + arc
        orb.x = orb.mergeStartX + (targetX - orb.mergeStartX) * progress;
        orb.y = orb.mergeStartY + (targetY - orb.mergeStartY) * progress - arcOffset;
        
        // Shrink the orb as it gets closer to the target
        orb.size = orb.size * (1 - progress * 0.7);
        orb.opacity = 1 - progress * 0.5;
        
        // If merge complete, mark as collected
        if (progress >= 1) {
            orb.collected = true;
        }
        
        return false;
    }
    
    // Handle growth animation for orbs that absorb another
    if (orb.mergeAnimationStart) {
        const now = Date.now();
        const elapsed = now - orb.mergeAnimationStart;
        const progress = Math.min(1, elapsed / orb.mergeAnimationDuration);
        
        // Animate size from original to target size with a pulse
        if (orb.originalSize && orb.targetSize) {
            // Add a pulse effect when growing
            const pulseEffect = Math.sin(progress * Math.PI * 2) * 0.2; // Pulse amplitude
            const sizeDifference = orb.targetSize - orb.originalSize;
            
            // Apply size with pulse effect
            if (progress < 1) {
                // During animation, include pulse effect
                orb.size = orb.originalSize + (sizeDifference * progress) + (pulseEffect * sizeDifference);
                
                // Add a temporary glow or highlight effect
                orb.glowIntensity = 0.5 + (1 - Math.abs(progress - 0.5)) * 1.5;
            } else {
                // Animation complete, set final size
                orb.size = orb.targetSize;
                orb.glowIntensity = undefined;
                
                // Clean up animation properties
                delete orb.mergeAnimationStart;
                delete orb.mergeAnimationDuration;
                delete orb.originalSize;
                delete orb.targetSize;
                delete orb.pulseOnMerge;
            }
        }
    }
    
    // Check for expiration
    const now = Date.now();
    const lifetime = now - orb.creationTime;
    
    if (lifetime >= XP_ORB_CONFIG.lifetime) {
        // Mark as expired
        orb.expired = true;
        return true;
    }
    
    // Start fading out near the end of lifetime
    if (lifetime >= XP_ORB_CONFIG.lifetime - XP_ORB_CONFIG.fadeOutTimeMs) {
        const fadeProgress = (lifetime - (XP_ORB_CONFIG.lifetime - XP_ORB_CONFIG.fadeOutTimeMs)) / XP_ORB_CONFIG.fadeOutTimeMs;
        orb.opacity = 1 - fadeProgress;
    }
    
    // Add magnetization behavior: Attract to player if close enough
    const playerDistance = distanceToPlayer(orb, player);
    if (playerDistance < XP_ORB_CONFIG.magnetDistance) {
        // Calculate direction to player
        const dx = player.x - orb.x;
        const dy = player.y - orb.y;
        const angle = Math.atan2(dy, dx);
        
        // Calculate acceleration based on distance
        const distanceFactor = 1 - (playerDistance / XP_ORB_CONFIG.magnetDistance);
        const acceleration = XP_ORB_CONFIG.accelerationRate * distanceFactor * (deltaTime / 16);
        
        // Accelerate orb toward player
        orb.vx += Math.cos(angle) * acceleration;
        orb.vy += Math.sin(angle) * acceleration;
    }
    
    // Update position based on velocity
    orb.x += orb.vx * (deltaTime / 16);
    orb.y += orb.vy * (deltaTime / 16);
    
    // Apply damping to velocity
    orb.vx *= 0.95;
    orb.vy *= 0.95;
    
    // Check if player touches the orb
    if (playerDistance < XP_ORB_CONFIG.collectionDistance) {
        orb.collected = true;
        orb.collectAnimation = 0;
        orb.collectedX = orb.x;
        orb.collectedY = orb.y;
        
        // Play sound effect
        playCollectionSound(orb.amount);
        
        // Return false so we can animate collection
        return false;
    }
    
    // Update fuzzy particles if enabled
    if (XP_ORB_CONFIG.fuzzyParticlesEnabled && orb.fuzzyParticles) {
        updateFuzzyParticles(orb, deltaTime);
    }
    
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
    const mergeDistance = 20; // Use 20 pixels for merge distance
    
    // Check each orb against others
    for (let i = 0; i < mergedOrbs.length; i++) {
        const orb1 = mergedOrbs[i];
        if (orb1.collected || orb1.merging) continue;
        
        for (let j = i + 1; j < mergedOrbs.length; j++) {
            const orb2 = mergedOrbs[j];
            if (orb2.collected || orb2.merging) continue;
            
            // Calculate distance between orbs
            const dx = orb2.x - orb1.x;
            const dy = orb2.y - orb1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Merge if close enough
            if (distance <= mergeDistance) {
                // Add experience from orb2 to orb1
                const originalAmount = orb1.amount;
                orb1.amount += orb2.amount;
                
                // Update size based on new amount (logarithmic scale)
                const minSize = XP_ORB_CONFIG.minSize;
                const maxSize = XP_ORB_CONFIG.maxSize;
                const sizeRange = maxSize - minSize;
                
                // For merged orbs, calculate appropriate size
                let newSize;
                if (orb1.amount <= 1) {
                    newSize = minSize * 0.7; // Should rarely happen after merge
                } else {
                    // Use logarithmic scaling for a nice visual progression
                    const normalizedAmount = Math.log(orb1.amount) / Math.log(XP_ORB_CONFIG.maxValue);
                    newSize = minSize + sizeRange * Math.min(1, normalizedAmount);
                    
                    // Add a small bonus size to emphasize the merge
                    newSize *= 1.1;
                }
                
                // Add merge animation effect
                orb1.mergeAnimationStart = Date.now();
                orb1.mergeAnimationDuration = 400; // 400ms
                orb1.originalSize = orb1.size;
                orb1.targetSize = newSize;
                orb1.pulseOnMerge = true;
                
                // Mark orb2 as collecting with a merge animation
                orb2.merging = true;
                orb2.mergeTarget = orb1;
                orb2.mergeStartTime = Date.now();
                orb2.mergeDuration = 300; // 300ms animation
                orb2.mergeStartX = orb2.x;
                orb2.mergeStartY = orb2.y;
                
                // Add a slight random offset to the velocity for visual interest
                orb1.vx += (Math.random() - 0.5) * 0.5;
                orb1.vy += (Math.random() - 0.5) * 0.5;
                
                // After merge animation completes, mark as collected
                setTimeout(() => {
                    orb2.collected = true;
                }, 300);
                
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
        this.drawOrb(ctx, cameraX, cameraY);
    }
    
    /**
     * Draw a single orb
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} orb - Experience orb to draw
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    drawOrb(ctx, cameraX, cameraY) {
        for (const orb of this.orbs) {
            const screenX = orb.x - cameraX;
            const screenY = orb.y - cameraY;
            
            // Skip if offscreen
            if (screenX < -50 || screenY < -50 || 
                screenX > ctx.canvas.width + 50 || 
                screenY > ctx.canvas.height + 50) {
                continue;
            }
            
            // Use classic style if set in config
            const useClassicStyle = XP_ORB_CONFIG.renderStyle === 'classic';
            
            if (useClassicStyle) {
                this.drawClassicOrb(ctx, orb, screenX, screenY);
            } else {
                this.drawModernOrb(ctx, orb, screenX, screenY);
            }
        }
    }
    
    /**
     * Draw orb with modern style
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} orb - Experience orb to draw
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawModernOrb(ctx, orb, screenX, screenY) {
        // Calculate glow intensity - enhanced during merge animations
        let glowAlpha = 0.5;
        let glowSize = 1.5;
        
        // If orb is in merge animation, enhance the glow
        if (orb.glowIntensity !== undefined) {
            glowAlpha = Math.min(0.9, 0.5 * orb.glowIntensity);
            glowSize = 1.5 + (orb.glowIntensity * 0.5);
        }
        
        // Draw glow
        ctx.globalAlpha = orb.opacity * glowAlpha;
        ctx.fillStyle = XP_ORB_CONFIG.glowColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, orb.size * orb.scale * glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw orb core
        ctx.globalAlpha = orb.opacity;
        ctx.fillStyle = XP_ORB_CONFIG.baseColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, orb.size * orb.scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a highlight
        ctx.globalAlpha = orb.opacity * 0.7;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(screenX - orb.size * 0.3, screenY - orb.size * 0.3, orb.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw fuzzy particles if enabled
        if (XP_ORB_CONFIG.fuzzyParticlesEnabled && orb.fuzzyParticles) {
            drawFuzzyParticles(ctx, orb, screenX, screenY);
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }
    
    /**
     * Draw orb with classic style
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} orb - Experience orb to draw
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawClassicOrb(ctx, orb, screenX, screenY) {
        // Calculate glow intensity - enhanced during merge animations
        let glowAlpha = 0.5;
        let glowSize = 1.2;
        
        // If orb is in merge animation, enhance the glow
        if (orb.glowIntensity !== undefined) {
            glowAlpha = Math.min(0.8, 0.5 * orb.glowIntensity);
            glowSize = 1.2 + (orb.glowIntensity * 0.3);
        }
        
        // Draw glow
        ctx.globalAlpha = orb.opacity * glowAlpha;
        ctx.fillStyle = XP_ORB_CONFIG.classicGlowColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, orb.size * orb.scale * glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw orb
        ctx.globalAlpha = orb.opacity || 1;
        ctx.fillStyle = XP_ORB_CONFIG.classicBaseColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, orb.size * orb.scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(screenX - orb.size * 0.3, screenY - orb.size * 0.3, orb.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw fuzzy particles
        if (XP_ORB_CONFIG.fuzzyParticlesEnabled && orb.fuzzyParticles) {
            drawFuzzyParticles(ctx, orb, screenX, screenY);
        }
        
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
        
        // Create one orb per experience point, regardless of count parameter
        // This ensures consistency with the individual 1 XP orbs approach
        const orbCount = Math.max(1, totalExp || 1);
        
        // Create orbs in a burst pattern
        for (let i = 0; i < orbCount; i++) {
            // Calculate position in a circular/burst pattern
            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + Math.random() * 20;
            const orbX = x + Math.cos(angle) * distance;
            const orbY = y + Math.sin(angle) * distance;
            
            // Create the orb with 1 experience
            const orb = this.createOrb(orbX, orbY, 1);
            
            // Add some initial velocity away from center
            orb.vx = Math.cos(angle) * (1 + Math.random() * 2);
            orb.vy = Math.sin(angle) * (1 + Math.random() * 2);
            
            orbs.push(orb);
        }
        
        return orbs;
    }

    /**
     * Set the visual style for experience orbs
     * @param {string} style - 'modern' or 'classic'
     */
    setVisualStyle(style) {
        if (style !== 'modern' && style !== 'classic') {
            console.error(`Invalid style: ${style}. Must be 'modern' or 'classic'`);
            return;
        }
        
        XP_ORB_CONFIG.renderStyle = style;
        console.log(`Experience orb visual style set to: ${style}`);
    }

    /**
     * Set whether fuzzy particles are enabled
     * @param {boolean} enabled - Whether fuzzy particles should be enabled
     */
    setFuzzyParticlesEnabled(enabled) {
        XP_ORB_CONFIG.fuzzyParticlesEnabled = enabled;
        
        // If enabling particles, initialize them for all existing orbs that don't have them
        if (enabled) {
            for (const orb of this.orbs) {
                if (!orb.fuzzyParticles) {
                    orb.fuzzyParticles = [];
                    orb.lastFuzzyParticleTime = Date.now();
                    initFuzzyParticles(orb);
                }
            }
        }
        
        console.log(`Experience orb fuzzy particles ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Make experienceOrbs available globally for backward compatibility
window.ExperienceOrbs = experienceOrbs;
window.ExperienceOrbManager = ExperienceOrbManager;

// Export the experienceOrbs object as default
export default experienceOrbs;

// Expose mergeExperienceOrbs on the global ExperienceOrbManager for use by other implementations
if (window.ExperienceOrbManager) {
    window.ExperienceOrbManager.mergeExperienceOrbs = mergeExperienceOrbs;
}

/**
 * Initialize fuzzy particles for an orb
 * @param {Object} orb - The experience orb
 */
function initFuzzyParticles(orb) {
    // Calculate particle count based on orb value
    const baseCount = XP_ORB_CONFIG.fuzzyParticleCount;
    
    // Smaller orbs (1 XP) get fewer particles
    let particleCount;
    if (orb.amount <= 1) {
        particleCount = Math.max(2, Math.floor(baseCount * 0.7));
    } else {
        particleCount = Math.max(3, Math.min(15, Math.floor(baseCount * (1 + orb.amount / 100))));
    }
    
    // Create initial particles
    for (let i = 0; i < particleCount; i++) {
        createFuzzyParticle(orb);
    }
}

/**
 * Create a fuzzy particle for an orb
 * @param {Object} orb - The experience orb
 */
function createFuzzyParticle(orb) {
    // Random angle and distance from orb center
    const angle = Math.random() * Math.PI * 2;
    
    // Scale distance based on orb size
    const distanceScale = orb.amount <= 1 ? 0.8 : 1.0;
    const distance = orb.size * (0.5 + Math.random() * 1.5) * distanceScale;
    
    // Get config values
    const sizeConfig = XP_ORB_CONFIG.fuzzyParticleSize;
    const alphaConfig = XP_ORB_CONFIG.fuzzyParticleAlpha;
    const lifetimeConfig = XP_ORB_CONFIG.fuzzyParticleLifetime;
    
    // Scale size based on orb amount
    const sizeScale = orb.amount <= 1 ? 0.7 : 1.0;
    const particleSize = (sizeConfig.min + Math.random() * (sizeConfig.max - sizeConfig.min)) * sizeScale;
    
    // Create particle
    const particle = {
        offsetX: Math.cos(angle) * distance,
        offsetY: Math.sin(angle) * distance,
        size: particleSize,
        alpha: alphaConfig.min + Math.random() * (alphaConfig.max - alphaConfig.min),
        speed: 0.05 + Math.random() * 0.1,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        pulseSpeed: 0.002 + Math.random() * 0.003,
        pulseAmount: 0.1 + Math.random() * 0.2,
        startTime: Date.now(),
        lifetime: lifetimeConfig.min + Math.random() * (lifetimeConfig.max - lifetimeConfig.min)
    };
    
    // Add color based on orb style
    if (XP_ORB_CONFIG.renderStyle === 'classic') {
        const green = Math.min(255, Math.floor(200 + Math.random() * 55));
        particle.color = `rgba(100, ${green}, 120, ${particle.alpha})`;
    } else {
        // For modern style, derive from the configured color
        const baseColor = XP_ORB_CONFIG.baseColor;
        
        // Create variations of the color
        const r = 0;
        const g = 200 + Math.floor(Math.random() * 55);
        const b = 0;
        
        particle.color = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`;
    }
    
    // Add to orb's particles array
    orb.fuzzyParticles.push(particle);
}

/**
 * Update fuzzy particles for an orb
 * @param {Object} orb - The experience orb
 * @param {number} deltaTime - Time elapsed since last update
 */
function updateFuzzyParticles(orb, deltaTime) {
    if (!XP_ORB_CONFIG.fuzzyParticlesEnabled || !orb.fuzzyParticles) return;
    
    const now = Date.now();
    
    // Create new particle occasionally
    if (now - orb.lastFuzzyParticleTime > 200) {
        createFuzzyParticle(orb);
        orb.lastFuzzyParticleTime = now;
        
        // Limit total particles
        const maxParticles = 15;
        if (orb.fuzzyParticles.length > maxParticles) {
            orb.fuzzyParticles.shift(); // Remove oldest particle
        }
    }
    
    // Update existing particles
    for (let i = orb.fuzzyParticles.length - 1; i >= 0; i--) {
        const particle = orb.fuzzyParticles[i];
        
        // Check for expiration
        if (now - particle.startTime > particle.lifetime) {
            orb.fuzzyParticles.splice(i, 1);
            continue;
        }
        
        // Update position (orbit-like motion)
        particle.angle += particle.rotationSpeed * (deltaTime / 16);
        
        // Calculate pulse effect
        const pulseTime = now * particle.pulseSpeed;
        const pulse = Math.sin(pulseTime) * particle.pulseAmount;
        
        // Update position based on angle and distance
        const distance = orb.size * (0.8 + pulse);
        particle.offsetX = Math.cos(particle.angle) * distance;
        particle.offsetY = Math.sin(particle.angle) * distance;
        
        // Update alpha based on lifetime
        const lifeProgress = (now - particle.startTime) / particle.lifetime;
        if (lifeProgress > 0.7) {
            // Fade out near end of life
            particle.alpha = XP_ORB_CONFIG.fuzzyParticleAlpha.max * (1 - ((lifeProgress - 0.7) / 0.3));
        }
    }
}

/**
 * Draw fuzzy particles for an orb
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} orb - Experience orb
 * @param {number} screenX - Screen X position
 * @param {number} screenY - Screen Y position
 */
function drawFuzzyParticles(ctx, orb, screenX, screenY) {
    if (!XP_ORB_CONFIG.fuzzyParticlesEnabled || !orb.fuzzyParticles || orb.fuzzyParticles.length === 0) {
        return;
    }
    
    for (const particle of orb.fuzzyParticles) {
        const particleX = screenX + particle.offsetX;
        const particleY = screenY + particle.offsetY;
        
        ctx.globalAlpha = particle.alpha * (orb.opacity || 1);
        ctx.fillStyle = particle.color;
        
        // Draw the particle
        ctx.beginPath();
        ctx.arc(particleX, particleY, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Reset alpha
    ctx.globalAlpha = 1;
}   