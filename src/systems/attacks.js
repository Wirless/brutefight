/**
 * Attacks System
 * 
 * Defines all attack types, damage calculations, and combat mechanics
 */

// Attack types
export const ATTACK_TYPES = {
    MELEE: 'melee',
    RANGED: 'ranged',
    MAGIC: 'magic'
};

// Weapon types and their base properties
export const WEAPON_TYPES = {
    SWORD: {
        id: 'sword',
        name: 'Sword',
        type: ATTACK_TYPES.MELEE,
        baseSpeed: 1.0,
        baseDamage: 5,
        range: 1
    },
    AXE: {
        id: 'axe',
        name: 'Axe',
        type: ATTACK_TYPES.MELEE,
        baseSpeed: 0.8,
        baseDamage: 7,
        range: 1
    },
    MACE: {
        id: 'mace',
        name: 'Mace',
        type: ATTACK_TYPES.MELEE,
        baseSpeed: 0.7,
        baseDamage: 8,
        range: 1
    },
    BOW: {
        id: 'bow',
        name: 'Bow',
        type: ATTACK_TYPES.RANGED,
        baseSpeed: 1.2,
        baseDamage: 4,
        range: 5
    },
    CROSSBOW: {
        id: 'crossbow',
        name: 'Crossbow',
        type: ATTACK_TYPES.RANGED,
        baseSpeed: 0.6,
        baseDamage: 9,
        range: 4
    },
    STAFF: {
        id: 'staff',
        name: 'Staff',
        type: ATTACK_TYPES.MAGIC,
        baseSpeed: 1.0,
        baseDamage: 3,
        range: 6
    },
    WAND: {
        id: 'wand',
        name: 'Wand',
        type: ATTACK_TYPES.MAGIC,
        baseSpeed: 1.5,
        baseDamage: 2,
        range: 5
    }
};

// Calculate damage based on weapon, player stats, and target
export function calculateDamage(attacker, target, weapon) {
    // Base damage from weapon
    let damage = weapon.baseDamage;
    
    // Add attacker's strength or relevant stat
    switch (weapon.type) {
        case ATTACK_TYPES.MELEE:
            damage += attacker.strength || 0;
            break;
        case ATTACK_TYPES.RANGED:
            damage += attacker.dexterity || 0;
            break;
        case ATTACK_TYPES.MAGIC:
            damage += attacker.intelligence || 0;
            break;
    }
    
    // Apply random variance (±20%)
    const variance = 0.2;
    const randomFactor = 1 + (Math.random() * variance * 2 - variance);
    damage *= randomFactor;
    
    // Apply target's defense
    const defense = target.defense || 0;
    damage = Math.max(1, damage - defense * 0.5);
    
    // Round to integer
    return Math.round(damage);
}

// Calculate hit chance based on attacker and target stats
export function calculateHitChance(attacker, target, weapon) {
    let accuracy = 70; // Base accuracy percentage
    
    // Add attacker's accuracy bonus based on weapon type
    switch (weapon.type) {
        case ATTACK_TYPES.MELEE:
            accuracy += (attacker.strength || 0) * 0.5;
            break;
        case ATTACK_TYPES.RANGED:
            accuracy += (attacker.dexterity || 0) * 0.5;
            break;
        case ATTACK_TYPES.MAGIC:
            accuracy += (attacker.intelligence || 0) * 0.5;
            break;
    }
    
    // Subtract target's evasion
    const evasion = (target.agility || 0) * 0.3;
    accuracy -= evasion;
    
    // Clamp between 10% and 95%
    return Math.max(10, Math.min(95, accuracy));
}

// Check if attack hits based on hit chance
export function doesAttackHit(hitChance) {
    return Math.random() * 100 <= hitChance;
}

// Calculate attack cooldown based on weapon speed and attacker stats
export function calculateAttackCooldown(attacker, weapon) {
    // Base cooldown in milliseconds (higher is slower)
    let cooldown = 1000 / weapon.baseSpeed;
    
    // Reduce cooldown based on attacker's agility
    const agilityBonus = (attacker.agility || 0) * 10;
    cooldown = Math.max(300, cooldown - agilityBonus);
    
    return cooldown;
}

// Initialize global variables for rock hit effects
if (!window.hitRocks) window.hitRocks = new Set();
if (!window.rockHitTimes) window.rockHitTimes = new Map();
if (!window.rockParticles) window.rockParticles = [];
if (!window.rockHitDuration) window.rockHitDuration = 500; // ms

