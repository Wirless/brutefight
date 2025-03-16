/**
 * Player.js
 * 
 * Represents a player entity in the game world,
 * handling player state, rendering, and interactions.
 */
class Player {
    /**
     * @param {Game} game - The main game instance
     * @param {Object} options - Player options
     */
    constructor(game, options = {}) {
        this.game = game;
        
        // Core player properties
        this.id = options.id || null;
        this.username = options.username || 'Player';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.color = options.color || '#3498db';
        this.level = options.level || 1;
        this.title = options.title || '';
        this.experience = options.experience || 0;
        this.expToNextLevel = this.calculateExpToNextLevel();
        
        // Player stats
        this.strength = options.strength || 1;
        this.defense = options.defense || 1;
        this.dexterity = options.dexterity || 1;
        this.agility = options.agility || 1;
        this.intelligence = options.intelligence || 1;
        this.luck = options.luck || 1;
        this.pickupStat = options.pickupStat || 1;
        
        // Player dimensions
        this.radius = options.radius || 20;
        this.drawRadius = this.radius;
        
        // Movement properties
        this.speed = options.speed || 5;
        this.velocity = { x: 0, y: 0 };
        this.lastValidPosition = { x: this.x, y: this.y };
        this.movementTarget = null;
        this.isMoving = false;
        
        // Appearance & animation
        this.animation = {
            frame: 0,
            frames: 8,
            frameSpeed: 0.15,
            direction: 0, // 0: right, 1: down, 2: left, 3: up
            lastUpdateTime: 0
        };
        
        // Player state
        this.health = options.health || 100;
        this.maxHealth = options.maxHealth || 100;
        this.mana = options.mana || 100;
        this.maxMana = options.maxMana || 100;
        this.stamina = options.stamina || 100;
        this.maxStamina = options.maxStamina || 100;
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.attackDirection = 0;
        
        // Resources and inventory
        this.resources = options.resources || {
            stone: 0,
            copper: 0,
            iron: 0,
            gold: 0,
            diamond: 0,
            wood: 0
        };
        
        // Track inventory and equipped items
        this.inventory = options.inventory || [];
        this.equipped = options.equipped || {};
        
        // Network properties
        this.lastUpdate = Date.now();
        this.isCurrentPlayer = options.isCurrentPlayer || false;
        this.serverX = this.x;
        this.serverY = this.y;
        
        // Visual effects
        this.effects = [];
        
        // Debug
        this.debug = false;
        
        // Calculate initial stats based on level
        this.calculateStats();
    }
    
    /**
     * Initialize the player
     * @returns {Player} - This instance for chaining
     */
    init() {
        // Set up any initial state
        this.calculateStats();
        
        return this;
    }
    
    /**
     * Calculate experience needed for next level
     * @returns {number} - Experience points needed
     */
    calculateExpToNextLevel() {
        // Simple formula: 100 * current level
        return 100 * this.level;
    }
    
