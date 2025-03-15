/**
 * Skills System
 * 
 * Defines all player skills, their mechanics, and related functionality
 */

// Skill types
export const SKILL_TYPES = {
    COMBAT: 'combat',
    GATHERING: 'gathering',
    CRAFTING: 'crafting',
    UTILITY: 'utility'
};

// Skill definitions
export const SKILLS = {
    // Combat skills
    ATTACK: {
        id: 'attack',
        name: 'Attack',
        description: 'Increases melee damage and accuracy',
        type: SKILL_TYPES.COMBAT,
        icon: 'sword',
        maxLevel: 99,
        baseXp: 50
    },
    DEFENSE: {
        id: 'defense',
        name: 'Defense',
        description: 'Reduces damage taken from attacks',
        type: SKILL_TYPES.COMBAT,
        icon: 'shield',
        maxLevel: 99,
        baseXp: 50
    },
    STRENGTH: {
        id: 'strength',
        name: 'Strength',
        description: 'Increases melee damage',
        type: SKILL_TYPES.COMBAT,
        icon: 'fist',
        maxLevel: 99,
        baseXp: 50
    },
    RANGED: {
        id: 'ranged',
        name: 'Ranged',
        description: 'Increases ranged damage and accuracy',
        type: SKILL_TYPES.COMBAT,
        icon: 'bow',
        maxLevel: 99,
        baseXp: 60
    },
    MAGIC: {
        id: 'magic',
        name: 'Magic',
        description: 'Increases magic damage and unlocks spells',
        type: SKILL_TYPES.COMBAT,
        icon: 'staff',
        maxLevel: 99,
        baseXp: 70
    },
    
    // Gathering skills
    MINING: {
        id: 'mining',
        name: 'Mining',
        description: 'Allows gathering of ores and gems',
        type: SKILL_TYPES.GATHERING,
        icon: 'pickaxe',
        maxLevel: 99,
        baseXp: 40
    },
    WOODCUTTING: {
        id: 'woodcutting',
        name: 'Woodcutting',
        description: 'Allows gathering of wood',
        type: SKILL_TYPES.GATHERING,
        icon: 'axe',
        maxLevel: 99,
        baseXp: 40
    },
    FISHING: {
        id: 'fishing',
        name: 'Fishing',
        description: 'Allows catching of fish',
        type: SKILL_TYPES.GATHERING,
        icon: 'fishing-rod',
        maxLevel: 99,
        baseXp: 45
    },
    
    // Crafting skills
    SMITHING: {
        id: 'smithing',
        name: 'Smithing',
        description: 'Allows crafting of metal items',
        type: SKILL_TYPES.CRAFTING,
        icon: 'anvil',
        maxLevel: 99,
        baseXp: 55
    },
    CRAFTING: {
        id: 'crafting',
        name: 'Crafting',
        description: 'Allows crafting of various items',
        type: SKILL_TYPES.CRAFTING,
        icon: 'needle',
        maxLevel: 99,
        baseXp: 50
    },
    FLETCHING: {
        id: 'fletching',
        name: 'Fletching',
        description: 'Allows crafting of bows and arrows',
        type: SKILL_TYPES.CRAFTING,
        icon: 'arrow',
        maxLevel: 99,
        baseXp: 45
    },
    
    // Utility skills
    AGILITY: {
        id: 'agility',
        name: 'Agility',
        description: 'Increases movement speed and stamina',
        type: SKILL_TYPES.UTILITY,
        icon: 'boots',
        maxLevel: 99,
        baseXp: 60
    },
    COOKING: {
        id: 'cooking',
        name: 'Cooking',
        description: 'Allows cooking of food for healing',
        type: SKILL_TYPES.UTILITY,
        icon: 'pot',
        maxLevel: 99,
        baseXp: 40
    }
};

/**
 * Get all skills of a specific type
 * @param {string} type - Skill type from SKILL_TYPES
 * @returns {Array} - Array of skills of the specified type
 */