// Load hit sound as early as possible
let hitSound, hitSound2;
try {
    hitSound = new Audio('sounds/hit.mp3');
    hitSound.volume = 0.3;
    hitSound2 = new Audio('sounds/hit2.mp3');
    hitSound2.volume = 0.3;
} catch (error) {
    console.error("Could not load hit sounds:", error);
}

class Attack {
    constructor(player, ctx) {
        this.player = player;
        this.ctx = ctx;
        this.isActive = false;
        this.startTime = 0;
        this.cooldown = 0;
        this.maxCooldown = 800; // Default cooldown in ms
        this.direction = 0;
    }
    
    // Start the attack
    start(direction) {
        if (this.cooldown > 0) return false;
        
        this.isActive = true;
        this.startTime = Date.now();
        this.cooldown = this.maxCooldown;
        this.direction = direction;
        return true;
    }
    
    // Update attack state
    update(deltaTime) {
        // Update cooldown
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
            if (this.cooldown < 0) this.cooldown = 0;
        }
        
        // Check if attack is finished
        if (this.isActive) {
            const elapsed = Date.now() - this.startTime;
            if (elapsed >= this.getDuration()) {
                this.isActive = false;
            }
        }
    }
    
    // Draw the attack
    draw(cameraX, cameraY) {
        // Base class doesn't draw anything
    }
    
    // Check for hits
    checkHits(targets) {
        // Base class doesn't hit anything
        return [];
    }
    
    // Get attack duration
    getDuration() {
        return 300; // Default duration in ms
    }
    
    // Get attack progress (0 to 1)
    getProgress() {
        if (!this.isActive) return 0;
        const elapsed = Date.now() - this.startTime;
        return Math.min(elapsed / this.getDuration(), 1);
    }
    
    // Get cooldown progress (0 to 1)
    getCooldownProgress() {
        return this.cooldown / this.maxCooldown;
    }
}

class PickaxeAttack extends Attack {
    constructor(player, ctx) {
        super(player, ctx);
        this.maxCooldown = 800; // ms
        this.range = 110; // Maximum reach
        this.length = 50; // Length of the pickaxe
        this.hitChecked = false;
        this.baseDamage = 5; // Base damage is 5
        
        // Load hit sound
        try {
            this.hitSound = hitSound || new Audio('sounds/hit.mp3');
            this.hitSound.volume = 0.3; // Set volume to 30%
        } catch (error) {
            console.error("Could not load pickaxe hit sound:", error);
            this.hitSound = null;
        }
    }
    
    getDuration() {
        return 400; // ms
    }
    
    start(direction) {
        if (!super.start(direction)) return false;
        
        this.hitChecked = false;
        
        // Schedule hit check at 90% through the swing - when pickaxe reaches the target
        setTimeout(() => {
            if (this.isActive) {
                this.checkHits();
                this.hitChecked = true;
            }
        }, this.getDuration() * 0.9);
        
        return true;
    }
    
