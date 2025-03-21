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
    FIST: {
        id: 'fist',
        name: 'Fist',
        type: ATTACK_TYPES.MELEE,
        baseSpeed: 2.0,  // Faster than other weapons
        baseDamage: 2,
        range: 0.7
    },
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

// Add global fist skill tracking
if (!window.playerSkills) {
    window.playerSkills = {
        fist: 0, // Start at level 0
        mining: 0,
        woodcutting: 0
    };
}

// Add this helper function at the top of the file before any classes
/**
 * Check if a point is within a square hitbox
 * @param {number} pointX - X coordinate of the point
 * @param {number} pointY - Y coordinate of the point
 * @param {number} squareX - X coordinate of square center
 * @param {number} squareY - Y coordinate of square center
 * @param {number} halfSize - Half the side length of the square
 * @returns {boolean} - True if the point is inside the square
 */
function isPointInSquare(pointX, pointY, squareX, squareY, halfSize) {
    return Math.abs(pointX - squareX) <= halfSize && 
           Math.abs(pointY - squareY) <= halfSize;
}

// Add these helper functions at the top of the file

/**
 * Check if a weapon attack hits a tree using square hitboxes
 * @param {number} attackX - X coordinate of attack point
 * @param {number} attackY - Y coordinate of attack point
 * @param {Object} tree - Tree object to check for hit
 * @returns {boolean} - True if the tree is hit
 */
function doesHitTree(attackX, attackY, tree, playerX, playerY) {
    if (!tree || tree.chopped) return false;
    
    // Use square hitbox for trees - slightly larger than radius
    const treeRadius = tree.radius || 30;
    const treeHitboxSize = treeRadius + 5; // 5 pixels larger
    
    // If player position is provided, check for very close trees
    if (playerX !== undefined && playerY !== undefined) {
        const playerToTreeX = tree.x - playerX;
        const playerToTreeY = tree.y - playerY;
        const playerToTreeDistance = Math.sqrt(playerToTreeX * playerToTreeX + playerToTreeY * playerToTreeY);
        
        // Special case for trees that are very close to player (within player radius + tree radius)
        const playerRadius = 15; // Default player radius
        if (playerToTreeDistance <= playerRadius + treeRadius + 5) {
            // For very close trees, we only care if the player is facing the right direction
            // Calculate angle to tree from player
            const angleToTree = Math.atan2(playerToTreeY, playerToTreeX);
            
            // Get attack direction from player to attack point
            const attackDirection = Math.atan2(attackY - playerY, attackX - playerX);
            
            // Calculate angle difference
            let angleDiff = angleToTree - attackDirection;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Consider it a hit if player is roughly facing the tree (within 90 degrees)
            if (Math.abs(angleDiff) <= Math.PI/2) {
                return true;
            }
        }
    }
    
    // Use square hitbox detection for normal cases
    return isPointInSquare(attackX, attackY, tree.x, tree.y, treeHitboxSize);
}

/**
 * Check if a weapon attack hits a rock/ore using circular hitboxes
 * @param {number} attackX - X coordinate of attack point
 * @param {number} attackY - Y coordinate of attack point
 * @param {Object} ore - Ore object to check for hit
 * @param {number} range - Attack range
 * @param {number} angleWidth - Attack angle width in radians
 * @param {number} direction - Attack direction in radians
 * @returns {boolean} - True if the ore is hit
 */
function doesHitRock(attackX, attackY, ore, range, angleWidth, direction, useRectangle = false, rectWidth = 0) {
    // Comprehensive validation - each check is separate for clarity
    if (!ore) return false;  
    if (ore.broken) return false;
    if (ore.health <= 0) return false; 
    if (ore.visible === false) return false;
    if (ore.radius <= 0) return false; // Check radius is valid
    
    // Additional safety check for any "destroyed" ores
    if (typeof ore.hit !== 'function') return false;
    
    // Calculate distance from ore to attack point
    const dx = ore.x - attackX;
    const dy = ore.y - attackY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Use circular hitbox for rocks based on ore radius
    const hitRadius = (ore.radius || 20);
    
    // Rectangle hit detection for fist
    if (useRectangle && direction !== undefined && rectWidth > 0) {
        // Get angle to ore
        const angleToOre = Math.atan2(dy, dx);
        
        // Normalize angle difference to be between -PI and PI
        let angleDiff = angleToOre - direction;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Calculate distance from player to ore (not from attack point)
        const playerToOreX = ore.x - (attackX - Math.cos(direction) * range);
        const playerToOreY = ore.y - (attackY - Math.sin(direction) * range);
        const playerToOreDistance = Math.sqrt(playerToOreX * playerToOreX + playerToOreY * playerToOreY);
        
        // Check if ore is within the rectangle:
        // 1. Distance should be less than range + hitRadius for length
        // IMPORTANT: For close targets, we'll check using player-to-ore distance instead
        const inRange = playerToOreDistance <= range + hitRadius;
        
        // 2. Angular distance should be small enough for width
        // Convert angular width to a linear width at the distance of the ore
        const halfAngularWidth = Math.atan2(rectWidth / 2, Math.max(5, distance));
        const inWidth = Math.abs(angleDiff) <= halfAngularWidth;
        
        // Special case: if ore is VERY close (less than player radius * 2), 
        // consider it a hit if player is facing towards it (within 90 degrees)
        const playerRadius = 15; // Default player radius
        if (playerToOreDistance <= playerRadius * 2 && Math.abs(angleDiff) <= Math.PI/2) {
            return true;
        }
        
        return inRange && inWidth;
    }
    
    // If we need to check angle (for directional attacks)
    if (direction !== undefined && angleWidth !== undefined) {
        // Calculate angle to ore
        const angleToOre = Math.atan2(dy, dx);
        
        // Normalize angle difference to be between -PI and PI
        let angleDiff = angleToOre - direction;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Calculate distance from player to ore (not from attack point)
        const playerToOreX = ore.x - (attackX - Math.cos(direction) * range);
        const playerToOreY = ore.y - (attackY - Math.sin(direction) * range);
        const playerToOreDistance = Math.sqrt(playerToOreX * playerToOreX + playerToOreY * playerToOreY);
        
        // Special case: if ore is VERY close (less than player radius * 2), 
        // consider it a hit if player is facing towards it (within 90 degrees)
        const playerRadius = 15; // Default player radius
        if (playerToOreDistance <= playerRadius * 2 && Math.abs(angleDiff) <= Math.PI/2) {
            return true;
        }
        
        // Check if ore is within range and angle
        return distance <= range + hitRadius && Math.abs(angleDiff) <= angleWidth / 2;
    }
    
    // Calculate distance from player to ore (not from attack point)
    const playerToOreX = ore.x - (attackX - Math.cos(direction) * range);
    const playerToOreY = ore.y - (attackY - Math.sin(direction) * range);
    const playerToOreDistance = Math.sqrt(playerToOreX * playerToOreX + playerToOreY * playerToOreY);
    
    // Special case: if ore is VERY close (less than player radius * 2), 
    // consider it a hit regardless of angle
    const playerRadius = 15; // Default player radius
    if (playerToOreDistance <= playerRadius * 2) {
        return true;
    }
    
    // Simpler check if we don't need angles
    return distance <= range + hitRadius;
}

