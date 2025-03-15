/**
 * CombatSystem.js
 * 
 * Handles all combat-related functionality including attacks,
 * damage calculations, and hit detection.
 */
class CombatSystem {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        
        // Attack types
        this.attackTypes = {
            PICKAXE: 'pickaxe',
            AXE: 'axe',
            SWORD: 'sword'
        };
        
        // Active attacks
        this.activeAttacks = {};
        
        // Cooldowns
        this.cooldowns = {};
        
        // Default attack settings
        this.defaultAttackSettings = {
            [this.attackTypes.PICKAXE]: {
                damage: 10,
                cooldown: 700, // ms
                range: 70,
                angleSpread: 0.5, // radians
                knockback: 2,
                resourceType: 'ore'
            },
            [this.attackTypes.AXE]: {
                damage: 8,
                cooldown: 600,
                range: 60,
                angleSpread: 0.7,
                knockback: 3,
                resourceType: 'tree'
            },
            [this.attackTypes.SWORD]: {
                damage: 15,
                cooldown: 500,
                range: 50,
                angleSpread: 0.9,
                knockback: 5,
                resourceType: 'enemy'
            }
        };
        
        // Attack animations
        this.attackAnimations = {};
        
        // Hit detection
        this.hitTargets = new Set();
        
        // Track damage numbers
        this.damageNumbers = [];
        
