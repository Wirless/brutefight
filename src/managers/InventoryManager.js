/**
 * InventoryManager.js
 * 
 * Manages the player's inventory system including items,
 * inventory slots, and the inventory UI.
 */
class InventoryManager {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        
        // Initialize inventory with 16 slots
        this.inventory = new window.Equipment.Inventory(16);
        
        // Create inventory UI using our new component
        this.ui = new window.InventoryUI(game, {
            container: document.body,
            title: 'Inventory',
            columns: 4,
            rows: 4,
            slotSize: 50,
            draggable: true,
            defaultPosition: { x: 20, y: 80 }
        });
        
        // Initialize the UI with our inventory
        this.ui.init(this.inventory);
        
        // Register global access for backward compatibility
        window.playerInventory = this.inventory;
        window.playerInventoryUI = this.ui;
    }
    
    /**
     * Initialize the inventory system
     * @returns {InventoryManager} - This instance for chaining
     */
    init() {
        // If the player has saved inventory data, load it
        this.loadSavedInventory();
        
        return this;
    }
    
    /**
     * Load saved inventory data if it exists
     */
    loadSavedInventory() {
        const myPlayer = this.game.myPlayer;
        
        if (myPlayer && myPlayer.inventory && myPlayer.inventory.length > 0) {
            console.log("Loading saved inventory with", myPlayer.inventory.length, "items");
            
            // Load saved inventory items
            myPlayer.inventory.forEach((item, index) => {
                if (item) {
                    this.inventory.setItem(index, item);
                }
            });
            
            // Update UI after loading items
            this.ui.updateAllSlots();
        } else {
            console.log("No saved inventory found, adding example items");
            
            // Add some example items to inventory for new players
            if (window.Equipment && window.Equipment.EQUIPMENT_EXAMPLES) {
                // ideally starting items is nothing and fists player hits in front of him to break blocks of various materials for now only rocks implemented
                this.inventory.addItem(window.Equipment.EQUIPMENT_EXAMPLES.woodenPickaxe);
                this.inventory.addItem(window.Equipment.EQUIPMENT_EXAMPLES.stonePickaxe);
                this.inventory.addItem(window.Equipment.EQUIPMENT_EXAMPLES.ironPickaxe);
                this.inventory.addItem(window.Equipment.EQUIPMENT_EXAMPLES.woodenAxe);
                this.inventory.addItem(window.Equipment.EQUIPMENT_EXAMPLES.smallBag);
            }
        }
    }
    
    /**
     * Add an item to the inventory
     * @param {Object} item - The item to add
     * @returns {boolean} - Whether the item was added successfully
     */
    addItem(item) {
        return this.inventory.addItem(item);
    }
    
    /**
     * Remove an item from the inventory
     * @param {number} slotIndex - The slot index to remove from
     * @returns {Object|null} - The removed item or null
     */
    removeItem(slotIndex) {
        return this.inventory.removeItem(slotIndex);
    }
    
    /**
     * Get an item from the inventory
     * @param {number} slotIndex - The slot index to get from
     * @returns {Object|null} - The item or null
     */
    getItem(slotIndex) {
        return this.inventory.getItem(slotIndex);
    }
    
    /**
     * Set an item in a specific inventory slot
     * @param {number} slotIndex - The slot index to set
     * @param {Object} item - The item to set
     */
    setItem(slotIndex, item) {
        this.inventory.setItem(slotIndex, item);
    }
    
    /**
     * Check if the inventory has an item of a specific type
     * @param {string} itemType - The type of item to check for
     * @returns {boolean} - Whether the inventory has the item
     */
    hasItemOfType(itemType) {
        for (let i = 0; i < this.inventory.items.length; i++) {
            const item = this.inventory.items[i];
            if (item && item.type === itemType) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Find an item in the inventory by its type
     * @param {string} itemType - The type of item to find
     * @returns {Object|null} - The found item or null
     */
    findItemByType(itemType) {
        for (let i = 0; i < this.inventory.items.length; i++) {
            const item = this.inventory.items[i];
            if (item && item.type === itemType) {
                return {
                    item: item,
                    slotIndex: i
                };
            }
        }
        return null;
    }
    
    /**
     * Count how many items of a specific type are in the inventory
     * @param {string} itemType - The type of item to count
     * @returns {number} - The count of items
     */
    countItemsByType(itemType) {
        let count = 0;
        for (let i = 0; i < this.inventory.items.length; i++) {
            const item = this.inventory.items[i];
            if (item && item.type === itemType) {
                count += item.count || 1;
            }
        }
        return count;
    }
    
    /**
     * Toggle the visibility of the inventory UI
     */
    toggleInventory() {
        this.ui.toggle();
    }
    
    /**
     * Update a specific inventory slot in the UI
     * @param {number} slotIndex - The slot index to update
     */
    updateSlot(slotIndex) {
        this.ui.updateSlot(slotIndex);
    }
    
    /**
     * Update all inventory slots in the UI
     */
    updateAllSlots() {
        this.ui.updateAllSlots();
    }
    
    /**
     * Connect the inventory to the equipment manager
     * @param {Object} equipmentManager - The equipment manager instance
     */
    connectToEquipmentManager(equipmentManager) {
        if (equipmentManager) {
            equipmentManager.setInventory(this.inventory);
        }
    }
    
    /**
     * Save inventory data to the player object
     */
    saveInventoryData() {
        if (this.game.myPlayer) {
            this.game.myPlayer.inventory = this.inventory.items;
        }
    }
    
    /**
     * Create a tooltip for an item
     * @param {Object} item - The item to create a tooltip for
     * @returns {HTMLElement} - The tooltip element
     */
    createItemTooltip(item) {
        // Clear any existing tooltips
        window.clearAllTooltips();
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'item-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.border = `2px solid ${item.getRarityColor()}`;
        tooltip.style.borderRadius = '5px';
        tooltip.style.padding = '10px';
        tooltip.style.color = 'white';
        tooltip.style.zIndex = '1000';
        tooltip.style.width = '200px';
        tooltip.style.pointerEvents = 'none';
        
        // Item name with rarity color
        const itemName = document.createElement('div');
        itemName.className = 'item-name';
        itemName.textContent = item.name;
        itemName.style.color = item.getRarityColor();
        itemName.style.fontWeight = 'bold';
        itemName.style.fontSize = '16px';
        itemName.style.marginBottom = '5px';
        tooltip.appendChild(itemName);
        
        // Item type
        if (item.type) {
            const itemType = document.createElement('div');
            itemType.className = 'item-type';
            itemType.textContent = item.type;
            itemType.style.color = '#aaa';
            itemType.style.fontSize = '12px';
            itemType.style.marginBottom = '5px';
            tooltip.appendChild(itemType);
        }
        
        // Item description
        if (item.description) {
            const itemDesc = document.createElement('div');
            itemDesc.className = 'item-description';
            itemDesc.textContent = item.description;
            itemDesc.style.fontSize = '14px';
            itemDesc.style.marginBottom = '10px';
            tooltip.appendChild(itemDesc);
        }
        
        // Item stats
        if (item.stats) {
            const statsDiv = document.createElement('div');
            statsDiv.className = 'item-stats';
            statsDiv.style.borderTop = '1px solid #555';
            statsDiv.style.paddingTop = '5px';
            statsDiv.style.marginBottom = '5px';
            
            for (const statName in item.stats) {
                const stat = document.createElement('div');
                stat.className = 'item-stat';
                stat.textContent = `${statName}: ${item.stats[statName]}`;
                stat.style.color = '#8aff8a';
                statsDiv.appendChild(stat);
            }
            
            tooltip.appendChild(statsDiv);
        }
        
        // Item requirements
        if (item.requirements) {
            const reqDiv = document.createElement('div');
            reqDiv.className = 'item-requirements';
            reqDiv.style.borderTop = '1px solid #555';
            reqDiv.style.paddingTop = '5px';
            
            const reqTitle = document.createElement('div');
            reqTitle.textContent = 'Requirements:';
            reqTitle.style.marginBottom = '3px';
            reqDiv.appendChild(reqTitle);
            
            for (const reqName in item.requirements) {
                const req = document.createElement('div');
                req.className = 'item-requirement';
                req.textContent = `${reqName}: ${item.requirements[reqName]}`;
                
                // Check if requirement is met
                let isMet = true;
                if (this.game.myPlayer && 
                    this.game.myPlayer[reqName.toLowerCase()] < item.requirements[reqName]) {
                    isMet = false;
                    req.style.color = '#ff8a8a';
                } else {
                    req.style.color = '#8aff8a';
                }
                
                reqDiv.appendChild(req);
            }
            
            tooltip.appendChild(reqDiv);
        }
        
        document.body.appendChild(tooltip);
        return tooltip;
    }
    
    /**
     * Position a tooltip next to an element
     * @param {HTMLElement} tooltip - The tooltip element
     * @param {HTMLElement} targetElement - The element to position next to
     */
    positionTooltip(tooltip, targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Position tooltip to the right of the target by default
        let left = rect.right + 10;
        let top = rect.top;
        
        // Check if tooltip would go off-screen to the right
        if (left + tooltipRect.width > window.innerWidth) {
            // Position to the left of target instead
            left = rect.left - tooltipRect.width - 10;
        }
        
        // Check if tooltip would go off-screen at the bottom
        if (top + tooltipRect.height > window.innerHeight) {
            // Position to the top of target instead
            top = window.innerHeight - tooltipRect.height - 10;
        }
        
        // Ensure tooltip doesn't go off-screen to the left
        if (left < 0) {
            left = 10;
        }
        
        // Ensure tooltip doesn't go off-screen at the top
        if (top < 0) {
            top = 10;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }
    
    /**
     * Clear all tooltips from the document
     */
    clearAllTooltips() {
        const tooltips = document.querySelectorAll('.item-tooltip');
        tooltips.forEach(tooltip => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });
    }
}

// Make the InventoryManager class globally available
window.InventoryManager = InventoryManager; 