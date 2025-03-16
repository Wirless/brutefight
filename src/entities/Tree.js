/**
 * Tree.js
 * 
 * Represents a tree entity in the game world,
 * handling tree properties, rendering, and interactions.
 */
class Tree {
    /**
     * @param {Object} options - Tree options
     */
    constructor(x, y, type, id) {
        // Handle different constructor signatures for backward compatibility
        let options = {};
        
        if (typeof x === 'object') {
            // Original constructor with options object
            options = x;
        } else {
            // New constructor with individual parameters
            options = {
                x: x,
                y: y,
                type: type || 'oak',
                id: id || Math.floor(Math.random() * 1000000)
            };
        }
        
        // Core properties
        this.id = options.id || Math.floor(Math.random() * 1000000);
        this.type = options.type || 'oak';
        this.name = options.name || (options.type === 'pine' ? 'Pine Tree' : 'Oak Tree');
        this.x = options.x || 0;
        this.y = options.y || 0;
        
        // Appearance
        this.trunkColor = options.trunkColor || '#8B4513';
        this.leavesColor = options.leavesColor || '#228B22';
        this.trunkWidth = options.trunkWidth || 20;
        this.trunkHeight = options.trunkHeight || 60;
        this.leavesRadius = options.leavesRadius || 40;
        this.shadowColor = options.shadowColor || 'rgba(0, 0, 0, 0.3)';
        
        // Gameplay properties
        this.health = options.health || (options.type === 'pine' ? 120 : 100);
        this.maxHealth = options.maxHealth || (options.type === 'pine' ? 120 : 100);
        this.hardness = options.hardness || (options.type === 'pine' ? 1.2 : 1);
        this.yield = options.yield || (options.type === 'pine' ? 3 : 1);
        this.expValue = options.expValue || (options.type === 'pine' ? 12 : 10);
        this.respawnTime = options.respawnTime || (options.type === 'pine' ? 360000 : 300000); // 6 min for pine, 5 min for others
        
        // State
        this.chopped = false;
        this.lastHitTime = 0;
        this.hitEffectDuration = 500; // ms
        
        // Animation
        this.swayAmount = options.swayAmount || (options.type === 'pine' ? 1.5 : 2);
        this.swaySpeed = options.swaySpeed || 0.001;
        this.swayOffset = Math.random() * Math.PI * 2;
        
        // Falling animation properties
        this.isFalling = false;
        this.fallStartTime = 0;
        this.fallDuration = 2000; // 2 seconds for full fall
        this.fallAngle = 0; // Current fall angle
        this.fallDirection = Math.random() > 0.5 ? 1 : -1; // Random direction (1 = right, -1 = left)
        this.maxFallAngle = Math.PI / 2; // 90 degrees
        this.opacity = 1.0;
        this.smokeParticles = [];
    }
    
    /**
     * Update tree state
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update hit effect
        if (Date.now() - this.lastHitTime > this.hitEffectDuration) {
            // No longer showing hit effect
        }
        
        // Update falling animation if active
        if (this.isFalling) {
            const fallProgress = this.getFallProgress();
            
            // Update fall angle
            this.fallAngle = this.maxFallAngle * fallProgress;
            
            // Update opacity - start fading at 50% through the animation
            if (fallProgress > 0.5) {
                this.opacity = 1.0 - ((fallProgress - 0.5) * 2); // From 1.0 to 0.0 in the second half
            }
            
            // Update smoke particles
            this.updateSmokeParticles(deltaTime);
            
            // Generate new smoke particles
            if (fallProgress < 0.8 && Math.random() < 0.2) {
                this.createSmokeParticle();
            }
            
            // Check if animation is complete
            if (fallProgress >= 1.0) {
                this.completeChop();
            }
        }
    }
    
    /**
     * Get the progress of the falling animation (0.0 to 1.0)
     * @returns {number} - Fall progress 
     */
    getFallProgress() {
        if (!this.isFalling) return 0;
        
        const elapsedTime = Date.now() - this.fallStartTime;
        return Math.min(1.0, elapsedTime / this.fallDuration);
    }
    
