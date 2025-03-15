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

/**
 * Create and manage the experience bar UI
 */
export class ExperienceBar {
    /**
     * Create a new experience bar
     * @param {Object} player - The player object
     * @param {Object} options - Configuration options
     */
    constructor(player, options = {}) {
        this.player = player;
        this.options = Object.assign({
            containerId: 'gamePanel',
            width: '50%',
            height: '15px',
            barColor: 'rgb(0, 233, 150)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderColor: 'rgb(0, 233, 150)',
            textColor: 'white',
            fontSize: '10px',
            position: 'top',
            margin: '5px'
        }, options);
        
        // Create UI elements
        this.createUI();
        
        // Initial update
        this.update();
    }
    
    /**
     * Create the experience bar UI elements
     */
    createUI() {
        // Get container
        this.container = document.getElementById(this.options.containerId);
        if (!this.container) {
            console.error(`Container with ID ${this.options.containerId} not found`);
            return;
        }
        
        // Create experience bar container
        this.barContainer = document.createElement('div');
        this.barContainer.className = 'exp-bar-container';
        this.barContainer.style.position = 'absolute';
        this.barContainer.style.top = this.options.position === 'top' ? this.options.margin : 'auto';
        this.barContainer.style.left = '50%';
        this.barContainer.style.transform = 'translateX(-50%)';
        this.barContainer.style.width = this.options.width;
        this.barContainer.style.height = this.options.height;
        this.barContainer.style.backgroundColor = this.options.backgroundColor;
        this.barContainer.style.border = `2px solid ${this.options.borderColor}`;
        this.barContainer.style.borderRadius = '8px';
        this.barContainer.style.overflow = 'hidden';
        this.barContainer.style.zIndex = '999';
        
        // Create the progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'exp-progress-bar';
        this.progressBar.style.height = '100%';
        this.progressBar.style.width = '0%';
        this.progressBar.style.backgroundColor = this.options.barColor;
        this.progressBar.style.transition = 'width 0.3s ease-out';
        
        // Create the text display
        this.textDisplay = document.createElement('div');
        this.textDisplay.className = 'exp-text';
        this.textDisplay.style.position = 'absolute';
        this.textDisplay.style.top = '0';
        this.textDisplay.style.left = '0';
        this.textDisplay.style.right = '0';
        this.textDisplay.style.bottom = '0';
        this.textDisplay.style.display = 'flex';
        this.textDisplay.style.alignItems = 'center';
        this.textDisplay.style.justifyContent = 'center';
        this.textDisplay.style.color = this.options.textColor;
        this.textDisplay.style.fontSize = this.options.fontSize;
        this.textDisplay.style.fontWeight = 'bold';
        this.textDisplay.style.textShadow = '1px 1px 1px black';
        
        // Create the total XP display
        this.totalXpDisplay = document.createElement('div');
        this.totalXpDisplay.className = 'total-xp';
        this.totalXpDisplay.style.position = 'absolute';
        this.totalXpDisplay.style.top = `calc(${this.options.height} + 5px)`;
        this.totalXpDisplay.style.left = '50%';
        this.totalXpDisplay.style.transform = 'translateX(-50%)';
        this.totalXpDisplay.style.color = this.options.textColor;
        this.totalXpDisplay.style.fontSize = this.options.fontSize;
        this.totalXpDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.totalXpDisplay.style.padding = '2px 6px';
        this.totalXpDisplay.style.borderRadius = '4px';
        
        // Assemble the components
        this.barContainer.appendChild(this.progressBar);
        this.barContainer.appendChild(this.textDisplay);
        this.container.appendChild(this.barContainer);
        this.container.appendChild(this.totalXpDisplay);
    }
    
    /**
     * Update the experience bar with current player data
     */
    update() {
        if (!this.player) return;
        
        // Calculate progress
        const totalXp = this.player.experience || 0;
        const progress = calculateLevelProgress(totalXp);
        
        // Update the progress bar width
        this.progressBar.style.width = `${progress.percentage}%`;
        
        // Update the text displays
        this.textDisplay.textContent = `Level ${progress.level} - ${progress.currentXp}/${progress.requiredXp} XP`;
        this.totalXpDisplay.textContent = `Total XP: ${totalXp}`;
    }
    