    draw(cameraX, cameraY) {
        if (!this.isActive) return;
        
        const ctx = this.ctx;
        const progress = this.getProgress();
        
        // Calculate screen position
        const screenX = this.player.x - Math.floor(cameraX);
        const screenY = this.player.y - Math.floor(cameraY);
        
        // Use the cursor direction directly
        const swingDirection = this.direction;
        
        // Calculate swing position
        // Start from one side (-1), pass through center (0), end at other side (1)
        const swingPosition = -1 + progress * 2; // Goes from -1 to 1
        
        // Calculate handle length based on position
        // Shortest at center, longest at sides
        const handleLength = this.length * Math.abs(swingPosition);
        
        // Calculate handle direction
        // If swingPosition is negative, we're on the starting side (opposite cursor)
        // If swingPosition is positive, we're on the ending side (toward cursor)
        const handleDirection = swingPosition < 0 ? swingDirection + Math.PI : swingDirection;
        
        // Calculate handle end position
        const handleEndX = screenX + Math.cos(handleDirection) * handleLength;
        const handleEndY = screenY + Math.sin(handleDirection) * handleLength;
        
        // Draw wooden handle
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(handleEndX, handleEndY);
        ctx.strokeStyle = '#8B4513'; // Brown
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Draw metal pickaxe head
        const headLength = 12;
        const headEndX = handleEndX + Math.cos(handleDirection) * headLength;
        const headEndY = handleEndY + Math.sin(handleDirection) * headLength;
        
        // Draw the metal head
        ctx.beginPath();
        ctx.moveTo(handleEndX, handleEndY);
        ctx.lineTo(headEndX, headEndY);
        ctx.strokeStyle = '#A9A9A9'; // Gray
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Draw swing path
        if (progress > 0.05 && progress < 0.95) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            
            // Draw line from start to end position
            const startX = screenX + Math.cos(swingDirection + Math.PI) * this.length;
            const startY = screenY + Math.sin(swingDirection + Math.PI) * this.length;
            const endX = screenX + Math.cos(swingDirection) * this.length;
            const endY = screenY + Math.sin(swingDirection) * this.length;
            
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        // Draw impact effect when hitting at the end of the swing
        if (progress > 0.9 && this.hitChecked) {
            // Draw impact flash at the end of the pickaxe
            const impactSize = 15;
            const impactAlpha = 0.7 - (progress - 0.9) * 7; // Fades quickly
            
            ctx.beginPath();
            ctx.arc(headEndX, headEndY, impactSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${impactAlpha})`;
            ctx.fill();
            
            // Draw impact lines
            const lineCount = 5;
            for (let i = 0; i < lineCount; i++) {
                const lineAngle = swingDirection + (Math.random() - 0.5) * Math.PI;
                const lineLength = 5 + Math.random() * 10;
                
                ctx.beginPath();
                ctx.moveTo(headEndX, headEndY);
                ctx.lineTo(
                    headEndX + Math.cos(lineAngle) * lineLength,
                    headEndY + Math.sin(lineAngle) * lineLength
                );
                ctx.strokeStyle = `rgba(255, 220, 150, ${impactAlpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
    
    checkHits() {
        if (!this.isActive || !window.ores || this.hitChecked) return [];
        
        const hitOres = [];
        
        // Use cursor direction directly
        const swingDirection = this.direction;
        
        // Check each ore
        for (let i = 0; i < window.ores.length; i++) {
            const ore = window.ores[i];
            
            // Calculate distance from ore to player
            const dx = ore.x - this.player.x;
            const dy = ore.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate angle to ore
            const angleToOre = Math.atan2(dy, dx);
            
            // Calculate angle difference to swing direction
            let angleDiff = angleToOre - swingDirection;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Check if ore is within range and in the direction of the cursor
            // Only check in the forward direction (toward cursor), not the opposite side
            if (distance < this.range && Math.abs(angleDiff) < Math.PI/6) {
                // Calculate damage based on player's strength and selected tool
                let damage = this.baseDamage;
                
                // If we have a tool selected, use its damage
                if (window.selectedTool && window.selectedTool.stats && window.selectedTool.stats.strength) {
                    damage = window.selectedTool.stats.strength;
                    console.log(`Using ${window.selectedTool.name} with strength ${damage}`);
                } else {
                    // Apply player strength multiplier if no tool
                    const strengthMultiplier = this.player.strength || 1;
                    damage = this.baseDamage * strengthMultiplier;
                }
                
                // Ore is hit! 
                const destroyed = ore.hit ? ore.hit(damage) : false;
                
                // Add mining experience for hitting the rock
                if (window.skillsManager) {
                    // Add 1 experience point for each hit
                    window.skillsManager.addExperience('mining', 1);
                }
                
                // Create a small experience orb for each hit instead of adding experience directly
                if (window.expOrbManager) {
                    // Random position slightly offset from where the hit occurred
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 10 + Math.random() * 5;
                    const orbX = ore.x + Math.cos(angle) * distance;
                    const orbY = ore.y + Math.sin(angle) * distance;
                    
                    // Create a small orb with 1 XP
                    window.expOrbManager.createOrb(orbX, orbY, 1);
                }
                
                // Play hit sound
                this.playHitSound();
                
                // Generate particles
                if (ore.generateParticles) {
                    const particles = ore.generateParticles();
                    if (particles && particles.length > 0) {
                        window.rockParticles.push(...particles);
                    }
                } else {
                    // Create default particles if the ore doesn't provide any
                    this.createDefaultParticles(ore.x, ore.y, ore.color || '#A9A9A9');
                }
                
                // Add visual hit effect
                window.hitRocks.add(ore);
                window.rockHitTimes.set(ore, Date.now());
                
                // If ore is destroyed, handle drops and remove it
                if (destroyed) {
                    const drops = ore.getDrops ? ore.getDrops() : [];
                    console.log(`Ore destroyed! Drops:`, drops);
                    
                    // Add bonus mining experience for destroying the rock
                    if (window.skillsManager) {
                        // Add 5 bonus experience points for destroying the rock
                        window.skillsManager.addExperience('mining', 5);
                    }
                    
                    // Create experience orbs for destruction
                    this.createExperienceOrbs(ore, drops);
                    
                    // Remove the ore
                    if (window.oreManager && window.oreManager.removeOre) {
                        window.oreManager.removeOre(ore);
                    } else {
                        // Fallback to direct array removal
                        window.ores.splice(i, 1);
                        i--; // Adjust index since we removed an item
                    }
                }
                
                hitOres.push(i);
            }
        }
        
        return hitOres;
    }
    
    createDefaultParticles(x, y, color) {
        // Create default particles if ore doesn't have its own implementation
        if (!window.rockParticles) window.rockParticles = [];
        
        const particleCount = 5 + Math.floor(Math.random() * 5); // 5-9 particles
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const size = 1 + Math.random() * 3;
            const lifetime = 500 + Math.random() * 1000; // 0.5 to 1.5 seconds
            
            window.rockParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                opacity: 0.8,
                lifetime: lifetime,
                created: Date.now()
            });
        }
    }
    
    createExperienceOrbs(ore, drops) {
        try {
            const expAmount = drops && drops.experience ? drops.experience : 10;
            
            // Create one orb per experience point, instead of combining them
            // This will allow them to merge naturally when they get close to each other
            console.log(`Rock destroyed! Creating ${expAmount} individual experience orbs`);
            
            // Create orbs using ExperienceOrbManager
            if (window.expOrbManager) {
                // Create individual orbs in a burst pattern
                if (window.expOrbManager.createOrb) {
                    for (let j = 0; j < expAmount; j++) {
                        // Random position around the ore
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 10 + Math.random() * 20;
                        const orbX = ore.x + Math.cos(angle) * distance;
                        const orbY = ore.y + Math.sin(angle) * distance;
                        
                        // Each orb is worth 1 XP
                        window.expOrbManager.createOrb(orbX, orbY, 1);
                    }
                } else if (window.expOrbManager.createOrbBurst) {
                    // If createOrb is not available, use createOrbBurst but with one value per orb
                    window.expOrbManager.createOrbBurst(ore.x, ore.y, expAmount, expAmount);
                }
            } 
            // Use old implementation if the above isn't available
            else if (window.ExperienceOrbManager) {
                // Try to use the manager if it's already instantiated
                let manager = window.expOrbManager;
                
                // If not, create a new one
                if (!manager) {
                    manager = new window.ExperienceOrbManager();
                    window.expOrbManager = manager;
                }
                
                if (manager.createOrb) {
                    // Create individual orbs with the burst pattern
                    for (let j = 0; j < expAmount; j++) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 10 + Math.random() * 20;
                        const orbX = ore.x + Math.cos(angle) * distance;
                        const orbY = ore.y + Math.sin(angle) * distance;
                        
                        // Each orb is worth 1 XP
                        manager.createOrb(orbX, orbY, 1);
                    }
                } else if (manager.createOrbBurst) {
                    // Create an orb burst with one value per orb
                    manager.createOrbBurst(ore.x, ore.y, expAmount, expAmount);
                }
            } else {
                console.warn("Could not create experience orbs: No ExperienceOrbManager found");
            }
        } catch (error) {
            console.error("Error creating experience orbs:", error);
        }
    }
    
