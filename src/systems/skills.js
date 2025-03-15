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
        baseXp: 40,
        effects: [
            { level: 1, description: 'Can chop basic trees' },
            { level: 5, description: '+10% woodcutting speed' },
            { level: 10, description: '+20% woodcutting speed' },
            { level: 15, description: '+10% wood yield' },
            { level: 20, description: '+30% woodcutting speed' },
            { level: 25, description: '+20% wood yield' },
            { level: 30, description: '+40% woodcutting speed' },
            { level: 40, description: '+30% wood yield' },
            { level: 50, description: '+50% woodcutting speed and +40% yield' }
        ]
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
 * SkillsManager class - Manages player skills, experience, and skill UI
 */
export class SkillsManager {
    /**
     * Create a new SkillsManager
     * @param {Object} player - Player object
     */
    constructor(player) {
        this.player = player;
        
        // Initialize skills if they don't exist
        if (!this.player.skills) {
            this.player.skills = {
                mining: {
                    level: 1,
                    experience: 0,
                    maxExperience: this.calculateMaxExperience(1)
                },
                woodcutting: {
                    level: 1,
                    experience: 0,
                    maxExperience: this.calculateMaxExperience(1)
                },
                // Add more skills here as needed
            };
        }
        
        // Ensure woodcutting skill exists (for existing players)
        if (!this.player.skills.woodcutting) {
            this.player.skills.woodcutting = {
                level: 1,
                experience: 0,
                maxExperience: this.calculateMaxExperience(1)
            };
        }
        
        // Create UI
        this.createUI();
        
        // Restore saved position if available
        this.restoreWindowPosition();
        
        console.log("SkillsManager initialized with player skills:", this.player.skills);
    }
    
    /**
     * Calculate maximum experience needed for a level
     * @param {number} level - Current level
     * @returns {number} - Experience required for next level
     */
    calculateMaxExperience(level) {
        // First level requires 100 hits
        const baseExperience = 100;
        
        // Each level requires 13% more experience than the previous
        if (level === 1) {
            return baseExperience;
        }
        
        return Math.floor(this.calculateMaxExperience(level - 1) * 1.13);
    }
    
    /**
     * Add experience to a skill
     * @param {string} skillName - Name of the skill
     * @param {number} amount - Amount of experience to add
     * @returns {Object} - Current experience, max experience, and level
     */
    addExperience(skillName, amount) {
        // Check if skill exists
        if (!this.player.skills[skillName]) {
            console.error(`Skill ${skillName} does not exist`);
            return;
        }
        
        const skill = this.player.skills[skillName];
        skill.experience += amount;
        
        // Check for level up
        while (skill.experience >= skill.maxExperience) {
            this.levelUp(skillName);
        }
        
        // Update UI
        this.updateUI();
        
        // Send update to server
        this.sendUpdateToServer();
        
        return {
            currentExp: skill.experience,
            maxExp: skill.maxExperience,
            level: skill.level
        };
    }
    
    /**
     * Level up a skill
     * @param {string} skillName - Name of the skill to level up
     */
    levelUp(skillName) {
        const skill = this.player.skills[skillName];
        
        // Subtract max experience
        skill.experience -= skill.maxExperience;
        
        // Increase level
        skill.level++;
        
        // Recalculate max experience
        skill.maxExperience = this.calculateMaxExperience(skill.level);
        
        // Show level up message
        this.showSkillLevelUpMessage(skillName, skill.level);
        
        // Send update to server
        this.sendUpdateToServer();
    }
    
    /**
     * Send skills data to server
     */
    sendUpdateToServer() {
        if (window.socket) {
            window.socket.emit('updatePlayerData', {
                skills: this.player.skills
            });
            
            // Also save locally
            if (window.savePlayerDataLocally) {
                window.savePlayerDataLocally();
            }
        }
    }
    