    /**
     * Create a smoke particle for the falling animation
     */
    createSmokeParticle() {
        // Calculate position based on fall angle
        const fallProgress = this.getFallProgress();
        const pivotX = this.x;
        const pivotY = this.y + this.trunkHeight / 2;
        
        // Position particle somewhere along the tree
        const treeOffset = Math.random() * this.trunkHeight;
        const particleX = pivotX + Math.sin(this.fallAngle * this.fallDirection) * treeOffset;
        const particleY = pivotY - Math.cos(this.fallAngle * this.fallDirection) * treeOffset;
        
        // Add some random offset
        const offsetX = (Math.random() - 0.5) * 10;
        const offsetY = (Math.random() - 0.5) * 10;
        
        this.smokeParticles.push({
            x: particleX + offsetX,
            y: particleY + offsetY,
            size: 5 + Math.random() * 10,
            opacity: 0.7 + Math.random() * 0.3,
            lifetime: 1000 + Math.random() * 1000,
            createdAt: Date.now(),
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.5 - Math.random() * 0.5,
            growRate: 0.05 + Math.random() * 0.1
        });
    }
    
    /**
     * Update smoke particles for falling animation
     * @param {number} deltaTime - Time since last update
     */
    updateSmokeParticles(deltaTime) {
        // Update existing particles
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const particle = this.smokeParticles[i];
            const age = Date.now() - particle.createdAt;
            
            // Remove particles that have exceeded their lifetime
            if (age >= particle.lifetime) {
                this.smokeParticles.splice(i, 1);
                continue;
            }
            
            // Calculate progress (0 to 1)
            const progress = age / particle.lifetime;
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Slow down movement as particle ages
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            // Increase size
            particle.size += particle.growRate;
            
            // Fade out
            if (progress > 0.7) {
                particle.opacity = 0.7 * (1 - ((progress - 0.7) / 0.3));
            }
        }
    }
    
    /**
     * Draw the tree
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    draw(ctx, screenX, screenY) {
        if (this.chopped && !this.isFalling) return;
        
        // Save the context so we can restore after rotation
        ctx.save();
        
        // For falling trees, apply rotation and opacity
        if (this.isFalling) {
            // Set the pivot point at the bottom of the trunk
            const pivotX = screenX;
            const pivotY = screenY + this.trunkHeight / 2;
            
            // Translate to pivot, rotate, then translate back
            ctx.translate(pivotX, pivotY);
            ctx.rotate(this.fallAngle * this.fallDirection);
            ctx.translate(-pivotX, -pivotY);
            
            // Apply opacity
            ctx.globalAlpha = this.opacity;
            
            // Draw smoke particles first so they appear behind the tree
            this.drawSmokeParticles(ctx, screenX, screenY);
        }
        
        // Calculate sway effect
        const time = Date.now() * this.swaySpeed;
        const sway = Math.sin(time + this.swayOffset) * this.swayAmount;
        
        // Is the tree being hit?
        const isHit = Date.now() - this.lastHitTime < this.hitEffectDuration;
        
        // Draw tree shadow
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        ctx.ellipse(
            screenX,
            screenY + this.trunkHeight - 10,
            this.trunkWidth * 0.8,
            this.trunkWidth * 0.4,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw trunk
        ctx.fillStyle = isHit ? this.getHitColor(this.trunkColor) : this.trunkColor;
        ctx.beginPath();
        ctx.rect(
            screenX + sway - this.trunkWidth / 2,
            screenY,
            this.trunkWidth,
            this.trunkHeight
        );
        ctx.fill();
        
        // Trunk outline
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw pine needle sections (conical shape)
        ctx.fillStyle = isHit ? this.getHitColor(this.leavesColor) : this.leavesColor;
        
        const sections = 4;
        const sectionHeight = this.leavesRadius * 0.8;
        
        for (let i = 0; i < sections; i++) {
            const y1 = screenY - (i * sectionHeight);
            const width = this.leavesRadius * 2 * ((sections - i) / sections);
            
            ctx.beginPath();
            ctx.moveTo(screenX + sway, y1 - sectionHeight);
            ctx.lineTo(screenX + sway - width / 2, y1);
            ctx.lineTo(screenX + sway + width / 2, y1);
            ctx.closePath();
            ctx.fill();
            
            // Outline
            ctx.strokeStyle = '#004d00';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Draw pine texture
        if (!isHit) {
            // Trunk texture
            ctx.strokeStyle = 'rgba(77, 38, 0, 0.5)';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < 6; i++) {
                const yOffset = i * (this.trunkHeight / 7) + this.trunkHeight / 14;
                
                ctx.beginPath();
                ctx.moveTo(screenX + sway - this.trunkWidth / 2 + 2, screenY + yOffset);
                ctx.lineTo(screenX + sway + this.trunkWidth / 2 - 2, screenY + yOffset);
                ctx.stroke();
            }
            
            // Needle details
            ctx.fillStyle = 'rgba(0, 60, 0, 0.4)';
            
            for (let i = 0; i < sections; i++) {
                const y1 = screenY - (i * sectionHeight);
                const width = this.leavesRadius * 2 * ((sections - i) / sections);
                
                for (let j = 0; j < 5; j++) {
                    const x1 = screenX + sway - width / 2 + (j + 1) * width / 6;
                    const y2 = y1 - (sectionHeight / 5) * (j % 3);
                    
                    ctx.beginPath();
                    ctx.arc(x1, y2, 4 + Math.random() * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Draw health bar if damaged and not falling
        if (this.health < this.maxHealth && !this.isFalling) {
            // Custom health bar position for pine tree
            const barWidth = this.trunkWidth * 2;
            const barHeight = 6;
            const barX = screenX - barWidth / 2;
            const barY = screenY - sections * sectionHeight - 15;
            
            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Health fill
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : (healthPercent > 0.25 ? '#ff0' : '#f00');
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }
        
        // Draw hit effect
        if (isHit) {
            this.drawHitEffect(ctx, screenX, screenY);
        }
        
        // Restore context
        ctx.restore();
    }
    
    /**
     * Draw smoke particles for falling tree
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawSmokeParticles(ctx, screenX, screenY) {
        // We only draw particles if falling
        if (!this.isFalling) return;
        
        // Save original globalAlpha
        const originalAlpha = ctx.globalAlpha;
        
        // Draw each particle
        for (const particle of this.smokeParticles) {
            // Calculate screen position of particle
            const particleScreenX = screenX + (particle.x - this.x);
            const particleScreenY = screenY + (particle.y - this.y);
            
            // Set appearance
            ctx.globalAlpha = particle.opacity * originalAlpha;
            ctx.fillStyle = '#ffffff';
            
            // Draw particle
            ctx.beginPath();
            ctx.arc(particleScreenX, particleScreenY, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Restore original alpha
        ctx.globalAlpha = originalAlpha;
    }
    
    /**
     * Draw standard tree
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {boolean} isHit - Whether the tree is being hit
     */
    drawStandardTree(ctx, x, y, isHit) {
        const size = this.trunkWidth + 20; // Make tree slightly larger than trunk for visibility
        
        // Draw tree as a square (trunk)
        ctx.fillStyle = isHit ? this.getHitColor(this.trunkColor) : this.trunkColor;
        ctx.fillRect(
            x - size/2,
            y - size/2,
            size,
            size
        );
        
        // Draw tree border
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            x - size/2,
            y - size/2,
            size,
            size
        );
        
        // Add a smaller square on top for leaves
        ctx.fillStyle = isHit ? this.getHitColor(this.leavesColor) : this.leavesColor;
        const leafSize = size * 1.5;
        ctx.fillRect(
            x - leafSize/2,
            y - leafSize/2 - size/2,
            leafSize,
            leafSize/1.5
        );
        
        // Leaf border
        ctx.strokeStyle = '#195919';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            x - leafSize/2,
            y - leafSize/2 - size/2,
            leafSize,
            leafSize/1.5
        );
        
        // Only draw tree type indicator if not falling
        if (!this.isFalling) {
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, x, y);
        }
    }
    
    /**
     * Draw pine tree
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {boolean} isHit - Whether the tree is being hit
     */
    drawPineTree(ctx, x, y, isHit) {
        // Don't draw if chopped and not falling
        if (this.chopped && !this.isFalling) return;
        
        // Draw trunk
        ctx.fillStyle = isHit ? this.getHitColor(this.trunkColor) : this.trunkColor;
        ctx.beginPath();
        ctx.rect(
            x - this.trunkWidth / 2,
            y,
            this.trunkWidth,
            this.trunkHeight
        );
        ctx.fill();
        
        // Trunk outline
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw pine needle sections (conical shape)
        ctx.fillStyle = isHit ? this.getHitColor(this.leavesColor) : this.leavesColor;
        
        const sections = 4;
        const sectionHeight = this.leavesRadius * 0.8;
        
        for (let i = 0; i < sections; i++) {
            const y1 = y - (i * sectionHeight);
            const width = this.leavesRadius * 2 * ((sections - i) / sections);
            
            ctx.beginPath();
            ctx.moveTo(x, y1 - sectionHeight);
            ctx.lineTo(x - width / 2, y1);
            ctx.lineTo(x + width / 2, y1);
            ctx.closePath();
            ctx.fill();
            
            // Outline
            ctx.strokeStyle = '#004d00';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    
    /**
     * Draw the tree body
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {boolean} isHit - Whether the tree is being hit
     */
    drawTree(ctx, x, y, isHit) {
        // Trunk
        ctx.fillStyle = isHit ? this.getHitColor(this.trunkColor) : this.trunkColor;
        ctx.beginPath();
        ctx.rect(
            x - this.trunkWidth / 2,
            y,
            this.trunkWidth,
            this.trunkHeight
        );
        ctx.fill();
        
        // Trunk outline
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Leaves
        ctx.fillStyle = isHit ? this.getHitColor(this.leavesColor) : this.leavesColor;
        ctx.beginPath();
        ctx.arc(
            x,
            y - this.leavesRadius * 0.3,
            this.leavesRadius,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Leaves outline
        ctx.strokeStyle = '#195919';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add texture based on tree type
        this.drawTreeTexture(ctx, x, y);
    }
    
    /**
     * Draw tree-specific texture
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    drawTreeTexture(ctx, x, y) {
        // Base implementation draws simple texture
        // Override in subclasses for specific tree types
        
        // Draw trunk details
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 3; i++) {
            const yOffset = i * (this.trunkHeight / 4) + this.trunkHeight / 8;
            ctx.beginPath();
            ctx.moveTo(x - this.trunkWidth / 2 + 3, y + yOffset);
            ctx.lineTo(x + this.trunkWidth / 2 - 3, y + yOffset);
            ctx.stroke();
        }
        
        // Leaf details
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 3; i++) {
            const angle = i * (Math.PI * 2 / 3);
            ctx.beginPath();
            ctx.moveTo(x, y - this.leavesRadius * 0.3);
            ctx.lineTo(x + Math.cos(angle) * this.leavesRadius * 0.7, 
                       y - this.leavesRadius * 0.3 + Math.sin(angle) * this.leavesRadius * 0.7);
            ctx.stroke();
        }
    }
    
    /**
     * Draw the health bar
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawHealthBar(ctx, screenX, screenY) {
        const barWidth = this.trunkWidth * 2;
        const barHeight = 6;
        const barX = screenX - barWidth / 2;
        const barY = screenY - this.leavesRadius * 2 - 15;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health fill
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : (healthPercent > 0.25 ? '#ff0' : '#f00');
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }
    
    /**
     * Draw hit effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawHitEffect(ctx, screenX, screenY) {
        // Calculate hit effect intensity (0-1)
        const timeSinceHit = Date.now() - this.lastHitTime;
        const intensity = 1 - (timeSinceHit / this.hitEffectDuration);
        
        // Draw glow effect
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
            screenX, screenY + this.trunkHeight / 2, this.trunkWidth * 0.5,
            screenX, screenY + this.trunkHeight / 2, this.trunkWidth * 1.5
        );
        
        gradient.addColorStop(0, `rgba(255, 255, 0, ${0.3 * intensity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.arc(screenX, screenY + this.trunkHeight / 2, this.trunkWidth * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw cracks on trunk
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.7 * intensity})`;
        ctx.lineWidth = 2;
        
        const crackCount = 3 + Math.floor(3 * (1 - this.health / this.maxHealth));
        
        for (let i = 0; i < crackCount; i++) {
            const yPos = screenY + (i + 1) * (this.trunkHeight / (crackCount + 1));
            const crackWidth = this.trunkWidth * 0.9;
            
            ctx.beginPath();
            ctx.moveTo(screenX - crackWidth / 2, yPos);
            ctx.lineTo(screenX + crackWidth / 2, yPos);
            ctx.stroke();
        }
    }
    
    /**
     * Get color to use when the tree is hit
     * @param {string} baseColor - Original color
     * @returns {string} - Hit color
     */
    getHitColor(baseColor) {
        // Flash between white and regular color
        const timeSinceHit = Date.now() - this.lastHitTime;
        const intensity = 1 - (timeSinceHit / this.hitEffectDuration);
        const flashSpeed = 0.1;
        
        if (Math.sin(timeSinceHit * flashSpeed) > 0) {
            return 'white';
        } else {
            return baseColor;
        }
    }
    
    /**
     * Hit the tree with a tool or weapon
     * @param {number} damage - Amount of damage to deal
     * @param {Object} source - Source of the damage (optional)
     * @returns {boolean} - Whether the tree was destroyed
     */
    hit(damage, source) {
        // If already chopped or falling, can't be hit
        if (this.chopped || this.isFalling) return false;
        
        console.log(`Tree hit! Type: ${this.type}, Health: ${this.health}/${this.maxHealth}, Damage: ${damage}`);
        
        // Ensure lastHitTime is set for visual effect
        this.lastHitTime = Date.now();
        
        // Create a "floating damage" text effect
        this.createDamageNumber(damage);
        
        // Apply damage to the tree
        const destroyed = this.takeDamage(damage, source);
        
        // Trigger any additional effects (can be overridden by subclasses)
        this.onHit(damage, source);
        
        return destroyed;
    }
    
    /**
     * Create a floating damage number
     * @param {number} damage - Amount of damage dealt
     */
    createDamageNumber(damage) {
        // Only create if we have a global particles system or game reference
        if (!window.game || (!window.particleManager && !window.rockParticles)) return;
        
        // Create a "floating" damage number that rises up
        const damageText = {
            x: this.x,
            y: this.y - this.trunkHeight / 2,
            text: `-${damage}`,
            color: 'red',
            size: 14 + Math.min(damage, 10), // Larger text for more damage
            opacity: 1,
            lifetime: 1500,
            created: Date.now(),
            vy: -1, // Move upward
            vx: (Math.random() - 0.5) * 0.5 // Slight random horizontal movement
        };
        
        // Add to global particles if possible
        if (window.particleManager && window.particleManager.addTextParticle) {
            window.particleManager.addTextParticle(damageText);
        } else if (window.game) {
            // Fall back to custom rendering if game reference exists
            if (!window.game.textParticles) window.game.textParticles = [];
            window.game.textParticles.push(damageText);
        }
    }
    
    /**
     * Handle additional effects when hit (can be overridden by subclasses)
     * @param {number} damage - Amount of damage
     * @param {Object} source - Source of the damage
     */
    onHit(damage, source) {
        // Base implementation does nothing
    }
    
    /**
     * Get drops when the tree is chopped
     * @returns {Object} - Object containing dropped items and experience
     */
    getDrops() {
        return {
            items: [{
                type: 'wood',
                quantity: Math.floor(this.yield + Math.random() * 2)
            }],
            experience: this.expValue
        };
    }
    
    /**
     * Take damage from a source
     * @param {number} damage - Amount of damage
     * @param {Object} source - Source of the damage
     * @returns {boolean} - Whether the tree was destroyed
     */
    takeDamage(damage, source) {
        // Register hit
        this.lastHitTime = Date.now();
        
        // Apply damage
        this.health -= damage;
        
        // Check if destroyed
        if (this.health <= 0) {
            this.health = 0;
            this.startFallingAnimation();
            return true;
        }
        
        return false;
    }
    
    /**
     * Start the falling animation for the tree
     */
    startFallingAnimation() {
        if (this.chopped || this.isFalling) return;
        
        console.log(`Starting falling animation for tree ${this.id}`);
        
        // Set falling animation properties
        this.isFalling = true;
        this.fallStartTime = Date.now();
        
        // Play sound if available
        this.playFallingSound();
        
        // Create initial smoke particles
        for (let i = 0; i < 5; i++) {
            this.createSmokeParticle();
        }
    }
    
    /**
     * Play sound when tree starts falling
     */
    playFallingSound() {
        try {
            // Try to use global audio system if available
            if (window.audioManager && window.audioManager.playSound) {
                window.audioManager.playSound('tree_fall');
            } 
            // Fallback to basic Audio API
            else {
                const sound = new Audio('./sounds/tree_fall.mp3');
                sound.volume = 0.5;
                sound.play().catch(err => console.log('Sound play failed:', err));
            }
        } catch (error) {
            console.error("Error playing tree falling sound:", error);
        }
    }
    
    /**
     * Complete the chop operation after animation finishes
     */
    completeChop() {
        // Set final state
        this.chopped = true;
        this.isFalling = false;
        
        // Schedule respawn
        setTimeout(() => {
            this.respawn();
        }, this.respawnTime);
    }
    
    /**
     * Chop down the tree
     */
    chop() {
        // Start falling animation instead of immediately chopping
        this.startFallingAnimation();
    }
    
    /**
     * Respawn the tree
     */
    respawn() {
        this.health = this.maxHealth;
        this.chopped = false;
        this.isFalling = false;
        this.opacity = 1.0;
        this.fallAngle = 0;
        this.smokeParticles = [];
    }
    
    /**
     * Check if a point is inside this tree
     * @param {number} x - X position to check
     * @param {number} y - Y position to check
     * @returns {boolean} - Whether the point is inside
     */
    containsPoint(x, y) {
        if (this.chopped || this.isFalling) return false;
        
        // Check if point is in trunk
        const inTrunk = x >= this.x - this.trunkWidth / 2 &&
                        x <= this.x + this.trunkWidth / 2 &&
                        y >= this.y &&
                        y <= this.y + this.trunkHeight;
        
        // Check if point is in leaves
        const dx = this.x - x;
        const dy = (this.y - this.leavesRadius * 0.3) - y;
        const distanceSquared = dx * dx + dy * dy;
        const inLeaves = distanceSquared <= this.leavesRadius * this.leavesRadius;
        
        return inTrunk || inLeaves;
    }
    
    /**
     * Get distance from a point to this tree
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {number} - Distance to the point
     */
    distanceTo(x, y) {
        // Get distance to the center of the tree
        const dx = this.x - x;
        const dy = (this.y + this.trunkHeight / 2) - y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Get collision boundaries
     * @returns {Object} - Collision bounds { minX, maxX, minY, maxY }
     */
    getBounds() {
        return {
            minX: this.x - Math.max(this.trunkWidth / 2, this.leavesRadius),
            maxX: this.x + Math.max(this.trunkWidth / 2, this.leavesRadius),
            minY: this.y - this.leavesRadius * 1.3,
            maxY: this.y + this.trunkHeight
        };
    }
}

/**
 * Oak Tree - Standard tree with green leaves and brown trunk
 */
class OakTree extends Tree {
    constructor(x, y) {
        super({
            type: 'oak',
            name: 'Oak Tree',
            x: x,
            y: y,
            trunkColor: '#8B4513',
            leavesColor: '#228B22',
            trunkWidth: 20,
            trunkHeight: 60,
            leavesRadius: 40,
            health: 100,
            maxHealth: 100,
            hardness: 1,
            yield: 2,
            expValue: 10,
            respawnTime: 300000, // 5 minutes
            swayAmount: 2
        });
    }
    
    drawTreeTexture(ctx, x, y) {
        // Oak-specific texture
        // Trunk lines
        ctx.strokeStyle = 'rgba(85, 53, 31, 0.7)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 5; i++) {
            const yOffset = i * (this.trunkHeight / 6) + this.trunkHeight / 12;
            const wiggle = Math.sin(i * 2.5) * (this.trunkWidth / 4);
            
            ctx.beginPath();
            ctx.moveTo(x - this.trunkWidth / 2 + 3, y + yOffset);
            ctx.bezierCurveTo(
                x - this.trunkWidth / 4 + wiggle, y + yOffset + 2,
                x + this.trunkWidth / 4 - wiggle, y + yOffset - 2,
                x + this.trunkWidth / 2 - 3, y + yOffset
            );
            ctx.stroke();
        }
        
        // Leaf details
        ctx.fillStyle = 'rgba(20, 100, 20, 0.3)';
        
        for (let i = 0; i < 8; i++) {
            const angle = i * (Math.PI * 2 / 8);
            const leafX = x + Math.cos(angle) * this.leavesRadius * 0.6;
            const leafY = y - this.leavesRadius * 0.3 + Math.sin(angle) * this.leavesRadius * 0.6;
            const leafSize = 8 + Math.random() * 5;
            
            ctx.beginPath();
            ctx.arc(leafX, leafY, leafSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * Birch Tree - White trunk with black marks and lighter green leaves
 */
class BirchTree extends Tree {
    constructor(x, y) {
        super({
            type: 'birch',
            name: 'Birch Tree',
            x: x,
            y: y,
            trunkColor: '#F5F5F5',
            leavesColor: '#7CFC00',
            trunkWidth: 18,
            trunkHeight: 70,
            leavesRadius: 35,
            health: 80,
            maxHealth: 80,
            hardness: 0.8,
            yield: 2,
            expValue: 8,
            respawnTime: 240000, // 4 minutes
            swayAmount: 3
        });
    }
    
    drawTreeTexture(ctx, x, y) {
        // Birch-specific texture
        // Black marks on the trunk
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        
        const seed = this.id % 1000;
        
        for (let i = 0; i < 8; i++) {
            const yOffset = i * (this.trunkHeight / 9) + (seed % 10);
            const xOffset = (i % 2 === 0) ? -this.trunkWidth / 4 : this.trunkWidth / 4;
            const width = 2 + Math.random() * 4;
            const height = 2 + Math.random() * 2;
            
            ctx.beginPath();
            ctx.ellipse(
                x + xOffset,
                y + yOffset,
                width,
                height,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        // Lighter leaf texture
        ctx.fillStyle = 'rgba(240, 255, 240, 0.3)';
        
        for (let i = 0; i < 6; i++) {
            const angle = i * (Math.PI * 2 / 6);
            const leafX = x + Math.cos(angle) * this.leavesRadius * 0.5;
            const leafY = y - this.leavesRadius * 0.3 + Math.sin(angle) * this.leavesRadius * 0.5;
            const leafSize = 6 + Math.random() * 4;
            
            ctx.beginPath();
            ctx.arc(leafX, leafY, leafSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * Pine Tree - Tall with conical shape and dark green needle leaves
 */
class PineTree extends Tree {
    constructor(x, y, type = 'pine', id) {
        super(x, y, type, id);
        
        // Pine tree specific properties
        this.trunkColor = '#8B4513';
        this.leavesColor = '#006400';
        this.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.trunkWidth = 20;
        this.trunkHeight = 60;
        this.leavesRadius = 40;
        
        // Animation properties
        this.swaySpeed = 0.001 + Math.random() * 0.0005;
        this.swayAmount = 1 + Math.random() * 0.5;
        this.swayOffset = Math.random() * Math.PI * 2;
        
        // Falling animation properties
        this.isFalling = false;
        this.fallStartTime = 0;
        this.fallDuration = 1500; // 1.5 seconds
        this.fallAngle = 0;
        this.fallDirection = Math.random() > 0.5 ? 1 : -1; // Random fall direction
        this.maxFallAngle = Math.PI / 2; // 90 degrees
        this.opacity = 1;
        this.smokeParticles = [];
    }
    
    draw(ctx, screenX, screenY) {
        if (this.chopped && !this.isFalling) return;
        
        // Save the context so we can restore after rotation
        ctx.save();
        
        // For falling trees, apply rotation and opacity
        if (this.isFalling) {
            // Set the pivot point at the bottom of the trunk
            const pivotX = screenX;
            const pivotY = screenY + this.trunkHeight / 2;
            
            // Translate to pivot, rotate, then translate back
            ctx.translate(pivotX, pivotY);
            ctx.rotate(this.fallAngle * this.fallDirection);
            ctx.translate(-pivotX, -pivotY);
            
            // Apply opacity
            ctx.globalAlpha = this.opacity;
            
            // Draw smoke particles first so they appear behind the tree
            this.drawSmokeParticles(ctx, screenX, screenY);
        }
        
        // Calculate sway effect
        const time = Date.now() * this.swaySpeed;
        const sway = Math.sin(time + this.swayOffset) * this.swayAmount;
        
        // Is the tree being hit?
        const isHit = Date.now() - this.lastHitTime < this.hitEffectDuration;
        
        // Draw tree shadow
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        ctx.ellipse(
            screenX,
            screenY + this.trunkHeight - 10,
            this.trunkWidth * 0.8,
            this.trunkWidth * 0.4,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw trunk
        ctx.fillStyle = isHit ? this.getHitColor(this.trunkColor) : this.trunkColor;
        ctx.beginPath();
        ctx.rect(
            screenX + sway - this.trunkWidth / 2,
            screenY,
            this.trunkWidth,
            this.trunkHeight
        );
        ctx.fill();
        
        // Trunk outline
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw pine needle sections (conical shape)
        ctx.fillStyle = isHit ? this.getHitColor(this.leavesColor) : this.leavesColor;
        
        const sections = 4;
        const sectionHeight = this.leavesRadius * 0.8;
        
        for (let i = 0; i < sections; i++) {
            const y1 = screenY - (i * sectionHeight);
            const width = this.leavesRadius * 2 * ((sections - i) / sections);
            
            ctx.beginPath();
            ctx.moveTo(screenX + sway, y1 - sectionHeight);
            ctx.lineTo(screenX + sway - width / 2, y1);
            ctx.lineTo(screenX + sway + width / 2, y1);
            ctx.closePath();
            ctx.fill();
            
            // Outline
            ctx.strokeStyle = '#004d00';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Draw pine texture
        if (!isHit) {
            // Trunk texture
            ctx.strokeStyle = 'rgba(77, 38, 0, 0.5)';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < 6; i++) {
                const yOffset = i * (this.trunkHeight / 7) + this.trunkHeight / 14;
                
                ctx.beginPath();
                ctx.moveTo(screenX + sway - this.trunkWidth / 2 + 2, screenY + yOffset);
                ctx.lineTo(screenX + sway + this.trunkWidth / 2 - 2, screenY + yOffset);
                ctx.stroke();
            }
            
            // Needle details
            ctx.fillStyle = 'rgba(0, 60, 0, 0.4)';
            
            for (let i = 0; i < sections; i++) {
                const y1 = screenY - (i * sectionHeight);
                const width = this.leavesRadius * 2 * ((sections - i) / sections);
                
                for (let j = 0; j < 5; j++) {
                    const x1 = screenX + sway - width / 2 + (j + 1) * width / 6;
                    const y2 = y1 - (sectionHeight / 5) * (j % 3);
                    
                    ctx.beginPath();
                    ctx.arc(x1, y2, 4 + Math.random() * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Draw health bar if damaged and not falling
        if (this.health < this.maxHealth && !this.isFalling) {
            // Custom health bar position for pine tree
            const barWidth = this.trunkWidth * 2;
            const barHeight = 6;
            const barX = screenX - barWidth / 2;
            const barY = screenY - sections * sectionHeight - 15;
            
            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Health fill
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : (healthPercent > 0.25 ? '#ff0' : '#f00');
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }
        
        // Draw hit effect
        if (isHit) {
            this.drawHitEffect(ctx, screenX, screenY);
        }
        
        // Restore context
        ctx.restore();
    }
}

/**
 * Jungle Tree - Tall with lush, dense foliage
 */
class JungleTree extends Tree {
    constructor(x, y) {
        super({
            type: 'jungle',
            name: 'Jungle Tree',
            x: x,
            y: y,
            trunkColor: '#654321',
            leavesColor: '#32CD32',
            trunkWidth: 25,
            trunkHeight: 90,
            leavesRadius: 50,
            health: 150,
            maxHealth: 150,
            hardness: 1.5,
            yield: 4,
            expValue: 15,
            respawnTime: 420000, // 7 minutes
            swayAmount: 1
        });
    }
    
    drawTreeTexture(ctx, x, y) {
        // Jungle-specific texture
        // Vines on the trunk
        ctx.strokeStyle = 'rgba(50, 180, 50, 0.7)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 3; i++) {
            const startX = x - this.trunkWidth / 2 + i * (this.trunkWidth / 2);
            ctx.beginPath();
            ctx.moveTo(startX, y);
            
            // Draw curvy vine
            for (let j = 0; j < 10; j++) {
                const yPos = y + j * (this.trunkHeight / 10);
                const xOffset = Math.sin(j * 0.7) * (this.trunkWidth / 3);
                ctx.lineTo(startX + xOffset, yPos);
            }
            
            ctx.stroke();
        }
        
        // Dense leaf clumps
        ctx.fillStyle = 'rgba(0, 150, 0, 0.5)';
        
        for (let i = 0; i < 12; i++) {
            const angle = i * (Math.PI * 2 / 12);
            const dist = Math.random() * this.leavesRadius * 0.7;
            const leafX = x + Math.cos(angle) * dist;
            const leafY = y - this.leavesRadius * 0.3 + Math.sin(angle) * dist;
            const leafSize = 10 + Math.random() * 8;
            
            ctx.beginPath();
            ctx.arc(leafX, leafY, leafSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add some flowers or fruit
        ctx.fillStyle = 'rgba(255, 0, 100, 0.8)';
        
        for (let i = 0; i < 5; i++) {
            const angle = i * (Math.PI * 2 / 5) + Math.random();
            const dist = this.leavesRadius * 0.5 + Math.random() * this.leavesRadius * 0.3;
            const flowerX = x + Math.cos(angle) * dist;
            const flowerY = y - this.leavesRadius * 0.3 + Math.sin(angle) * dist;
            const flowerSize = 3 + Math.random() * 2;
            
            ctx.beginPath();
            ctx.arc(flowerX, flowerY, flowerSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Make tree classes available globally
window.Tree = Tree;
window.OakTree = OakTree;
window.BirchTree = BirchTree;
window.PineTree = PineTree;
window.JungleTree = JungleTree;

// Create a namespace for all tree types
window.Trees = {
    oak: (x, y) => new OakTree(x, y),
    birch: (x, y) => new BirchTree(x, y),
    pine: (x, y) => new PineTree(x, y),
    jungle: (x, y) => new JungleTree(x, y)
};

// Export tree classes
export {
    Tree,
    OakTree,
    BirchTree,
    PineTree,
    JungleTree
};

export default Tree; 