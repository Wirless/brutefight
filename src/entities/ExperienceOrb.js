/**
 * ExperienceOrb.js
 * 
 * Represents an experience orb entity in the game world,
 * handling orb properties, rendering, and interactions.
 */
class ExperienceOrb {
    /**
     * @param {Object} options - Experience orb options
     */
    constructor(options = {}) {
        // Core properties
        this.id = options.id || `xp_${Math.floor(Math.random() * 1000000)}`;
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.value = options.value || 5;
        
        // Appearance
        this.size = Math.max(5, Math.min(15, Math.sqrt(this.value) * 2));
        this.baseColor = options.color || '#3498db';
        this.glowColor = options.glowColor || '#85c0f9';
        this.pulseSpeed = options.pulseSpeed || 0.003;
        this.rotationSpeed = options.rotationSpeed || 0.001;
        
        // Physics
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.maxSpeed = options.maxSpeed || 5;
        this.friction = options.friction || 0.98;
        this.gravity = options.gravity || 0.1;
        this.bounce = options.bounce || 0.6;
        
        // State
        this.isCollected = false;
        this.collectTime = 0;
        this.collectDuration = 500; // ms
        this.lifeDuration = options.lifeDuration || 30000; // 30 seconds
        this.createdAt = Date.now();
        this.expireTime = this.createdAt + this.lifeDuration;
        this.magnetized = false;
        this.magnetTarget = null;
        this.magnetRange = options.magnetRange || 150;
        this.magnetForce = options.magnetForce || 0.5;
        
        // Animation
        this.animationOffset = Math.random() * Math.PI * 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.scale = 1.0;
        this.alpha = 1.0;
        
        // Generate initial velocity in random direction
        if (options.randomVelocity !== false) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        }
    }
    
    /**
     * Update orb state
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Array} players - Array of players to check for magnetization
     */
    update(deltaTime, players = []) {
        const now = Date.now();
        
        // Check if collected
        if (this.isCollected) {
            const collectProgress = (now - this.collectTime) / this.collectDuration;
            if (collectProgress >= 1) {
                return true; // Fully collected, should be removed
            }
            
            // Animate collection
            this.scale = 1 - collectProgress;
            this.alpha = 1 - collectProgress;
            return false;
        }
        
        // Check if expired
        if (now > this.expireTime) {
            // Fade out
            const fadeTime = 1000; // 1 second fade
            const fadeProgress = Math.min(1, (now - (this.expireTime - fadeTime)) / fadeTime);
            
            if (fadeProgress >= 1) {
                return true; // Fully faded, should be removed
            }
            
            this.alpha = 1 - fadeProgress;
        }
        
        // Check for magnetization to players
        if (!this.magnetized) {
            this.checkMagnetization(players);
        }
        
        // Update physics
        this.updatePhysics(deltaTime);
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        return false; // Not ready to be removed
    }
    
    /**
     * Update orb physics
     * @param {number} deltaTime - Time elapsed since last update
     */
    updatePhysics(deltaTime) {
        // If magnetized, move towards target
        if (this.magnetized && this.magnetTarget) {
            const dx = this.magnetTarget.x - this.x;
            const dy = this.magnetTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 10) {
                // Close enough to collect
                this.collect(this.magnetTarget);
                return;
            }
            
            // Move towards player with increasing force as it gets closer
            const force = this.magnetForce * (1 + (this.magnetRange - distance) / this.magnetRange);
            
            this.vx += dx / distance * force;
            this.vy += dy / distance * force;
        } else {
            // Apply gravity
            this.vy += this.gravity * deltaTime;
        }
        
        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // World boundaries (assuming a world with bounds -5000 to 5000 for both x and y)
        const worldBounds = {
            minX: -5000, maxX: 5000,
            minY: -5000, maxY: 5000
        };
        
        // Bounce off world edges
        if (this.x - this.size < worldBounds.minX) {
            this.x = worldBounds.minX + this.size;
            this.vx = Math.abs(this.vx) * this.bounce;
        } else if (this.x + this.size > worldBounds.maxX) {
            this.x = worldBounds.maxX - this.size;
            this.vx = -Math.abs(this.vx) * this.bounce;
        }
        
        if (this.y - this.size < worldBounds.minY) {
            this.y = worldBounds.minY + this.size;
            this.vy = Math.abs(this.vy) * this.bounce;
        } else if (this.y + this.size > worldBounds.maxY) {
            this.y = worldBounds.maxY - this.size;
            this.vy = -Math.abs(this.vy) * this.bounce;
        }
    }
    
    /**
     * Update animation state
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateAnimation(deltaTime) {
        // Update rotation
        this.rotation += this.rotationSpeed * (deltaTime * 60);
    }
    
    /**
     * Check if orb should be magnetized to any player
     * @param {Array} players - Array of players to check
     */
    checkMagnetization(players) {
        for (const player of players) {
            if (!player.isCurrentPlayer) continue; // Only magnetize to current player
            
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.magnetRange) {
                this.magnetized = true;
                this.magnetTarget = player;
                break;
            }
        }
    }
    
    /**
     * Collect the orb
     * @param {Object} player - Player collecting the orb
     */
    collect(player) {
        if (this.isCollected) return;
        
        this.isCollected = true;
        this.collectTime = Date.now();
        
        // Add experience to player
        if (player.addExperience) {
            const didLevelUp = player.addExperience(this.value);
            
            // Play sound if available
            if (window.game && window.game.assetLoader) {
                window.game.assetLoader.playSound(didLevelUp ? 'levelUp' : 'expPickup', 0.3);
            }
        }
    }
    
    /**
     * Check if orb collides with player
     * @param {Object} player - Player to check collision with
     * @returns {boolean} - Whether there is a collision
     */
    checkCollision(player) {
        if (this.isCollected) return false;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < player.radius + this.size;
    }
    
    /**
     * Draw the experience orb
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraX, cameraY) {
        if (this.isCollected && this.alpha <= 0) return;
        
        // Convert world coordinates to screen coordinates
        const screenX = this.x - Math.floor(cameraX);
        const screenY = this.y - Math.floor(cameraY);
        
        // Only draw if visible on screen (with margin)
        if (screenX < -50 || screenX > ctx.canvas.width + 50 || 
            screenY < -50 || screenY > ctx.canvas.height + 50) {
            return;
        }
        
        // Save context state
        ctx.save();
        
        // Apply alpha for fade effects
        ctx.globalAlpha = this.alpha;
        
        // Apply scale
        ctx.translate(screenX, screenY);
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 5, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Calculate pulse effect
        const time = Date.now() * this.pulseSpeed;
        const pulse = 0.2 + (Math.sin(time + this.animationOffset) * 0.1);
        
        // Draw outer glow
        const gradient = ctx.createRadialGradient(
            0, 0, this.size * 0.5,
            0, 0, this.size * (1.5 + pulse)
        );
        gradient.addColorStop(0, this.glowColor);
        gradient.addColorStop(1, 'rgba(133, 192, 249, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * (1.5 + pulse), 0, Math.PI * 2);
        ctx.fill();
        
        // Draw inner orb
        ctx.fillStyle = this.baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * (0.8 + pulse * 0.2), 0, Math.PI * 2);
        ctx.fill();
        
        // Draw shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(-this.size * 0.3, -this.size * 0.3, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Restore context state
        ctx.restore();
        
        // Draw XP value text
        if (this.value >= 10) {
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Add shadow to make text readable
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            ctx.fillText(`+${this.value}`, screenX, screenY - this.size - 10);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    }
}

/**
 * ExperienceOrbManager
 * 
 * Manages creation, update, and rendering of experience orbs
 */
