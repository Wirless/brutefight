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
        this.id = options.id || generateOrbId(); // Unique ID for network synchronization
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.value = options.value || 1;
        this.skillType = options.skillType || 'default';
        
        // Network synchronization
        this.syncedToNetwork = false;
        this.lastSyncTime = 0;
        this.syncInterval = 200; // Sync every 200ms
        
        // Movement & physics
        this.vx = options.vx || (Math.random() - 0.5) * 2;
        this.vy = options.vy || (Math.random() - 0.5) * 2 - 2; // Initial upward momentum
        this.gravity = options.gravity || 0.05;
        this.friction = options.friction || 0.98;
        this.bounce = options.bounce || 0.5;
        this.groundY = options.groundY || null; // Optional ground level
        
        // Pickup & collection
        this.collected = false;
        this.isMagnetized = false;
        this.magnetizationSpeed = options.magnetizationSpeed || 0.3;
        this.basePickupRadius = options.basePickupRadius || 10; // Reduced to 10px (will be affected by player's pickup stat)
        this.targetPlayer = null;
        
        // Animation
        this.createdAt = Date.now();
        this.lifetime = options.lifetime || 30000; // 30 seconds
        this.pulseSpeed = options.pulseSpeed || 0.005;
        this.pulseAmount = options.pulseAmount || 0.2;
        this.rotationSpeed = options.rotationSpeed || 0.02;
        this.rotation = Math.random() * Math.PI * 2;
        this.scale = options.scale || 1;
        this.glow = options.glow !== undefined ? options.glow : true;
        
        // Visual style
        this.visualStyle = options.visualStyle || 'modern';
        this.color = options.color || this.getColorForSkill(this.skillType);
        this.size = options.size || this.getSizeForValue(this.value);
        this.opacity = 1.0;
        this.blendMode = options.blendMode || 'source-over';
        
        // Particle effects
        this.fuzzyParticlesEnabled = options.fuzzyParticlesEnabled !== undefined ? 
            options.fuzzyParticlesEnabled : true;
        this.fuzzyParticles = [];
        this.trailParticles = [];
        
        // Initialize fuzzy particles if enabled
        if (this.fuzzyParticlesEnabled) {
            this.initFuzzyParticles();
        }
    }
    
    /**
     * Generate a unique ID for experience orbs
     * @returns {string} - Unique ID
     */
    generateOrbId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    /**
     * Calculate effective pickup radius based on player's pickup stat
     * @param {Object} player - Player object
     * @returns {number} - Effective pickup radius
     */
    calculatePickupRadius(player) {
        // Default if no player or no pickupStat defined
        if (!player || typeof player.pickupStat !== 'number') {
            return this.basePickupRadius;
        }
        
        // Calculate pickup radius: base 10px plus percentage from player's pickup stat
        // If pickup stat is 20, then increase radius by 20%
        return this.basePickupRadius * (1 + (player.pickupStat / 100));
    }
    
    /**
     * Check if the experience orb should be magnetized to the player
     * @param {Array} players - Array of players to check
     */
    checkMagnetization(players) {
        // If already collected, don't change magnetization
        if (this.collected) return;
        
        // If already magnetized to a player, maintain that magnetization
        if (this.isMagnetized && this.targetPlayer) {
            // Check if target player is still close enough to maintain magnetization
            const dx = this.targetPlayer.x - this.x;
            const dy = this.targetPlayer.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If player has moved too far away, release magnetization
            // Use a slightly larger range (1.5x) to avoid flickering
            const effectiveRadius = this.calculatePickupRadius(this.targetPlayer);
            if (distance > effectiveRadius * 1.5) {
                this.isMagnetized = false;
                this.targetPlayer = null;
            }
            return;
        }
        
        // Check all players in the array
        let closestPlayer = null;
        let closestDistance = Infinity;
        
        for (const player of players) {
            // Skip players that don't exist
            if (!player) continue;
            
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const effectiveRadius = this.calculatePickupRadius(player);
            
            // Check if player is within pickup radius - STRICT enforcement
            if (distance <= effectiveRadius && distance < closestDistance) {
                closestPlayer = player;
                closestDistance = distance;
            }
        }
        
        // Magnetize to the closest player if any is in range
        if (closestPlayer) {
            this.isMagnetized = true;
            this.targetPlayer = closestPlayer;
        }
    }
    
    /**
     * Update orb state
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Array} players - Array of players to check for magnetization
     */
    update(deltaTime, players = []) {
        // Skip update if collected
        if (this.collected) return false;
        
        // Check lifecycle
        const age = Date.now() - this.createdAt;
        if (age > this.lifetime) {
            // Fade out in the last second
            const fadeAge = this.lifetime - 1000;
            if (age > fadeAge) {
                this.opacity = 1 - (age - fadeAge) / 1000;
            }
            
            // Remove when completely faded
            if (this.opacity <= 0) {
                return true; // Signal for removal
            }
        }
        
        // Update network synchronization
        this.updateNetworkSync();
        
        // Check for magnetization to any player
        this.checkMagnetization(players);
        
        // Update physics and movement
        if (this.isMagnetized && this.targetPlayer) {
            // Move towards the player
            const dx = this.targetPlayer.x - this.x;
            const dy = this.targetPlayer.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                // Accelerate towards player with increasing speed as it gets closer
                const speed = this.magnetizationSpeed * (1 + (50 / Math.max(1, distance)));
                this.vx = (dx / distance) * speed;
                this.vy = (dy / distance) * speed;
            }
            
            // Check for collection
            if (distance < 20) { // Collection happens when very close
                this.collect(this.targetPlayer);
                return true; // Signal for removal
            }
        } else {
            // Normal physics when not magnetized
            this.updatePhysics(deltaTime);
        }
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update particle effects
        if (this.fuzzyParticlesEnabled) {
            this.updateFuzzyParticles(deltaTime);
        }
        
        // Update trail particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const particle = this.trailParticles[i];
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                this.trailParticles.splice(i, 1);
            } else {
                particle.opacity = particle.life / particle.maxLife;
            }
        }
        
        // Occasionally create trail particles when moving quickly
        if (Math.random() < 0.1 && (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5)) {
            this.createTrailParticle();
        }
        
        return false; // Don't remove
    }
    
    /**
     * Update orb physics
     * @param {number} deltaTime - Time elapsed since last update
     */
    updatePhysics(deltaTime) {
        // Apply gravity
        this.vy += this.gravity * deltaTime;
        
        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;
        
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
     * Collect the orb by a player
     * @param {Object} player - Player that collects the orb
     */
    collect(player) {
        if (this.collected) return;
        
        this.collected = true;
        
        // Create collection particles
        this.createCollectionParticles();
        
        // Apply experience to player
        if (player && typeof player.addExperience === 'function') {
            player.addExperience(this.value);
        }
        
        // Play collection sound
        this.playCollectionSound();
        
        // Notify server of collection if this is networked
        if (window.socket && window.socket.connected) {
            window.socket.emit('collectExpOrb', {
                orbId: this.id,
                playerId: player.id,
                value: this.value
            });
        }
    }
    
    /**
     * Play sound when the orb is collected
     */
    playCollectionSound() {
        try {
            // Volume and pitch based on value
            const volume = Math.min(0.6, 0.3 + (this.value / 100) * 0.3);
            const pitch = Math.min(1.5, 0.8 + (this.value / 100) * 0.7);
            
            // Try to use global sound manager if available
            if (window.audioManager && window.audioManager.playSound) {
                window.audioManager.playSound('exp_collect', volume, pitch);
            } else {
                // Fallback to basic Audio API
                const sound = new Audio('./sounds/exp_collect.mp3');
                sound.volume = volume;
                sound.playbackRate = pitch;
                sound.play().catch(err => console.log('Sound play failed:', err));
            }
        } catch (error) {
            console.error("Error playing collection sound:", error);
        }
    }
    
    /**
     * Create particles for collection effect
     */
    createCollectionParticles() {
        // Add collection particles
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const size = 2 + Math.random() * 3;
            
            if (!this.trailParticles) this.trailParticles = [];
            
            this.trailParticles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: this.color,
                opacity: 0.8,
                life: 300 + Math.random() * 200,
                maxLife: 500
            });
        }
    }
    
    /**
     * Check if orb collides with player
     * @param {Object} player - Player to check collision with
     * @returns {boolean} - Whether there is a collision
     */
    checkCollision(player) {
        if (this.collected) return false;
        
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
        if (this.collected && this.opacity <= 0) return;
        
        // Convert world coordinates to screen coordinates
        const screenX = this.x - Math.floor(cameraX);
        const screenY = this.y - Math.floor(cameraY);
        
        // Only draw if visible on screen (with margin)
        if (screenX < -50 || screenX > ctx.canvas.width + 50 || 
            screenY < -50 || screenY > ctx.canvas.height + 50) {
            return;
        }
        
        if (this.visualStyle === 'classic') {
            this.drawClassicStyle(ctx, screenX, screenY);
        } else {
            this.drawModernStyle(ctx, screenX, screenY);
        }
        
        // Draw fuzzy particles
        this.drawFuzzyParticles(ctx, screenX, screenY);
    }
    
    /**
     * Draw the orb with modern style
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawModernStyle(ctx, screenX, screenY) {
        // Save context state
        ctx.save();
        
        // Apply alpha for fade effects
        ctx.globalAlpha = this.opacity;
        
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
        ctx.fillStyle = this.color;
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
    
    /**
     * Draw the orb with classic style (old visual appearance)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawClassicStyle(ctx, screenX, screenY) {
        // Draw trail particles
        if (this.particles) {
            for (const particle of this.particles) {
                const particleScreenX = particle.x - Math.floor(this.x - screenX);
                const particleScreenY = particle.y - Math.floor(this.y - screenY);
                
                ctx.globalAlpha = particle.opacity * 0.7;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particleScreenX, particleScreenY, particle.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Reset alpha
        ctx.globalAlpha = this.opacity;
        
        // Draw glow
        ctx.beginPath();
        const glowSize = this.size * 0.6;
        ctx.arc(screenX, screenY, this.size + glowSize, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            screenX, screenY, this.size,
            screenX, screenY, this.size + glowSize
        );
        gradient.addColorStop(0, `rgba(0, 255, 100, ${this.opacity})`);
        gradient.addColorStop(1, 'rgba(0, 255, 100, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw orb
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(screenX - this.size * 0.3, screenY - this.size * 0.3, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw XP value text if significant
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
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }
    
    /**
     * Initialize fuzzy particles
     */
    initFuzzyParticles() {
        if (!this.fuzzyParticlesEnabled) return;
        
        // Create initial particles
        for (let i = 0; i < this.fuzzyParticleCount; i++) {
            this.createFuzzyParticle();
        }
    }
    
    /**
     * Create a new fuzzy particle
     */
    createFuzzyParticle() {
        const angle = Math.random() * Math.PI * 2;
        const distance = this.size * (0.5 + Math.random() * 1.5);
        
        // Create with random offset from orb center
        const particle = {
            offsetX: Math.cos(angle) * distance,
            offsetY: Math.sin(angle) * distance,
            size: 0.5 + Math.random() * 1.5,
            alpha: 0.3 + Math.random() * 0.4,
            speed: 0.05 + Math.random() * 0.1,
            angle: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            pulseSpeed: 0.002 + Math.random() * 0.003,
            pulseAmount: 0.1 + Math.random() * 0.2,
            startTime: Date.now(),
            lifetime: 1000 + Math.random() * 2000
        };
        
        // Add color based on orb style
        if (this.visualStyle === 'classic') {
            const green = Math.min(255, Math.floor(200 + Math.random() * 55));
            particle.color = `rgba(100, ${green}, 120, ${particle.alpha})`;
        } else {
            // For modern style, derive from the orb's base color
            const baseColor = this.color.startsWith('#') ? 
                this.color : 
                this.color || '#3498db';
                
            // Slightly vary the particle color from the base
            const r = parseInt(baseColor.substring(1, 3), 16);
            const g = parseInt(baseColor.substring(3, 5), 16);
            const b = parseInt(baseColor.substring(5, 7), 16);
            
            const variance = 30; // Color variance
            const newR = Math.min(255, Math.max(0, r + (Math.random() - 0.5) * variance));
            const newG = Math.min(255, Math.max(0, g + (Math.random() - 0.5) * variance));
            const newB = Math.min(255, Math.max(0, b + (Math.random() - 0.5) * variance));
            
            particle.color = `rgba(${Math.floor(newR)}, ${Math.floor(newG)}, ${Math.floor(newB)}, ${particle.alpha})`;
        }
        
        this.fuzzyParticles.push(particle);
    }
    
    /**
     * Update fuzzy particles
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateFuzzyParticles(deltaTime) {
        if (!this.fuzzyParticlesEnabled) return;
        
        const now = Date.now();
        
        // Create new particles occasionally
        if (now - this.lastFuzzyParticleTime > this.fuzzyParticleInterval) {
            this.createFuzzyParticle();
            this.lastFuzzyParticleTime = now;
        }
        
        // Update existing particles
        for (let i = this.fuzzyParticles.length - 1; i >= 0; i--) {
            const particle = this.fuzzyParticles[i];
            
            // Check for particle expiration
            if (now - particle.startTime > particle.lifetime) {
                this.fuzzyParticles.splice(i, 1);
                continue;
            }
            
            // Update particle position (orbit-like motion)
            particle.angle += particle.rotationSpeed * deltaTime;
            
            // Calculate pulse effect
            const pulseTime = now * particle.pulseSpeed;
            const pulse = Math.sin(pulseTime) * particle.pulseAmount;
            
            // Update position based on angle and distance
            const distance = this.size * (0.8 + pulse);
            particle.offsetX = Math.cos(particle.angle) * distance;
            particle.offsetY = Math.sin(particle.angle) * distance;
            
            // Update alpha based on lifetime
            const lifeProgress = (now - particle.startTime) / particle.lifetime;
            if (lifeProgress > 0.7) {
                // Fade out near end of life
                particle.alpha = 0.7 * (1 - ((lifeProgress - 0.7) / 0.3));
            }
        }
    }
    
    /**
     * Draw fuzzy particles
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawFuzzyParticles(ctx, screenX, screenY) {
        if (!this.fuzzyParticlesEnabled || this.fuzzyParticles.length === 0) return;
        
        for (const particle of this.fuzzyParticles) {
            const particleX = screenX + particle.offsetX;
            const particleY = screenY + particle.offsetY;
            
            ctx.globalAlpha = particle.alpha * this.opacity; // Apply orb opacity to particles
            ctx.fillStyle = particle.color;
            
            // Draw the particle
            ctx.beginPath();
            ctx.arc(particleX, particleY, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }
    
    /**
     * Set whether fuzzy particles are enabled
     * @param {boolean} enabled - Whether fuzzy particles should be enabled
     */
    setFuzzyParticlesEnabled(enabled) {
        // Update the setting for new orbs
        this.fuzzyParticlesEnabled = enabled;
        
        // Update existing orbs
        for (const orb of this.orbs) {
            orb.fuzzyParticlesEnabled = enabled;
            
            // Initialize particles if they're now enabled and don't exist yet
            if (enabled && (!orb.fuzzyParticles || orb.fuzzyParticles.length === 0)) {
                orb.fuzzyParticles = [];
                orb.lastFuzzyParticleTime = Date.now();
                orb.fuzzyParticleCount = Math.floor(5 + (orb.value / 10));
                orb.initFuzzyParticles();
            }
        }
        
        console.log(`Experience orb fuzzy particles ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    // Update network synchronization
    updateNetworkSync() {
        const now = Date.now();
        
        // Only sync at intervals to reduce network traffic
        if (now - this.lastSyncTime > this.syncInterval) {
            this.lastSyncTime = now;
            
            // If we have a socket connection and the orb is not yet synced or has moved significantly
            if (window.socket && window.socket.connected) {
                // Send orb data to server
                window.socket.emit('syncExpOrb', {
                    id: this.id,
                    x: this.x,
                    y: this.y,
                    vx: this.vx,
                    vy: this.vy,
                    value: this.value,
                    skillType: this.skillType,
                    collected: this.collected
                });
                
                this.syncedToNetwork = true;
            }
        }
    }

    /**
     * Create a trail particle
     */
    createTrailParticle() {
        this.trailParticles.push({
            x: this.x,
            y: this.y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: 1 + Math.random() * 2,
            color: this.color,
            opacity: 0.7,
            life: 300 + Math.random() * 200,
            maxLife: 500
        });
    }

    /**
     * Get color for skill type
     * @param {string} skillType - Type of skill 
     * @returns {string} - Color for the skill
     */
    getColorForSkill(skillType) {
        const skillColors = {
            'default': '#3498db',
            'mining': '#cd7f32',
            'woodcutting': '#228B22',
            'combat': '#ff0000',
            'fishing': '#1e90ff'
        };
        
        return skillColors[skillType] || skillColors.default;
    }

    /**
     * Get size based on value
     * @param {number} value - XP value
     * @returns {number} - Size for the orb
     */
    getSizeForValue(value) {
        // Make orbs scale with value, but not linearly
        if (value <= 1) {
            return Math.max(3, Math.min(5, Math.sqrt(value) * 2));
        } else {
            return Math.max(5, Math.min(15, Math.sqrt(value) * 2));
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
     * @param {Object} options - Manager options
     */
    constructor(game, options = {}) {
        this.game = game;
        this.orbs = new Map(); // Use a Map with ID as key for efficient lookup
        this.options = Object.assign({
            maxOrbs: 200,
            visualStyle: 'modern',
            fuzzyParticlesEnabled: true,
            mergeSimilarOrbs: true,
            magnetizationEnabled: true
        }, options);
        
        // Handle incoming network orb sync
        this.setupNetworkListeners();
        
        this.init();
    }
    
    /**
     * Initialize the manager
     */
    init() {
        console.log("Experience Orb Manager initialized");
        
        // Set visual style from saved preferences if available
        if (window.localStorage) {
            const savedStyle = localStorage.getItem('expOrbStyle');
            if (savedStyle) {
                this.setVisualStyle(savedStyle);
            }
            
            const fuzzyParticles = localStorage.getItem('fuzzyParticlesEnabled');
            if (fuzzyParticles !== null) {
                this.setFuzzyParticlesEnabled(fuzzyParticles === 'true');
            }
        }
    }
    
    /**
     * Setup network event listeners for syncing orbs
     */
    setupNetworkListeners() {
        if (window.socket) {
            // Listen for experience orb updates from the server
            window.socket.on('expOrbUpdate', (orbData) => {
                this.handleOrbUpdate(orbData);
            });
            
            // Listen for orb collection events from other players
            window.socket.on('expOrbCollected', (data) => {
                this.handleOrbCollected(data);
            });
        }
    }
    
    /**
     * Handle orb update from network
     * @param {Object} orbData - Orb data from server
     */
    handleOrbUpdate(orbData) {
        // Check if we have this orb already
        if (this.orbs.has(orbData.id)) {
            // Update existing orb
            const orb = this.orbs.get(orbData.id);
            
            // Don't update if the orb is already collected
            if (orb.collected) return;
            
            // Mark as collected if server says it's collected
            if (orbData.collected) {
                orb.collected = true;
                return;
            }
            
            // Update position and velocity if not magnetized to local player
            if (!orb.isMagnetized) {
                orb.x = orbData.x;
                orb.y = orbData.y;
                orb.vx = orbData.vx;
                orb.vy = orbData.vy;
            }
        } else {
            // Create new orb if it's not collected
            if (!orbData.collected) {
                this.createExpOrb(
                    orbData.x, 
                    orbData.y, 
                    orbData.value, 
                    {
                        id: orbData.id,
                        skillType: orbData.skillType,
                        syncedToNetwork: true
                    }
                );
            }
        }
    }
    
    /**
     * Handle orb collected by another player
     * @param {Object} data - Collection data
     */
    handleOrbCollected(data) {
        if (this.orbs.has(data.orbId)) {
            const orb = this.orbs.get(data.orbId);
            
            // Mark as collected
            orb.collected = true;
            
            // Create collection effect
            if (orb.createCollectionParticles) {
                orb.createCollectionParticles();
            }
            
            // Play sound if nearby
            if (this.game && this.game.myPlayer) {
                const dx = this.game.myPlayer.x - orb.x;
                const dy = this.game.myPlayer.y - orb.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 500) {
                    this.playCollectionSound(orb.value);
                }
            }
        }
    }
    
    /**
     * Create an experience orb
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} value - XP value
     * @param {Object} options - Orb options
     * @returns {ExperienceOrb} - The created orb
     */
    createExpOrb(x, y, value = 5, options = {}) {
        // Ensure we don't exceed the maximum number of orbs
        if (this.orbs.size >= this.options.maxOrbs) {
            // Remove the oldest orb
            const oldest = this.orbs.keys().next().value;
            this.orbs.delete(oldest);
        }
        
        // Apply manager settings to orb options
        const orbOptions = Object.assign({}, options, {
            visualStyle: this.options.visualStyle,
            fuzzyParticlesEnabled: this.options.fuzzyParticlesEnabled,
            value: value
        });
        
        // Create the orb
        const orb = new ExperienceOrb(Object.assign({ x, y }, orbOptions));
        
        // Add to orbs map
        this.orbs.set(orb.id, orb);
        
        // Sync to network if socket is available
        if (window.socket && window.socket.connected && !orb.syncedToNetwork) {
            window.socket.emit('createExpOrb', {
                id: orb.id,
                x: orb.x,
                y: orb.y,
                value: orb.value,
                skillType: orb.skillType || 'default'
            });
            
            orb.syncedToNetwork = true;
        }
        
        return orb;
    }
    
    /**
     * Set the visual style for all orbs
     * @param {string} style - 'modern' or 'classic'
     */
    setVisualStyle(style) {
        if (style !== 'modern' && style !== 'classic') {
            console.error(`Invalid experience orb style: ${style}`);
            return;
        }
        
        this.options.visualStyle = style;
        
        // Update all existing orbs
        this.orbs.forEach(orb => {
            orb.visualStyle = style;
        });
        
        // Save preference
        if (window.localStorage) {
            localStorage.setItem('expOrbStyle', style);
        }
        
        console.log(`Experience orb style set to: ${style}`);
    }
    
    /**
     * Create a burst of experience orbs
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} totalValue - Total XP value
     * @param {number} count - Number of orbs to create
     * @param {Object} options - Orb options
     * @returns {Array} - Array of created orbs
     */
    createExpOrbBurst(x, y, totalValue, count = 3, options = {}) {
        const createdOrbs = [];
        
        // Don't create empty orbs
        if (totalValue <= 0) return createdOrbs;
        
        // Make sure count is reasonable
        count = Math.min(Math.max(1, count), 10);
        
        // Distribute value among orbs
        let remaining = totalValue;
        for (let i = 0; i < count; i++) {
            // For the last orb, just use remaining value
            let orbValue;
            if (i === count - 1) {
                orbValue = remaining;
            } else {
                // Randomly distribute, but ensure minimum of 1
                orbValue = Math.max(1, Math.floor(remaining * (0.1 + Math.random() * 0.4)));
            }
            
            remaining -= orbValue;
            
            // Create the orb with random offset
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;
            
            const orb = this.createExpOrb(x + offsetX, y + offsetY, orbValue, options);
            createdOrbs.push(orb);
            
            // If we've distributed all value, stop creating orbs
            if (remaining <= 0) break;
        }
        
        return createdOrbs;
    }
    
    /**
     * Update all orbs
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Get all players to check for magnetization
        let players = [];
        
        // Try to get players from game
        if (this.game) {
            if (this.game.myPlayer) {
                players.push(this.game.myPlayer);
            }
            
            // Also include other players if available
            if (this.game.otherPlayers) {
                players = players.concat(Object.values(this.game.otherPlayers));
            }
        }
        
        // Update each orb
        const orbsToRemove = [];
        
        for (const [id, orb] of this.orbs.entries()) {
            try {
                const shouldRemove = orb.update(deltaTime, players);
                
                if (shouldRemove) {
                    orbsToRemove.push(id);
                }
            } catch (error) {
                console.error(`Error updating experience orb: ${error.message}`);
                orbsToRemove.push(id);
            }
        }
        
        // Remove orbs that need to be removed
        orbsToRemove.forEach(id => {
            this.orbs.delete(id);
        });
        
        // Check for merging similar orbs if enabled
        if (this.options.mergeSimilarOrbs) {
            this.mergeSimilarOrbs();
        }
    }
    
    /**
     * Draw all orbs
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraX, cameraY) {
        for (const orb of this.orbs.values()) {
            orb.draw(ctx, cameraX, cameraY);
        }
    }
    
    /**
     * Get all orbs
     * @returns {Array} - Array of all orbs
     */
    getOrbs() {
        return Array.from(this.orbs.values());
    }
    
    /**
     * Clear all orbs
     */
    clearAll() {
        this.orbs.clear();
    }
    
    /**
     * Enable or disable fuzzy particles for all orbs
     * @param {boolean} enabled - Whether fuzzy particles should be enabled
     */
    setFuzzyParticlesEnabled(enabled) {
        this.options.fuzzyParticlesEnabled = enabled;
        
        // Update all existing orbs
        this.orbs.forEach(orb => {
            orb.setFuzzyParticlesEnabled(enabled);
        });
        
        // Save preference
        if (window.localStorage) {
            localStorage.setItem('fuzzyParticlesEnabled', enabled.toString());
        }
        
        console.log(`Experience orb fuzzy particles ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Merge similar orbs that are close to each other
     */
    mergeSimilarOrbs() {
        // Get all orbs as an array
        const orbsArray = Array.from(this.orbs.values());
        
        // Track orbs to remove
        const orbsToRemove = new Set();
        
        for (let i = 0; i < orbsArray.length; i++) {
            const orb1 = orbsArray[i];
            
            // Skip if this orb is already marked for removal or collected
            if (orbsToRemove.has(orb1.id) || orb1.collected) continue;
            
            for (let j = i + 1; j < orbsArray.length; j++) {
                const orb2 = orbsArray[j];
                
                // Skip if this orb is already marked for removal or collected
                if (orbsToRemove.has(orb2.id) || orb2.collected) continue;
                
                // Check if orbs are of the same type
                if (orb1.skillType === orb2.skillType) {
                    // Check if orbs are close to each other
                    const dx = orb1.x - orb2.x;
                    const dy = orb1.y - orb2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // If they're close, merge them
                    if (distance < 15) {
                        // Add second orb's value to first orb
                        orb1.value += orb2.value;
                        
                        // Update size based on new value
                        orb1.size = orb1.getSizeForValue(orb1.value);
                        
                        // Mark second orb for removal
                        orbsToRemove.add(orb2.id);
                    }
                }
            }
        }
        
        // Remove orbs marked for removal
        orbsToRemove.forEach(id => {
            this.orbs.delete(id);
        });
    }
    
    /**
     * Play sound when an orb is collected
     * @param {number} amount - Experience amount
     */
    playCollectionSound(amount) {
        try {
            // Volume and pitch based on amount
            const volume = Math.min(0.6, 0.3 + (amount / 100) * 0.3);
            const pitch = Math.min(1.5, 0.8 + (amount / 100) * 0.7);
            
            // Try to use global sound manager if available
            if (window.audioManager && window.audioManager.playSound) {
                window.audioManager.playSound('exp_collect', volume, pitch);
            } else {
                // Fallback to basic Audio API
                const sound = new Audio('./sounds/exp_collect.mp3');
                sound.volume = volume;
                sound.playbackRate = pitch;
                sound.play().catch(err => console.log('Sound play failed:', err));
            }
        } catch (error) {
            console.error("Error playing experience collect sound:", error);
        }
    }
}

// Make classes globally available
window.ExperienceOrb = ExperienceOrb;
window.ExperienceOrbManager = ExperienceOrbManager; 

export default ExperienceOrb;