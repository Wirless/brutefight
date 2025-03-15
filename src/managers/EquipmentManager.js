/**
 * EquipmentManager.js
 * 
 * Manages player equipment including equipping/unequipping items,
 * handling equipment effects, and managing quick slots.
 */
import { EquipmentUI } from '../ui';

class EquipmentManager {
    /**
     * @param {Game} game - The main game instance
     */
    constructor(game) {
        this.game = game;
        this.player = game.myPlayer;
        
        // Equipment slots
        this.slots = {
            head: null,
            body: null,
            legs: null,
            feet: null,
            hands: null,
            pickaxe: null,
            axe: null,
            offhand: null,
            bag: null,
            accessory1: null,
            accessory2: null
        };
        
        // Quick slots for hotkey access (0-9)
        this.quickSlots = {
            '0': null,
            '1': null,
            '2': null,
            '3': null,
            '4': null,
            '5': null,
            '6': null,
            '7': null,
            '8': null,
            '9': null
        };
        
        // Track equipped items for serialization
        this.equipped = {};
        
        // Current active quick slot
        this.activeQuickSlot = '1';
        
        // Reference to inventory
        this.inventory = null;
        
        // Create equipment UI if the class is available
        try {
            // First try to use the imported EquipmentUI if available
            const UIClass = window.EquipmentUI || EquipmentUI;
            this.ui = new UIClass(this, {
                showQuickbar: true,
                showCompactDisplay: true
            });
        } catch (error) {
            console.error("Error creating EquipmentUI:", error);
            this.ui = null;
        }
        
        // Register for global access
        window.equipmentManager = this;
    }
    
    /**
     * Set the UI reference manually if needed
     * @param {EquipmentUI} ui - The UI instance to use
     */
    setUI(ui) {
        this.ui = ui;
    }
    
    /**
     * Initialize the equipment manager
     * @returns {EquipmentManager} - This instance for chaining
     */
    init() {
        // If player has saved equipment data, load it
        this.loadSavedEquipment();
        
        return this;
    }
    
    /**
     * Load saved equipment data if it exists
     */
    loadSavedEquipment() {
        if (this.player && this.player.equipped) {
            console.log("Loading saved equipment:", this.player.equipped);
            
            // Copy saved equipped items
            this.equipped = this.player.equipped;
            
            // Load items into slots
            for (const slotName in this.equipped) {
                if (this.slots.hasOwnProperty(slotName)) {
                    this.slots[slotName] = this.equipped[slotName];
                } else if (this.quickSlots.hasOwnProperty(slotName)) {
                    this.quickSlots[slotName] = this.equipped[slotName];
                }
            }
            
            // Update UI
            if (this.ui && this.ui.updateAllSlots) {
                this.ui.updateAllSlots();
            }
        }
    }
    
    /**
     * Set the inventory reference
     * @param {Inventory} inventory - The inventory instance
     */
    setInventory(inventory) {
        this.inventory = inventory;
    }
    
