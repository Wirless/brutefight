// Player Progression System
// Handles experience, levels, and inventory capacity

class PlayerProgression {
    constructor(player) {
        this.player = player;
        
        // Initialize progression properties if they don't exist
        if (!this.player.level) {
            this.player.level = 1;
        }
        
        if (!this.player.experience) {
            this.player.experience = 0;
        }
        
        if (!this.player.maxExperience) {
            this.player.maxExperience = this.calculateMaxExperience(this.player.level);
        }
        
        if (!this.player.capacity) {
            this.player.capacity = this.calculateCapacity(this.player.level);
        }
        
        if (!this.player.resources) {
            this.player.resources = {
                rocks: 0
            };
        }
        
        // Create UI elements
        this.createUI();
    }
    
    // Calculate max experience needed for level
    calculateMaxExperience(level) {
        return 100 * level;
    }
    
    // Calculate capacity based on level
    calculateCapacity(level) {
        return 100 + (level - 1) * 10;
    }
    
    // Add experience to player
    addExperience(amount) {
        this.player.experience += amount;
        
        // Check for level up
        while (this.player.experience >= this.player.maxExperience) {
            this.levelUp();
        }
        
        // Update UI
        this.updateUI();
        
        return {
            currentExp: this.player.experience,
            maxExp: this.player.maxExperience,
            level: this.player.level
        };
    }
    
    // Level up the player
    levelUp() {
        // Subtract max experience
        this.player.experience -= this.player.maxExperience;
        
        // Increase level
        this.player.level++;
        
        // Recalculate max experience
        this.player.maxExperience = this.calculateMaxExperience(this.player.level);
        
        // Increase capacity
        this.player.capacity = this.calculateCapacity(this.player.level);
        
        // Show level up message
        this.showLevelUpMessage();
    }
    
    // Add resource to player
    addResource(type, amount) {
        // Check if adding would exceed capacity
        const currentUsage = this.getCurrentCapacityUsage();
        
        if (currentUsage + amount > this.player.capacity) {
            // Determine how many can be added
            const canAdd = Math.max(0, this.player.capacity - currentUsage);
            
            if (canAdd > 0) {
                this.player.resources[type] += canAdd;
                this.updateUI();
            }
            
            return {
                added: canAdd,
                remaining: amount - canAdd,
                capacityExceeded: true
            };
        }
        
        // Add the resource
        if (!this.player.resources[type]) {
            this.player.resources[type] = 0;
        }
        
        this.player.resources[type] += amount;
        this.updateUI();
        
        return {
            added: amount,
            remaining: 0,
            capacityExceeded: false
        };
    }
    
    // Remove resource from player
    removeResource(type, amount) {
        if (!this.player.resources[type]) {
            return {
                removed: 0,
                notEnough: true
            };
        }
        
        const actualAmount = Math.min(this.player.resources[type], amount);
        this.player.resources[type] -= actualAmount;
        this.updateUI();
        
        return {
            removed: actualAmount,
            notEnough: actualAmount < amount
        };
    }
    
    // Get current capacity usage
    getCurrentCapacityUsage() {
        let usage = 0;
        
        // Each rock weighs 1
        if (this.player.resources.rocks) {
            usage += this.player.resources.rocks;
        }
        
        // Add other resource weights here in the future
        
        return usage;
    }
    
