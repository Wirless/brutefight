/**
 * Ores System
 * 
 * Defines all minable ores, their properties, and related functionality
 */

// Ore types
export const ORE_TYPES = {
    ROCK: 'rock',
    COPPER: 'copper',
    TIN: 'tin',
    IRON: 'iron',
    COAL: 'coal',
    GOLD: 'gold',
    MITHRIL: 'mithril',
    ADAMANTITE: 'adamantite',
    RUNITE: 'runite'
};

// Ore definitions
export const ORE_DATA = {
    [ORE_TYPES.ROCK]: {
        id: ORE_TYPES.ROCK,
        name: 'Rock',
        description: 'A basic rock with no valuable minerals',
        levelRequired: 1,
        experienceGiven: 5,
        respawnTime: 5000, // 5 seconds
        color: '#8B8B8B',
        chance: 100, // 100% chance to appear at any level
        depleteTime: 2000 // 2 seconds to mine
    },
    [ORE_TYPES.COPPER]: {
        id: ORE_TYPES.COPPER,
        name: 'Copper Ore',
        description: 'A basic metal used in early crafting',
        levelRequired: 1,
        experienceGiven: 20,
        respawnTime: 8000, // 8 seconds
        color: '#CD7F32',
        chance: 90, // 90% chance to appear at level 1+
        depleteTime: 3000 // 3 seconds to mine
    },
    [ORE_TYPES.TIN]: {
        id: ORE_TYPES.TIN,
        name: 'Tin Ore',
        description: 'Used with copper to create bronze',
        levelRequired: 1,
        experienceGiven: 20,
        respawnTime: 8000, // 8 seconds
        color: '#B4B4B4',
        chance: 90, // 90% chance to appear at level 1+
        depleteTime: 3000 // 3 seconds to mine
    },
    [ORE_TYPES.IRON]: {
        id: ORE_TYPES.IRON,
        name: 'Iron Ore',
        description: 'A versatile metal used in many recipes',
        levelRequired: 10,
        experienceGiven: 50,
        respawnTime: 10000, // 10 seconds
        color: '#8B4513',
        chance: 80, // 80% chance to appear at level 10+
        depleteTime: 5000 // 5 seconds to mine
    },
    [ORE_TYPES.COAL]: {
        id: ORE_TYPES.COAL,
        name: 'Coal',
        description: 'Used as fuel for smelting',
        levelRequired: 20,
        experienceGiven: 75,
        respawnTime: 12000, // 12 seconds
        color: '#2E2E2E',
        chance: 70, // 70% chance to appear at level 20+
        depleteTime: 5000 // 5 seconds to mine
    },
    [ORE_TYPES.GOLD]: {
        id: ORE_TYPES.GOLD,
        name: 'Gold Ore',
        description: 'A valuable metal used in advanced recipes',
        levelRequired: 30,
        experienceGiven: 100,
        respawnTime: 15000, // 15 seconds
        color: '#FFD700',
        chance: 60, // 60% chance to appear at level 30+
        depleteTime: 6000 // 6 seconds to mine
    },
    [ORE_TYPES.MITHRIL]: {
        id: ORE_TYPES.MITHRIL,
        name: 'Mithril Ore',
        description: 'A strong metal used in high-level equipment',
        levelRequired: 50,
        experienceGiven: 150,
        respawnTime: 20000, // 20 seconds
        color: '#4682B4',
        chance: 50, // 50% chance to appear at level 50+
        depleteTime: 8000 // 8 seconds to mine
    },
    [ORE_TYPES.ADAMANTITE]: {
        id: ORE_TYPES.ADAMANTITE,
        name: 'Adamantite Ore',
        description: 'An extremely strong metal for high-tier equipment',
        levelRequired: 70,
        experienceGiven: 200,
        respawnTime: 25000, // 25 seconds
        color: '#3CB371',
        chance: 40, // 40% chance to appear at level 70+
        depleteTime: 10000 // 10 seconds to mine
    },
    [ORE_TYPES.RUNITE]: {
        id: ORE_TYPES.RUNITE,
        name: 'Runite Ore',
        description: 'The strongest minable metal for top-tier equipment',
        levelRequired: 90,
        experienceGiven: 250,
        respawnTime: 30000, // 30 seconds
        color: '#4169E1',
        chance: 30, // 30% chance to appear at level 90+
        depleteTime: 12000 // 12 seconds to mine
    }
};

/**
 * Get all ores available at a specified level
 * @param {number} playerLevel - Current mining level of player
 * @returns {Array} - Array of ore objects available at the level
 */
export function getOresByLevel(level) {
    return Object.values(ORE_DATA).filter(ore => ore.levelRequired <= level);
}

/**
 * Get an ore by its ID
 * @param {string} id - Ore ID from ORE_TYPES
 * @returns {Object|null} - Ore object or null if not found
 */
export function getOreById(id) {
    return ORE_DATA[id] || null;
}

// Calculate mining success chance based on player level and ore level
export function calculateMiningSuccessChance(playerLevel, oreLevel) {
    const levelDifference = playerLevel - oreLevel;
    
    // Base chance starts at 50%
    let chance = 50;
    
    // Each level above the required level adds 5% chance
    if (levelDifference > 0) {
        chance += levelDifference * 5;
    } else {
        // Each level below reduces chance by 10%
        chance += levelDifference * 10;
    }
    
    // Clamp between 5% and 95%
    return Math.max(5, Math.min(95, chance));
} 

// Create an Ores object that contains all exported functions and constants
const OresData = {
    ORE_TYPES,
    ORE_DATA,
    getOresByLevel,
    getOreById,
    calculateMiningSuccessChance
};

// Make Ores available globally for backward compatibility
window.OresData = OresData;

// Export the Ores object as default
export default OresData;