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
        
        // Synchronize resources from inventory after a short delay to ensure inventory is loaded
        setTimeout(() => {
            this.syncResourcesFromInventory();
            
            // Calculate total weight including bags
            this.calculateTotalWeight();
        }, 500);
    }
    
    // Calculate max experience needed for level
    calculateMaxExperience(level) {
        return 100 * level;
    }
    
    // Calculate capacity based on level
    calculateCapacity(level) {
        return 100 + (level - 1) * 10;
    }
    
    // Calculate total weight of all items in inventory and bags
    calculateTotalWeight() {
        let totalWeight = 0;
        
        // Count resources
        if (this.player.resources) {
            // Each rock weighs 1
            if (this.player.resources.rocks) {
                totalWeight += this.player.resources.rocks;
            }
            
            // Add other resource weights here in the future
        }
        
        // Count items in inventory
        if (window.playerInventory) {
            for (let i = 0; i < window.playerInventory.size; i++) {
                const item = window.playerInventory.getItem(i);
                if (item) {
                    // Add weight based on item type
                    if (item.type === 'resource') {
                        // Resources in inventory are already counted in resources
                        // No need to count them again
                    } else if (item.weight) {
                        // If item has a defined weight, use it
                        totalWeight += item.weight;
                    } else {
                        // Default weights by type
                        if (item.type === 'tool' || item.type === 'weapon') {
                            totalWeight += 5;
                        } else if (item.type === 'armor') {
                            totalWeight += 10;
                        } else {
                            totalWeight += 1; // Default weight for other items
                        }
                    }
                }
            }
        }
        
        // Count items in equipped bags
        if (window.equipmentManager && window.equipmentManager.slots) {
            const backpackSlot = window.equipmentManager.slots[EQUIPMENT_SLOTS.BACKPACK];
            if (backpackSlot && backpackSlot.type === 'bag') {
                // Add weight of the bag itself
                totalWeight += backpackSlot.weight || 2;
                
                // Add weight of items in the bag
                if (backpackSlot.contents) {
                    for (let i = 0; i < backpackSlot.contents.length; i++) {
                        const item = backpackSlot.contents[i];
                        if (item) {
                            // Add weight based on item type
                            if (item.type === 'resource' && item.count) {
                                totalWeight += item.count;
                            } else if (item.weight) {
                                totalWeight += item.weight;
                            } else {
                                // Default weights by type
                                if (item.type === 'tool' || item.type === 'weapon') {
                                    totalWeight += 5;
                                } else if (item.type === 'armor') {
                                    totalWeight += 10;
                                } else {
                                    totalWeight += 1; // Default weight for other items
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`Total weight calculated: ${totalWeight}/${this.player.capacity}`);
        
        // Update UI
        this.updateUI();
        
        return totalWeight;
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
        
        // Send update to server
        this.sendUpdateToServer();
        
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
        
        // Send update to server
        this.sendUpdateToServer();
    }
    
    // Send player progression data to server
    sendUpdateToServer() {
        if (window.socket) {
            // Prepare data to send
            const updateData = {
                experience: this.player.experience,
                level: this.player.level,
                maxExperience: this.player.maxExperience,
                capacity: this.player.capacity,
                resources: this.player.resources,
                // Include inventory and equipped items if they exist
                inventory: window.playerInventory ? window.playerInventory.items : undefined,
                equipped: window.equipmentManager ? window.equipmentManager.equipped : undefined
            };
            
            // Add bag contents if a bag is equipped
            if (window.equipmentManager && window.equipmentManager.slots) {
                const backpackSlot = window.equipmentManager.slots[EQUIPMENT_SLOTS.BACKPACK];
                if (backpackSlot && backpackSlot.type === 'bag') {
                    updateData.bagContents = backpackSlot.contents;
                    updateData.bagId = backpackSlot.id;
                    updateData.bagSlots = backpackSlot.slots;
                }
            }
            
            // Send update to server
            window.socket.emit('updatePlayerData', updateData);
            
            // Also save locally
            if (window.savePlayerDataLocally) {
                window.savePlayerDataLocally();
            }
        }
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
                
                // Try to add to inventory if it exists
                this.addResourceToInventory(type, canAdd);
                
                // Send update to server immediately
                this.sendUpdateToServer();
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
        
        // Try to add to inventory if it exists
        this.addResourceToInventory(type, amount);
        
        // Send update to server immediately
        this.sendUpdateToServer();
        
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
        
        // Send update to server immediately
        this.sendUpdateToServer();
        
        return {
            removed: actualAmount,
            notEnough: actualAmount < amount
        };
    }
    
    // Synchronize resources count from inventory
    syncResourcesFromInventory() {
        // Check if inventory exists
        if (!window.playerInventory) return;
        
        console.log('Synchronizing resources from inventory...');
        
        // Reset resource counts
        this.player.resources = {
            rocks: 0
        };
        
        // Count resources in inventory
        for (let i = 0; i < window.playerInventory.size; i++) {
            const item = window.playerInventory.getItem(i);
            if (item && item.type === 'resource') {
                const resourceType = item.name.toLowerCase();
                
                // Initialize resource type if it doesn't exist
                if (!this.player.resources[resourceType]) {
                    this.player.resources[resourceType] = 0;
                }
                
                // Add item count to resource count
                this.player.resources[resourceType] += item.count || 1;
                
                console.log(`Found ${item.count || 1} ${resourceType} in inventory slot ${i}`);
            }
        }
        
        console.log('Resources after sync:', this.player.resources);
        
        // Update UI
        this.updateUI();
        
        // Send update to server
        this.sendUpdateToServer();
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
        
        // Add capacity elements to display
        this.capacityDisplay.appendChild(this.capacityIcon);
        this.capacityDisplay.appendChild(this.capacityText);
        
        // Add capacity display to resources display
        this.resourcesDisplay.appendChild(this.capacityDisplay);
        
        // Assemble the UI
        this.expBarContainer.appendChild(this.expBar);
        this.expBarContainer.appendChild(this.levelText);
        
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
    
    // Add resource to inventory
    addResourceToInventory(type, amount) {
        // Check if inventory exists
        if (!window.playerInventory) return;
        
        console.log(`Adding ${amount} ${type} to inventory`);
        
        // Find resource definition
        let resourceItem = null;
        
        // Try to find existing stack of this resource type in inventory
        for (let i = 0; i < window.playerInventory.size; i++) {
            const item = window.playerInventory.getItem(i);
            if (item && item.type === 'resource' && item.name.toLowerCase() === type) {
                // Found existing stack
                if (item.count < item.maxStack) {
                    // Can add to this stack
                    const addAmount = Math.min(amount, item.maxStack - item.count);
                    item.count += addAmount;
                    window.playerInventory.setItem(i, item);
                    amount -= addAmount;
                    
                    console.log(`Added ${addAmount} ${type} to existing stack, ${amount} remaining`);
                    
                    if (amount <= 0) {
                        // Save inventory state after modification
                        if (window.myPlayer && window.playerInventory) {
                            window.myPlayer.inventory = window.playerInventory.items;
                        }
                        return; // All added
                    }
                }
            }
        }
        
        // If we still have resources to add, create new stacks
        while (amount > 0) {
            // Find resource definition in items.json if we don't have it yet
            if (!resourceItem) {
                // Find the resource definition
                const resourceDef = window.items ? window.items.find(i => 
                    i.type === 'resource' && i.name.toLowerCase() === type
                ) : null;
                
                if (!resourceDef) {
                    // Create a generic resource item
                    resourceItem = {
                        name: type.charAt(0).toUpperCase() + type.slice(1),
                        description: `${type} resource`,
                        type: 'resource',
                        stackable: true,
                        maxStack: 100,
                        color: '#A9A9A9',
                        icon: 'rock-svg',
                        rarity: 'common',
                        isResource: true
                    };
                } else {
                    resourceItem = { ...resourceDef };
                }
            }
            
            // Create a new stack
            const newStack = { ...resourceItem };
            newStack.count = Math.min(amount, newStack.maxStack || 100);
            
            // Add to inventory
            const slotIndex = window.playerInventory.addItem(newStack);
            if (slotIndex === -1) {
                // Inventory is full
                console.log(`Inventory full, couldn't add ${amount} remaining ${type}`);
                break;
            }
            
            console.log(`Created new stack of ${newStack.count} ${type} in slot ${slotIndex}`);
            amount -= newStack.count;
        }
        
        // Save inventory state after modification
        if (window.myPlayer && window.playerInventory) {
            window.myPlayer.inventory = window.playerInventory.items;
        }
    }
}

// Make it available globally
window.PlayerProgression = PlayerProgression; 