class ExperienceOrbManager {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        this.orbs = [];
        
        // Make globally available
        window.expOrbManager = this;
    }
    
    /**
     * Initialize the manager
     * @returns {ExperienceOrbManager} - This instance for chaining
     */
    init() {
        return this;
    }
    
    /**
     * Create a new experience orb
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} value - Experience value
     * @param {Object} options - Additional options
     * @returns {ExperienceOrb} - The created orb
     */
    createExpOrb(x, y, value = 5, options = {}) {
        const orb = new ExperienceOrb({
            x: x,
            y: y,
            value: value,
            ...options
        });
        
        this.orbs.push(orb);
        return orb;
    }
    
    /**
     * Create multiple experience orbs
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} totalValue - Total experience value
     * @param {number} count - Number of orbs to create
     * @param {Object} options - Additional options
     * @returns {Array} - Array of created orbs
     */
    createExpOrbBurst(x, y, totalValue, count = 3, options = {}) {
        const orbs = [];
        
        // Calculate value per orb (with a minimum)
        const minValue = 1;
        let remainingValue = totalValue;
        let remainingCount = count;
        
        for (let i = 0; i < count; i++) {
            // For the last orb, use all remaining value
            let orbValue = (i === count - 1) 
                ? remainingValue 
                : Math.max(minValue, Math.floor(remainingValue / remainingCount));
            
            // Create orb with random offset
            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + Math.random() * 15;
            const orbX = x + Math.cos(angle) * distance;
            const orbY = y + Math.sin(angle) * distance;
            
            // Create with random initial velocity
            const orb = this.createExpOrb(orbX, orbY, orbValue, {
                randomVelocity: true,
                ...options
            });
            
            orbs.push(orb);
            
            // Update remaining value and count
            remainingValue -= orbValue;
            remainingCount--;
        }
        
        return orbs;
    }
    
    /**
     * Update all orbs
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        const players = this.game.playerManager ? this.game.playerManager.getPlayers() : [];
        
        // Update all orbs
        for (let i = this.orbs.length - 1; i >= 0; i--) {
            const orb = this.orbs[i];
            const shouldRemove = orb.update(deltaTime, players);
            
            // Remove if necessary
            if (shouldRemove) {
                this.orbs.splice(i, 1);
                continue;
            }
            
            // Check collision with current player
            if (this.game.myPlayer && !orb.isCollected) {
                if (orb.checkCollision(this.game.myPlayer)) {
                    orb.collect(this.game.myPlayer);
                }
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
            orb.draw(ctx, cameraX, cameraY);
        }
    }
    
    /**
     * Get all orbs
     * @returns {Array} - Array of orbs
     */
    getOrbs() {
        return this.orbs;
    }
    
    /**
     * Clear all orbs
     */
    clearAll() {
        this.orbs = [];
    }
}

// Make classes globally available
window.ExperienceOrb = ExperienceOrb;
window.ExperienceOrbManager = ExperienceOrbManager; 

export default ExperienceOrb;