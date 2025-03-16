/**
 * Inventory.js
 * 
 * Manages inventory slots and item storage
 */

/**
 * Represents a player inventory with a specific number of slots
 */
class Inventory {
    /**
     * Create a new inventory
     * @param {number} size - Number of inventory slots
     */
    constructor(size = 16) {
        this.size = size;
        this.items = new Array(size).fill(null);
        this.ui = null;
        this.onChanged = null; // Callback for when inventory changes
    }

    /**
     * Add an item to the first available slot
     * @param {Object} item - The item to add
     * @returns {number} - The slot index where the item was added, or -1 if inventory is full
     */
    addItem(item) {
        // Find the first empty slot
        for (let i = 0; i < this.size; i++) {
            if (!this.items[i]) {
                this.items[i] = item;
                this.notifyChange(i);
                return i;
            }
        }
        
        // Try to stack items if they are stackable
        if (item.stackable) {
            for (let i = 0; i < this.size; i++) {
                const existingItem = this.items[i];
                if (existingItem && existingItem.id === item.id && existingItem.stackable) {
                    // Stack with existing item
                    existingItem.count = (existingItem.count || 1) + (item.count || 1);
                    this.notifyChange(i);
                    return i;
                }
            }
        }
        
        // Inventory is full
        return -1;
    }

    /**
     * Remove an item from a specific slot
     * @param {number} slotIndex - The slot index to remove from
     * @returns {Object|null} - The removed item or null
     */
    removeItem(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.size) {
            const item = this.items[slotIndex];
            this.items[slotIndex] = null;
            this.notifyChange(slotIndex);
            return item;
        }
        return null;
    }

    /**
     * Get an item without removing it
     * @param {number} slotIndex - The slot index to get
     * @returns {Object|null} - The item or null
     */
    getItem(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.size) {
            return this.items[slotIndex];
        }
        return null;
    }

    /**
     * Set an item in a specific slot
     * @param {number} slotIndex - The slot index to set
     * @param {Object} item - The item to set
     * @returns {boolean} - Whether the item was set successfully
     */
    setItem(slotIndex, item) {
        if (slotIndex >= 0 && slotIndex < this.size) {
            this.items[slotIndex] = item;
            this.notifyChange(slotIndex);
            return true;
        }
        return false;
    }

    /**
     * Check if inventory contains an item of specific type
     * @param {string} itemType - The item type to check for
     * @returns {boolean} - Whether the inventory has an item of the specified type
     */
    hasItemOfType(itemType) {
        for (let i = 0; i < this.size; i++) {
            const item = this.items[i];
            if (item && item.type === itemType) {
                return true;
            }
        }
        return false;
    }

    /**
     * Find all slots containing items of a specific type
     * @param {string} itemType - The item type to find
     * @returns {Array} - Array of objects with item and slotIndex
     */
    findItemsByType(itemType) {
        const result = [];
        for (let i = 0; i < this.size; i++) {
            const item = this.items[i];
            if (item && item.type === itemType) {
                result.push({
                    item: item,
                    slotIndex: i
                });
            }
        }
        return result;
    }

    /**
     * Count how many items of a specific type are in the inventory
     * @param {string} itemType - The type of item to count
     * @returns {number} - The count of items
     */
    countItemsByType(itemType) {
        let count = 0;
        for (let i = 0; i < this.size; i++) {
            const item = this.items[i];
            if (item && item.type === itemType) {
                count += item.count || 1;
            }
        }
        return count;
    }

    /**
     * Move an item from one slot to another
     * @param {number} fromSlot - Source slot index
     * @param {number} toSlot - Destination slot index
     * @returns {boolean} - Whether the move was successful
     */
    moveItem(fromSlot, toSlot) {
        if (
            fromSlot >= 0 && 
            fromSlot < this.size && 
            toSlot >= 0 && 
            toSlot < this.size &&
            fromSlot !== toSlot
        ) {
            // Get items in both slots
            const sourceItem = this.items[fromSlot];
            const destItem = this.items[toSlot];
            
            // If source slot is empty, nothing to move
            if (!sourceItem) return false;
            
            // If destination slot is empty, simple move
            if (!destItem) {
                this.items[toSlot] = sourceItem;
                this.items[fromSlot] = null;
                this.notifyChange(fromSlot, toSlot);
                return true;
            }
            
            // If both slots have stackable items of the same type
            if (
                sourceItem.stackable && 
                destItem.stackable && 
                sourceItem.id === destItem.id
            ) {
                // Stack items
                destItem.count = (destItem.count || 1) + (sourceItem.count || 1);
                this.items[fromSlot] = null;
                this.notifyChange(fromSlot, toSlot);
                return true;
            }
            
            // Swap items
            this.items[fromSlot] = destItem;
            this.items[toSlot] = sourceItem;
            this.notifyChange(fromSlot, toSlot);
            return true;
        }
        return false;
    }

    /**
     * Notify that the inventory changed
     * @param {...number} slotIndices - Slot indices that were changed
     */
    notifyChange(...slotIndices) {
        // Update the UI if one exists
        if (this.ui && this.ui.updateSlot) {
            for (const slotIndex of slotIndices) {
                this.ui.updateSlot(slotIndex);
            }
        }
        
        // Call the change callback if one is set
        if (this.onChanged) {
            this.onChanged(this, slotIndices);
        }
    }
}

// Export the Inventory class
export default Inventory; 