    /**
     * Calculate player stats based on level and equipment
     */
    calculateStats() {
        // Base stats
        let healthMax = 100 + (this.level - 1) * 5;
        let manaMax = 100 + (this.level - 1) * 5;
        let staminaMax = 100 + (this.level - 1) * 8;
        let moveSpeed = 5 + (this.level - 1) * 0.1;
        
        // Base player attributes - will be overridden by equipment adjustments
        this.strength = Math.max(1, Math.floor(this.level / 2) + (this.level % 2));
        this.defense = Math.max(1, Math.floor(this.level / 3) + (this.level % 3));
        this.dexterity = Math.max(1, Math.floor(this.level / 2.5) + (this.level % 2));
        this.agility = Math.max(1, Math.floor(this.level / 3) + (this.level % 2));
        this.intelligence = Math.max(1, Math.floor(this.level / 2.5) + (this.level % 3));
        this.luck = Math.max(1, Math.floor(this.level / 4) + (this.level % 2));
        // Calculate pickup stat based on level and luck
        this.pickupStat = Math.max(1, Math.floor(this.level / 3) + this.luck / 2);
        
        // Apply equipment bonuses if equipment manager exists
        if (window.equipmentManager) {
            // Iterate through equipped items
            for (const slotName in window.equipmentManager.slots) {
                const item = window.equipmentManager.slots[slotName];
                if (item && item.stats) {
                    if (item.stats.health) healthMax += item.stats.health;
                    if (item.stats.mana) manaMax += item.stats.mana;
                    if (item.stats.stamina) staminaMax += item.stats.stamina;
                    if (item.stats.speed) moveSpeed += item.stats.speed;
                    
                    // Apply stat bonuses from equipment
                    if (item.stats.strength) this.strength += item.stats.strength;
                    if (item.stats.defense) this.defense += item.stats.defense;
                    if (item.stats.dexterity) this.dexterity += item.stats.dexterity;
                    if (item.stats.agility) this.agility += item.stats.agility;
                    if (item.stats.intelligence) this.intelligence += item.stats.intelligence;
                    if (item.stats.luck) this.luck += item.stats.luck;
                    if (item.stats.pickupStat) this.pickupStat += item.stats.pickupStat;
                }
            }
        }
        
        // Update stats
        this.maxHealth = healthMax;
        this.maxMana = manaMax;
        this.maxStamina = staminaMax;
        this.speed = moveSpeed;
        
        // Ensure current values don't exceed maximums
        this.health = Math.min(this.health, this.maxHealth);
        this.mana = Math.min(this.mana, this.maxMana);
        this.stamina = Math.min(this.stamina, this.maxStamina);
        
        // Update experience needed for next level
        this.expToNextLevel = this.calculateExpToNextLevel();
    }
    
    /**
     * Add experience points to the player
     * @param {number} amount - Amount of XP to add
     * @returns {boolean} - Whether the player leveled up
     */
    addExperience(amount) {
        // Store old level for comparison
        const oldLevel = this.level;
        
        // Add experience
        this.experience += amount;
        
        // Update level based on experience if PlayerProgression is available
        if (window.PlayerProgression && window.PlayerProgression.calculateLevelFromExperience) {
            this.level = window.PlayerProgression.calculateLevelFromExperience(this.experience);
        } else {
            // Simple fallback level calculation
            this.level = Math.floor(Math.sqrt(this.experience / 100)) + 1;
        }
        
        // Recalculate necessary values if level changed
        if (this.level > oldLevel) {
            this.calculateStats();
            return true; // Indicate level up
        }
        
        // Update experience to next level
        this.expToNextLevel = this.calculateExpToNextLevel();
        
        return false; // No level up
    }
    
    /**
     * Level up the player
     */
    levelUp() {
        // Bank overflow XP
        const overflowExp = this.experience - this.expToNextLevel;
        
        // Increase level
        this.level++;
        
        // Reset experience and calculate new threshold
        this.experience = overflowExp;
        this.expToNextLevel = this.calculateExpToNextLevel();
        
        // Recalculate stats
        this.calculateStats();
        
        // Heal player on level up
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        this.stamina = this.maxStamina;
        
        // Record stats increase for notification
        const statMessages = [
            `Strength increased to ${this.strength}!`,
            `Defense increased to ${this.defense}!`,
            `Dexterity increased to ${this.dexterity}!`,
            `Agility increased to ${this.agility}!`,
            `Intelligence increased to ${this.intelligence}!`,
            `Luck increased to ${this.luck}!`
        ];
        
        // Play level up sound if available
        if (this.game.assetLoader) {
            this.game.assetLoader.playSound('levelUp', 0.5);
        }
        
        // Notify player
        if (this.game.chatManager) {
            this.game.chatManager.addMessage({
                type: 'system',
                message: `${this.username} reached level ${this.level}!`
            });
            
            // Show stats changes
            statMessages.forEach(msg => {
                this.game.chatManager.addMessage({
                    type: 'system',
                    message: msg
                });
            });
        }
        
        // Show level up effect
        this.addEffect('levelUp');
    }
    
    /**
     * Move the player to a position
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {boolean} immediate - Whether to move immediately
     */
    moveTo(x, y, immediate = false) {
        if (immediate) {
            this.x = x;
            this.y = y;
            this.lastValidPosition.x = x;
            this.lastValidPosition.y = y;
        } else {
            this.movementTarget = { x, y };
        }
    }
    