export function getSkillsByType(type) {
    return Object.values(SKILLS).filter(skill => skill.type === type);
}

/**
 * Get a skill by its ID
 * @param {string} id - Skill ID
 * @returns {Object|null} - Skill object or null if not found
 */
export function getSkillById(id) {
    return Object.values(SKILLS).find(skill => skill.id === id) || null;
}

/**
 * Calculate experience required for a specific skill level
 * @param {Object} skill - Skill object
 * @param {number} level - Target level
 * @returns {number} - Experience required
 */
export function calculateSkillExperience(skill, level) {
    if (level <= 1) return 0;
    if (level > skill.maxLevel) return Infinity;
    
    // Formula: baseXp * level * (level - 1) * 0.25
    return Math.floor(skill.baseXp * level * (level - 1) * 0.25);
}

/**
 * Calculate total experience required from level 1 to target level for a skill
 * @param {Object} skill - Skill object
 * @param {number} level - Target level
 * @returns {number} - Total experience required
 */
export function calculateTotalSkillExperience(skill, level) {
    if (level <= 1) return 0;
    if (level > skill.maxLevel) return Infinity;
    
    let totalXp = 0;
    for (let i = 2; i <= level; i++) {
        totalXp += calculateSkillExperience(skill, i);
    }
    
    return totalXp;
}

/**
 * Calculate skill level based on total experience
 * @param {Object} skill - Skill object
 * @param {number} totalXp - Total experience in the skill
 * @returns {number} - Current level
 */
export function calculateSkillLevel(skill, totalXp) {
    if (totalXp <= 0) return 1;
    
    let level = 1;
    let xpForNextLevel = calculateSkillExperience(skill, level + 1);
    let accumulatedXp = 0;
    
    while (totalXp >= accumulatedXp + xpForNextLevel && level < skill.maxLevel) {
        level++;
        accumulatedXp += xpForNextLevel;
        xpForNextLevel = calculateSkillExperience(skill, level + 1);
    }
    
    return level;
}

/**
 * Check if player meets the skill requirements for an item or action
 * @param {Object} playerSkills - Object mapping skill IDs to experience values
 * @param {Object} requirements - Object mapping skill IDs to required levels
 * @returns {boolean} - True if all requirements are met
 */
export function meetsSkillRequirements(playerSkills, requirements) {
    for (const [skillId, requiredLevel] of Object.entries(requirements)) {
        const skill = getSkillById(skillId);
        if (!skill) continue;
        
        const playerXp = playerSkills[skillId] || 0;
        const playerLevel = calculateSkillLevel(skill, playerXp);
        
        if (playerLevel < requiredLevel) {
            return false;
        }
    }
    
    return true;
}

/**
 * Get missing skill requirements for an item or action
 * @param {Object} playerSkills - Object mapping skill IDs to experience values
 * @param {Object} requirements - Object mapping skill IDs to required levels
 * @returns {Array} - Array of objects with skill and required level information
 */
export function getMissingSkillRequirements(playerSkills, requirements) {
    const missing = [];
    
    for (const [skillId, requiredLevel] of Object.entries(requirements)) {
        const skill = getSkillById(skillId);
        if (!skill) continue;
        
        const playerXp = playerSkills[skillId] || 0;
        const playerLevel = calculateSkillLevel(skill, playerXp);
        
        if (playerLevel < requiredLevel) {
            missing.push({
                skill,
                currentLevel: playerLevel,
                requiredLevel
            });
        }
    }
    
    return missing;
} 

// Create a skills object that contains all exported functions
const skills = {
    SKILL_TYPES,
    SKILLS,
    getSkillsByType,
    getSkillById,
    calculateSkillExperience,
    calculateTotalSkillExperience,
    calculateSkillLevel,
    meetsSkillRequirements,
    getMissingSkillRequirements
};

// Make skills available globally for backward compatibility
window.Skills = skills;

// Export the skills object as default
export default skills;