    /**
     * Create UI elements for skills
     */
    createUI() {
        // Create skills window container
        this.skillsWindow = document.createElement('div');
        this.skillsWindow.className = 'skills-window';
        this.skillsWindow.style.position = 'fixed';
        this.skillsWindow.style.left = '20px';
        this.skillsWindow.style.top = '200px';
        this.skillsWindow.style.width = '220px';
        this.skillsWindow.style.maxHeight = '400px';
        this.skillsWindow.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.skillsWindow.style.border = '2px solid rgb(0, 233, 150)';
        this.skillsWindow.style.borderRadius = '10px';
        this.skillsWindow.style.padding = '12px';
        this.skillsWindow.style.overflowY = 'auto';
        this.skillsWindow.style.zIndex = '999';
        this.skillsWindow.style.color = 'white';
        this.skillsWindow.style.fontFamily = 'Arial, sans-serif';
        this.skillsWindow.style.fontSize = '14px';
        this.skillsWindow.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.5)';
        this.skillsWindow.style.display = 'none'; // Hidden by default
        
        // Create header
        const header = document.createElement('div');
        header.className = 'skills-header';
        header.style.textAlign = 'center';
        header.style.marginBottom = '15px';
        header.style.borderBottom = '2px solid rgb(0, 233, 150)';
        header.style.paddingBottom = '8px';
        header.style.fontSize = '18px';
        header.style.fontWeight = 'bold';
        header.style.color = 'rgb(0, 233, 150)';
        header.style.textShadow = '0 0 5px rgba(0, 233, 150, 0.5)';
        header.style.position = 'relative';
        header.style.cursor = 'grab'; // Show grab cursor to indicate draggable
        header.textContent = 'Skills';
        
        // Add drag handle icon
        const dragIcon = document.createElement('div');
        dragIcon.innerHTML = '&#8801;'; // Triple bar icon
        dragIcon.style.position = 'absolute';
        dragIcon.style.left = '5px';
        dragIcon.style.top = '0';
        dragIcon.style.fontSize = '18px';
        dragIcon.style.color = 'rgba(0, 233, 150, 0.7)';
        header.appendChild(dragIcon);
        
        // Add keyboard shortcut indicator
        const shortcutIndicator = document.createElement('div');
        shortcutIndicator.textContent = 'Press K';
        shortcutIndicator.style.position = 'absolute';
        shortcutIndicator.style.right = '30px';
        shortcutIndicator.style.top = '0';
        shortcutIndicator.style.fontSize = '12px';
        shortcutIndicator.style.color = 'rgba(255, 255, 255, 0.7)';
        shortcutIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        shortcutIndicator.style.padding = '2px 5px';
        shortcutIndicator.style.borderRadius = '3px';
        shortcutIndicator.style.border = '1px solid rgba(0, 233, 150, 0.3)';
        header.appendChild(shortcutIndicator);
        