class Attack {
    constructor(player, ctx) {
        this.player = player;
        this.ctx = ctx;
        this.isActive = false;
        this.startTime = 0;
        this.cooldown = 0;
        this.maxCooldown = 1; // Reduced from 800 to 300 ms to allow higher CPS
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
        
        // Calculate attack point position (at the head of the pickaxe)
        const attackX = this.player.x + Math.cos(swingDirection) * this.range;
        const attackY = this.player.y + Math.sin(swingDirection) * this.range;
        
        // Check each ore
        for (let i = 0; i < window.ores.length; i++) {
            const ore = window.ores[i];
            
            // Use the helper function to check if the pickaxe hits the ore
            if (doesHitRock(attackX, attackY, ore, this.range, Math.PI/6, swingDirection)) {
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
                const destroyed = ore.hit ? ore.hit(damage, this.player) : false;
                
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
        
        // ---------- CHECK FOR TREE HITS ----------
        // Check trees using square hitboxes
        const trees = [];
        
        // Try different ways to access trees, using whatever method might be available
        if (window.game && window.game.treeSystem && window.game.treeSystem.trees) {
            trees.push(...window.game.treeSystem.trees);
        } else if (window.treeSystem && window.treeSystem.trees) {
            trees.push(...window.treeSystem.trees);
        } else if (window.treeManager && window.treeManager.trees) {
            trees.push(...window.treeManager.trees);
        }
        
        // Process tree hits (pickaxe isn't very effective on trees, so deal less damage)
        if (trees.length > 0) {
            for (const tree of trees) {
                // Use the helper function to check if the pickaxe hits the tree
                if (doesHitTree(attackX, attackY, tree)) {
                    console.log(`Hitting tree at (${tree.x}, ${tree.y}) with pickaxe`);
                    
                    // Pickaxe does reduced damage to trees (25% effectiveness)
                    let damage = Math.max(1, Math.floor(this.baseDamage * 0.25));
                    
                    // Apply player strength multiplier
                    const strengthMultiplier = this.player.strength || 1;
                    damage = Math.max(1, Math.floor(damage * strengthMultiplier));
                    
                    // Hit the tree
                    let treeDestroyed = false;
                    if (typeof tree.hit === 'function') {
                        treeDestroyed = tree.hit(damage, this.player);
                        // Add random tree hit exp
                        generateRandomTreeHitExp(tree, this.player);
                    } else if (tree.health !== undefined) {
                        tree.health -= damage;
                        // Add random tree hit exp
                        generateRandomTreeHitExp(tree, this.player);
                        if (tree.health <= 0) {
                            tree.health = 0;
                            treeDestroyed = true;
                            // Try to call chop method if it exists
                            if (typeof tree.chop === 'function') {
                                tree.chop();
                            }
                        }
                    }
                    
                    // Create wood particles at the hit location
                    if (this.createWoodParticles) {
                        this.createWoodParticles(tree.x, tree.y, tree.trunkColor || '#8B4513');
                    } else {
                        // Fallback to default particles
                        this.createDefaultParticles(tree.x, tree.y, tree.trunkColor || '#8B4513');
                    }
                    
                    // Play hit sound
                    this.playHitSound();
                    
                    // Add to hit visual effects
                    if (!window.hitTrees) window.hitTrees = new Set();
                    if (!window.treeHitTimes) window.treeHitTimes = new Map();
                    window.hitTrees.add(tree);
                    window.treeHitTimes.set(tree, Date.now());
                    
                    // If also using rock hit effects for trees
                    if (!window.hitRocks) window.hitRocks = new Set();
                    if (!window.rockHitTimes) window.rockHitTimes = new Map();
                    window.hitRocks.add(tree);
                    window.rockHitTimes.set(tree, Date.now());
                    
                    // If tree was destroyed, handle drops
                    if (treeDestroyed) {
                        console.log("Tree destroyed with pickaxe!");
                        const drops = tree.getDrops ? tree.getDrops() : { experience: 10 };
                        
                        // Create experience orbs for tree destruction
                        if (this.createWoodExperienceOrbs) {
                            this.createWoodExperienceOrbs(tree, drops);
                        } else if (this.createExperienceOrbs) {
                            this.createExperienceOrbs(tree, drops);
                        }
                    }
                }
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
        this.createNodeExperienceOrbs(ore, drops, 'mining');
    }
    
    createWoodExperienceOrbs(tree, drops) {
        this.createNodeExperienceOrbs(tree, drops, 'woodcutting');
    }
    
    /**
     * Create experience orbs from any node type (tree, ore, etc.)
     * @param {Object} node - The node that was destroyed
     * @param {Object} drops - Drops from the node
     * @param {string} skillType - Skill associated with this node type ('mining', 'woodcutting', etc.)
     */
    createNodeExperienceOrbs(node, drops, skillType = 'mining') {
        if (!node || !drops) {
            console.error(`Cannot create experience orbs - node or drops are missing for ${skillType}`);
            return;
        }
        
        // Calculate experience based on node type
        let totalExp = 0;
        
        if (skillType === 'woodcutting') {
            // More experience for trees than basic rocks
            totalExp = 10 + Math.floor(Math.random() * 10);
        } else if (skillType === 'mining') {
            // Base experience for stone
            totalExp = 5;
            
            // Add bonus exp for special ores if we have ore type information
            if (node.type) {
                switch(node.type) {
                case 'copper': totalExp += 10; break;
                case 'iron': totalExp += 15; break;
                case 'gold': totalExp += 25; break;
                case 'diamond': totalExp += 40; break;
                default: totalExp += 5; break;
            }
        }
        
        // Add randomness
        totalExp += Math.floor(Math.random() * 5);
            } else {
            // Default for other skill types
            totalExp = drops.experience || 5;
        }
        
        console.log(`Creating ${totalExp} experience from ${skillType} node destruction`);
        
        try {
            // Add experience to the appropriate skill if it exists
            if (window.skillsManager) {
                window.skillsManager.addExperience(skillType, totalExp);
            } else if (window.game && window.game.skillsManager) {
                window.game.skillsManager.addExperience(skillType, totalExp);
            }
            
            // Get the experience orb manager
            const manager = getExperienceOrbManager();
            if (!manager) {
                console.log(`No experience orb manager found to create ${skillType} orbs`);
                return;
            }
            
            // Try to create experience orbs
            if (typeof manager.createExperienceOrbs === 'function') {
                manager.createExperienceOrbs(node.x, node.y, totalExp);
            } else if (typeof manager.createOrb === 'function') {
                // Create individual orbs in a burst pattern
                for (let i = 0; i < totalExp; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 10 + Math.random() * 20;
                    const orbX = node.x + Math.cos(angle) * distance;
                    const orbY = node.y + Math.sin(angle) * distance;
                    manager.createOrb(orbX, orbY, 1);
                }
            } else if (typeof manager.createOrbBurst === 'function') {
                manager.createOrbBurst(node.x, node.y, totalExp, totalExp);
            } else {
                console.error(`Found manager but it has no suitable method to create ${skillType} orbs`);
            }
        } catch (error) {
            console.error(`Error creating ${skillType} experience orbs:`, error);
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
        this.createNodeExperienceOrbs(ore, drops, 'mining');
    }
    
    createWoodExperienceOrbs(tree, drops) {
        this.createNodeExperienceOrbs(tree, drops, 'woodcutting');
    }
    
    /**
     * Create experience orbs from any node type (tree, ore, etc.)
     * @param {Object} node - The node that was destroyed
     * @param {Object} drops - Drops from the node
     * @param {string} skillType - Skill associated with this node type ('mining', 'woodcutting', etc.)
     */
    createNodeExperienceOrbs(node, drops, skillType = 'mining') {
        if (!node || !drops) {
            console.error(`Cannot create experience orbs - node or drops are missing for ${skillType}`);
            return;
        }
        
        // Calculate experience based on node type
        let totalExp = 0;
        
        if (skillType === 'woodcutting') {
            // More experience for trees than basic rocks
            totalExp = 10 + Math.floor(Math.random() * 10);
        } else if (skillType === 'mining') {
            // Base experience for stone
            totalExp = 5;
            
            // Add bonus exp for special ores if we have ore type information
            if (node.type) {
                switch(node.type) {
                    case 'copper': totalExp += 10; break;
                    case 'iron': totalExp += 15; break;
                    case 'gold': totalExp += 25; break;
                    case 'diamond': totalExp += 40; break;
                    default: totalExp += 5; break;
                }
            }
            
            // Add randomness
            totalExp += Math.floor(Math.random() * 5);
        } else {
            // Default for other skill types
            totalExp = drops.experience || 5;
        }
        
        console.log(`Creating ${totalExp} experience from ${skillType} node destruction`);
        
        try {
            // Add experience to the appropriate skill if it exists
            if (window.skillsManager) {
                window.skillsManager.addExperience(skillType, totalExp);
            } else if (window.game && window.game.skillsManager) {
                window.game.skillsManager.addExperience(skillType, totalExp);
            }
            
            // Get the experience orb manager
            const manager = getExperienceOrbManager();
            if (!manager) {
                console.log(`No experience orb manager found to create ${skillType} orbs`);
                return;
            }
            
            // Try to create experience orbs
            if (typeof manager.createExperienceOrbs === 'function') {
                manager.createExperienceOrbs(node.x, node.y, totalExp);
            } else if (typeof manager.createOrb === 'function') {
                // Create individual orbs in a burst pattern
                for (let i = 0; i < totalExp; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 10 + Math.random() * 20;
                    const orbX = node.x + Math.cos(angle) * distance;
                    const orbY = node.y + Math.sin(angle) * distance;
                    manager.createOrb(orbX, orbY, 1);
                }
            } else if (typeof manager.createOrbBurst === 'function') {
                manager.createOrbBurst(node.x, node.y, totalExp, totalExp);
            } else {
                console.error(`Found manager but it has no suitable method to create ${skillType} orbs`);
            }
        } catch (error) {
            console.error(`Error creating ${skillType} experience orbs:`, error);
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
        } else {
            // Fallback to checking all trees if no radius function available
            const allTrees = [];
            if (window.game && window.game.treeSystem && window.game.treeSystem.trees) {
                allTrees.push(...window.game.treeSystem.trees);
            } else if (window.treeSystem && window.treeSystem.trees) {
                allTrees.push(...window.treeSystem.trees);
            } else if (window.treeManager && window.treeManager.trees) {
                allTrees.push(...window.treeManager.trees);
            }
            
            // Filter trees by approximate radius
            nearbyTrees = allTrees.filter(tree => {
                if (!tree) return false;
                const dx = tree.x - attackX;
                const dy = tree.y - attackY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < AXE_ATTACK_RADIUS + (tree.radius || 30);
            });
        }
        
        // Process tree hits
        if (nearbyTrees && nearbyTrees.length > 0) {
            // Determine how many trees we can hit based on woodcutting skill
            let maxTreeHits = 1; // Default is 1 tree
            
            // Check if player has woodcutting skill and calculate extra hits
            if (window.game && window.game.skillsManager) {
                const woodcuttingSkill = window.game.skillsManager.getSkill('woodcutting');
                if (woodcuttingSkill) {
                    const level = woodcuttingSkill.level || 1;
                    // For every 5 levels, add 1 tree (level 1-4 = 1 tree, 5-9 = 2 trees, etc.)
                    maxTreeHits = 1 + Math.floor(level / 5);
                    console.log(`Woodcutting level ${level} allows hitting up to ${maxTreeHits} trees`);
                }
            }
            
            // Sort trees by distance to hit closest ones first
            const sortedTrees = nearbyTrees
                .filter(tree => !tree.chopped) // Filter out already chopped trees
                .map(tree => {
                    const dx = tree.x - attackX;
                    const dy = tree.y - attackY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    return { tree, distance };
                })
                .sort((a, b) => a.distance - b.distance); // Sort by distance (closest first)
            
            // Limit to max number of trees we can hit
            const treesToHit = sortedTrees.slice(0, maxTreeHits);
            
            // Hit each tree in range up to our max
            for (const { tree: targetTree, distance } of treesToHit) {
                // Use the helper function to check if the axe hits the tree
                if (doesHitTree(attackX, attackY, targetTree)) {
                    console.log(`Hitting tree at (${targetTree.x}, ${targetTree.y}) with axe`);
                
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
                if (typeof targetTree.hit === 'function') {
                        treeDestroyed = targetTree.hit(damage, this.player);
                        // Add random tree hit exp
                        generateRandomTreeHitExp(targetTree, this.player);
                } else if (targetTree.health !== undefined) {
                    targetTree.health -= damage;
                    // Add random tree hit exp
                    generateRandomTreeHitExp(targetTree, this.player);
                    if (targetTree.health <= 0) {
                        targetTree.health = 0;
                        treeDestroyed = true;
                        // Try to call chop method if it exists
                        if (typeof targetTree.chop === 'function') {
                            targetTree.chop();
                        }
                    }
                }
                
                // Register hit
                this.hasHit = true;
                hitSomething = true;
                
                // Create wood particles
                this.createWoodParticles(targetTree.x, targetTree.y, targetTree.trunkColor || '#8B4513');
                
                // Play hit sound (only for the first tree to avoid sound spam)
                if (distance === treesToHit[0].distance) {
                    this.playHitSound();
                }
                
                // Create experience orbs if tree was destroyed
                if (treeDestroyed) {
                    console.log("Tree chopped down!");
                    const drops = targetTree.getDrops ? targetTree.getDrops() : { experience: 10 };
                    this.createWoodExperienceOrbs(targetTree, drops);
                }
                
                // Add to hit trees for visual effect
                if (!window.hitRocks) window.hitRocks = new Set();
                if (!window.rockHitTimes) window.rockHitTimes = new Map();
                
                window.hitRocks.add(targetTree);
                window.rockHitTimes.set(targetTree, Date.now());
                }
            }
        }
        
        // --- ORE HIT DETECTION ---
        // Only try hitting ores if we didn't hit any trees
        if (!hitSomething && window.oreManager) {
            // Get ores within range
            const ores = window.oreManager.getOres ? window.oreManager.getOres() : window.ores;
            if (ores && ores.length > 0) {
                // Find closest ore
                let closestOre = null;
                let closestDistance = AXE_ATTACK_RADIUS;
                
                for (const ore of ores) {
                    if (!ore || ore.broken || ore.health <= 0) continue;
                    
                    // Use our helper function with adjusted parameters for the axe
                    // Axe has wider arc than pickaxe (110 degrees)
                    if (doesHitRock(attackX, attackY, ore, AXE_ATTACK_RADIUS, Math.PI * 0.6, this.direction)) {
                    const dx = ore.x - attackX;
                    const dy = ore.y - attackY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestOre = ore;
                        }
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
                        // Add random ore hit exp
                        generateRandomOreHitExp(closestOre, player);
                    } else if (closestOre.health !== undefined) {
                        closestOre.health -= damage;
                        // Add random ore hit exp
                        generateRandomOreHitExp(closestOre, player);
                        if (closestOre.health <= 0) {
                            closestOre.health = 0;
                            closestOre.broken = true; // Mark as broken when destroyed
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

class FistAttack extends Attack {
    constructor(player, ctx) {
        super(player, ctx);
        this.maxCooldown = 50; // Extremely low cooldown (50ms) to allow for much faster clicking
        this.baseRange = 40; // Base range of 40 pixels
        this.range = this.baseRange; // Initialize with base range
        this.baseWidth = 15; // Base width of 15 pixels
        this.width = this.baseWidth; // Initialize with base width
        this.arcWidth = 55 * (Math.PI / 180); // 55 degrees in radians (still used for drawing)
        this.hitChecked = false;
        this.lastClickTime = Date.now();
        this.clicksPerSecond = 0;
        this.clickCount = 0;
        this.clickTimeWindow = [];
        this.hitTargets = new Set(); // Track targets already hit in this attack
        this.comboCount = 0; // Counter for combo attacks
        this.comboTimeout = 1000; // Time window for combos in ms
        this.useRectangle = true; // Use rectangular hit detection
        this.showDebug = false; // Don't show debug visuals by default
        this.useLeftHand = false; // Start with right hand
        this.skinColor = '#e0ac69'; // Default skin color
        
        // Initialize skills system integration
        if (!this.player.skills) {
            this.player.skills = {};
        }
        
        // Add fist skill to player if it doesn't exist
        if (!this.player.skills.fist) {
            this.player.skills.fist = {
                level: 1,
                experience: 0,
                maxExperience: 100 // Base XP for level 1
            };
        }
        
        // Track clicks per second
        setInterval(() => {
            // Calculate clicks per second based on clicks in the last second
            this.clickTimeWindow = this.clickTimeWindow.filter(time => Date.now() - time < 1000);
            this.clicksPerSecond = this.clickTimeWindow.length;
        }, 1000);
        
        // Load hit sound explicitly with a relative path
        this.hitSound = null;
        this.loadHitSound();
        
        // Add notice about fist skill in chat if it exists and level > 1
        if (window.chatManager && this.player.skills.fist.level > 1) {
            window.chatManager.addMessage({
                type: 'system',
                message: `Your unarmed combat skill is level ${this.player.skills.fist.level}. Keep punching to improve!`
            });
        }
    }
    
    // Separate method to load sound to better handle errors
    loadHitSound() {
        try {
            this.hitSound = new Audio('./sounds/hit.mp3');
            
            // Preload the sound
            this.hitSound.preload = 'auto';
            this.hitSound.load();
            
            // Add error listener
            this.hitSound.addEventListener('error', (e) => {
                console.error("Error loading hit sound:", e);
                // Try alternative path as fallback
                try {
                    this.hitSound = new Audio('../sounds/hit.mp3');
                    this.hitSound.preload = 'auto';
                    this.hitSound.load();
                } catch (fallbackError) {
                    console.error("Could not load fallback hit sound:", fallbackError);
                }
            });
            
            console.log("Loaded hit sound for fist attacks");
        } catch (error) {
            console.error("Could not initialize fist hit sound:", error);
        }
    }
    
    // Calculate damage based on fist skill
    calculateDamage(baseMin, baseMax, strength, targetType = 'default') {
        // Get current fist skill level
        const fistLevel = this.player.skills.fist?.level || 1;
        
        // Apply specific damage for rocks and trees as requested
        if (targetType === 'rock') {
            // For rocks: fistSkill + (strength / 2) damage as requested
            const strengthBonus = Math.floor((strength || 1) / 2);
            console.log(`Fist damage calculation - Fist level: ${fistLevel}, Strength: ${strength}, Strength bonus: ${strengthBonus}`);
            return fistLevel + strengthBonus;
        } else if (targetType === 'tree') {
            // For trees: 2 + strength damage
            return 2 + (strength || 1);
        }
        
        // Base damage calculation for other targets
        let damage = Math.floor(Math.random() * (baseMax - baseMin + 1) + baseMin) * strength;
        
        // Apply fist skill bonus based on level
        let skillBonus = 1.0; // Base multiplier
        
        if (fistLevel >= 50) skillBonus = 2.5;      // +150%
        else if (fistLevel >= 40) skillBonus = 2.0;  // +100%
        else if (fistLevel >= 30) skillBonus = 1.75; // +75%
        else if (fistLevel >= 20) skillBonus = 1.5;  // +50%
        else if (fistLevel >= 15) skillBonus = 1.3;  // +30%
        else if (fistLevel >= 10) skillBonus = 1.2;  // +20%
        else if (fistLevel >= 5) skillBonus = 1.1;   // +10%
        
        damage = Math.max(1, Math.floor(damage * skillBonus)); // Ensure at least 1 damage
        
        return damage;
    }
    
    // Increase fist skill when hitting appropriate targets
    increaseFistSkill(target, damage) {
        if (!this.player.skills || !this.player.skills.fist) {
            this.player.skills = this.player.skills || {};
            this.player.skills.fist = {
                level: 1,
                experience: 0,
                maxExperience: 100
            };
        }
        
        // Add whole number experience points instead of fractional values
        const skillIncrease = 1; // Always add 1 point for cleaner progression
        
        const currentLevel = this.player.skills.fist.level;
        this.player.skills.fist.experience += skillIncrease;
        
        // Check for level up
        if (this.player.skills.fist.experience >= this.player.skills.fist.maxExperience) {
            this.levelUpFistSkill();
        }
        
        // Update skill in global skills manager if it exists
        if (window.playerSkills) {
            window.playerSkills.fist = this.player.skills.fist.level + 
                (this.player.skills.fist.experience / this.player.skills.fist.maxExperience);
        }
        
        // Force update the skills UI
        this.updateSkillsDisplay();
        
        // Add debug message to confirm skill is increasing
        console.log(`Fist skill increased by ${skillIncrease} (Total: ${this.player.skills.fist.experience}/${this.player.skills.fist.maxExperience})`);
    }
    
    // Add a new method to update the skills display
    updateSkillsDisplay() {
        // Try all possible ways to update the skills UI
        if (window.skillsManager && window.skillsManager.updateUI) {
            window.skillsManager.updateUI();
        }
        else if (window.game && window.game.skillsManager && window.game.skillsManager.updateUI) {
            window.game.skillsManager.updateUI();
        }
        else if (window.SkillsManager && window.SkillsManager.updateUI) {
            window.SkillsManager.updateUI();
        }
        
        // Also try updating an individual skill if that method exists
        if (window.skillsManager && window.skillsManager.updateSkill) {
            window.skillsManager.updateSkill('fist', this.player.skills.fist);
        }
        else if (window.game && window.game.skillsManager && window.game.skillsManager.updateSkill) {
            window.game.skillsManager.updateSkill('fist', this.player.skills.fist);
        }
        
        // Finally, try to directly manipulate any UI elements if they exist
        const fistSkillElement = document.getElementById('skill-fist') || 
                                document.querySelector('.skill-fist') ||
                                document.querySelector('[data-skill="fist"]');
        
        if (fistSkillElement) {
            const levelElement = fistSkillElement.querySelector('.skill-level');
            const progressElement = fistSkillElement.querySelector('.skill-progress');
            
            if (levelElement) {
                levelElement.textContent = this.player.skills.fist.level;
            }
            
            if (progressElement) {
                const progressPercent = (this.player.skills.fist.experience / this.player.skills.fist.maxExperience) * 100;
                progressElement.style.width = `${progressPercent}%`;
            }
        }
    }
    
    // Fix the levelUpFistSkill method to also update the UI
    levelUpFistSkill() {
        // Reset experience for next level
        this.player.skills.fist.experience -= this.player.skills.fist.maxExperience;
        this.player.skills.fist.level++;
        this.player.skills.fist.maxExperience = this.calculateMaxExperience(this.player.skills.fist.level);
        
        // Notify player of level up
        if (window.chatManager) {
            window.chatManager.addMessage({
                type: 'system',
                message: `Your unarmed combat skill increased to level ${this.player.skills.fist.level}!`
            });
        }
        
        // Check for skill unlock messages
        this.checkForSkillUnlocks(this.player.skills.fist.level);
        
        // Force update the skills UI
        this.updateSkillsDisplay();
    }
    
    // Calculate max experience for a given level
    calculateMaxExperience(level) {
        return Math.floor(100 * Math.pow(1.1, level - 1));
    }
    
    // Check for skill unlock messages at specific levels
    checkForSkillUnlocks(level) {
        if (!window.chatManager) return;
        
        const unlocks = {
            5: '+10% fist damage',
            10: '+20% fist damage',
            15: '+30% fist damage',
            20: '+50% fist damage',
            25: 'Chance to deal critical hits with fists',
            30: '+75% fist damage',
            40: '+100% fist damage',
            50: '+150% fist damage and increased critical hit chance'
        };
        
        if (unlocks[level]) {
            window.chatManager.addMessage({
                type: 'system',
                message: `Unarmed combat level ${level} unlocked: ${unlocks[level]}`
            });
        }
    }
    
    getDuration() {
        return 300; // Faster attack animation
    }
    
    start(direction) {
        // Allow starting even if cooldown isn't fully complete
        if (this.cooldown > this.maxCooldown * 0.5) {
            this.cooldown = this.maxCooldown * 0.5; // Cut remaining cooldown in half
        }
        
        if (super.start(direction)) {
            // Clear hit targets set for new attack
            this.hitTargets.clear();
            
            // Record this click for clicks per second calculation
            this.clickTimeWindow.push(Date.now());
            this.hitChecked = false;
            
            // Calculate time between clicks
            const now = Date.now();
            const timeBetweenClicks = now - this.lastClickTime;
            
            // Update combo count based on click timing
            if (timeBetweenClicks < this.comboTimeout) {
                // Consecutive click within combo timeout
                this.comboCount++;
                console.log(`Fist combo: ${this.comboCount}`);
            } else {
                // Reset combo if too much time has passed
                this.comboCount = 0;
            }
            this.lastClickTime = now;
            
            // Toggle between left and right hand
            this.useLeftHand = !this.useLeftHand;
            
            // Increase range based on CPS (5 pixels per CPS)
            const rangeBonus = Math.min(50, this.clicksPerSecond * 5);
            this.range = this.baseRange + rangeBonus;
            
            // Increase width based on CPS (3 pixels per CPS)
            const widthBonus = Math.min(30, this.clicksPerSecond * 3);
            this.width = this.baseWidth + widthBonus;
            
            // Legacy arc width calculation - keep for drawing purposes
            const maxArcBonus = 45 * (Math.PI / 180);
            const arcBonus = Math.min(maxArcBonus, this.comboCount * (Math.PI / 90));
            this.arcWidth = (55 * (Math.PI / 180)) + arcBonus;
            
            console.log(`Fist attack with length: ${this.range}px, width: ${this.width}px, hand: ${this.useLeftHand ? 'left' : 'right'}`);
            
            // Further reduce cooldown based on rapid clicking
            if (timeBetweenClicks < 300) {
                // Fast clicking - dramatically reduce cooldown
                this.cooldown = Math.max(10, 50 - this.clicksPerSecond * 5);
            } else {
                this.cooldown = 50; // Very short default cooldown
            }
            
            return true;
        }
        return false;
    }
    
    draw(cameraX, cameraY) {
        if (!this.isActive || !this.player) return;
        
        const ctx = this.ctx;
        if (!ctx) return;
        
        const progress = this.getProgress();
        const screenX = this.player.x - Math.floor(cameraX);
        const screenY = this.player.y - Math.floor(cameraY);
        const radius = this.player.radius || 15;
        
        // Determine fist position based on direction and animation progress
        const direction = this.direction;
        
        // Calculate the attack endpoint
        const attackDistance = this.range;
        const endpointX = screenX + Math.cos(direction) * attackDistance;
        const endpointY = screenY + Math.sin(direction) * attackDistance;
        
        // Calculate offsets for left or right hand (perpendicular to attack direction)
        const perpDirection = direction + Math.PI/2; // 90 degrees offset
        const handOffset = 10; // How far the hands are from the center of the player
        
        // Starting position of the hand (offset to side of player body)
        let handStartX, handStartY;
        if (this.useLeftHand) {
            // Left hand starts on the left side of player
            handStartX = screenX + Math.cos(perpDirection) * handOffset;
            handStartY = screenY + Math.sin(perpDirection) * handOffset;
        } else {
            // Right hand starts on the right side of player
            handStartX = screenX - Math.cos(perpDirection) * handOffset;
            handStartY = screenY - Math.sin(perpDirection) * handOffset;
        }
        
        // Calculate curved path using quadratic bezier curve
        // We'll use progress (0-1) to determine how far along the path the fist is
        
        // Control point for the curve (offset from the straight line for the arc)
        const controlPointDistance = 40; // Higher = bigger arc
        const controlOffsetDirection = this.useLeftHand ? 
            direction - Math.PI/4 : // Left hand curves one way
            direction + Math.PI/4;  // Right hand curves the other way
        
        const controlX = screenX + Math.cos(controlOffsetDirection) * controlPointDistance;
        const controlY = screenY + Math.sin(controlOffsetDirection) * controlPointDistance;
        
        // Calculate current position using quadratic bezier formula
        // P = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
        // where P₀=start, P₁=control, P₂=end, and t is progress (0-1)
        const t = progress;
        const tSq = t * t;
        const oneMinusT = 1 - t;
        const oneMinusTSq = oneMinusT * oneMinusT;
        
        const currentX = oneMinusTSq * handStartX + 2 * oneMinusT * t * controlX + tSq * endpointX;
        const currentY = oneMinusTSq * handStartY + 2 * oneMinusT * t * controlY + tSq * endpointY;
        
        // Calculate size of fist (bigger at the end of punch, smaller at start and return)
        let fistSize = 10; // Base size
        
        // Make the fist grow as it extends and shrink as it retracts
        if (progress < 0.5) {
            // Growing phase (0 to 0.5)
            fistSize = 8 + progress * 8; // 8 to 12
        } else {
            // Shrinking phase (0.5 to 1)
            fistSize = 12 - (progress - 0.5) * 8; // 12 to 8
        }
        
        // Draw the arm/fist line (thinner line connecting player to fist)
        ctx.strokeStyle = this.skinColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(handStartX, handStartY);
        
        // Draw a curved line using the same quadratic bezier curve
        ctx.quadraticCurveTo(controlX, controlY, currentX, currentY);
        ctx.stroke();
        
        // Draw the fist (skin-colored circle)
        ctx.fillStyle = this.skinColor;
        ctx.beginPath();
        ctx.arc(currentX, currentY, fistSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw knuckle details
        const knuckleColor = '#d69c66'; // Slightly darker than skin
        const knuckleSizeRatio = 0.3; // Size ratio of knuckles to fist
        const knuckleOffset = fistSize * 0.5; // Offset from center
        
        // Direction from center of fist to target
        const knuckleDirection = Math.atan2(endpointY - currentY, endpointX - currentX);
        
        // Draw three knuckles
        for (let i = -1; i <= 1; i++) {
            // Spread knuckles perpendicular to punch direction
            const spreadAngle = knuckleDirection + (i * Math.PI/8);
            
            const knuckleX = currentX + Math.cos(spreadAngle) * knuckleOffset;
            const knuckleY = currentY + Math.sin(spreadAngle) * knuckleOffset;
            
            ctx.fillStyle = knuckleColor;
            ctx.beginPath();
            ctx.arc(knuckleX, knuckleY, fistSize * knuckleSizeRatio, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Only show debug visualization if enabled
        if (this.showDebug && window.game && window.game.debug) {
            // Draw the rectangle that represents the hit detection area
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            
            // Draw rectangle hitbox
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(direction);
            
            // Draw the rectangle
            const halfWidth = this.width / 2;
            const fullLength = this.range + radius;
            ctx.strokeRect(0, -halfWidth, fullLength, this.width);
            ctx.restore();
        }
        
        // Check for hits at the right moment in the animation
        if (!this.hitChecked && progress > 0.4 && progress < 0.6) {
            this.checkHits();
            this.hitChecked = true;
        }
    }
    
    checkHits() {
        if (!this.player || !this.isActive) return [];
        
        // Clean up any broken ores before checking hits
        if (typeof cleanupBrokenRocks === 'function') {
            cleanupBrokenRocks();
        }
        
        const hits = [];
        const player = this.player;
        const punchX = player.x + Math.cos(this.direction) * this.range;
        const punchY = player.y + Math.sin(this.direction) * this.range;
        
        // Check for close targets first - we'll expand the search radius for very close objects
        const playerRadius = player.radius || 15;
        const closeRange = playerRadius * 2; // Close range detection for items right next to player
        
        // Don't play hit sound automatically - only play when we actually hit something
        // We'll play it below when we hit an ore or tree
        
        // Get ores from all possible sources
        let ores = [];
        
        // Try window.ores first (used by pickaxe)
        if (window.ores && Array.isArray(window.ores)) {
            ores = window.ores;
        } 
        // Then try oreManager if available
        else if (window.oreManager && window.oreManager.ores) {
            ores = window.oreManager.ores;
        }
        
        // Debug info
        console.log(`Checking fist hits against ${ores.length} ores with range ${this.range}px`);
        
        // Find very close ores first - these get special treatment
        const closeOres = ores.filter(ore => {
            if (!ore || ore.broken || (ore.visible === false) || this.hitTargets.has(ore.id)) return false;
            
            const dx = ore.x - player.x;
            const dy = ore.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if ore is very close to the player
            return distance <= (ore.radius || 20) + closeRange;
        });
        
        // Special logic for close ores - more forgiving hit detection
        for (const ore of closeOres) {
            // Calculate angle to ore
            const dx = ore.x - player.x;
            const dy = ore.y - player.y;
            const angleToOre = Math.atan2(dy, dx);
            
            // If player is facing approximately toward the ore (within 90 degrees)
            let angleDiff = angleToOre - this.direction;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (Math.abs(angleDiff) <= Math.PI/2) {
                console.log(`Close ore hit with fist at (${ore.x}, ${ore.y}) - special close range detection`);
                
                // Calculate damage based on player stats: fistSkill level + (strength/2)
                const damage = this.calculateDamage(1, 1, player.strength || 1, 'rock');
                
                console.log(`Applying ${damage} damage to close ore with health: ${ore.health || 100}`);
                
                // Apply damage to ore
                let oreDestroyed = false;
                
                if (ore.hit) {
                    oreDestroyed = ore.hit(damage, player);
                    // Add random ore hit exp
                    generateRandomOreHitExp(ore, player);
                } else {
                    console.warn("Ore doesn't have a hit method:", ore);
                }
                
                hits.push({
                    target: ore,
                    damage: damage,
                    destroyed: oreDestroyed
                });
                
                // Add to hit targets set so we don't hit it again in this attack
                this.hitTargets.add(ore.id);
                
                // Play hit sound
                this.playHitSound();
                
                // Create particles
                this.createDefaultParticles(ore.x, ore.y, ore.color || '#888');
                
                // Increase skill
                this.increaseFistSkill(ore, damage);
                
                // Create damage number
                this.createCriticalHitText(ore.x, ore.y, damage);
                
                // Get drops if ore was destroyed
                if (oreDestroyed) {
                    const drops = ore.getDrops ? ore.getDrops() : { experience: 5 };
                    this.createExperienceOrbs(ore, drops);
                }
            }
        }
        
        // Check collision with rocks - hit ALL ores in range instead of just closest
        for (const ore of ores) {
            // Skip if ore is not visible or broken or already hit in this attack
            if (!ore || ore.broken || (ore.visible === false) || this.hitTargets.has(ore.id)) continue;
            
            // Use the helper function to check if the punch hits the ore
            if (doesHitRock(punchX, punchY, ore, this.range, this.arcWidth, this.direction, 
                           this.useRectangle, this.width)) {
                console.log(`Ore hit with fist at (${ore.x}, ${ore.y}) using rectangular hitbox`);
                
                // Calculate damage based on player stats: fistSkill level + (strength/2)
                const fistSkillLevel = this.player.skills.fist.level || 1;
                const damage = this.calculateDamage(1, 1, player.strength || 1, 'rock');
                
                console.log(`Applying ${damage} damage to ore with health: ${ore.health || 100}`);
                
                // Apply damage to ore
                let oreDestroyed = false;
                
                if (ore.hit) {
                    oreDestroyed = ore.hit(damage, player);
                    // Add random ore hit exp
                    generateRandomOreHitExp(ore, player);
                } else {
                    console.warn("Ore doesn't have a hit method:", ore);
                }
                
                hits.push({
                    target: ore,
                    damage: damage,
                    destroyed: oreDestroyed
                });
                
                // Add to hit targets set so we don't hit it again in this attack
                this.hitTargets.add(ore.id);
                
                // Play hit sound
                this.playHitSound();
                
                // Create particles
                this.createDefaultParticles(ore.x, ore.y, ore.color || '#888');
                
                // Increase skill
                this.increaseFistSkill(ore, damage);
                
                // Create damage number
                this.createCriticalHitText(ore.x, ore.y, damage);
                
                // Get drops if ore was destroyed
                if (oreDestroyed) {
                    const drops = ore.getDrops ? ore.getDrops() : { experience: 5 };
                    this.createExperienceOrbs(ore, drops);
                }
            }
        }
        
        // Check collision with trees - also handle trees with the same improved detection
        const trees = [];
        
        // Try different ways to access trees, using whatever method might be available
        if (window.game && window.game.treeSystem && window.game.treeSystem.trees) {
            trees.push(...window.game.treeSystem.trees);
        } else if (window.treeSystem && window.treeSystem.trees) {
            trees.push(...window.treeSystem.trees);
        } else if (window.treeManager && window.treeManager.trees) {
            trees.push(...window.treeManager.trees);
        }
        
        // Find very close trees first - these get special treatment
        const closeTrees = trees.filter(tree => {
            if (!tree || this.hitTargets.has(tree.id)) return false;
            
            const dx = tree.x - player.x;
            const dy = tree.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if tree is very close to the player
            return distance <= (tree.radius || 25) + closeRange;
        });
        
        // Special logic for close trees - more forgiving hit detection
        for (const tree of closeTrees) {
            // Calculate angle to tree
            const dx = tree.x - player.x;
            const dy = tree.y - player.y;
            const angleToTree = Math.atan2(dy, dx);
            
            // If player is facing approximately toward the tree (within 90 degrees)
            let angleDiff = angleToTree - this.direction;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (Math.abs(angleDiff) <= Math.PI/2) {
                console.log(`Close tree hit with fist - special close range detection`);
                
                // Calculate damage: 2 + strength for trees
                const damage = this.calculateDamage(2, 2, player.strength || 1, 'tree');
                
                // Get fist level for critical hit calculation
                const fistLevel = this.player.skills.fist.level || 1;
                
                // Check for critical hit based on clicks per second and fist level
                const criticalChanceBase = Math.min(0.5, this.clicksPerSecond * 0.05);
                let criticalChance = criticalChanceBase;
                
                // Increase critical chance based on fist level
                if (fistLevel >= 50) criticalChance += 0.15; // 15% extra at level 50+
                else if (fistLevel >= 25) criticalChance += 0.1; // 10% extra at level 25+
                
                const isCritical = Math.random() < criticalChance;
                
                let finalDamage = damage;
                if (isCritical) {
                    finalDamage *= 2;
                }
                
                console.log(`Applying ${finalDamage} damage to tree with health: ${tree.health || 100}`);
                
                // Apply damage to tree
                let treeDestroyed = false;
                
                if (typeof tree.hit === 'function') {
                    treeDestroyed = tree.hit(finalDamage, player);
                    // Add random tree hit exp
                    generateRandomTreeHitExp(tree, player);
                } else if (tree.health !== undefined) {
                    tree.health -= finalDamage;
                    // Add random tree hit exp
                    generateRandomTreeHitExp(tree, player);
                    if (tree.health <= 0) {
                        tree.health = 0;
                        treeDestroyed = true;
                        // Try to call chop method if it exists
                        if (typeof tree.chop === 'function') {
                            tree.chop();
                        }
                    }
                }
                
                hits.push({
                    target: tree,
                    damage: finalDamage,
                    destroyed: treeDestroyed
                });
                
                // Mark tree as hit
                this.hitTargets.add(tree.id);
                
                // Increase fist skill
                this.increaseFistSkill(tree, finalDamage);
                
                // Create wood particles at the hit location
                this.createWoodParticles(tree.x, tree.y, tree.trunkColor || '#8B4513');
                
                // Create damage number
                this.createCriticalHitText(tree.x, tree.y, finalDamage);
                
                // Play hit sound
                this.playHitSound();
                
                // If tree was destroyed, create experience orbs
                if (treeDestroyed) {
                    console.log("Tree destroyed with fist!");
                    const drops = tree.getDrops ? tree.getDrops() : { experience: 5 };
                    this.createWoodExperienceOrbs(tree, drops);
                }
            }
        }
        
        // Process regular tree hits
        for (const tree of trees) {
            // Skip if tree is already hit in this attack
            if (!tree || this.hitTargets.has(tree.id)) continue;
            
            // Use the helper function to check if the punch hits the tree
            if (doesHitTree(punchX, punchY, tree, player.x, player.y)) {
                console.log("Tree hit detected with square hitbox!");
                
                // Calculate damage: 2 + strength for trees
                const damage = this.calculateDamage(2, 2, player.strength || 1, 'tree');
                
                // Get fist level for critical hit calculation
                const fistLevel = this.player.skills.fist.level || 1;
                
                // Check for critical hit based on clicks per second and fist level
                const criticalChanceBase = Math.min(0.5, this.clicksPerSecond * 0.05);
                let criticalChance = criticalChanceBase;
                
                // Increase critical chance based on fist level
                if (fistLevel >= 50) criticalChance += 0.15; // 15% extra at level 50+
                else if (fistLevel >= 25) criticalChance += 0.1; // 10% extra at level 25+
                
                const isCritical = Math.random() < criticalChance;
                
                let finalDamage = damage;
                if (isCritical) {
                    finalDamage *= 2;
                }
                
                console.log(`Applying ${finalDamage} damage to tree with health: ${tree.health || 100}`);
                
                // Apply damage to tree
                let treeDestroyed = false;
                
                if (typeof tree.hit === 'function') {
                    treeDestroyed = tree.hit(finalDamage, player);
                    // Add random tree hit exp
                    generateRandomTreeHitExp(tree, player);
                } else if (tree.health !== undefined) {
                    tree.health -= finalDamage;
                    // Add random tree hit exp
                    generateRandomTreeHitExp(tree, player);
                    if (tree.health <= 0) {
                        tree.health = 0;
                        treeDestroyed = true;
                        // Try to call chop method if it exists
                        if (typeof tree.chop === 'function') {
                            tree.chop();
                        }
                    }
                }
                
                hits.push({
                    target: tree,
                    damage: finalDamage,
                    destroyed: treeDestroyed
                });
                
                // Mark tree as hit
                this.hitTargets.add(tree.id);
                
                // Increase fist skill
                this.increaseFistSkill(tree, finalDamage);
                
                // Create wood particles at the hit location
                this.createWoodParticles(tree.x, tree.y, tree.trunkColor || '#8B4513');
                
                // Create damage number
                this.createCriticalHitText(tree.x, tree.y, finalDamage);
                
                // Play hit sound
                this.playHitSound();
                
                // If tree was destroyed, create experience orbs
                if (treeDestroyed) {
                    console.log("Tree destroyed with fist!");
                    const drops = tree.getDrops ? tree.getDrops() : { experience: 5 };
                    this.createWoodExperienceOrbs(tree, drops);
                }
            }
        }
        
        return hits;
    }
    
    createDefaultParticles(x, y, color) {
        if (!window.rockParticles) window.rockParticles = [];
        
        const particleCount = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 30;
            const size = 2 + Math.random() * 2;
            const lifetime = 300 + Math.random() * 200;
            
            window.rockParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color || '#888888',
                lifetime: lifetime,
                createdAt: Date.now()
            });
        }
    }
    
    createWoodParticles(x, y, color) {
        if (!window.rockParticles) window.rockParticles = [];
        
        const particleCount = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 30;
            const size = 2 + Math.random() * 3;
            const lifetime = 300 + Math.random() * 200;
            
            window.rockParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color || '#8B4513',
                lifetime: lifetime,
                createdAt: Date.now()
            });
        }
    }
    
    createCriticalHitText(x, y, damage) {
        if (!window.textParticles) window.textParticles = [];
        
        window.textParticles.push({
            x: x,
            y: y,
            text: `CRIT ${damage}!`,
            color: '#FF0000',
            size: 16,
            vx: (Math.random() - 0.5) * 5,
            vy: -20,
            lifetime: 1000,
            createdAt: Date.now()
        });
    }
    
    createExperienceOrbs(ore, drops) {
        this.createNodeExperienceOrbs(ore, drops, 'mining');
    }
    
    /**
     * Create experience orbs from wood/trees
     * @param {Object} tree - The tree that was chopped
     * @param {Object} drops - Drops from the tree
     */
    createWoodExperienceOrbs(tree, drops) {
        this.createNodeExperienceOrbs(tree, drops, 'woodcutting');
    }
    
    /**
     * Create experience orbs from any node type (tree, ore, etc.)
     * @param {Object} node - The node that was destroyed
     * @param {Object} drops - Drops from the node
     * @param {string} skillType - Skill associated with this node type ('mining', 'woodcutting', etc.)
     */
    createNodeExperienceOrbs(node, drops, skillType = 'mining') {
        if (!node || !drops) {
            console.error(`Cannot create experience orbs - node or drops are missing for ${skillType}`);
            return;
        }
        
        // Calculate experience based on node type
        let totalExp = 0;
        
        if (skillType === 'woodcutting') {
            // More experience for trees than basic rocks
            totalExp = 10 + Math.floor(Math.random() * 10);
        } else if (skillType === 'mining') {
            // Base experience for stone
            totalExp = 5;
            
            // Add bonus exp for special ores if we have ore type information
            if (node.type) {
                switch(node.type) {
                    case 'copper': totalExp += 10; break;
                    case 'iron': totalExp += 15; break;
                    case 'gold': totalExp += 25; break;
                    case 'diamond': totalExp += 40; break;
                    default: totalExp += 5; break;
                }
            }
            
            // Add randomness
            totalExp += Math.floor(Math.random() * 5);
        } else {
            // Default for other skill types
            totalExp = drops.experience || 5;
        }
        
        console.log(`Creating ${totalExp} experience from ${skillType} node destruction`);
        
        try {
            // Add experience to the appropriate skill if it exists
            if (window.skillsManager) {
                window.skillsManager.addExperience(skillType, totalExp);
            } else if (window.game && window.game.skillsManager) {
                window.game.skillsManager.addExperience(skillType, totalExp);
            }
            
            // Get the experience orb manager
            const manager = getExperienceOrbManager();
            if (!manager) {
                console.log(`No experience orb manager found to create ${skillType} orbs`);
                return;
            }
            
            // Try to create experience orbs
            if (typeof manager.createExperienceOrbs === 'function') {
                manager.createExperienceOrbs(node.x, node.y, totalExp);
            } else if (typeof manager.createOrb === 'function') {
                // Create individual orbs in a burst pattern
                for (let i = 0; i < totalExp; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 10 + Math.random() * 20;
                    const orbX = node.x + Math.cos(angle) * distance;
                    const orbY = node.y + Math.sin(angle) * distance;
                    manager.createOrb(orbX, orbY, 1);
                }
            } else if (typeof manager.createOrbBurst === 'function') {
                manager.createOrbBurst(node.x, node.y, totalExp, totalExp);
            } else {
                console.error(`Found manager but it has no suitable method to create ${skillType} orbs`);
            }
        } catch (error) {
            console.error(`Error creating ${skillType} experience orbs:`, error);
        }
    }
    
    playHitSound() {
        if (this.hitSound) {
            try {
                // Clone the sound to allow multiple plays
                const sound = this.hitSound.cloneNode();
                sound.volume = 0.3 + Math.random() * 0.2; // Slightly louder
                sound.playbackRate = 0.9 + Math.random() * 0.2; // Less variation in pitch
                
                // Force the sound to play with a timeout fallback
                const playPromise = sound.play();
                
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.error('Error playing hit sound:', e);
                        // Try to play again after user interaction
                        document.addEventListener('click', () => {
                            sound.play().catch(e2 => console.error('Still cannot play sound:', e2));
                        }, { once: true });
                    });
                }
            } catch (error) {
                console.error('Error playing hit sound:', error);
                // Try recreating the sound
                this.loadHitSound();
            }
        } else {
            // If sound is null, try to reload it
            this.loadHitSound();
        }
    }
}

// Create Attacks namespace
const Attacks = {
    Attack,
    PickaxeAttack,
    AxeAttack,
    FistAttack
};

// Make Attacks globally available for backward compatibility
window.Attacks = Attacks;
window.PickaxeAttack = PickaxeAttack;
window.AxeAttack = AxeAttack;
window.FistAttack = FistAttack;

// Export as default and named exports
export { Attack, PickaxeAttack, AxeAttack, FistAttack };
export default Attacks; 

/**
 * Clean up broken ores from the hit tracking sets
 * This prevents visual effects from applying to broken ores
 */
function cleanupBrokenRocks() {
    // Clean up the hitRocks set - remove any broken ores
    if (window.hitRocks) {
        const hitRocksArray = [...window.hitRocks];
        for (const rock of hitRocksArray) {
            // More comprehensive validation for dead ores
            if (!rock || 
                rock.broken || 
                rock.health <= 0 || 
                rock.visible === false || 
                rock.radius <= 0 ||
                typeof rock.hit !== 'function') {
                
                // Remove from tracking
                window.hitRocks.delete(rock);
                if (window.rockHitTimes) {
                    window.rockHitTimes.delete(rock);
                }
                
                console.log('Cleaned up invalid rock from hit tracking');
            }
        }
    }
    
    // Also clean up tree hit tracking if it exists
    if (window.hitTrees) {
        const hitTreesArray = [...window.hitTrees];
        for (const tree of hitTreesArray) {
            if (!tree || tree.broken || tree.health <= 0 || tree.visible === false) {
                window.hitTrees.delete(tree);
                if (window.treeHitTimes) {
                    window.treeHitTimes.delete(tree);
                }
            }
        }
    }
}

// Call this function periodically to keep things clean
if (typeof window !== 'undefined') {
    // Run more frequently (every 2 seconds instead of 5)
    setInterval(cleanupBrokenRocks, 2000);
    
    // Also run immediately
    setTimeout(cleanupBrokenRocks, 100);
    
    // Run whenever hitting happens - add to click events
    window.addEventListener('mousedown', () => {
        setTimeout(cleanupBrokenRocks, 50);
    });
}

/**
 * Get the experience orb manager from any source
 * @returns {Object|null} - Experience orb manager if found, null otherwise
 */
function getExperienceOrbManager() {
    if (window.game && window.game.expOrbManager) {
        return window.game.expOrbManager;
    } else if (window.expOrbManager) {
        return window.expOrbManager;
    } else if (window.ExperienceOrbManager) {
        return window.ExperienceOrbManager;
    } else if (window.experienceOrbManager) {
        return window.experienceOrbManager;
    } else if (window.Game && window.Game.expOrbManager) {
        return window.Game.expOrbManager;
    }
    return null;
}

/**
 * Generate random 1 XP orb for tree hits (1 in 10 chance)
 * @param {Object} tree - Tree object
 * @param {Object} player - Player object
 */
function generateRandomTreeHitExp(tree, player) {
    // 1 in 10 chance to drop a small experience orb
    if (Math.random() < 0.1) {
        try {
            // Get the experience orb manager
            const manager = getExperienceOrbManager();
            if (!manager) {
                console.log("Could not find any experience orb manager to create woodcutting orbs");
                return;
            }
            
            // Position with small random offset
            const x = tree.x + (Math.random() - 0.5) * 20;
            const y = tree.y + (Math.random() - 0.5) * 20;
            
            // Try to create the orb
            if (typeof manager.createExpOrb === 'function') {
                manager.createExpOrb(x, y, 1, { skillType: 'woodcutting' });
            } else if (typeof manager.createOrb === 'function') {
                manager.createOrb(x, y, 1);
            } else {
                console.log("Found manager but it has no suitable create method");
            }
        } catch (error) {
            console.error("Error creating random woodcutting experience orb:", error);
        }
    }
}

/**
 * Generate random 1 XP orb for ore hits (1 in 20 chance)
 * @param {Object} ore - Ore object
 * @param {Object} player - Player object
 */
function generateRandomOreHitExp(ore, player) {
    // 1 in 20 chance to drop a small experience orb
    if (Math.random() < 0.05) {
        try {
            // Get the experience orb manager
            const manager = getExperienceOrbManager();
            if (!manager) {
                console.log("Could not find any experience orb manager to create mining orbs");
                return;
            }
            
            // Position with small random offset
            const x = ore.x + (Math.random() - 0.5) * 20;
            const y = ore.y + (Math.random() - 0.5) * 20;
            
            // Try to create the orb
            if (typeof manager.createExpOrb === 'function') {
                manager.createExpOrb(x, y, 1, { skillType: 'mining' });
            } else if (typeof manager.createOrb === 'function') {
                manager.createOrb(x, y, 1);
            } else {
                console.log("Found manager but it has no suitable create method");
            }
        } catch (error) {
            console.error("Error creating random mining experience orb:", error);
        }
    }
}