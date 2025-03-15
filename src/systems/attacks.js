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

// Define attack classes
class PickaxeAttack {
    constructor(player, ctx) {
        this.player = player;
        this.ctx = ctx;
        this.active = false;
        this.cooldown = 0;
        this.angle = 0;
        this.damage = 3;
        this.range = 50;
    }
    
    start(angle) {
        if (this.cooldown > 0) return false;
        
        this.active = true;
        this.angle = angle;
        this.cooldown = 500; // 500ms cooldown
        
        return true;
    }
    
    update(deltaTime) {
        if (this.cooldown > 0) {
            this.cooldown = Math.max(0, this.cooldown - deltaTime);
        }
        
        if (this.active && this.cooldown < 450) {
            this.active = false;
        }
    }
    
    draw(cameraX, cameraY) {
        if (!this.active) return;
        
        const playerScreenX = this.player.x - Math.floor(cameraX);
        const playerScreenY = this.player.y - Math.floor(cameraY);
        
        // Draw attack animation
        this.ctx.save();
        this.ctx.translate(playerScreenX, playerScreenY);
        this.ctx.rotate(this.angle);
        
        // Draw pickaxe
        this.ctx.fillStyle = '#888';
        this.ctx.fillRect(10, -5, 30, 10);
        
        this.ctx.restore();
    }
}

class AxeAttack {
    constructor(player, ctx) {
        this.player = player;
        this.ctx = ctx;
        this.active = false;
        this.cooldown = 0;
        this.angle = 0;
        this.damage = 5;
        this.range = 60;
    }
    
    start(angle) {
        if (this.cooldown > 0) return false;
        
        this.active = true;
        this.angle = angle;
        this.cooldown = 700; // 700ms cooldown
        
        return true;
    }
    
    update(deltaTime) {
        if (this.cooldown > 0) {
            this.cooldown = Math.max(0, this.cooldown - deltaTime);
        }
        
        if (this.active && this.cooldown < 650) {
            this.active = false;
        }
    }
    
    draw(cameraX, cameraY) {
        if (!this.active) return;
        
        const playerScreenX = this.player.x - Math.floor(cameraX);
        const playerScreenY = this.player.y - Math.floor(cameraY);
        
        // Draw attack animation
        this.ctx.save();
        this.ctx.translate(playerScreenX, playerScreenY);
        this.ctx.rotate(this.angle);
        
        // Draw axe
        this.ctx.fillStyle = '#754C24';
        this.ctx.fillRect(10, -5, 25, 10);
        this.ctx.fillStyle = '#A9A9A9';
        this.ctx.fillRect(35, -15, 15, 30);
        
        this.ctx.restore();
    }
}

// Create an Attacks object that contains all exported functions and constants
const Attacks = {
    ATTACK_TYPES,
    WEAPON_TYPES,
    calculateDamage,
    calculateHitChance,
    doesAttackHit,
    calculateAttackCooldown,
    PickaxeAttack,
    AxeAttack
};

// Make Attacks available globally for backward compatibility
window.Attacks = Attacks;

// Export the Attacks object as default
export default Attacks; 