    /**
     * Set the player's velocity directly
     * @param {number} vx - X velocity
     * @param {number} vy - Y velocity
     */
    setVelocity(vx, vy) {
        this.velocity.x = vx;
        this.velocity.y = vy;
        
        // Determine direction from velocity
        if (Math.abs(vx) > Math.abs(vy)) {
            this.animation.direction = vx < 0 ? 2 : 0; // left : right
        } else if (vy !== 0) {
            this.animation.direction = vy < 0 ? 3 : 1; // up : down
        }
        
        // Set moving flag
        this.isMoving = vx !== 0 || vy !== 0;
    }
    
    /**
     * Update player position and state
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update effects
        this.updateEffects(deltaTime);
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
            if (this.attackCooldown <= 0) {
                this.attackCooldown = 0;
                this.isAttacking = false;
            }
        }
        
        // Regenerate resources over time
        this.regenerateResources(deltaTime);
    }
    
    /**
     * Update player movement
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateMovement(deltaTime) {
        // Save current position
        const prevX = this.x;
        const prevY = this.y;
        
        // Apply velocity
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            // Move player
            this.x += this.velocity.x * this.speed * deltaTime;
            this.y += this.velocity.y * this.speed * deltaTime;
            
            // Check for collisions
            this.checkCollisions();
        }
        
        // Or handle movement to target
        else if (this.movementTarget) {
            const dx = this.movementTarget.x - this.x;
            const dy = this.movementTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.speed * deltaTime) {
                // Arrived at target
                this.x = this.movementTarget.x;
                this.y = this.movementTarget.y;
                this.movementTarget = null;
                this.isMoving = false;
            } else {
                // Move toward target
                const vx = dx / distance;
                const vy = dy / distance;
                
                this.x += vx * this.speed * deltaTime;
                this.y += vy * this.speed * deltaTime;
                this.isMoving = true;
                
                // Set animation direction
                if (Math.abs(vx) > Math.abs(vy)) {
                    this.animation.direction = vx < 0 ? 2 : 0; // left : right
                } else {
                    this.animation.direction = vy < 0 ? 3 : 1; // up : down
                }
                
                // Check for collisions
                this.checkCollisions();
            }
        }
        
        // If position changed and this is current player, update server
        if ((this.x !== prevX || this.y !== prevY) && this.isCurrentPlayer) {
            this.updateServerPosition();
        }
    }
    
    /**
     * Check for collisions with other entities
     */
    checkCollisions() {
        // Check collisions with ores
        if (window.oreManager) {
            const newPosition = window.oreManager.handlePlayerCollision(
                this.x, this.y, this.radius
            );
            
            if (newPosition) {
                this.x = newPosition.x;
                this.y = newPosition.y;
            }
        }
        
        // Check for world boundaries
        this.checkWorldBoundaries();
        
        // If valid position, update last valid position
        this.lastValidPosition.x = this.x;
        this.lastValidPosition.y = this.y;
    }
    
    /**
     * Check if player is within world boundaries
     */
    checkWorldBoundaries() {
        // Get world boundaries from game
        const worldBounds = this.game.worldBounds || {
            minX: -5000, maxX: 5000,
            minY: -5000, maxY: 5000
        };
        
        // Apply boundaries
        if (this.x - this.radius < worldBounds.minX) {
            this.x = worldBounds.minX + this.radius;
        } else if (this.x + this.radius > worldBounds.maxX) {
            this.x = worldBounds.maxX - this.radius;
        }
        
        if (this.y - this.radius < worldBounds.minY) {
            this.y = worldBounds.minY + this.radius;
        } else if (this.y + this.radius > worldBounds.maxY) {
            this.y = worldBounds.maxY - this.radius;
        }
    }
    