        // Create close button
        const closeButton = document.createElement('span');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '8px';
        closeButton.style.right = '12px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '24px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.color = 'rgb(0, 233, 150)';
        closeButton.style.transition = 'all 0.2s ease';
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.transform = 'scale(1.2)';
            closeButton.style.textShadow = '0 0 8px rgba(0, 233, 150, 0.8)';
        });
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.transform = 'scale(1)';
            closeButton.style.textShadow = 'none';
        });
        closeButton.addEventListener('click', () => this.toggleWindow());
        
        // Create skills container
        this.skillsContainer = document.createElement('div');
        this.skillsContainer.className = 'skills-container';
        
        // Assemble the UI
        this.skillsWindow.appendChild(header);
        this.skillsWindow.appendChild(closeButton);
        this.skillsWindow.appendChild(this.skillsContainer);
        
        // Create toggle button
        this.createToggleButton();
        
        // Add to game panel
        const gamePanel = document.getElementById('gamePanel');
        if (gamePanel) {
            gamePanel.appendChild(this.skillsWindow);
        }
        
        // Update UI with initial values
        this.updateUI();
        
        // Make the window draggable
        this.makeDraggable(header);
        
        // Register K key for toggling the window
        document.addEventListener('keydown', (e) => {
            if (e.key === 'k' || e.key === 'K') {
                // Don't toggle if user is typing in an input field
                if (document.activeElement.tagName === 'INPUT' || 
                    document.activeElement.tagName === 'TEXTAREA') {
                    return;
                }
                this.toggleWindow();
            }
        });
    }
    
    /**
     * Create toggle button for skills window
     */
    createToggleButton() {
        const toggleButton = document.createElement('div');
        toggleButton.className = 'skills-toggle-button';
        toggleButton.style.position = 'fixed';
        toggleButton.style.left = '20px';
        toggleButton.style.top = '170px';
        toggleButton.style.width = '45px';
        toggleButton.style.height = '45px';
        toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        toggleButton.style.border = '2px solid rgb(0, 233, 150)';
        toggleButton.style.borderRadius = '50%';
        toggleButton.style.display = 'flex';
        toggleButton.style.justifyContent = 'center';
        toggleButton.style.alignItems = 'center';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.zIndex = '1000';
        toggleButton.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.3)';
        toggleButton.style.fontSize = '22px';
        toggleButton.style.transition = 'all 0.2s ease';
        toggleButton.textContent = '⛏️';
        toggleButton.title = 'Toggle Skills Window (K)';
        
        // Add label below the button
        const label = document.createElement('div');
        label.textContent = 'Skills';
        label.style.position = 'absolute';
        label.style.bottom = '-20px';
        label.style.left = '0';
        label.style.right = '0';
        label.style.textAlign = 'center';
        label.style.fontSize = '12px';
        label.style.color = 'rgb(0, 233, 150)';
        label.style.fontWeight = 'bold';
        label.style.textShadow = '0 0 3px rgba(0, 0, 0, 0.8)';
        toggleButton.appendChild(label);
        
        // Hover effect
        toggleButton.addEventListener('mouseover', () => {
            toggleButton.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.7)';
            toggleButton.style.transform = 'scale(1.1)';
        });
        
        toggleButton.addEventListener('mouseout', () => {
            toggleButton.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.3)';
            toggleButton.style.transform = 'scale(1)';
        });
        
        // Click handler
        toggleButton.addEventListener('click', () => {
            this.toggleWindow();
        });
        
        // Add to document
        document.body.appendChild(toggleButton);
        this.toggleButton = toggleButton;
    }
    
    /**
     * Toggle skills window visibility
     */
    toggleWindow() {
        if (this.skillsWindow.style.display === 'none') {
            // Show window with animation
            this.skillsWindow.style.display = 'block';
            this.skillsWindow.style.opacity = '0';
            this.skillsWindow.style.transform = 'scale(0.9) translateY(-20px)';
            
            // Add transition for animation
            this.skillsWindow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            // Trigger animation after a small delay (needed for the transition to work)
            setTimeout(() => {
                this.skillsWindow.style.opacity = '1';
                this.skillsWindow.style.transform = 'scale(1) translateY(0)';
            }, 10);
            
            // Add a pulsing glow effect to the border
            this.addPulseEffect();
        } else {
            // Hide window with fade out
            this.skillsWindow.style.opacity = '0';
            this.skillsWindow.style.transform = 'scale(0.9) translateY(-10px)';
            
            // Remove the window after animation completes
            setTimeout(() => {
                this.skillsWindow.style.display = 'none';
                // Reset transform for next time
                this.skillsWindow.style.transform = 'scale(1) translateY(0)';
                // Remove pulse effect
                this.removePulseEffect();
            }, 300);
        }
    }
    
    /**
     * Add pulsing glow effect to the window
     */
    addPulseEffect() {
        // Create a keyframe animation for the border glow
        const styleElement = document.createElement('style');
        styleElement.id = 'skills-pulse-animation';
        styleElement.textContent = `
            @keyframes skillsBorderPulse {
                0% { box-shadow: 0 0 15px rgba(0, 233, 150, 0.5); }
                50% { box-shadow: 0 0 25px rgba(0, 233, 150, 0.8); }
                100% { box-shadow: 0 0 15px rgba(0, 233, 150, 0.5); }
            }
        `;
        document.head.appendChild(styleElement);
        
        // Apply the animation to the window
        this.skillsWindow.style.animation = 'skillsBorderPulse 2s ease-in-out 3';
        
        // Remove the animation after it completes
        setTimeout(() => {
            this.removePulseEffect();
        }, 6000); // 3 pulses at 2 seconds each
    }
    
    /**
     * Remove the pulse effect
     */
    removePulseEffect() {
        this.skillsWindow.style.animation = 'none';
        const styleElement = document.getElementById('skills-pulse-animation');
        if (styleElement) {
            document.head.removeChild(styleElement);
        }
    }
    
    /**
     * Update UI elements
     */
    updateUI() {
        // Clear skills container
        this.skillsContainer.innerHTML = '';
        
        // Add each skill to the container
        for (const skillName in this.player.skills) {
            const skill = this.player.skills[skillName];
            
            // Create skill container
            const skillContainer = document.createElement('div');
            skillContainer.className = 'skill-item';
            skillContainer.style.marginBottom = '15px';
            skillContainer.style.padding = '8px';
            skillContainer.style.borderRadius = '5px';
            skillContainer.style.transition = 'background-color 0.2s ease';
            
            // Add hover effect
            skillContainer.addEventListener('mouseover', () => {
                skillContainer.style.backgroundColor = 'rgba(0, 233, 150, 0.2)';
            });
            
            skillContainer.addEventListener('mouseout', () => {
                skillContainer.style.backgroundColor = 'transparent';
            });
            
            // Create skill header
            const skillHeader = document.createElement('div');
            skillHeader.className = 'skill-header';
            skillHeader.style.display = 'flex';
            skillHeader.style.justifyContent = 'space-between';
            skillHeader.style.marginBottom = '5px';
            
            // Create skill name
            const skillNameElement = document.createElement('div');
            skillNameElement.className = 'skill-name';
            skillNameElement.textContent = this.formatSkillName(skillName);
            skillNameElement.style.fontWeight = 'bold';
            
            // Create skill level
            const skillLevel = document.createElement('div');
            skillLevel.className = 'skill-level';
            skillLevel.textContent = `Lvl ${skill.level}`;
            skillLevel.style.color = 'rgb(0, 233, 150)';
            skillLevel.style.fontWeight = 'bold';
            
            // Create progress bar container
            const progressContainer = document.createElement('div');
            progressContainer.className = 'skill-progress-container';
            progressContainer.style.height = '10px';
            progressContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            progressContainer.style.borderRadius = '5px';
            progressContainer.style.overflow = 'hidden';
            progressContainer.style.border = '1px solid rgba(0, 233, 150, 0.3)';
            
            // Create progress bar
            const progressBar = document.createElement('div');
            progressBar.className = 'skill-progress-bar';
            progressBar.style.height = '100%';
            progressBar.style.width = `${(skill.experience / skill.maxExperience) * 100}%`;
            progressBar.style.backgroundColor = 'rgb(0, 233, 150)';
            progressBar.style.transition = 'width 0.3s ease-out';
            progressBar.style.boxShadow = '0 0 5px rgba(0, 233, 150, 0.5)';
            
            // Create experience text
            const expText = document.createElement('div');
            expText.className = 'skill-exp-text';
            expText.textContent = `${skill.experience}/${skill.maxExperience} XP`;
            expText.style.fontSize = '12px';
            expText.style.marginTop = '5px';
            expText.style.textAlign = 'right';
            expText.style.color = 'rgba(255, 255, 255, 0.7)';
            
            // Assemble skill item
            skillHeader.appendChild(skillNameElement);
            skillHeader.appendChild(skillLevel);
            progressContainer.appendChild(progressBar);
            
            skillContainer.appendChild(skillHeader);
            skillContainer.appendChild(progressContainer);
            skillContainer.appendChild(expText);
            
            // Add to skills container
            this.skillsContainer.appendChild(skillContainer);
        }
    }
    
    /**
     * Format skill name for display
     * @param {string} skillName - Name of the skill
     * @returns {string} - Formatted skill name
     */
    formatSkillName(skillName) {
        return skillName.charAt(0).toUpperCase() + skillName.slice(1);
    }
    
    /**
     * Show skill level up message
     * @param {string} skillName - Name of the skill
     * @param {number} level - New level
     */
    showSkillLevelUpMessage(skillName, level) {
        // Create level up message
        const message = document.createElement('div');
        message.className = 'skill-level-up-message';
        message.textContent = `${this.formatSkillName(skillName)} Level Up! You are now level ${level}`;
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
        message.style.animation = 'skillLevelUpAnimation 2s forwards';
        
        // Add animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes skillLevelUpAnimation {
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
        
        // Add a chat message
        if (window.addChatMessage) {
            window.addChatMessage({
                type: 'system',
                message: `Congratulations! Your ${this.formatSkillName(skillName)} skill has reached level ${level}.`
            });
        }
    }
    
    /**
     * Save window position to localStorage
     */
    saveWindowPosition() {
        if (!this.skillsWindow) return;
        
        const position = {
            left: this.skillsWindow.style.left,
            top: this.skillsWindow.style.top
        };
        
        try {
            localStorage.setItem('skillsWindowPosition', JSON.stringify(position));
            console.log('Skills window position saved:', position);
        } catch (error) {
            console.error('Error saving skills window position:', error);
        }
    }
    
    /**
     * Restore window position from localStorage
     */
    restoreWindowPosition() {
        try {
            const savedPosition = localStorage.getItem('skillsWindowPosition');
            if (savedPosition) {
                const position = JSON.parse(savedPosition);
                this.skillsWindow.style.left = position.left;
                this.skillsWindow.style.top = position.top;
                console.log('Skills window position restored:', position);
            }
        } catch (error) {
            console.error('Error restoring skills window position:', error);
        }
    }
    
    /**
     * Make the skills window draggable
     * @param {HTMLElement} dragHandle - Element that triggers dragging
     */
    makeDraggable(dragHandle) {
        let isDragging = false;
        let offsetX, offsetY;
        
        // Mouse down event - start dragging
        dragHandle.addEventListener('mousedown', (e) => {
            // Only allow left mouse button for dragging
            if (e.button !== 0) return;
            
            // Prevent text selection during drag
            e.preventDefault();
            
            // Change cursor style
            dragHandle.style.cursor = 'grabbing';
            
            // Calculate the offset of the mouse pointer from the window's top-left corner
            const rect = this.skillsWindow.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            isDragging = true;
        });
        
        // Mouse move event - move the window
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // Calculate new position
            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;
            
            // Apply new position
            this.skillsWindow.style.left = `${newLeft}px`;
            this.skillsWindow.style.top = `${newTop}px`;
        });
        
        // Mouse up event - stop dragging
        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            
            isDragging = false;
            dragHandle.style.cursor = 'grab';
            
            // Save the new position
            this.saveWindowPosition();
        });
        
        // Mouse leave event - stop dragging if mouse leaves the window
        document.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                dragHandle.style.cursor = 'grab';
                
                // Save the new position
                this.saveWindowPosition();
            }
        });
        
        // Add a tooltip to indicate draggable
        dragHandle.title = 'Drag to move window';
    }

    /**
     * Get skill information
     * @param {string} skillName - Name of the skill
     * @returns {Object|null} - The skill object or null if not found
     */
    getSkill(skillName) {
        if (!this.player || !this.player.skills || !this.player.skills[skillName]) {
            return null;
        }
        
        return this.player.skills[skillName];
    }
}

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

// Make SkillsManager available globally
window.SkillsManager = SkillsManager;

// Export the skills object as default
export default skills;