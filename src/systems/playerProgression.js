/**
 * Player Progression System
 * 
 * Handles player leveling, experience calculations, and progression mechanics
 */

// Base experience required for level 2
const BASE_XP = 100;

// Experience multiplier for each level
const XP_MULTIPLIER = 1.5;

/**
 * Calculate experience required for a specific level
 * @param {number} level - The target level
 * @returns {number} - Experience required to reach the level
 */
export function calculateExperienceForLevel(level) {
    if (level <= 1) return 0;
    
    // Formula: BASE_XP * (XP_MULTIPLIER^(level-1))
    return Math.floor(BASE_XP * Math.pow(XP_MULTIPLIER, level - 2));
}

/**
 * Calculate total experience required from level 1 to target level
 * @param {number} level - The target level
 * @returns {number} - Total experience required
 */
export function calculateTotalExperienceForLevel(level) {
    if (level <= 1) return 0;
    
    let totalXp = 0;
    for (let i = 2; i <= level; i++) {
        totalXp += calculateExperienceForLevel(i);
    }
    
    return totalXp;
}

/**
 * Calculate player level based on total experience
 * @param {number} totalXp - Player's total experience
 * @returns {number} - Current level
 */
export function calculateLevelFromExperience(totalXp) {
    if (totalXp <= 0) return 1;
    
    let level = 1;
    let xpForNextLevel = calculateExperienceForLevel(level + 1);
    let accumulatedXp = 0;
    
    while (totalXp >= accumulatedXp + xpForNextLevel) {
        level++;
        accumulatedXp += xpForNextLevel;
        xpForNextLevel = calculateExperienceForLevel(level + 1);
    }
    
    return level;
}

/**
 * Calculate experience progress towards next level
 * @param {number} totalXp - Player's total experience
 * @returns {Object} - Object containing current level, experience in current level,
 *                    experience needed for next level, and percentage progress
 */
export function calculateLevelProgress(totalXp) {
    const currentLevel = calculateLevelFromExperience(totalXp);
    const xpForCurrentLevel = calculateTotalExperienceForLevel(currentLevel);
    const xpForNextLevel = calculateExperienceForLevel(currentLevel + 1);
    const xpInCurrentLevel = totalXp - xpForCurrentLevel;
    const progressPercentage = (xpInCurrentLevel / xpForNextLevel) * 100;
    
    return {
        level: currentLevel,
        currentXp: xpInCurrentLevel,
        requiredXp: xpForNextLevel,
        percentage: progressPercentage
    };
}

/**
 * Check if player has leveled up after gaining experience
 * @param {number} oldXp - Previous total experience
 * @param {number} newXp - New total experience
 * @returns {boolean} - True if player leveled up
 */
export function hasLeveledUp(oldXp, newXp) {
    const oldLevel = calculateLevelFromExperience(oldXp);
    const newLevel = calculateLevelFromExperience(newXp);
    
    return newLevel > oldLevel;
}

/**
 * Get all levels gained from experience gain
 * @param {number} oldXp - Previous total experience
 * @param {number} newXp - New total experience
 * @returns {Array<number>} - Array of levels gained
 */
export function getLevelsGained(oldXp, newXp) {
    const oldLevel = calculateLevelFromExperience(oldXp);
    const newLevel = calculateLevelFromExperience(newXp);
    
    if (oldLevel >= newLevel) return [];
    
    const levelsGained = [];
    for (let i = oldLevel + 1; i <= newLevel; i++) {
        levelsGained.push(i);
    }
    
    return levelsGained;
} 

// Create a playerProgression object that contains all exported functions
const playerProgression = {
    BASE_XP,
    XP_MULTIPLIER,
    calculateExperienceForLevel,
    calculateTotalExperienceForLevel,
    calculateLevelFromExperience,
    calculateLevelProgress,
    hasLeveledUp,
    getLevelsGained
};

// Make playerProgression available globally for backward compatibility
window.PlayerProgression = playerProgression;

// Export the playerProgression object as default
export default playerProgression;