        // Make globally available
        window.combatSystem = this;
    }
    
    /**
     * Initialize the combat system
     * @returns {CombatSystem} - This instance for chaining
     */
    init() {
        // Create attack animations
        this.createAttackAnimations();
        
        return this;
    }
    
    /**
     * Create attack animations
     */
    createAttackAnimations() {
        // Pickaxe attack animation
        this.attackAnimations[this.attackTypes.PICKAXE] = {
            frames: 6,
            currentFrame: 0,
            duration: 500, // ms
            startTime: 0,
            active: false,
            
            // Draw function
            draw: (ctx, x, y, angle, cameraX, cameraY) => {
                if (!this.attackAnimations[this.attackTypes.PICKAXE].active) return;
                
                // Get the sprite if available
                let image = null;
                if (this.game.assetLoader && this.game.assetLoader.getImage) {
                    image = this.game.assetLoader.getImage('pickaxePlaceholder');
                }
                
                // Convert world coordinates to screen coordinates
                const screenX = x - Math.floor(cameraX);
                const screenY = y - Math.floor(cameraY);
                
                // Calculate frame progress
                const elapsedTime = Date.now() - this.attackAnimations[this.attackTypes.PICKAXE].startTime;
                const progress = Math.min(elapsedTime / this.attackAnimations[this.attackTypes.PICKAXE].duration, 1);
                const frame = Math.floor(progress * this.attackAnimations[this.attackTypes.PICKAXE].frames);
                this.attackAnimations[this.attackTypes.PICKAXE].currentFrame = frame;
                
                // Draw pickaxe swing animation
                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(angle);
                
                // Animation logic - angle changes based on progress
                const swingAngle = -Math.PI / 2 + Math.sin(progress * Math.PI) * Math.PI / 1.5;
                
                // Draw the pickaxe at different angles based on animation progress
                ctx.rotate(swingAngle);
                
                if (image) {
                    // Draw image if available
                    ctx.drawImage(image, 20, -15, 40, 40);
                } else {
                    // Draw placeholder
                    ctx.fillStyle = '#888';
                    ctx.fillRect(20, -5, 40, 10);
                    
                    // Draw handle
                    ctx.fillStyle = '#A52A2A'; // Brown
                    ctx.fillRect(0, -5, 20, 10);
                }
                
                ctx.restore();
                
                // End animation if complete
                if (progress >= 1) {
                    this.attackAnimations[this.attackTypes.PICKAXE].active = false;
                }
            }
        };
        
        // Axe attack animation
        this.attackAnimations[this.attackTypes.AXE] = {
            frames: 5,
            currentFrame: 0,
            duration: 400, // ms
            startTime: 0,
            active: false,
            
            // Draw function
            draw: (ctx, x, y, angle, cameraX, cameraY) => {
                if (!this.attackAnimations[this.attackTypes.AXE].active) return;
                
                // Get the sprite if available
                let image = null;
                if (this.game.assetLoader && this.game.assetLoader.getImage) {
                    image = this.game.assetLoader.getImage('axePlaceholder');
                }
                
                // Convert world coordinates to screen coordinates
                const screenX = x - Math.floor(cameraX);
                const screenY = y - Math.floor(cameraY);
                
                // Calculate frame progress
                const elapsedTime = Date.now() - this.attackAnimations[this.attackTypes.AXE].startTime;
                const progress = Math.min(elapsedTime / this.attackAnimations[this.attackTypes.AXE].duration, 1);
                const frame = Math.floor(progress * this.attackAnimations[this.attackTypes.AXE].frames);
                this.attackAnimations[this.attackTypes.AXE].currentFrame = frame;
                
                // Draw axe swing animation
                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(angle);
                
                // Animation logic - angle changes based on progress
                const swingAngle = -Math.PI / 2 + Math.sin(progress * Math.PI) * Math.PI;
                
                // Draw the axe at different angles based on animation progress
                ctx.rotate(swingAngle);
                
                if (image) {
                    // Draw image if available
                    ctx.drawImage(image, 15, -20, 40, 40);
                } else {
                    // Draw placeholder
                    ctx.fillStyle = '#AAA';
                    ctx.beginPath();
                    ctx.moveTo(40, -20);
                    ctx.lineTo(60, -10);
                    ctx.lineTo(60, 10);
                    ctx.lineTo(40, 20);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Draw handle
                    ctx.fillStyle = '#8B4513'; // Saddle Brown
                    ctx.fillRect(10, -5, 30, 10);
                }
                
                ctx.restore();
                
                // End animation if complete
                if (progress >= 1) {
                    this.attackAnimations[this.attackTypes.AXE].active = false;
                }
            }
        };
    }
    
    /**
     * Start an attack
     * @param {string} attackType - Type of attack
     * @param {number} direction - Direction angle in radians
     * @param {Object} source - Source of the attack (usually the player)
     * @returns {boolean} - Whether the attack was started
     */
    startAttack(attackType, direction, source) {
        // Check if attack type is valid
        if (!this.attackTypes[attackType.toUpperCase()]) {
            console.error(`Invalid attack type: ${attackType}`);
            return false;
        }
        
        attackType = this.attackTypes[attackType.toUpperCase()];
        
        // Check cooldown
        const currentTime = Date.now();
        const cooldownKey = `${source.id || 'player'}_${attackType}`;
        
        if (this.cooldowns[cooldownKey] && currentTime < this.cooldowns[cooldownKey]) {
            console.log(`Attack on cooldown for ${(this.cooldowns[cooldownKey] - currentTime) / 1000}s`);
            return false;
        }
        
        // Get attack settings
        const settings = this.defaultAttackSettings[attackType];
        if (!settings) {
            console.error(`No settings found for attack type: ${attackType}`);
            return false;
        }
        
        // Set cooldown
        this.cooldowns[cooldownKey] = currentTime + settings.cooldown;
        
        // Create attack object
        const attackId = `attack_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.activeAttacks[attackId] = {
            id: attackId,
            type: attackType,
            direction: direction,
            source: source,
            settings: settings,
            startTime: currentTime,
            endTime: currentTime + settings.duration || 300,
            hasHit: new Set() // Track which targets were already hit
        };
        
        // Start animation
        if (this.attackAnimations[attackType]) {
            this.attackAnimations[attackType].active = true;
            this.attackAnimations[attackType].startTime = currentTime;
            this.attackAnimations[attackType].currentFrame = 0;
        }
        
        // Play sound if available
        if (this.game.assetLoader && this.game.assetLoader.playSound) {
            switch (attackType) {
                case this.attackTypes.PICKAXE:
                    this.game.assetLoader.playSound('miningHit', 0.5);
                    break;
                case this.attackTypes.AXE:
                    this.game.assetLoader.playSound('miningHit2', 0.5);
                    break;
            }
        }
        
        // Check for hits
        this.checkHits(attackId);
        
        return true;
    }
    
    /**
     * Update all active attacks
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        const currentTime = Date.now();
        
        // Update active attacks
        for (const attackId in this.activeAttacks) {
            const attack = this.activeAttacks[attackId];
            
            // Check if attack has ended
            if (currentTime > attack.endTime) {
                delete this.activeAttacks[attackId];
                continue;
            }
            
            // Check for hits
            this.checkHits(attackId);
        }
        
        // Update damage numbers
        this.updateDamageNumbers(deltaTime);
    }
    
    /**
     * Check for hits from an attack
     * @param {string} attackId - ID of the attack
     */
    checkHits(attackId) {
        const attack = this.activeAttacks[attackId];
        if (!attack) return;
        
        const source = attack.source;
        const settings = attack.settings;
        
        // Calculate attack range
        const rangeStart = attack.direction - settings.angleSpread / 2;
        const rangeEnd = attack.direction + settings.angleSpread / 2;
        
        // Different hit detection based on resource type
        switch (settings.resourceType) {
            case 'ore':
                this.checkOreHits(attack, source, settings, rangeStart, rangeEnd);
                break;
            case 'tree':
                this.checkTreeHits(attack, source, settings, rangeStart, rangeEnd);
                break;
            case 'enemy':
                this.checkEnemyHits(attack, source, settings, rangeStart, rangeEnd);
                break;
        }
    }
    
    /**
     * Check for ore hits
     * @param {Object} attack - The attack object
     * @param {Object} source - Source of the attack
     * @param {Object} settings - Attack settings
     * @param {number} rangeStart - Start angle of attack range
     * @param {number} rangeEnd - End angle of attack range
     */
    checkOreHits(attack, source, settings, rangeStart, rangeEnd) {
        // Get ores from the game
        const ores = window.ores || [];
        if (!ores.length) return;
        
        // Check each ore
        for (const ore of ores) {
            // Skip if already hit by this attack
            if (attack.hasHit.has(ore.id)) continue;
            
            // Skip if ore is broken
            if (ore.broken) continue;
            
            // Calculate direction to ore
            const dx = ore.x - source.x;
            const dy = ore.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if ore is in range
            if (distance > settings.range + (ore.radius || 0)) {
                continue;
            }
            
            // Check if ore is in angle range
            const angle = Math.atan2(dy, dx);
            const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
            const normalizedRangeStart = (rangeStart + Math.PI * 2) % (Math.PI * 2);
            const normalizedRangeEnd = (rangeEnd + Math.PI * 2) % (Math.PI * 2);
            
            // Handle angle wrap-around
            let inAngleRange;
            if (normalizedRangeStart <= normalizedRangeEnd) {
                inAngleRange = normalizedAngle >= normalizedRangeStart && normalizedAngle <= normalizedRangeEnd;
            } else {
                inAngleRange = normalizedAngle >= normalizedRangeStart || normalizedAngle <= normalizedRangeEnd;
            }
            
            if (!inAngleRange) {
                continue;
            }
            
            // Ore is hit!
            attack.hasHit.add(ore.id);
            this.hitTargets.add(ore);
            
            // Mine the ore
            this.mineOre(ore, settings.damage, source);
            
            // Add visual effects
            this.addHitEffects(ore);
        }
    }
    
    /**
     * Check for tree hits
     * @param {Object} attack - The attack object
     * @param {Object} source - Source of the attack
     * @param {Object} settings - Attack settings
     * @param {number} rangeStart - Start angle of attack range
     * @param {number} rangeEnd - End angle of attack range
     */
    checkTreeHits(attack, source, settings, rangeStart, rangeEnd) {
        // In a full implementation, this would check for tree hits
        // For now, we'll just log a message
        console.log('Tree hit detection not yet implemented');
    }
    
    /**
     * Check for enemy hits
     * @param {Object} attack - The attack object
     * @param {Object} source - Source of the attack
     * @param {Object} settings - Attack settings
     * @param {number} rangeStart - Start angle of attack range
     * @param {number} rangeEnd - End angle of attack range
     */
    checkEnemyHits(attack, source, settings, rangeStart, rangeEnd) {
        // In a full implementation, this would check for enemy hits
        // For now, we'll just log a message
        console.log('Enemy hit detection not yet implemented');
    }
    
    /**
     * Mine an ore
     * @param {Object} ore - The ore to mine
     * @param {number} damage - Damage to apply
     * @param {Object} source - Source of the attack (usually the player)
     */
    mineOre(ore, damage, source) {
        // Get tool being used
        const toolLevel = this.getToolLevel(source);
        
        // Apply mining multiplier based on tool
        const adjustedDamage = damage * this.getMiningMultiplier(ore, toolLevel);
        
        // Reduce ore health
        ore.health -= adjustedDamage;
        
        // Show damage number
        this.createDamageNumber(Math.round(adjustedDamage), ore.x, ore.y);
        
        // Generate particles
        if (ore.generateParticles) {
            const particles = ore.generateParticles(true);
            window.rockParticles.push(...particles);
        }
        
        // Check if ore is destroyed
        if (ore.health <= 0 && !ore.broken) {
            this.handleOreDestroyed(ore, source);
        }
    }
    
    /**
     * Handle ore destroyed
     * @param {Object} ore - The destroyed ore
     * @param {Object} source - Source of the attack (usually the player)
     */
    handleOreDestroyed(ore, source) {
        ore.broken = true;
        
        // Generate experience orbs if the function exists
        if (window.expOrbManager && window.expOrbManager.createExpOrb) {
            const expValue = ore.expValue || 5; // Default to 5 if not specified
            window.expOrbManager.createExpOrb(ore.x, ore.y, expValue);
        }
        
        // Add to player's resources
        this.addResourcesToPlayer(ore.type || 'stone', ore.yield || 1, source);
        
        // Add mining message to chat
        if (this.game.chatManager) {
            this.game.chatManager.addMessage({
                type: 'system',
                message: `${source.username || 'Player'} mined ${ore.name || 'a rock'} and got ${ore.yield || 1} ${ore.type || 'stone'}.`
            });
        }
        
        // Respawn ore after delay
        setTimeout(() => {
            ore.health = ore.maxHealth;
            ore.broken = false;
        }, ore.respawnTime || 60000); // Default 60 seconds if not specified
    }
    
    /**
     * Get tool level from player/source
     * @param {Object} source - Source object (usually player)
     * @returns {number} - Tool level (0-5)
     */
    getToolLevel(source) {
        // Check if player has a selected tool
        if (window.selectedTool) {
            if (window.selectedTool.level) {
                return window.selectedTool.level;
            }
            
            // Determine level from tool name
            if (window.selectedTool.name) {
                const name = window.selectedTool.name.toLowerCase();
                if (name.includes('wooden')) return 1;
                if (name.includes('stone')) return 2;
                if (name.includes('iron')) return 3;
                if (name.includes('gold')) return 4;
                if (name.includes('diamond')) return 5;
            }
        }
        
        // Default to level 1 (wooden)
        return 1;
    }
    
    /**
     * Get mining multiplier based on ore and tool level
     * @param {Object} ore - The ore being mined
     * @param {number} toolLevel - Level of the tool
     * @returns {number} - Damage multiplier
     */
    getMiningMultiplier(ore, toolLevel) {
        // Base multiplier
        let multiplier = 1.0;
        
        // Adjust based on ore hardness vs tool level
        const oreHardness = ore.hardness || 1;
        
        if (toolLevel >= oreHardness + 2) {
            // Tool is much better than needed
            multiplier = 2.5;
        } else if (toolLevel >= oreHardness + 1) {
            // Tool is better than needed
            multiplier = 2.0;
        } else if (toolLevel >= oreHardness) {
            // Tool is appropriate
            multiplier = 1.5;
        } else if (toolLevel === oreHardness - 1) {
            // Tool is slightly too weak
            multiplier = 0.75;
        } else {
            // Tool is much too weak
            multiplier = 0.25;
        }
        
        return multiplier;
    }
    
    /**
     * Add resources to player
     * @param {string} type - Resource type
     * @param {number} amount - Amount to add
     * @param {Object} player - Player object
     */
    addResourcesToPlayer(type, amount, player) {
        if (!player || !player.resources) return;
        
        // Initialize resource type if it doesn't exist
        if (!player.resources[type]) {
            player.resources[type] = 0;
        }
        
        // Add resources
        player.resources[type] += amount;
        
        // Update UI if it exists
        if (window.playerProgression && window.playerProgression.updateResourceDisplay) {
            window.playerProgression.updateResourceDisplay();
        }
    }
    
    /**
     * Add hit effects
     * @param {Object} target - The target that was hit
     */
    addHitEffects(target) {
        // Add to hitRocks for visual effect
        window.hitRocks = window.hitRocks || new Set();
        window.rockHitTimes = window.rockHitTimes || new Map();
        window.rockHitDuration = window.rockHitDuration || 500;
        
        window.hitRocks.add(target);
        window.rockHitTimes.set(target, Date.now());
    }
    
    /**
     * Create a damage number at a position
     * @param {number} amount - Amount of damage
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createDamageNumber(amount, x, y) {
        this.damageNumbers.push({
            amount: amount,
            x: x,
            y: y,
            startY: y,
            created: Date.now(),
            life: 1000,
            color: amount > 15 ? '#FF0000' : (amount > 10 ? '#FF6600' : '#FFFFFF')
        });
    }
    
    /**
     * Update damage numbers
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateDamageNumbers(deltaTime) {
        const now = Date.now();
        
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const number = this.damageNumbers[i];
            const age = now - number.created;
            
            // Move upward
            number.y = number.startY - (age / 1000) * 50;
            
            // Remove if too old
            if (age > number.life) {
                this.damageNumbers.splice(i, 1);
            }
        }
    }
    
    /**
     * Draw damage numbers
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    drawDamageNumbers(ctx, cameraX, cameraY) {
        const now = Date.now();
        
        ctx.save();
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        for (const number of this.damageNumbers) {
            const age = now - number.created;
            const opacity = 1 - (age / number.life);
            
            // Skip if off-screen
            const screenX = number.x - Math.floor(cameraX);
            const screenY = number.y - Math.floor(cameraY);
            
            if (screenX < 0 || screenX > ctx.canvas.width || 
                screenY < 0 || screenY > ctx.canvas.height) {
                continue;
            }
            
            // Draw with fading opacity
            ctx.fillStyle = `rgba(${number.color.slice(1, -1)}, ${opacity})`;
            ctx.fillText(`${number.amount}`, screenX, screenY);
        }
        
        ctx.restore();
    }
    
    /**
     * Draw all attack animations
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera X position
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraX, cameraY) {
        // Get player position
        const player = this.game.myPlayer;
        if (!player) return;
        
        // Draw attack animations
        for (const type in this.attackAnimations) {
            const animation = this.attackAnimations[type];
            if (animation.active) {
                animation.draw(
                    ctx, 
                    player.x, 
                    player.y, 
                    this.getAttackDirection(player),
                    cameraX, 
                    cameraY
                );
            }
        }
        
        // Draw damage numbers
        this.drawDamageNumbers(ctx, cameraX, cameraY);
    }
    
    /**
     * Get attack direction for a player
     * @param {Object} player - Player object
     * @returns {number} - Attack direction in radians
     */
    getAttackDirection(player) {
        // Use player's attack direction if available
        if (player.attackDirection !== undefined) {
            return player.attackDirection;
        }
        
        // Fall back to movement direction
        if (this.game.velocity) {
            if (this.game.velocity.x !== 0 || this.game.velocity.y !== 0) {
                return Math.atan2(this.game.velocity.y, this.game.velocity.x);
            }
        }
        
        // Default to right
        return 0;
    }
}

// Make the CombatSystem class globally available
window.CombatSystem = CombatSystem; 

export default CombatSystem;