    /**
     * Get a bag by its ID
     * @param {string} bagId - The ID of the bag
     * @returns {BagItem|null} - The bag or null if not found
     */
    getBagById(bagId) {
        // Check equipped bag
        if (this.slots.bag && this.slots.bag.id === bagId) {
            return this.slots.bag;
        }
        
        // Check inventory for bags
        if (this.inventory) {
            for (const item of this.inventory.items) {
                if (item && item.type === 'bag' && item.id === bagId) {
                    return item;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Equip an item to a slot
     * @param {EquipmentItem} item - The item to equip
     * @param {string} slotName - The slot to equip to
     * @returns {boolean} - Whether the equip was successful
     */
    equipItem(item, slotName) {
        // Check if the slot exists
        if (!this.slots.hasOwnProperty(slotName)) {
            console.error(`Invalid equipment slot: ${slotName}`);
            return false;
        }
        
        // Check if the item can be equipped to this slot
        if (!this.canEquip(item, slotName)) {
            console.error(`Item ${item.name} cannot be equipped to ${slotName}`);
            return false;
        }
        
        // Check if the player meets requirements
        if (!item.canBeEquippedBy(this.player)) {
            this.ui.showErrorMessage(`You don't meet the requirements for ${item.name}`);
            return false;
        }
        
        // Unequip current item if any
        const currentItem = this.slots[slotName];
        if (currentItem) {
            this.unequipItem(slotName);
        }
        
        // Equip the new item
        this.slots[slotName] = item;
        
        // Update the equipped items tracking
        this.equipped[slotName] = item;
        
        // Apply equipment effects
        item.applyEffects(this.player);
        
        // Update UI
        if (this.ui) {
            this.ui.updateSlot(slotName, false);
        }
        
        // Add equip message to chat
        this.game.chatManager.addMessage({
            type: 'system',
            message: `${this.game.username} equipped ${item.name}.`
        });
        
        return true;
    }
    
    /**
     * Unequip an item from a slot
     * @param {string} slotName - The slot to unequip from
     * @returns {EquipmentItem|null} - The unequipped item or null
     */
    unequipItem(slotName) {
        // Check if the slot exists
        if (!this.slots.hasOwnProperty(slotName)) {
            console.error(`Invalid equipment slot: ${slotName}`);
            return null;
        }
        
        // Get the current item
        const item = this.slots[slotName];
        if (!item) {
            return null;
        }
        
        // Check if inventory has space
        if (this.inventory && !this.inventory.addItem(item)) {
            this.ui.showErrorMessage("Inventory is full");
            return null;
        }
        
        // Remove equipment effects
        if (item.removeEffects) {
            item.removeEffects(this.player);
        }
        
        // Clear the slot
        this.slots[slotName] = null;
        
        // Update the equipped items tracking
        delete this.equipped[slotName];
        
        // Update UI
        if (this.ui) {
            this.ui.updateSlot(slotName, false);
        }
        
        // Add unequip message to chat
        this.game.chatManager.addMessage({
            type: 'system',
            message: `${this.game.username} unequipped ${item.name}.`
        });
        
        return item;
    }
    
    /**
     * Set the active quick slot
     * @param {string} key - The quick slot key (0-9)
     */
    setActiveQuickSlot(key) {
        if (this.quickSlots.hasOwnProperty(key)) {
            this.activeQuickSlot = key;
            
            // Update UI
            if (this.ui && this.ui.updateActiveQuickSlot) {
                this.ui.updateActiveQuickSlot();
            }
            
            // Show selected tool in debug info
            const selectedTool = this.getActiveQuickSlotItem();
            if (selectedTool) {
                console.log(`Selected tool: ${selectedTool.name}`);
            }
        }
    }
    
    /**
     * Get the item in the active quick slot
     * @returns {EquipmentItem|null} - The active quick slot item
     */
    getActiveQuickSlotItem() {
        return this.quickSlots[this.activeQuickSlot];
    }
    
    /**
     * Handle hotkey press for quick slots
     * @param {string} key - The key pressed (0-9)
     */
    handleHotkey(key) {
        if (this.quickSlots.hasOwnProperty(key)) {
            this.setActiveQuickSlot(key);
            
            // Set selected tool for global access
            window.selectedTool = this.getActiveQuickSlotItem();
        }
    }
    
    /**
     * Toggle equipment panel visibility
     */
    toggleEquipmentPanel() {
        if (this.ui) {
            this.ui.toggleEquipmentPanel();
        }
    }
    
    /**
     * Check if an item can be equipped to a slot
     * @param {EquipmentItem} item - The item to check
     * @param {string} slotName - The slot to check
     * @returns {boolean} - Whether the item can be equipped
     */
    canEquip(item, slotName) {
        // Check if the slot exists
        if (!this.slots.hasOwnProperty(slotName)) {
            return false;
        }
        
        // Special case for bags
        if (slotName === 'bag' && item.type !== 'bag') {
            return false;
        }
        
        // Check item type against slot name
        switch (slotName) {
            case 'head':
                return item.type === 'helmet' || item.type === 'hat';
            case 'body':
                return item.type === 'chest' || item.type === 'armor';
            case 'legs':
                return item.type === 'pants' || item.type === 'leggings';
            case 'feet':
                return item.type === 'boots' || item.type === 'shoes';
            case 'hands':
                return item.type === 'gloves' || item.type === 'gauntlets';
            case 'pickaxe':
                return item.type === 'pickaxe' || item.type === 'tool';
            case 'axe':
                return item.type === 'axe' || item.type === 'tool';
            case 'offhand':
                return item.type === 'shield' || item.type === 'offhand';
            case 'bag':
                return item.type === 'bag' || item.type === 'container';
            case 'accessory1':
            case 'accessory2':
                return item.type === 'accessory' || item.type === 'ring' || item.type === 'amulet';
            default:
                return false;
        }
    }
    
    /**
     * Equip an item from inventory
     * @param {number} inventorySlotIndex - The inventory slot index
     * @returns {boolean} - Whether the equip was successful
     */
    equipFromInventory(inventorySlotIndex) {
        if (!this.inventory) {
            console.error("No inventory set");
            return false;
        }
        
        // Get the item from inventory
        const item = this.inventory.getItem(inventorySlotIndex);
        if (!item) {
            return false;
        }
        
        // Determine the appropriate slot
        let targetSlot = null;
        
        switch (item.type) {
            case 'helmet':
            case 'hat':
                targetSlot = 'head';
                break;
            case 'chest':
            case 'armor':
                targetSlot = 'body';
                break;
            case 'pants':
            case 'leggings':
                targetSlot = 'legs';
                break;
            case 'boots':
            case 'shoes':
                targetSlot = 'feet';
                break;
            case 'gloves':
            case 'gauntlets':
                targetSlot = 'hands';
                break;
            case 'pickaxe':
                targetSlot = 'pickaxe';
                break;
            case 'axe':
                targetSlot = 'axe';
                break;
            case 'shield':
            case 'offhand':
                targetSlot = 'offhand';
                break;
            case 'bag':
            case 'container':
                targetSlot = 'bag';
                break;
            case 'accessory':
            case 'ring':
            case 'amulet':
                // Check which accessory slot is available
                if (!this.slots.accessory1) {
                    targetSlot = 'accessory1';
                } else if (!this.slots.accessory2) {
                    targetSlot = 'accessory2';
                } else {
                    // Both slots are full, use the first one
                    targetSlot = 'accessory1';
                }
                break;
            default:
                // For other items, try to assign to a quick slot
                for (const key in this.quickSlots) {
                    if (!this.quickSlots[key]) {
                        targetSlot = key;
                        break;
                    }
                }
        }
        
        if (!targetSlot) {
            this.ui.showErrorMessage("No suitable equipment slot available");
            return false;
        }
        
        // If it's a quick slot, handle differently
        if (targetSlot in this.quickSlots) {
            // Remove from inventory
            const removedItem = this.inventory.removeItem(inventorySlotIndex);
            if (!removedItem) {
                return false;
            }
            
            // If there's already an item in the quick slot, put it back in inventory
            if (this.quickSlots[targetSlot]) {
                this.inventory.addItem(this.quickSlots[targetSlot]);
            }
            
            // Add to quick slot
            this.quickSlots[targetSlot] = removedItem;
            
            // Update equipped tracking
            this.equipped[targetSlot] = removedItem;
            
            // Update UI
            if (this.ui) {
                this.ui.updateSlot(targetSlot, true);
            }
            
            return true;
        } else {
            // For equipment slots, equip the item
            // First remove from inventory
            const removedItem = this.inventory.removeItem(inventorySlotIndex);
            if (!removedItem) {
                return false;
            }
            
            // Try to equip
            if (this.equipItem(removedItem, targetSlot)) {
                return true;
            } else {
                // If equip fails, put the item back in inventory
                this.inventory.addItem(removedItem);
                return false;
            }
        }
    }
    
    /**
     * Save equipment data to the player object
     */
    saveEquipmentData() {
        if (this.player) {
            this.player.equipped = this.equipped;
        }
    }
}

// Make the EquipmentManager class globally available for backward compatibility
window.EquipmentManager = EquipmentManager;

// Add default export
export default EquipmentManager; 