    /**
     * Show a level up animation
     * @param {number} newLevel - The new level achieved
     */
    showLevelUpAnimation(newLevel) {
        // Create level up message
        const message = document.createElement('div');
        message.className = 'level-up-message';
        message.textContent = `LEVEL UP! You are now level ${newLevel}`;
        
        message.style.position = 'absolute';
        message.style.top = '50%';
        message.style.left = '50%';
        message.style.transform = 'translate(-50%, -50%)';
        message.style.backgroundColor = 'rgba(0, 233, 150, 0.9)';
        message.style.color = 'white';
        message.style.padding = '20px';
        message.style.borderRadius = '10px';
        message.style.fontWeight = 'bold';
        message.style.fontSize = '24px';
        message.style.textAlign = 'center';
        message.style.boxShadow = '0 0 20px rgba(0, 233, 150, 0.7)';
        message.style.zIndex = '1001';
        message.style.animation = 'levelUpAnimation 2s forwards';
        
        // Add animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes levelUpAnimation {
                0% { opacity: 0; transform: translate(-50%, -80%); }
                20% { opacity: 1; transform: translate(-50%, -50%); }
                80% { opacity: 1; transform: translate(-50%, -50%); }
                100% { opacity: 0; transform: translate(-50%, -20%); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(message);
        
        // Remove message after animation
        setTimeout(() => {
            document.body.removeChild(message);
        }, 2000);
        
        // Play level up sound if available
        try {
            if (window.audioContext) {
                const sound = window.soundsCache ? window.soundsCache['sounds/levelup.mp3'] : new Audio('sounds/levelup.mp3');
                sound.volume = 0.5;
                sound.play().catch(err => console.log('Sound play failed:', err));
            }
        } catch (error) {
            console.error("Error playing level up sound:", error);
        }
    }
    
    /**
     * Handle experience gain
     * @param {number} amount - Amount of experience gained
     * @returns {boolean} - True if the player leveled up
     */
    addExperience(amount) {
        if (!this.player) return false;
        
        // Store old experience and level
        const oldXp = this.player.experience || 0;
        const oldLevel = calculateLevelFromExperience(oldXp);
        
        // Add experience
        this.player.experience = oldXp + amount;
        
        // Calculate new level
        const newLevel = calculateLevelFromExperience(this.player.experience);
        
        // Update the UI
        this.update();
        
        // Check if the player leveled up
        if (newLevel > oldLevel) {
            this.showLevelUpAnimation(newLevel);
            return true;
        }
        
        return false;
    }
}

/**
 * Save player skills progress including woodcutting
 * @param {Object} player - The player object
 * @param {Object} skillsData - Skills progress data
 */
export function saveSkillsProgress(player, skillsData) {
    if (!player || !skillsData) return;
    
    // Make sure player.skills exists
    if (!player.skills) {
        player.skills = {};
    }
    
    // Save each skill's progress
    for (const skillId in skillsData) {
        player.skills[skillId] = {
            level: skillsData[skillId].level || 1,
            experience: skillsData[skillId].experience || 0
        };
    }
    
    // Ensure woodcutting progress is saved
    if (skillsData.woodcutting) {
        if (!player.skills.woodcutting) {
            player.skills.woodcutting = {
                level: 1,
                experience: 0
            };
        }
        
        player.skills.woodcutting.level = skillsData.woodcutting.level || player.skills.woodcutting.level;
        player.skills.woodcutting.experience = skillsData.woodcutting.experience || player.skills.woodcutting.experience;
    }
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
    getLevelsGained,
    ExperienceBar,
    saveSkillsProgress
};

// Make playerProgression available globally for backward compatibility
window.PlayerProgression = playerProgression;

// Export the playerProgression object as default
export default playerProgression;