    /**
     * Update player animation
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateAnimation(deltaTime) {
        // Only animate if moving
        if (this.isMoving) {
            const currentTime = Date.now();
            const elapsed = (currentTime - this.animation.lastUpdateTime) / 1000;
            
            if (elapsed > this.animation.frameSpeed) {
                this.animation.frame = (this.animation.frame + 1) % this.animation.frames;
                this.animation.lastUpdateTime = currentTime;
            }
        } else {
            // Reset to idle frame when not moving
            this.animation.frame = 0;
        }
    }
    
    /**
     * Update visual effects
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateEffects(deltaTime) {
        // Update and remove expired effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.duration -= deltaTime * 1000;
            
            if (effect.duration <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }
    
    /**
     * Regenerate health, mana, and stamina over time
     * @param {number} deltaTime - Time elapsed since last update
     */
    regenerateResources(deltaTime) {
        // Regenerate health (1% per second)
        if (this.health < this.maxHealth) {
            this.health += this.maxHealth * 0.01 * deltaTime;
            this.health = Math.min(this.health, this.maxHealth);
        }
        
        // Regenerate mana (2% per second)
        if (this.mana < this.maxMana) {
            this.mana += this.maxMana * 0.02 * deltaTime;
            this.mana = Math.min(this.mana, this.maxMana);
        }
        
        // Regenerate stamina (5% per second when not running)
        if (this.stamina < this.maxStamina && !this.isRunning) {
            this.stamina += this.maxStamina * 0.05 * deltaTime;
            this.stamina = Math.min(this.stamina, this.maxStamina);
        }
    }
    
    /**
     * Perform an attack
     * @param {string} attackType - Type of attack (pickaxe, axe, sword)
     * @param {number} direction - Direction of attack in radians
     * @returns {boolean} - Whether the attack was performed
     */
    attack(attackType, direction) {
        // Check if player can attack
        if (this.attackCooldown > 0) {
            return false;
        }
        
        // Set attack properties
        this.isAttacking = true;
        this.attackDirection = direction;
        
        // Use combat system if available
        if (window.combatSystem) {
            return window.combatSystem.startAttack(attackType, direction, this);
        } else {
            // Default attack cooldown if no combat system
            this.attackCooldown = 500; // 500ms cooldown
            return true;
        }
    }
    