    // Create UI elements for progression
    createUI() {
        // Create experience bar container
        this.expBarContainer = document.createElement('div');
        this.expBarContainer.className = 'exp-bar-container';
        this.expBarContainer.style.position = 'absolute';
        this.expBarContainer.style.top = '5px';
        this.expBarContainer.style.left = '50%';
        this.expBarContainer.style.transform = 'translateX(-50%)';
        this.expBarContainer.style.width = '50%';
        this.expBarContainer.style.height = '15px';
        this.expBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.expBarContainer.style.border = '2px solid rgb(0, 233, 150)';
        this.expBarContainer.style.borderRadius = '8px';
        this.expBarContainer.style.overflow = 'hidden';
        this.expBarContainer.style.zIndex = '999';
        
        // Create experience bar
        this.expBar = document.createElement('div');
        this.expBar.className = 'exp-bar';
        this.expBar.style.height = '100%';
        this.expBar.style.width = '0%';
        this.expBar.style.backgroundColor = 'rgb(0, 233, 150)';
        this.expBar.style.transition = 'width 0.3s ease-out';
        
        // Create level text
        this.levelText = document.createElement('div');
        this.levelText.className = 'level-text';
        this.levelText.style.position = 'absolute';
        this.levelText.style.top = '0';
        this.levelText.style.left = '0';
        this.levelText.style.right = '0';
        this.levelText.style.bottom = '0';
        this.levelText.style.display = 'flex';
        this.levelText.style.alignItems = 'center';
        this.levelText.style.justifyContent = 'center';
        this.levelText.style.color = 'white';
        this.levelText.style.fontSize = '10px';
        this.levelText.style.fontWeight = 'bold';
        this.levelText.style.textShadow = '1px 1px 1px black';
        
        // Create resources display
        this.resourcesDisplay = document.createElement('div');
        this.resourcesDisplay.className = 'resources-display';
        this.resourcesDisplay.style.position = 'absolute';
        this.resourcesDisplay.style.top = '25px';
        this.resourcesDisplay.style.left = '50%';
        this.resourcesDisplay.style.transform = 'translateX(-50%)';
        this.resourcesDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.resourcesDisplay.style.color = 'white';
        this.resourcesDisplay.style.padding = '5px 10px';
        this.resourcesDisplay.style.borderRadius = '5px';
        this.resourcesDisplay.style.border = '1px solid rgb(0, 233, 150)';
        this.resourcesDisplay.style.fontSize = '12px';
        this.resourcesDisplay.style.display = 'flex';
        this.resourcesDisplay.style.alignItems = 'center';
        this.resourcesDisplay.style.gap = '10px';
        this.resourcesDisplay.style.zIndex = '999';
        
        // Create capacity display
        this.capacityDisplay = document.createElement('div');
        this.capacityDisplay.className = 'capacity-display';
        this.capacityDisplay.style.display = 'flex';
        this.capacityDisplay.style.alignItems = 'center';
        this.capacityDisplay.style.gap = '5px';
        
        // Create capacity icon (backpack)
        this.capacityIcon = document.createElement('span');
        this.capacityIcon.textContent = '🎒';
        this.capacityIcon.style.fontSize = '16px';
        
        // Create capacity text
        this.capacityText = document.createElement('span');
        
        // Create rock display
        this.rockDisplay = document.createElement('div');
        this.rockDisplay.className = 'rock-display';
        this.rockDisplay.style.display = 'flex';
        this.rockDisplay.style.alignItems = 'center';
        this.rockDisplay.style.gap = '5px';
        
        // Create rock icon (rock)
        this.rockIcon = document.createElement('span');
        this.rockIcon.textContent = '🪨';
        this.rockIcon.style.fontSize = '16px';
        
        // Create rock text
        this.rockText = document.createElement('span');
        
        // Assemble the UI
        this.expBarContainer.appendChild(this.expBar);
        this.expBarContainer.appendChild(this.levelText);
        
        this.capacityDisplay.appendChild(this.capacityIcon);
        this.capacityDisplay.appendChild(this.capacityText);
        
        this.rockDisplay.appendChild(this.rockIcon);
        this.rockDisplay.appendChild(this.rockText);
        
        this.resourcesDisplay.appendChild(this.capacityDisplay);
        this.resourcesDisplay.appendChild(this.rockDisplay);
        
        // Add to game panel
        const gamePanel = document.getElementById('gamePanel');
        if (gamePanel) {
            gamePanel.appendChild(this.expBarContainer);
            gamePanel.appendChild(this.resourcesDisplay);
        }
        
        // Update UI with initial values
        this.updateUI();
    }
    
    // Update UI elements
    updateUI() {
        // Update experience bar
        const expPercentage = (this.player.experience / this.player.maxExperience) * 100;
        this.expBar.style.width = `${expPercentage}%`;
        
        // Update level text
        this.levelText.textContent = `Level ${this.player.level} - ${this.player.experience}/${this.player.maxExperience} XP`;
        
        // Update capacity text
        const currentUsage = this.getCurrentCapacityUsage();
        this.capacityText.textContent = `${currentUsage}/${this.player.capacity}`;
        
        // Change color if near capacity
        if (currentUsage / this.player.capacity > 0.8) {
            this.capacityText.style.color = 'orange';
        } else if (currentUsage / this.player.capacity > 0.95) {
            this.capacityText.style.color = 'red';
        } else {
            this.capacityText.style.color = 'white';
        }
        
        // Update rock text
        this.rockText.textContent = this.player.resources.rocks || 0;
    }
    
    // Show level up message
    showLevelUpMessage() {
        // Create level up message
        const message = document.createElement('div');
        message.className = 'level-up-message';
        message.textContent = `LEVEL UP! You are now level ${this.player.level}`;
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
        
        // Add a chat message
        if (window.addChatMessage) {
            window.addChatMessage({
                type: 'system',
                message: `Congratulations! You have reached level ${this.player.level}.`
            });
        }
    }
}

// Make it available globally
window.PlayerProgression = PlayerProgression; 