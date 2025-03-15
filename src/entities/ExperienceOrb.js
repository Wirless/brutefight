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
        // Make 1 XP orbs smaller to emphasize growth when merging
        if (this.value <= 1) {
            this.size = Math.max(3, Math.min(5, Math.sqrt(this.value) * 2));
        } else {
            this.size = Math.max(5, Math.min(15, Math.sqrt(this.value) * 2));
        }
        this.baseColor = options.color || '#3498db';
        this.glowColor = options.glowColor || '#85c0f9';
        this.pulseSpeed = options.pulseSpeed || 0.003;
        this.rotationSpeed = options.rotationSpeed || 0.001;
        this.renderStyle = options.renderStyle || 'modern'; // 'modern' or 'classic'
        
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
        
        // Fuzzy particles
        this.fuzzyParticles = [];
        this.fuzzyParticleCount = options.fuzzyParticleCount || Math.floor(5 + (this.value / 10));
        this.lastFuzzyParticleTime = Date.now();
        this.fuzzyParticleInterval = options.fuzzyParticleInterval || 100;
        this.fuzzyParticlesEnabled = options.fuzzyParticlesEnabled !== undefined ? options.fuzzyParticlesEnabled : true;
        this.initFuzzyParticles();
        
        // Classic style properties
        if (this.renderStyle === 'classic') {
            const greenIntensity = Math.min(255, 200 + (this.value * 5));
            this.baseColor = `rgb(0, ${greenIntensity}, 100)`;
            this.glowColor = `rgba(0, 255, 100, 0.5)`;
            this.particles = [];
            this.lastParticleTime = 0;
            this.particleInterval = 100 + Math.random() * 100;
        }
        
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
            
            // If using classic style, create particles on collection
            if (this.renderStyle === 'classic' && this.particles) {
                this.createCollectionParticles();
            }
            
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
        
        // Update classic style particles if needed
        if (this.renderStyle === 'classic' && this.particles) {
            this.updateClassicParticles(deltaTime);
        }
        
        // Update fuzzy particles
        this.updateFuzzyParticles(deltaTime);
        
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
        
        // Don't directly add experience to player anymore
        // Experience will be added by ExperienceOrbManager on full collection
        
        // Play sound if available
        try {
            if (window.game && window.game.assetLoader) {
                const isLargeAmount = this.value >= 10;
                window.game.assetLoader.playSound(isLargeAmount ? 'levelUp' : 'expPickup', 0.3);
            } else if (window.audioContext) {
                // Try to play sound directly if assetLoader is not available
                const isLargeAmount = this.value >= 10;
                const soundName = isLargeAmount ? 'sounds/levelup.mp3' : 'sounds/collect.mp3';
                const sound = window.soundsCache && window.soundsCache[soundName] ? 
                    window.soundsCache[soundName].cloneNode() : new Audio(soundName);
                sound.volume = 0.3;
                sound.play().catch(err => console.log('Sound play failed:', err));
            }
        } catch (error) {
            console.error("Error playing sound:", error);
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
        
        if (this.renderStyle === 'classic') {
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
        ctx.globalAlpha = this.alpha;
        
        // Draw glow
        ctx.beginPath();
        const glowSize = this.size * 0.6;
        ctx.arc(screenX, screenY, this.size + glowSize, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            screenX, screenY, this.size,
            screenX, screenY, this.size + glowSize
        );
        gradient.addColorStop(0, `rgba(0, 255, 100, ${this.alpha})`);
        gradient.addColorStop(1, 'rgba(0, 255, 100, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw orb
        ctx.fillStyle = this.baseColor;
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
     * Update classic style particles
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateClassicParticles(deltaTime) {
        // Create trail particles occasionally
        const now = Date.now();
        if (now - this.lastParticleTime > this.particleInterval) {
            this.createTrailParticle();
            this.lastParticleTime = now;
        }
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Move particle
            particle.x += particle.vx * (deltaTime / 16);
            particle.y += particle.vy * (deltaTime / 16);
            
            // Fade out
            particle.opacity = particle.life / particle.maxLife;
        }
    }
    
    /**
     * Create a trail particle for classic style
     */
    createTrailParticle() {
        this.particles.push({
            x: this.x,
            y: this.y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: 1 + Math.random() * 2,
            color: 'rgb(0, 255, 100)',
            opacity: 0.7,
            life: 300 + Math.random() * 200,
            maxLife: 500
        });
    }
    
    /**
     * Create particle burst on collection for classic style
     */
    createCollectionParticles() {
        // Create particle burst when collected
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                radius: 2 + Math.random() * 2,
                color: 'rgb(0, 255, 100)',
                opacity: 1,
                life: 300 + Math.random() * 200,
                maxLife: 500
            });
        }
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
        if (this.renderStyle === 'classic') {
            const green = Math.min(255, Math.floor(200 + Math.random() * 55));
            particle.color = `rgba(100, ${green}, 120, ${particle.alpha})`;
        } else {
            // For modern style, derive from the orb's base color
            const baseColor = this.baseColor.startsWith('#') ? 
                this.baseColor : 
                this.baseColor || '#3498db';
                
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
            
            ctx.globalAlpha = particle.alpha * this.alpha; // Apply orb alpha to particles
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
        this.orbs = [];
        
        // Visual style options
        this.defaultRenderStyle = options.renderStyle || 'modern'; // 'modern' or 'classic'
        
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
            renderStyle: options.renderStyle || this.defaultRenderStyle,
            ...options
        });
        
        this.orbs.push(orb);
        return orb;
    }
    
    /**
     * Toggle the visual style of all orbs
     * @param {string} style - 'modern' or 'classic'
     */
    setVisualStyle(style) {
        if (style !== 'modern' && style !== 'classic') {
            console.error(`Invalid style: ${style}. Must be 'modern' or 'classic'`);
            return;
        }
        
        this.defaultRenderStyle = style;
        
        // Update existing orbs
        for (const orb of this.orbs) {
            orb.renderStyle = style;
            
            // Initialize classic style properties if needed
            if (style === 'classic' && !orb.particles) {
                const greenIntensity = Math.min(255, 200 + (orb.value * 5));
                orb.baseColor = `rgb(0, ${greenIntensity}, 100)`;
                orb.glowColor = `rgba(0, 255, 100, 0.5)`;
                orb.particles = [];
                orb.lastParticleTime = 0;
                orb.particleInterval = 100 + Math.random() * 100;
            }
        }
        
        console.log(`Experience orb visual style set to: ${style}`);
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
        
        // Create one orb per experience point
        const orbCount = Math.max(1, totalValue);
        
        for (let i = 0; i < orbCount; i++) {
            // Create orb with random offset in a burst pattern
            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + Math.random() * 20;
            const orbX = x + Math.cos(angle) * distance;
            const orbY = y + Math.sin(angle) * distance;
            
            // Create with 1 XP and random initial velocity
            const orb = this.createExpOrb(orbX, orbY, 1, {
                randomVelocity: true,
                ...options
            });
            
            // Add some initial velocity for the burst effect
            orb.vx = Math.cos(angle) * (1 + Math.random() * 2);
            orb.vy = Math.sin(angle) * (1 + Math.random() * 2);
            
            orbs.push(orb);
        }
        
        return orbs;
    }
    
    /**
     * Update all orbs
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        const players = this.game.playerManager ? this.game.playerManager.getPlayers() : [];
        
        // Merge nearby orbs before updating them
        // Try to use the mergeExperienceOrbs function if available
        if (window.ExperienceOrbManager && window.ExperienceOrbManager.mergeExperienceOrbs) {
            this.orbs = window.ExperienceOrbManager.mergeExperienceOrbs(this.orbs);
        }
        
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