    /**
     * Take damage from a source
     * @param {number} amount - Amount of damage
     * @param {Object} source - Source of the damage
     * @returns {boolean} - Whether the player died
     */
    takeDamage(amount, source) {
        // Apply damage
        this.health -= amount;
        
        // Add damage effect
        this.addEffect('damage');
        
        // Check if dead
        if (this.health <= 0) {
            this.health = 0;
            this.die();
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle player death
     */
    die() {
        // Add death effect
        this.addEffect('death');
        
        // Respawn after delay
        if (this.isCurrentPlayer) {
            setTimeout(() => this.respawn(), 3000);
        }
        
        // Add death message to chat
        if (this.game.chatManager) {
            this.game.chatManager.addMessage({
                type: 'system',
                message: `${this.username} has died!`
            });
        }
    }
    
    /**
     * Respawn the player
     */
    respawn() {
        // Reset health and position
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        this.stamina = this.maxStamina;
        
        // Move to spawn point
        const spawnPoint = this.game.getSpawnPoint();
        this.moveTo(spawnPoint.x, spawnPoint.y, true);
        
        // Add respawn effect
        this.addEffect('respawn');
        
        // Add respawn message to chat
        if (this.game.chatManager) {
            this.game.chatManager.addMessage({
                type: 'system',
                message: `${this.username} has respawned!`
            });
        }
    }
    
    /**
     * Add a visual effect to the player
     * @param {string} type - Effect type
     * @param {number} duration - Effect duration in ms
     */
    addEffect(type, duration = 1000) {
        this.effects.push({
            type: type,
            duration: duration,
            startTime: Date.now()
        });
    }
    
    /**
     * Update server position when necessary
     */
    updateServerPosition() {
        if (!this.game || !this.game.socket) return;
        
        // Send updated position to server using the Socket module
        this.game.socket.sendMovement(this.x, this.y);
        
        // Track last update time
        this.lastServerUpdate = Date.now();
        
        // Update movement flags and metrics
        this.hasMovedSinceLastUpdate = false;
        this.distanceMoved = 0;
    }
    
    /**
     * Draw the player
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraX, cameraY) {
        // Convert world coordinates to screen coordinates
        const screenX = this.x - Math.floor(cameraX);
        const screenY = this.y - Math.floor(cameraY);
        
        // Only draw if player is visible on screen (with margin)
        if (screenX < -100 || screenX > ctx.canvas.width + 100 || 
            screenY < -100 || screenY > ctx.canvas.height + 100) {
            return;
        }
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenX,
            screenY + this.radius - 5,
            this.radius * 0.8,
            this.radius * 0.4,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw player body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw border for current player
        if (this.isCurrentPlayer) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw player name and level
        this.drawNameAndLevel(ctx, screenX, screenY);
        
        // Draw health bar
        this.drawHealthBar(ctx, screenX, screenY);
        
        // Draw effects
        this.drawEffects(ctx, screenX, screenY);
        
        // Draw debug info if enabled
        if (this.debug) {
            this.drawDebugInfo(ctx, screenX, screenY);
        }
    }
    
    /**
     * Draw player name and level
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawNameAndLevel(ctx, screenX, screenY) {
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        
        // Add shadow to make text readable
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Draw level badge
        const levelText = `Lv.${this.level}`;
        const levelMetrics = ctx.measureText(levelText);
        const levelHeight = 16;
        const levelWidth = levelMetrics.width + 10;
        
        const levelX = screenX - levelWidth / 2;
        const levelY = screenY - this.radius - 25;
        
        // Badge background
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.roundRect(levelX, levelY, levelWidth, levelHeight, 8);
        ctx.fill();
        
        // Level text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(levelText, screenX, levelY + 12);
        
        // Draw name
        ctx.fillText(this.username, screenX, screenY - this.radius - 10);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    
    /**
     * Draw player health bar
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawHealthBar(ctx, screenX, screenY) {
        const barWidth = this.radius * 2;
        const barHeight = 6;
        const barX = screenX - barWidth / 2;
        const barY = screenY + this.radius + 5;
        
        // Health bar background
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 3);
        ctx.fill();
        
        // Health bar fill
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : (healthPercent > 0.25 ? '#f39c12' : '#e74c3c');
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth * healthPercent, barHeight, 3);
        ctx.fill();
    }
    
    /**
     * Draw visual effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawEffects(ctx, screenX, screenY) {
        for (const effect of this.effects) {
            switch (effect.type) {
                case 'levelUp':
                    this.drawLevelUpEffect(ctx, screenX, screenY, effect);
                    break;
                case 'damage':
                    this.drawDamageEffect(ctx, screenX, screenY, effect);
                    break;
                case 'respawn':
                    this.drawRespawnEffect(ctx, screenX, screenY, effect);
                    break;
                case 'death':
                    this.drawDeathEffect(ctx, screenX, screenY, effect);
                    break;
            }
        }
    }
    
    /**
     * Draw level up effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {Object} effect - Effect data
     */
    drawLevelUpEffect(ctx, screenX, screenY, effect) {
        const progress = 1 - effect.duration / 1000;
        const radius = this.radius * (1 + progress);
        
        // Draw expanding circle
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw stars
        const starCount = 5;
        for (let i = 0; i < starCount; i++) {
            const angle = (Math.PI * 2 * i / starCount) + (progress * Math.PI);
            const distance = this.radius * 1.5 * progress;
            const starX = screenX + Math.cos(angle) * distance;
            const starY = screenY + Math.sin(angle) * distance;
            
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            this.drawStar(ctx, starX, starY, 5, 5, 3);
            ctx.fill();
        }
        
        // Text indicator
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('LEVEL UP!', screenX, screenY - this.radius - 30 - progress * 20);
        
        ctx.globalAlpha = 1.0;
    }
    
    /**
     * Draw damage effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {Object} effect - Effect data
     */
    drawDamageEffect(ctx, screenX, screenY, effect) {
        const progress = 1 - effect.duration / 1000;
        
        // Flash player red
        if (progress < 0.3) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
    
    /**
     * Draw respawn effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {Object} effect - Effect data
     */
    drawRespawnEffect(ctx, screenX, screenY, effect) {
        const progress = 1 - effect.duration / 1000;
        
        // Fade in player
        ctx.globalAlpha = progress;
        
        // Draw glow
        ctx.globalAlpha = progress * 0.7;
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.radius * 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
    }
    
    /**
     * Draw death effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {Object} effect - Effect data
     */
    drawDeathEffect(ctx, screenX, screenY, effect) {
        const progress = effect.duration / 1000;
        
        // Fade out player
        ctx.globalAlpha = progress;
        
        // Draw particles
        const particleCount = 10;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i / particleCount) + ((1 - progress) * Math.PI);
            const distance = this.radius * (1 - progress) * 2;
            const particleX = screenX + Math.cos(angle) * distance;
            const particleY = screenY + Math.sin(angle) * distance;
            
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1.0;
    }
    
    /**
     * Draw a star shape
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cx - Center X position
     * @param {number} cy - Center Y position
     * @param {number} spikes - Number of spikes
     * @param {number} outerRadius - Outer radius
     * @param {number} innerRadius - Inner radius
     */
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }
    
    /**
     * Draw debug information
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     */
    drawDebugInfo(ctx, screenX, screenY) {
        ctx.font = '10px Courier New';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        
        const debugInfo = [
            `ID: ${this.id}`,
            `Pos: (${Math.round(this.x)},${Math.round(this.y)})`,
            `Vel: (${this.velocity.x.toFixed(2)},${this.velocity.y.toFixed(2)})`,
            `Health: ${Math.round(this.health)}/${this.maxHealth}`,
            `Frame: ${this.animation.frame}/${this.animation.frames}`
        ];
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
            screenX + this.radius + 5,
            screenY - 20,
            150,
            debugInfo.length * 12 + 10
        );
        
        ctx.fillStyle = '#FFFFFF';
        debugInfo.forEach((text, index) => {
            ctx.fillText(
                text,
                screenX + this.radius + 10,
                screenY - 10 + (index + 1) * 12
            );
        });
    }
    