    playHitSound() {
        if (!this.hitSound) return;
        
        try {
            // Clone the sound to allow multiple overlapping sounds
            const sound = this.hitSound.cloneNode();
            
            // Add some pitch variation
            sound.playbackRate = 0.9 + Math.random() * 0.2;
            
            // Play the sound
            sound.play().catch(err => {
                // Handle autoplay restrictions
                console.log('Sound play failed:', err);
            });
        } catch (error) {
            console.error("Error playing sound:", error);
        }
    }
}

class AxeAttack extends Attack {
    constructor(player, ctx) {
        super(player, ctx);
        this.name = 'axe';
        this.damage = 15;
        this.range = 60;
        this.cooldown = 600; // Milliseconds
        this.duration = 400; // Milliseconds
        this.width = 30; // Width of swing arc
        this.length = 45; // Length of the axe
        this.hasHit = false;
        this.elapsedTime = 0;
        
        // Load hit sound
        this.hitSound = 'hit2'; // Use hit2 sound which is known to exist
        
        console.log('AxeAttack initialized');
    }
    
    getDuration() {
        return this.duration;
    }
    
    start(direction) {
        super.start(direction);
        this.hitChecked = false;
        this.hasHit = false;
        this.elapsedTime = 0;
        
        // Schedule hit check at 50% through the swing (middle of side swing)
        setTimeout(() => {
            if (this.isActive) {
                this.checkHits();
                this.hitChecked = true;
            }
        }, this.duration * 0.5);
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.elapsedTime += deltaTime;
    }
    