    /**
     * Serialize player data for network transmission
     * @returns {Object} - Serialized player data
     */
    serialize() {
        return {
            id: this.id,
            username: this.username,
            x: this.x,
            y: this.y,
            color: this.color,
            level: this.level,
            title: this.title,
            direction: this.animation.direction,
            frame: this.animation.frame,
            health: this.health,
            maxHealth: this.maxHealth,
            pickupStat: this.pickupStat
        };
    }
    
    /**
     * Deserialize player data from network
     * @param {Object} data - Player data
     */
    deserialize(data) {
        // Update properties from data
        if (data.x !== undefined) this.x = data.x;
        if (data.y !== undefined) this.y = data.y;
        if (data.color !== undefined) this.color = data.color;
        if (data.level !== undefined) this.level = data.level;
        if (data.title !== undefined) this.title = data.title;
        if (data.health !== undefined) this.health = data.health;
        if (data.maxHealth !== undefined) this.maxHealth = data.maxHealth;
        if (data.pickupStat !== undefined) this.pickupStat = data.pickupStat;
        
        // Update animation
        if (data.direction !== undefined) this.animation.direction = data.direction;
        if (data.frame !== undefined) this.animation.frame = data.frame;
    }
    
    /**
     * Update the player stats display in the UI
     */
    updateStatsDisplay() {
        const statsContainer = document.getElementById('playerStats');
        if (!statsContainer) return;
        
        // Update stats display
        statsContainer.innerHTML = `
            <div class="stat"><span class="stat-name">Strength:</span> <span class="stat-value">${this.strength}</span></div>
            <div class="stat"><span class="stat-name">Defense:</span> <span class="stat-value">${this.defense}</span></div>
            <div class="stat"><span class="stat-name">Dexterity:</span> <span class="stat-value">${this.dexterity}</span></div>
            <div class="stat"><span class="stat-name">Agility:</span> <span class="stat-value">${this.agility}</span></div>
            <div class="stat"><span class="stat-name">Intelligence:</span> <span class="stat-value">${this.intelligence}</span></div>
            <div class="stat"><span class="stat-name">Luck:</span> <span class="stat-value">${this.luck}</span></div>
            <div class="stat"><span class="stat-name">Pickup Range:</span> <span class="stat-value">${this.pickupStat}%</span></div>
        `;
    }
}

// Make the Player class globally available
window.Player = Player; 

export default Player;