    // Add the createDefaultParticles method
    createDefaultParticles(x, y, color) {
        if (!window.particleManager) return;
        
        const particleCount = 5 + Math.floor(Math.random() * 5);
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const size = 1 + Math.random() * 3;
            const life = 500 + Math.random() * 1000;
            
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                life: life,
                maxLife: life,
                gravity: 0.05 + Math.random() * 0.1
            });
        }
        
        window.particleManager.addParticles(particles);
    }
    
    // Add the createExperienceOrbs method (keeping both methods for compatibility)
    createExperienceOrbs(ore, drops) {
        try {
            const expAmount = drops && drops.experience ? drops.experience : 10;
            
            // Create one orb per experience point, instead of combining them
            // This will allow them to merge naturally when they get close to each other
            console.log(`Rock destroyed! Creating ${expAmount} individual experience orbs`);
            
            // Create orbs using ExperienceOrbManager
            if (window.expOrbManager) {
                // Create individual orbs in a burst pattern
                if (window.expOrbManager.createOrb) {
                    for (let j = 0; j < expAmount; j++) {
                        // Random position around the ore
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 10 + Math.random() * 20;
                        const orbX = ore.x + Math.cos(angle) * distance;
                        const orbY = ore.y + Math.sin(angle) * distance;
                        
                        // Each orb is worth 1 XP
                        window.expOrbManager.createOrb(orbX, orbY, 1);
                    }
                } else if (window.expOrbManager.createOrbBurst) {
                    // If createOrb is not available, use createOrbBurst but with one value per orb
                    window.expOrbManager.createOrbBurst(ore.x, ore.y, expAmount, expAmount);
                }
            }
            // Use old implementation if the above isn't available
            else if (window.ExperienceOrbManager) {
                // Try to use the manager if it's already instantiated
                let manager = window.expOrbManager;
                
                // If not, create a new one
                if (!manager) {
                    manager = new window.ExperienceOrbManager();
                    window.expOrbManager = manager;
                }
                
                if (manager.createOrb) {
                    // Create individual orbs with the burst pattern
                    for (let j = 0; j < expAmount; j++) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 10 + Math.random() * 20;
                        const orbX = ore.x + Math.cos(angle) * distance;
                        const orbY = ore.y + Math.sin(angle) * distance;
                        
                        // Each orb is worth 1 XP
                        manager.createOrb(orbX, orbY, 1);
                    }
                } else if (manager.createOrbBurst) {
                    // Create an orb burst with one value per orb
                    manager.createOrbBurst(ore.x, ore.y, expAmount, expAmount);
                }
            } else {
                console.warn("Could not create experience orbs: No ExperienceOrbManager found");
            }
        } catch (error) {
            console.error("Error creating experience orbs:", error);
        }
    }
    
    /**
     * Create wood particles at the hit location
     * @param {number} x - X position of the hit
     * @param {number} y - Y position of the hit
     * @param {string} color - Color of the wood (trunk color)
     */
    createWoodParticles(x, y, color) {
        if (!window.particleManager) {
            // Fallback to rockParticles if no particle manager
            if (!window.rockParticles) {
                window.rockParticles = [];
            }
            
            const particleCount = 8 + Math.floor(Math.random() * 5);
            
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 3;
                const size = 2 + Math.random() * 3;
                const lifetime = 800 + Math.random() * 1200;
                
                window.rockParticles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1, // Add a slight upward motion
                    size: size,
                    color: color || '#8B4513', // Default to saddle brown
                    opacity: 0.9,
                    created: Date.now(),
                    lifetime: lifetime
                });
            }
        } else {
            // Use particle manager if available
            const particleCount = 10 + Math.floor(Math.random() * 8);
            const particles = [];
            
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 4;
                const size = 2 + Math.random() * 3;
                const life = 800 + Math.random() * 1200;
                
                particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1.5, // Add upward motion
                    size: size,
                    color: color || '#8B4513',
                    life: life,
                    maxLife: life,
                    gravity: 0.1 + Math.random() * 0.1
                });
            }
            
            window.particleManager.addParticles(particles);
        }
    }
    
    /**
     * Create experience orbs from chopped tree
     * @param {Object} tree - The tree that was chopped
     * @param {Object} drops - Drops from the tree
     */
    createWoodExperienceOrbs(tree, drops) {
        if (!tree || !drops) {
            console.error("Cannot create experience orbs - tree or drops are missing");
            return;
        }
        
        const experience = Math.floor(drops.experience || 0);
        
        if (experience <= 0) {
            console.warn("Tree has no experience value");
            return;
        }
        
        console.log(`Creating ${experience} experience from chopped tree`);
        
        // Add experience to the woodcutting skill
        if (this.player && window.game && window.game.skillsManager) {
            console.log("Adding experience to woodcutting skill");
            window.game.skillsManager.addExperience('woodcutting', experience);
        }
        
        // Spawn experience orbs
        this.spawnExperienceOrbs(tree.x, tree.y, experience);
    }
    
    /**
     * Spawn experience orbs at a location
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} amount - Amount of experience
     */
    spawnExperienceOrbs(x, y, amount) {
        // Use the newer experience orb manager if available
        if (window.expOrbManager) {
            console.log("Using expOrbManager to create orbs");
            // Create orbs in a burst pattern around the source
            for (let i = 0; i < amount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 20 + 5;
                const orbX = x + Math.cos(angle) * distance;
                const orbY = y + Math.sin(angle) * distance;
                
                window.expOrbManager.createOrb({
                    x: orbX,
                    y: orbY,
                    value: 1, // Each orb is worth 1 XP
                    mergeDistance: 20
                });
            }
        } 
        // Fallback to older implementation
        else if (window.ExperienceOrbManager) {
            console.log("Using ExperienceOrbManager to create orbs");
            for (let i = 0; i < amount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 20 + 5;
                const orbX = x + Math.cos(angle) * distance;
                const orbY = y + Math.sin(angle) * distance;
                
                window.ExperienceOrbManager.createOrb(orbX, orbY, 1);
            }
        }
        // Manual creation as last resort
        else if (window.game && window.game.addExperience) {
            console.log("Direct experience addition as fallback");
            window.game.addExperience(amount);
            
            // Create a visual indicator
            if (window.game.textParticles) {
                window.game.textParticles.push({
                    x: x,
                    y: y,
                    text: `+${amount} XP`,
                    color: 'yellow',
                    size: 16,
                    opacity: 1,
                    lifetime: 2000,
                    created: Date.now(),
                    vy: -1.5,
                    vx: 0
                });
            }
        }
        // Last fallback
        else {
            console.warn('No experience orb manager found for tree experience orbs');
        }
    }
    
    // Re-add the missing draw method
    draw(cameraX, cameraY) {
        if (!this.isActive) return;
        
        const ctx = this.ctx;
        const progress = this.getProgress();
        
        // Calculate screen position
        const screenX = this.player.x - Math.floor(cameraX);
        const screenY = this.player.y - Math.floor(cameraY);
        
        // Calculate swing angle based on progress
        // For axe: Side to side swing
        const swingStartAngle = this.direction - Math.PI * 0.4; // Start from left
        const swingEndAngle = this.direction + Math.PI * 0.4;   // End at right
        const currentSwingAngle = swingStartAngle + (swingEndAngle - swingStartAngle) * progress;
        
        // Draw axe based on current swing angle
        const handleLength = this.length;
        const handleEndX = screenX + Math.cos(currentSwingAngle) * handleLength;
        const handleEndY = screenY + Math.sin(currentSwingAngle) * handleLength;
        
        // Draw wooden handle
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(handleEndX, handleEndY);
        ctx.strokeStyle = '#8B4513'; // Brown
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Draw a simple axe head at end of handle
        // Calculate perpendicular angle for the blade
        const bladeAngle = currentSwingAngle + Math.PI / 2;
        
        // Calculate the blade curve points
        const bladeLength = 15;
        const bladeWidth = 8;
        
        // Blade points
        const bladeTopX = handleEndX + Math.cos(bladeAngle) * bladeLength;
        const bladeTopY = handleEndY + Math.sin(bladeAngle) * bladeLength;
        
        // Draw the axe blade (curved line)
        ctx.beginPath();
        ctx.moveTo(handleEndX, handleEndY);
        ctx.quadraticCurveTo(
            handleEndX + Math.cos(bladeAngle) * (bladeLength/2) - Math.cos(currentSwingAngle) * bladeWidth,
            handleEndY + Math.sin(bladeAngle) * (bladeLength/2) - Math.sin(currentSwingAngle) * bladeWidth,
            bladeTopX,
            bladeTopY
        );
        ctx.strokeStyle = '#A9A9A9'; // Gray
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Draw swing trail
        if (progress > 0.1 && progress < 0.9) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            
            // Draw arc from start position to current position
            ctx.arc(screenX, screenY, handleLength * 0.8, swingStartAngle, currentSwingAngle);
            ctx.stroke();
        }
        
        // Draw impact effect
        if (this.hasHit && progress > 0.4 && progress < 0.7) {
            const impactProgress = (progress - 0.4) / 0.3; // 0 to 1 during impact
            const impactOpacity = 0.7 * (1 - impactProgress);
            const impactSize = 20 * (1 - impactProgress * 0.5);
            
            // Impact position is at the blade edge
            const impactX = bladeTopX;
            const impactY = bladeTopY;
            
            // Draw impact flash
            ctx.beginPath();
            ctx.arc(impactX, impactY, impactSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${impactOpacity})`;
            ctx.fill();
        }
    }
    
    /**
     * Play hit sound when axe hits a tree or rock
     */
    playHitSound() {
        try {
            // Try playing using standard hit sound
            if (this.hitSound) {
                // First try using the hit sound if it's loaded as an Audio object
                if (typeof this.hitSound === 'object' && this.hitSound instanceof Audio) {
                    const sound = this.hitSound.cloneNode();
                    sound.volume = 0.4;
                    sound.playbackRate = 0.9 + Math.random() * 0.2;
                    sound.play().catch(err => console.log('Sound play failed:', err));
                    return;
                }
                
                // If it's a string name, try the asset loader
                if (window.game && window.game.assetLoader) {
                    window.game.assetLoader.playSound(this.hitSound, 0.4);
                    return;
                }
            }
            
            // Fallback to direct audio playing
            let soundFile = 'sounds/hit2.mp3'; // Use hit2.mp3 as fallback (exists from pickaxe sound)
            
            // Try to get from sound cache
            let sound;
            if (window.soundsCache && window.soundsCache[soundFile]) {
                sound = window.soundsCache[soundFile].cloneNode();
            } else {
                // Create new Audio object
                sound = new Audio(soundFile);
                // Cache it for future use
                if (!window.soundsCache) window.soundsCache = {};
                window.soundsCache[soundFile] = sound;
            }
            
            // Play the sound
            sound.volume = 0.4;
            sound.playbackRate = 0.9 + Math.random() * 0.2; // Add some pitch variation
            sound.play().catch(err => console.log('Sound play failed:', err));
            
            // Also output a console message to help debug
            console.log("Playing axe hit sound with fallback method");
        } catch (error) {
            console.error("Error playing axe hit sound:", error);
        }
    }

    // Fix the checkHits method to properly detect tree hits
    checkHits() {
        // If already hit something this attack or not at the right frame of animation, skip
        if (this.hasHit || this.elapsedTime < (this.getDuration() * 0.3)) {
            return false;
        }
        
        const player = this.player;
        let hitSomething = false;
        
        // Use proper axe attack range - 110 radius with length 50
        const AXE_ATTACK_RADIUS = 110;
        const AXE_ATTACK_LENGTH = 50;
        
        // Calculate attack arc position - use attack length as distance from player
        const attackX = player.x + Math.cos(this.direction) * AXE_ATTACK_LENGTH;
        const attackY = player.y + Math.sin(this.direction) * AXE_ATTACK_LENGTH;
        
        // Debug visualization - add to window for render if needed
        if (window.game && window.game.debug) {
            window.attackVisuals = window.attackVisuals || [];
            window.attackVisuals.push({
                x: attackX,
                y: attackY,
                radius: AXE_ATTACK_RADIUS,
                created: Date.now(),
                lifetime: 500
            });
        }
        
        // Try hitting BOTH trees and ores - axe can hit both
        
        // --- TREE HIT DETECTION ---
        let nearbyTrees = [];
        
        // Try different ways to access trees, in order of preference
        if (window.game && window.game.treeSystem && window.game.treeSystem.getTreesInRadius) {
            nearbyTrees = window.game.treeSystem.getTreesInRadius(attackX, attackY, AXE_ATTACK_RADIUS);
        } else if (window.treeSystem && window.treeSystem.getTreesInRadius) {
            nearbyTrees = window.treeSystem.getTreesInRadius(attackX, attackY, AXE_ATTACK_RADIUS);
        } else if (window.treeManager && window.treeManager.getTreesInRadius) {
            nearbyTrees = window.treeManager.getTreesInRadius(attackX, attackY, AXE_ATTACK_RADIUS);
        }
        
        // Process tree hits
        if (nearbyTrees && nearbyTrees.length > 0) {
            // Find closest tree
            let closestTree = null;
            let closestDistance = AXE_ATTACK_RADIUS;
            
            for (const tree of nearbyTrees) {
                if (tree.chopped) continue;
                
                const dx = tree.x - attackX;
                const dy = tree.y - attackY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTree = tree;
                }
            }
            
            if (closestTree) {
                console.log(`Hitting tree at (${closestTree.x}, ${closestTree.y}) with axe`);
                
                // Apply woodcutting skill bonus if it exists
                let damageMultiplier = 1.0;
                if (window.game && window.game.skillsManager) {
                    const woodcuttingSkill = window.game.skillsManager.getSkill('woodcutting');
                    if (woodcuttingSkill) {
                        const level = woodcuttingSkill.level || 1;
                        damageMultiplier = 1 + (Math.floor(level / 10) * 0.1); // 10% per 10 levels
                    }
                }
                
                const damage = Math.floor(this.damage * damageMultiplier);
                
                // Hit the tree
                let treeDestroyed = false;
                if (typeof closestTree.hit === 'function') {
                    treeDestroyed = closestTree.hit(damage, player);
                } else if (closestTree.health !== undefined) {
                    closestTree.health -= damage;
                    if (closestTree.health <= 0) {
                        closestTree.health = 0;
                        treeDestroyed = true;
                        // Try to call chop method if it exists
                        if (typeof closestTree.chop === 'function') {
                            closestTree.chop();
                        }
                    }
                }
                
                // Register hit
                this.hasHit = true;
                hitSomething = true;
                
                // Create wood particles
                this.createWoodParticles(closestTree.x, closestTree.y, closestTree.trunkColor || '#8B4513');
                
                // Play hit sound
                this.playHitSound();
                
                // Create experience orbs if tree was destroyed
                if (treeDestroyed) {
                    console.log("Tree chopped down!");
                    const drops = closestTree.getDrops ? closestTree.getDrops() : { experience: 10 };
                    this.createWoodExperienceOrbs(closestTree, drops);
                }
                
                // Add to hit trees for visual effect
                if (!window.hitRocks) window.hitRocks = new Set();
                if (!window.rockHitTimes) window.rockHitTimes = new Map();
                
                window.hitRocks.add(closestTree);
                window.rockHitTimes.set(closestTree, Date.now());
            }
        }
        
        // --- ORE HIT DETECTION ---
        // Try hitting ores (axe can hit rocks too, just less efficiently)
        if (window.oreManager) {
            // Get ores within range
            const ores = window.oreManager.getOres ? window.oreManager.getOres() : window.ores;
            if (ores && ores.length > 0) {
                // Find closest ore
                let closestOre = null;
                let closestDistance = AXE_ATTACK_RADIUS;
                
                for (const ore of ores) {
                    if (!ore || ore.broken || ore.health <= 0) continue;
                    
                    const dx = ore.x - attackX;
                    const dy = ore.y - attackY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestOre = ore;
                    }
                }
                
                if (closestOre) {
                    console.log(`Hitting ore at (${closestOre.x}, ${closestOre.y}) with axe`);
                    
                    // Axe deals 50% damage to ores compared to pickaxe
                    const damage = Math.floor(this.damage * 0.5);
                    let oreDestroyed = false;
                    
                    // Apply damage to ore
                    if (typeof closestOre.hit === 'function') {
                        oreDestroyed = closestOre.hit(damage, player);
                    } else if (closestOre.health !== undefined) {
                        closestOre.health -= damage;
                        if (closestOre.health <= 0) {
                            closestOre.health = 0;
                            oreDestroyed = true;
                        }
                    }
                    
                    // Register hit
                    this.hasHit = true;
                    hitSomething = true;
                    
                    // Create particles at hit location
                    this.createDefaultParticles(closestOre.x, closestOre.y, closestOre.color);
                    
                    // Play hit sound
                    this.playHitSound();
                    
                    // Add to hit rocks for visual effect
                    if (!window.hitRocks) window.hitRocks = new Set();
                    if (!window.rockHitTimes) window.rockHitTimes = new Map();
                    
                    window.hitRocks.add(closestOre);
                    window.rockHitTimes.set(closestOre, Date.now());
                    
                    // Create experience orbs if ore was destroyed
                    if (oreDestroyed) {
                        const drops = closestOre.getDrops ? closestOre.getDrops() : { experience: 5 };
                        this.createExperienceOrbs(closestOre, drops);
                    }
                }
            }
        }
        
        return hitSomething;
    }
}

// Create Attacks namespace
const Attacks = {
    Attack,
    PickaxeAttack,
    AxeAttack
};

// Make it globally available for backward compatibility
window.Attacks = Attacks;

// Export as default and named exports
export { Attack, PickaxeAttack, AxeAttack };
export default Attacks; 