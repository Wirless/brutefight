// Equipment System for the game
// Contains equipment classes, slot management, and UI

// Constants for equipment slots
const EQUIPMENT_SLOTS = {
    HEAD: 'head',
    CHEST: 'chest',
    LEGS: 'legs',
    FEET: 'feet',
    LEFT_HAND: 'leftHand',
    RIGHT_HAND: 'rightHand',
    NECKLACE: 'necklace',
    RING_LEFT: 'ringLeft',
    RING_RIGHT: 'ringRight',
    BACKPACK: 'backpack'
};

// Update the QUICK_SLOTS constant to include all 10 number keys
const QUICK_SLOTS = {
    SLOT_1: 'quickSlot1',
    SLOT_2: 'quickSlot2',
    SLOT_3: 'quickSlot3',
    SLOT_4: 'quickSlot4',
    SLOT_5: 'quickSlot5',
    SLOT_6: 'quickSlot6',
    SLOT_7: 'quickSlot7',
    SLOT_8: 'quickSlot8',
    SLOT_9: 'quickSlot9',
    SLOT_0: 'quickSlot0'  // 0 is the last slot
};

// Add these variables at the top of the file (outside any class)
let draggedItem = null;
let draggedItemSource = null;
let draggedItemSlot = null;
let draggedItemElement = null;

// New inventory system
class Inventory {
    constructor(size = 16) {
        this.size = size;
        this.slots = new Array(size).fill(null);
        this.ui = null;
    }
    
    // Add an item to the inventory
    addItem(item) {
        // Find first empty slot
        for (let i = 0; i < this.size; i++) {
            if (this.slots[i] === null) {
                this.slots[i] = item;
                if (this.ui) this.ui.updateSlot(i);
                return i;
            }
        }
        return -1; // Inventory full
    }
    
    // Remove an item from a slot
    removeItem(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.size && this.slots[slotIndex] !== null) {
            const item = this.slots[slotIndex];
            this.slots[slotIndex] = null;
            if (this.ui) this.ui.updateSlot(slotIndex);
            return item;
        }
        return null;
    }
    
    // Get an item without removing it
    getItem(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.size) {
            return this.slots[slotIndex];
        }
        return null;
    }
    
    // Set an item in a specific slot
    setItem(slotIndex, item) {
        if (slotIndex >= 0 && slotIndex < this.size) {
            this.slots[slotIndex] = item;
            if (this.ui) this.ui.updateSlot(slotIndex);
            return true;
        }
        return false;
    }
}

// Inventory UI class
class InventoryUI {
    constructor(inventory) {
        this.inventory = inventory;
        this.inventory.ui = this;
        this.container = null;
        this.slotElements = [];
        this.isVisible = false;
        
        this.createUI();
    }
    
    createUI() {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'inventory-panel';
        this.container.style.position = 'fixed';
        this.container.style.top = '50%';
        this.container.style.left = '50%';
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.width = '400px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.container.style.border = '2px solid rgb(0, 233, 150)';
        this.container.style.borderRadius = '5px';
        this.container.style.padding = '15px';
        this.container.style.zIndex = '100';
        this.container.style.display = 'none';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '10px';
        this.container.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.3)';
        
        // Create header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        
        const title = document.createElement('h2');
        title.textContent = 'Inventory';
        title.style.color = 'rgb(0, 233, 150)';
        title.style.margin = '0';
        header.appendChild(title);
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'rgb(0, 233, 150)';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => this.hide());
        header.appendChild(closeButton);
        
        this.container.appendChild(header);
        
        // Create slots grid
        const slotsGrid = document.createElement('div');
        slotsGrid.style.display = 'grid';
        slotsGrid.style.gridTemplateColumns = 'repeat(8, 1fr)';
        slotsGrid.style.gap = '5px';
        
        // Create inventory slots
        for (let i = 0; i < this.inventory.size; i++) {
            const slot = this.createSlot(i);
            slotsGrid.appendChild(slot);
            this.slotElements.push(slot);
        }
        
        this.container.appendChild(slotsGrid);
        document.body.appendChild(this.container);
        
        // Update all slots
        this.updateAllSlots();
    }
    
    createSlot(index) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.slotIndex = index;
        slot.style.width = '40px';
        slot.style.height = '40px';
        slot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        slot.style.border = '1px solid rgb(0, 233, 150)';
        slot.style.borderRadius = '3px';
        slot.style.display = 'flex';
        slot.style.justifyContent = 'center';
        slot.style.alignItems = 'center';
        slot.style.position = 'relative';
        slot.style.cursor = 'pointer';
        
        // Hover effect
        slot.addEventListener('mouseover', () => {
            slot.style.boxShadow = '0 0 5px rgba(0, 233, 150, 0.5)';
            slot.style.backgroundColor = 'rgba(0, 50, 30, 0.5)';
        });
        
        slot.addEventListener('mouseout', () => {
            slot.style.boxShadow = 'none';
            slot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        });
        
        // Click handlers for drag and drop
        slot.addEventListener('mousedown', (e) => {
            // Left click - drag item
            if (e.button === 0) {
                this.handleSlotLeftClick(index);
            }
            // Right click - context menu or use item
            else if (e.button === 2) {
                e.preventDefault();
                this.handleSlotRightClick(index);
            }
        });
        
        // Prevent context menu on right click
        slot.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        return slot;
    }
    
    handleSlotLeftClick(index) {
        const item = this.inventory.getItem(index);
        
        // If we already have a dragged item, place it in this slot
        if (draggedItem) {
            // Remove the item from its original location
            if (draggedItemSource === 'inventory') {
                this.inventory.removeItem(draggedItemSlot);
            } else if (draggedItemSource === 'equipment') {
                window.equipmentManager.unequipItem(draggedItemSlot);
            } else if (draggedItemSource === 'quickslot') {
                window.equipmentManager.quickSlots[draggedItemSlot] = null;
                window.equipmentManager.ui.updateSlot(draggedItemSlot, true);
            }
            
            // If there's an item in this slot, swap it
            const currentItem = this.inventory.getItem(index);
            if (currentItem) {
                // Put the current item where the dragged item was
                if (draggedItemSource === 'inventory') {
                    this.inventory.setItem(draggedItemSlot, currentItem);
                } else if (draggedItemSource === 'equipment') {
                    window.equipmentManager.equipItem(currentItem, draggedItemSlot);
                } else if (draggedItemSource === 'quickslot') {
                    window.equipmentManager.quickSlots[draggedItemSlot] = currentItem;
                    window.equipmentManager.ui.updateSlot(draggedItemSlot, true);
                }
            }
            
            // Place the dragged item in this slot
            this.inventory.setItem(index, draggedItem);
            
            // Clear dragged item
            if (draggedItemElement) {
                document.body.removeChild(draggedItemElement);
            }
            draggedItem = null;
            draggedItemSource = null;
            draggedItemSlot = null;
            draggedItemElement = null;
            
            return;
        }
        
        // If there's an item in this slot, start dragging it
        if (item) {
            draggedItem = item;
            draggedItemSource = 'inventory';
            draggedItemSlot = index;
            
            // Create a visual element for dragging
            draggedItemElement = document.createElement('div');
            draggedItemElement.style.position = 'absolute';
            draggedItemElement.style.width = '40px';
            draggedItemElement.style.height = '40px';
            draggedItemElement.style.backgroundColor = item.color;
            draggedItemElement.style.border = `2px solid ${item.getRarityColor()}`;
            draggedItemElement.style.borderRadius = '3px';
            draggedItemElement.style.zIndex = '1000';
            draggedItemElement.style.pointerEvents = 'none';
            draggedItemElement.style.opacity = '0.8';
            
            // Position at mouse cursor
            const mouseX = event.clientX;
            const mouseY = event.clientY;
            draggedItemElement.style.left = `${mouseX - 20}px`;
            draggedItemElement.style.top = `${mouseY - 20}px`;
            
            document.body.appendChild(draggedItemElement);
            
            // Add mouse move handler
            document.addEventListener('mousemove', this.handleMouseMove);
            
            // Add mouse up handler
            document.addEventListener('mouseup', this.handleMouseUp);
        }
    }
    
    handleSlotRightClick(index) {
        const item = this.inventory.getItem(index);
        
        if (item) {
            // If it's a bag, open it
            if (item.type === 'bag') {
                // Get mouse position
                const mouseX = event.clientX;
                const mouseY = event.clientY;
                
                // Open the bag at mouse position
                item.open(mouseX, mouseY);
            }
            // If it's a tool or weapon, equip to quickslot
            else if (item.type === 'tool' || item.type === 'weapon') {
                // Find first empty quickslot
                for (const key in QUICK_SLOTS) {
                    const slotName = QUICK_SLOTS[key];
                    if (!window.equipmentManager.quickSlots[slotName]) {
                        // Add to quickslot
                        window.equipmentManager.quickSlots[slotName] = item;
                        window.equipmentManager.ui.updateSlot(slotName, true);
                        
                        // Remove from inventory
                        this.inventory.removeItem(index);
                        break;
                    }
                }
            }
        }
    }
    
    handleMouseMove(e) {
        if (draggedItemElement) {
            draggedItemElement.style.left = `${e.clientX - 20}px`;
            draggedItemElement.style.top = `${e.clientY - 20}px`;
        }
    }
    
    handleMouseUp(e) {
        // If we have a dragged item but didn't drop it on a valid target, return it
        if (draggedItem && draggedItemElement) {
            document.body.removeChild(draggedItemElement);
            draggedItem = null;
            draggedItemSource = null;
            draggedItemSlot = null;
            draggedItemElement = null;
        }
        
        // Remove event listeners
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }
    
    updateSlot(index) {
        const slot = this.slotElements[index];
        const item = this.inventory.getItem(index);
        
        // Clear slot
        slot.innerHTML = '';
        
        if (item) {
            // Create item visual
            const itemVisual = document.createElement('div');
            itemVisual.style.width = '36px';
            itemVisual.style.height = '36px';
            itemVisual.style.backgroundColor = item.color;
            itemVisual.style.border = `2px solid ${item.getRarityColor()}`;
            itemVisual.style.borderRadius = '3px';
            
            // Add tooltip
            slot.title = `${item.name}\n${item.description}\nLevel ${item.level} ${item.rarity}`;
            
            slot.appendChild(itemVisual);
        } else {
            slot.title = '';
        }
    }
    
    updateAllSlots() {
        for (let i = 0; i < this.inventory.size; i++) {
            this.updateSlot(i);
        }
    }
    
    show() {
        this.container.style.display = 'flex';
        this.isVisible = true;
    }
    
    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Equipment Item class
class EquipmentItem {
    constructor(options = {}) {
        this.id = options.id || `item_${Math.floor(Math.random() * 1000000)}`;
        this.name = options.name || 'Unknown Item';
        this.description = options.description || '';
        this.slot = options.slot || null;
        this.icon = options.icon || null; // Path to icon image
        this.color = options.color || '#888888'; // Fallback color if no icon
        this.stats = options.stats || {}; // Stat bonuses when equipped
        this.durability = options.durability || 100;
        this.maxDurability = options.maxDurability || 100;
        this.rarity = options.rarity || 'common'; // common, uncommon, rare, epic, legendary
        this.level = options.level || 1;
        this.requirements = options.requirements || {}; // Level, stat requirements to equip
        this.effects = options.effects || []; // Special effects when equipped
        this.type = options.type || 'miscellaneous'; // weapon, tool, armor, accessory, etc.
    }
    
    // Get the color for item rarity
    getRarityColor() {
        switch(this.rarity) {
            case 'common': return '#ffffff';
            case 'uncommon': return '#1eff00';
            case 'rare': return '#0070dd';
            case 'epic': return '#a335ee';
            case 'legendary': return '#ff8000';
            default: return '#ffffff';
        }
    }
    
    // Check if the item can be equipped by a player
    canBeEquippedBy(player) {
        // Check level requirement
        if (this.requirements.level && player.level < this.requirements.level) {
            return false;
        }
        
        // Check stat requirements
        for (const stat in this.requirements.stats) {
            if (player[stat] < this.requirements.stats[stat]) {
                return false;
            }
        }
        
        return true;
    }
    
    // Apply the item's effects to a player when equipped
    applyEffects(player) {
        // Apply stat bonuses
        for (const stat in this.stats) {
            if (player[stat] !== undefined) {
                player[`base${stat.charAt(0).toUpperCase() + stat.slice(1)}`] = player[stat];
                player[stat] += this.stats[stat];
            }
        }
        
        // Apply special effects
        for (const effect of this.effects) {
            // Implementation would depend on the effect system
            console.log(`Applying effect: ${effect.name}`);
        }
    }
    
    // Remove the item's effects from a player when unequipped
    removeEffects(player) {
        // Remove stat bonuses
        for (const stat in this.stats) {
            if (player[stat] !== undefined && player[`base${stat.charAt(0).toUpperCase() + stat.slice(1)}`] !== undefined) {
                player[stat] = player[`base${stat.charAt(0).toUpperCase() + stat.slice(1)}`];
            }
        }
        
        // Remove special effects
        for (const effect of this.effects) {
            // Implementation would depend on the effect system
            console.log(`Removing effect: ${effect.name}`);
        }
    }
}

// Bag class that extends EquipmentItem
class BagItem extends EquipmentItem {
    constructor(options = {}) {
        super(options);
        this.slots = options.slots || 8; // Number of inventory slots
        this.contents = new Array(this.slots).fill(null); // Contents of the bag
        this.type = 'bag';
        this.isOpen = false; // Whether the bag window is open
        this.windowUI = null; // Reference to the bag window UI
        
        // Ensure bag has a unique ID
        this.id = options.id || `bag_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    
    // Add an item to the bag
    addItem(item, slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.slots) {
            if (this.contents[slotIndex] === null) {
                this.contents[slotIndex] = item;
                if (this.windowUI) {
                    this.windowUI.updateSlot(slotIndex);
                }
                return true;
            }
        }
        return false;
    }
    
    // Remove an item from the bag
    removeItem(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.slots && this.contents[slotIndex] !== null) {
            const item = this.contents[slotIndex];
            this.contents[slotIndex] = null;
            if (this.windowUI) {
                this.windowUI.updateSlot(slotIndex);
            }
            return item;
        }
        return null;
    }
    
    // Get an item from the bag without removing it
    getItem(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.slots) {
            return this.contents[slotIndex];
        }
        return null;
    }
    
    // Open the bag window
    open(x, y) {
        if (!this.isOpen) {
            this.isOpen = true;
            this.windowUI = new BagWindowUI(this, x, y);
            return true;
        }
        return false;
    }
    
    // Close the bag window
    close() {
        if (this.isOpen && this.windowUI) {
            this.windowUI.close();
            this.windowUI = null;
            this.isOpen = false;
            return true;
        }
        return false;
    }
}

// Bag Window UI class
class BagWindowUI {
    constructor(bag, x, y) {
        this.bag = bag;
        this.x = x || 100;
        this.y = y || 100;
        this.width = 250;
        this.height = 300;
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.slotElements = [];
        
        this.createWindow();
    }
    
    createWindow() {
        // Create the window container
        this.container = document.createElement('div');
        this.container.className = 'bag-window';
        this.container.style.position = 'absolute';
        this.container.style.left = `${this.x}px`;
        this.container.style.top = `${this.y}px`;
        this.container.style.width = `${this.width}px`;
        this.container.style.height = `${this.height}px`;
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.container.style.border = '2px solid rgb(0, 233, 150)';
        this.container.style.borderRadius = '5px';
        this.container.style.padding = '5px';
        this.container.style.zIndex = '200'; // Higher than other UI elements
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        
        // Create the header
        const header = document.createElement('div');
        header.className = 'bag-window-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = '5px';
        header.style.borderBottom = '1px solid #555';
        header.style.marginBottom = '10px';
        header.style.cursor = 'move'; // Show move cursor on header
        
        // Add bag title
        const title = document.createElement('div');
        title.textContent = this.bag.name;
        title.style.fontWeight = 'bold';
        title.style.color = 'rgb(0, 233, 150)';
        header.appendChild(title);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'rgb(0, 233, 150)';
        closeButton.style.fontSize = '16px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '0 5px';
        closeButton.addEventListener('click', () => this.bag.close());
        header.appendChild(closeButton);
        
        // Make the header draggable
        header.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragOffsetX = e.clientX - this.container.offsetLeft;
            this.dragOffsetY = e.clientY - this.container.offsetTop;
            
            // Add event listeners for dragging
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
        });
        
        this.container.appendChild(header);
        
        // Create slots container
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'bag-slots';
        slotsContainer.style.display = 'grid';
        slotsContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
        slotsContainer.style.gap = '5px';
        slotsContainer.style.padding = '5px';
        
        // Create slots
        for (let i = 0; i < this.bag.slots; i++) {
            const slot = this.createSlotElement(i);
            slotsContainer.appendChild(slot);
            this.slotElements.push(slot);
        }
        
        this.container.appendChild(slotsContainer);
        
        // Add to document
        document.body.appendChild(this.container);
        
        // Bind event handlers
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        
        // Update all slots
        this.updateAllSlots();
    }
    
    createSlotElement(slotIndex) {
        const slot = document.createElement('div');
        slot.className = 'bag-slot';
        slot.dataset.slotIndex = slotIndex;
        slot.style.width = '40px';
        slot.style.height = '40px';
        slot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        slot.style.border = '1px solid rgb(0, 233, 150)';
        slot.style.borderRadius = '3px';
        slot.style.display = 'flex';
        slot.style.justifyContent = 'center';
        slot.style.alignItems = 'center';
        slot.style.position = 'relative';
        slot.style.cursor = 'pointer';
        
        // Hover effect
        slot.addEventListener('mouseover', () => {
            slot.style.boxShadow = '0 0 5px rgba(0, 233, 150, 0.5)';
            slot.style.backgroundColor = 'rgba(0, 50, 30, 0.5)';
        });
        
        slot.addEventListener('mouseout', () => {
            slot.style.boxShadow = 'none';
            slot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        });
        
        // Click handlers for drag and drop
        slot.addEventListener('mousedown', (e) => {
            // Left click - drag item
            if (e.button === 0) {
                this.handleSlotClick(slotIndex);
            }
            // Right click - context menu or use item
            else if (e.button === 2) {
                e.preventDefault();
                this.handleSlotRightClick(slotIndex);
            }
        });
        
        // Prevent context menu on right click
        slot.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        return slot;
    }
    
    handleSlotClick(slotIndex) {
        const item = this.bag.getItem(slotIndex);
        
        // If we already have a dragged item, place it in this slot
        if (draggedItem) {
            // If there's an item in this slot, swap it
            const currentItem = this.bag.getItem(slotIndex);
            
            // Place the dragged item in this slot
            this.bag.contents[slotIndex] = draggedItem;
            this.updateSlot(slotIndex);
            
            // If there was an item in this slot, put it where the dragged item was
            if (currentItem) {
                if (draggedItemSource === 'inventory') {
                    window.playerInventory.setItem(draggedItemSlot, currentItem);
                } else if (draggedItemSource === 'equipment') {
                    window.equipmentManager.equipItem(currentItem, draggedItemSlot);
                } else if (draggedItemSource === 'quickslot') {
                    window.equipmentManager.quickSlots[draggedItemSlot] = currentItem;
                    window.equipmentManager.ui.updateSlot(draggedItemSlot, true);
                } else if (draggedItemSource === 'bag') {
                    // Get the bag and slot
                    const [bagId, bagSlot] = draggedItemSlot.split(':');
                    const bag = window.equipmentManager.getBagById(bagId);
                    if (bag) {
                        bag.contents[bagSlot] = currentItem;
                        if (bag.windowUI) {
                            bag.windowUI.updateSlot(bagSlot);
                        }
                    }
                }
            } else {
                // Remove the item from its original location
                if (draggedItemSource === 'inventory') {
                    window.playerInventory.removeItem(draggedItemSlot);
                } else if (draggedItemSource === 'equipment') {
                    window.equipmentManager.unequipItem(draggedItemSlot);
                } else if (draggedItemSource === 'quickslot') {
                    window.equipmentManager.quickSlots[draggedItemSlot] = null;
                    window.equipmentManager.ui.updateSlot(draggedItemSlot, true);
                } else if (draggedItemSource === 'bag') {
                    // Get the bag and slot
                    const [bagId, bagSlot] = draggedItemSlot.split(':');
                    const bag = window.equipmentManager.getBagById(bagId);
                    if (bag) {
                        bag.contents[bagSlot] = null;
                        if (bag.windowUI) {
                            bag.windowUI.updateSlot(bagSlot);
                        }
                    }
                }
            }
            
            // Clear dragged item
            if (draggedItemElement) {
                document.body.removeChild(draggedItemElement);
            }
            draggedItem = null;
            draggedItemSource = null;
            draggedItemSlot = null;
            draggedItemElement = null;
            
            return;
        }
        
        // If there's an item in this slot, start dragging it
        if (item) {
            draggedItem = item;
            draggedItemSource = 'bag';
            draggedItemSlot = `${this.bag.id}:${slotIndex}`;
            
            // Create a visual element for dragging
            draggedItemElement = document.createElement('div');
            draggedItemElement.style.position = 'absolute';
            draggedItemElement.style.width = '40px';
            draggedItemElement.style.height = '40px';
            draggedItemElement.style.backgroundColor = item.color;
            draggedItemElement.style.border = `2px solid ${item.getRarityColor()}`;
            draggedItemElement.style.borderRadius = '3px';
            draggedItemElement.style.zIndex = '1000';
            draggedItemElement.style.pointerEvents = 'none';
            draggedItemElement.style.opacity = '0.8';
            
            // Position at mouse cursor
            const mouseX = event.clientX;
            const mouseY = event.clientY;
            draggedItemElement.style.left = `${mouseX - 20}px`;
            draggedItemElement.style.top = `${mouseY - 20}px`;
            
            document.body.appendChild(draggedItemElement);
            
            // Add mouse move handler
            document.addEventListener('mousemove', this.handleMouseMove);
            
            // Add mouse up handler
            document.addEventListener('mouseup', this.handleMouseUp);
            
            // Remove the item from the bag
            this.bag.contents[slotIndex] = null;
            this.updateSlot(slotIndex);
        }
    }
    
    handleSlotRightClick(slotIndex) {
        const item = this.bag.getItem(slotIndex);
        
        if (item) {
            // If it's a tool or weapon, equip to quickslot
            if (item.type === 'tool' || item.type === 'weapon') {
                // Find first empty quickslot
                for (const key in QUICK_SLOTS) {
                    const slotName = QUICK_SLOTS[key];
                    if (!window.equipmentManager.quickSlots[slotName]) {
                        // Add to quickslot
                        window.equipmentManager.quickSlots[slotName] = item;
                        window.equipmentManager.ui.updateSlot(slotName, true);
                        
                        // Remove from bag
                        this.bag.removeItem(slotIndex);
                        this.updateSlot(slotIndex);
                        break;
                    }
                }
            }
            // If it's equipment, try to equip it
            else if (item.slot && Object.values(EQUIPMENT_SLOTS).includes(item.slot)) {
                if (window.equipmentManager.equipItem(item, item.slot)) {
                    // Remove from bag if successfully equipped
                    this.bag.removeItem(slotIndex);
                    this.updateSlot(slotIndex);
                }
            }
        }
    }
    
    updateSlot(slotIndex) {
        const slot = this.slotElements[slotIndex];
        const item = this.bag.getItem(slotIndex);
        
        // Clear slot
        slot.innerHTML = '';
        
        if (item) {
            // Create item visual
            const itemVisual = document.createElement('div');
            itemVisual.style.width = '36px';
            itemVisual.style.height = '36px';
            itemVisual.style.backgroundColor = item.color;
            itemVisual.style.border = `2px solid ${item.getRarityColor()}`;
            itemVisual.style.borderRadius = '3px';
            
            // Add tooltip
            slot.title = `${item.name}\n${item.description}\nLevel ${item.level} ${item.rarity}`;
            
            slot.appendChild(itemVisual);
        } else {
            slot.title = '';
        }
    }
    
    updateAllSlots() {
        for (let i = 0; i < this.bag.slots; i++) {
            this.updateSlot(i);
        }
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            this.container.style.left = `${e.clientX - this.dragOffsetX}px`;
            this.container.style.top = `${e.clientY - this.dragOffsetY}px`;
        }
        
        if (draggedItemElement) {
            draggedItemElement.style.left = `${e.clientX - 20}px`;
            draggedItemElement.style.top = `${e.clientY - 20}px`;
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }
    
    close() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Equipment Manager class
class EquipmentManager {
    constructor(player) {
        this.player = player;
        this.slots = {};
        this.quickSlots = {};
        this.activeQuickSlot = 'quickSlot1'; // Default active slot
        this.inventory = null; // Reference to player inventory
        
        // Initialize all equipment slots as empty
        for (const slot in EQUIPMENT_SLOTS) {
            this.slots[EQUIPMENT_SLOTS[slot]] = null;
        }
        
        // Initialize quick slots as empty
        for (const key in QUICK_SLOTS) {
            this.quickSlots[QUICK_SLOTS[key]] = null;
        }
        
        // Create UI
        this.ui = new EquipmentUI(this);
        
        // Show the quickbar UI immediately
        this.ui.showQuickbar();
    }
    
    // Set the player inventory reference
    setInventory(inventory) {
        this.inventory = inventory;
    }
    
    // Get a bag by its ID
    getBagById(bagId) {
        // Check equipment slots for the bag
        for (const slotName in this.slots) {
            const item = this.slots[slotName];
            if (item && item.type === 'bag' && item.id === bagId) {
                return item;
            }
        }
        
        // Check inventory for the bag
        if (this.inventory) {
            for (let i = 0; i < this.inventory.size; i++) {
                const item = this.inventory.getItem(i);
                if (item && item.type === 'bag' && item.id === bagId) {
                    return item;
                }
            }
        }
        
        return null;
    }
    
    // Equip an item to a slot
    equipItem(item, slotName) {
        // Check if this is a quick slot
        const isQuickSlot = Object.values(QUICK_SLOTS).includes(slotName);
        const targetContainer = isQuickSlot ? this.quickSlots : this.slots;
        
        // For quick slots, we don't need to check item slot compatibility
        if (!isQuickSlot) {
            // Check if the item can be equipped to this slot
            if (item.slot !== slotName) {
                console.error(`Cannot equip ${item.name} to ${slotName} slot`);
                return false;
            }
            
            // Check if the player meets requirements
            if (!item.canBeEquippedBy(this.player)) {
                console.error(`Player does not meet requirements to equip ${item.name}`);
                return false;
            }
        }
        
        // Unequip current item in the slot if any
        const currentItem = targetContainer[slotName];
        if (currentItem) {
            if (!isQuickSlot) {
                // Only remove effects for actual equipment slots
                this.unequipItem(slotName);
            } else {
                // For quick slots, just remove the item without effects
                targetContainer[slotName] = null;
            }
        }
        
        // Equip the new item
        targetContainer[slotName] = item;
        
        // Only apply effects for actual equipment slots
        if (!isQuickSlot) {
            item.applyEffects(this.player);
        }
        
        // Update UI
        this.ui.updateSlot(slotName, isQuickSlot);
        
        console.log(`Equipped ${item.name} to ${slotName} slot`);
        return true;
    }
    
    // Unequip an item from a slot
    unequipItem(slotName) {
        // Check if this is a quick slot
        const isQuickSlot = Object.values(QUICK_SLOTS).includes(slotName);
        const targetContainer = isQuickSlot ? this.quickSlots : this.slots;
        
        const item = targetContainer[slotName];
        if (!item) {
            console.error(`No item equipped in ${slotName} slot`);
            return false;
        }
        
        // Remove item effects (only for actual equipment slots)
        if (!isQuickSlot) {
            item.removeEffects(this.player);
        }
        
        // Clear the slot
        targetContainer[slotName] = null;
        
        // Update UI
        this.ui.updateSlot(slotName, isQuickSlot);
        
        console.log(`Unequipped ${item.name} from ${slotName} slot`);
        return item;
    }
    
    // Set the active quick slot
    setActiveQuickSlot(key) {
        const slotName = QUICK_SLOTS[key];
        if (slotName) {
            this.activeQuickSlot = slotName;
            this.ui.updateActiveQuickSlot();
            
            // Get the item in the active slot
            const item = this.quickSlots[slotName];
            
            // Update the global selectedTool variable if it exists
            if (window.selectedTool !== undefined) {
                window.selectedTool = item;
            }
            
            if (item) {
                console.log(`Activated ${item.name} from quick slot ${key}`);
                return item;
            } else {
                console.log(`Quick slot ${key} is empty`);
            }
        }
        return null;
    }
    
    // Get the active quick slot item
    getActiveQuickSlotItem() {
        return this.quickSlots[this.activeQuickSlot];
    }
    
    // Handle hotkey presses for quick slot access
    handleHotkey(key) {
        // Set the active quick slot
        this.setActiveQuickSlot(key);
    }
    
    // Toggle the equipment panel
    toggleEquipmentPanel() {
        this.ui.toggleEquipmentPanel();
    }
}

// Equipment UI class
class EquipmentUI {
    constructor(equipmentManager, options = {}) {
        this.equipmentManager = equipmentManager;
        this.isPanelVisible = false;
        this.equipmentPanel = null;
        this.quickbarPanel = null;
        this.slotElements = {};
        this.quickSlotElements = {};
        this.options = options;
        this.compactDisplayContainer = null;
        this.compactSlotElements = {};
        
        // Create UI elements safely
        try {
            this.createUI();
            
            // Show quickbar immediately - it should always be visible
            this.showQuickbar();
            
            // Show compact equipment display - always visible
            this.createCompactEquipmentDisplay();
        } catch (err) {
            console.error('Error creating equipment UI:', err);
        }
    }
    
    createUI() {
        this.createEquipmentPanel();
        this.createQuickbar();
        this.createInventoryButton();
    }
    
    createEquipmentPanel() {
        // Create main container
        this.equipmentPanel = document.createElement('div');
        this.equipmentPanel.id = 'equipmentPanel';
        this.equipmentPanel.className = 'game-panel';
        this.equipmentPanel.style.position = 'fixed'; // Fixed positioning
        
        // Position based on options
        if (this.options.position === 'left') {
            this.equipmentPanel.style.left = this.options.outside ? '-250px' : '20px';
            this.equipmentPanel.style.top = '50%';
            this.equipmentPanel.style.transform = 'translateY(-50%)';
        } else {
            this.equipmentPanel.style.right = this.options.outside ? '-250px' : '20px';
            this.equipmentPanel.style.top = '50%';
            this.equipmentPanel.style.transform = 'translateY(-50%)';
        }
        
        this.equipmentPanel.style.width = '250px';
        this.equipmentPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.equipmentPanel.style.border = '2px solid rgb(0, 233, 150)';
        this.equipmentPanel.style.borderRadius = '5px';
        this.equipmentPanel.style.padding = '15px';
        this.equipmentPanel.style.zIndex = '100';
        this.equipmentPanel.style.display = 'none';
        this.equipmentPanel.style.flexDirection = 'column';
        this.equipmentPanel.style.gap = '10px';
        this.equipmentPanel.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.3)';
        this.equipmentPanel.style.transition = 'left 0.3s ease, right 0.3s ease';
        
        // Create header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        
        const title = document.createElement('h2');
        title.textContent = 'Equipment';
        title.style.color = 'rgb(0, 233, 150)';
        title.style.margin = '0';
        header.appendChild(title);
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'rgb(0, 233, 150)';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => this.hideEquipmentPanel());
        header.appendChild(closeButton);
        
        this.equipmentPanel.appendChild(header);
        
        // Create grid container for equipment slots
        const gridContainer = document.createElement('div');
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        gridContainer.style.gridTemplateRows = 'repeat(4, auto)';
        gridContainer.style.gap = '10px';
        gridContainer.style.justifyItems = 'center';
        this.equipmentPanel.appendChild(gridContainer);
        
        // Define the grid layout with slot IDs exactly as requested
        const gridLayout = [
            // Row 1: Necklace, Helmet, Bag
            { slotId: EQUIPMENT_SLOTS.NECKLACE, name: 'Necklace', icon: '📿', col: 1, row: 1 },
            { slotId: EQUIPMENT_SLOTS.HEAD, name: 'Helmet', icon: '👑', col: 2, row: 1 },
            { slotId: EQUIPMENT_SLOTS.BACKPACK, name: 'Bag', icon: '🎒', col: 3, row: 1 },
            
            // Row 2: Left Hand, Chest/Armor, Right Hand
            { slotId: EQUIPMENT_SLOTS.LEFT_HAND, name: 'Left Hand', icon: '🛡️', col: 1, row: 2 },
            { slotId: EQUIPMENT_SLOTS.CHEST, name: 'Armor', icon: '👕', col: 2, row: 2 },
            { slotId: EQUIPMENT_SLOTS.RIGHT_HAND, name: 'Right Hand', icon: '⚔️', col: 3, row: 2 },
            
            // Row 3: Left Ring, Legs, Right Ring
            { slotId: EQUIPMENT_SLOTS.RING_LEFT, name: 'Left Ring', icon: '💍', col: 1, row: 3 },
            { slotId: EQUIPMENT_SLOTS.LEGS, name: 'Legs', icon: '👖', col: 2, row: 3 },
            { slotId: EQUIPMENT_SLOTS.RING_RIGHT, name: 'Right Ring', icon: '💍', col: 3, row: 3 },
            
            // Row 4: Empty, Boots/Feet, Empty
            { slotId: EQUIPMENT_SLOTS.FEET, name: 'Boots', icon: '👢', col: 2, row: 4 }
        ];
        
        // Create slots based on the grid layout
        for (const slot of gridLayout) {
            const slotElement = this.createSlotElement(slot.slotId, false);
            
            // Position in the grid
            slotElement.style.gridColumn = slot.col;
            slotElement.style.gridRow = slot.row;
            
            gridContainer.appendChild(slotElement);
            this.slotElements[slot.slotId] = slotElement;
        }
        
        // Add inventory button
        const inventoryButton = document.createElement('button');
        inventoryButton.textContent = 'Open Inventory';
        inventoryButton.style.backgroundColor = 'rgba(0, 233, 150, 0.2)';
        inventoryButton.style.border = '1px solid rgb(0, 233, 150)';
        inventoryButton.style.borderRadius = '5px';
        inventoryButton.style.color = 'rgb(0, 233, 150)';
        inventoryButton.style.padding = '8px';
        inventoryButton.style.marginTop = '10px';
        inventoryButton.style.cursor = 'pointer';
        inventoryButton.style.width = '100%';
        inventoryButton.style.transition = 'background-color 0.2s';
        
        inventoryButton.addEventListener('mouseover', () => {
            inventoryButton.style.backgroundColor = 'rgba(0, 233, 150, 0.4)';
        });
        
        inventoryButton.addEventListener('mouseout', () => {
            inventoryButton.style.backgroundColor = 'rgba(0, 233, 150, 0.2)';
        });
        
        inventoryButton.addEventListener('click', () => {
            if (window.playerInventory && window.playerInventoryUI) {
                window.playerInventoryUI.toggle();
            }
        });
        
        this.equipmentPanel.appendChild(inventoryButton);
        
        // Add to document
        document.body.appendChild(this.equipmentPanel);
    }
    
    createInventoryButton() {
        // Create a floating button to open inventory
        const inventoryButton = document.createElement('div');
        inventoryButton.className = 'inventory-button';
        inventoryButton.style.position = 'fixed';
        inventoryButton.style.top = '20px';
        inventoryButton.style.left = '20px';
        inventoryButton.style.width = '50px';
        inventoryButton.style.height = '50px';
        inventoryButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        inventoryButton.style.border = '2px solid rgb(0, 233, 150)';
        inventoryButton.style.borderRadius = '50%';
        inventoryButton.style.display = 'flex';
        inventoryButton.style.justifyContent = 'center';
        inventoryButton.style.alignItems = 'center';
        inventoryButton.style.cursor = 'pointer';
        inventoryButton.style.zIndex = '100';
        inventoryButton.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.3)';
        inventoryButton.style.fontSize = '24px';
        inventoryButton.textContent = '🎒';
        
        // Hover effect
        inventoryButton.addEventListener('mouseover', () => {
            inventoryButton.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.5)';
            inventoryButton.style.transform = 'scale(1.1)';
        });
        
        inventoryButton.addEventListener('mouseout', () => {
            inventoryButton.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.3)';
            inventoryButton.style.transform = 'scale(1)';
        });
        
        // Click handler
        inventoryButton.addEventListener('click', () => {
            if (window.playerInventory && window.playerInventoryUI) {
                window.playerInventoryUI.toggle();
            }
        });
        
        // Add tooltip
        inventoryButton.title = 'Open Inventory (I)';
        
        // Add to document
        document.body.appendChild(inventoryButton);
        this.inventoryButton = inventoryButton;
    }
    
    createQuickbar() {
        console.log('Creating quickslots panel');
        
        // Create the quickslots container
        this.quickbarPanel = document.createElement('div');
        this.quickbarPanel.className = 'quickslots-panel';
        this.quickbarPanel.style.position = 'fixed'; // Change to fixed positioning
        this.quickbarPanel.style.bottom = '20px';
        this.quickbarPanel.style.left = '50%';
        this.quickbarPanel.style.transform = 'translateX(-50%)';
        this.quickbarPanel.style.display = 'flex';
        this.quickbarPanel.style.gap = '8px'; // Slightly smaller gap to fit all slots
        this.quickbarPanel.style.padding = '10px';
        this.quickbarPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.quickbarPanel.style.border = '2px solid rgb(0, 233, 150)'; // Match the equipment panel
        this.quickbarPanel.style.borderRadius = '5px';
        this.quickbarPanel.style.zIndex = '100';
        this.quickbarPanel.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.3)'; // Match the equipment panel
        
        // Create quickslots
        this.quickSlotElements = {};
        
        // Add slots 1-9
        for (let i = 1; i <= 9; i++) {
            const slotName = `quickSlot${i}`;
            const key = i;
            
            const slotElement = this.createQuickSlotElement(slotName, key);
            this.quickbarPanel.appendChild(slotElement);
            this.quickSlotElements[slotName] = slotElement;
        }
        
        // Add slot 0 (last)
        const slot0Element = this.createQuickSlotElement('quickSlot0', 0);
        this.quickbarPanel.appendChild(slot0Element);
        this.quickSlotElements['quickSlot0'] = slot0Element;
        
        // Add the quickslots panel to the document
        document.body.appendChild(this.quickbarPanel);
        
        console.log('Quickslots panel created with elements:', this.quickSlotElements);
        
        // Add keyboard shortcuts for quickslots
        document.addEventListener('keydown', (e) => {
            // Number keys 1-9
            if (e.key >= '1' && e.key <= '9') {
                const slotIndex = parseInt(e.key);
                const slotName = `quickSlot${slotIndex}`;
                
                // Set this quickslot as active
                this.equipmentManager.setActiveQuickSlot(slotName);
            }
            // Number key 0 (last slot)
            else if (e.key === '0') {
                // Set slot 0 as active
                this.equipmentManager.setActiveQuickSlot('quickSlot0');
            }
        });
    }
    
    createSlotElement(slotName, isQuickSlot) {
        // Create slot container
        const slotElement = document.createElement('div');
        slotElement.className = `equipment-slot ${slotName}`;
        slotElement.dataset.slot = slotName;
        
        // Style the slot
        slotElement.style.width = '60px';
        slotElement.style.height = '60px';
        slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        slotElement.style.border = '2px solid rgb(0, 233, 150)';
        slotElement.style.borderRadius = '5px';
        slotElement.style.display = 'flex';
        slotElement.style.flexDirection = 'column';
        slotElement.style.alignItems = 'center';
        slotElement.style.justifyContent = 'center';
        slotElement.style.position = 'relative';
        slotElement.style.cursor = 'pointer';
        slotElement.style.transition = 'all 0.2s ease';
        
        // Hover effect
        slotElement.addEventListener('mouseover', () => {
            slotElement.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.5)';
            slotElement.style.backgroundColor = 'rgba(0, 50, 30, 0.5)';
        });
        
        slotElement.addEventListener('mouseout', () => {
            slotElement.style.boxShadow = 'none';
            slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        });
        
        // Create slot icon container
        const iconContainer = document.createElement('div');
        iconContainer.className = 'slot-icon';
        iconContainer.style.width = '40px';
        iconContainer.style.height = '40px';
        iconContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        iconContainer.style.border = '1px solid rgb(0, 233, 150)';
        iconContainer.style.borderRadius = '3px';
        iconContainer.style.display = 'flex';
        iconContainer.style.justifyContent = 'center';
        iconContainer.style.alignItems = 'center';
        iconContainer.style.color = 'rgb(0, 233, 150)';
        iconContainer.style.fontSize = '24px';
        
        // Add slot icon or placeholder
        const slotIcon = document.createElement('div');
        slotIcon.textContent = this.getSlotEmoji(slotName);
        slotIcon.style.fontSize = '20px';
        iconContainer.appendChild(slotIcon);
        
        slotElement.appendChild(iconContainer);
        
        // Create slot name label
        const slotLabel = document.createElement('div');
        slotLabel.className = 'slot-name';
        slotLabel.textContent = this.formatSlotName(slotName);
        slotLabel.style.fontSize = '10px';
        slotLabel.style.marginTop = '3px';
        slotLabel.style.color = 'white';
        slotLabel.style.textAlign = 'center';
        slotElement.appendChild(slotLabel);
        
        // Create slot item (empty by default)
        const slotItemName = document.createElement('div');
        slotItemName.className = 'slot-item-name';
        slotItemName.textContent = '';
        slotItemName.style.fontSize = '9px';
        slotItemName.style.color = '#aaa';
        slotItemName.style.position = 'absolute';
        slotItemName.style.bottom = '2px';
        slotItemName.style.width = '100%';
        slotItemName.style.textAlign = 'center';
        slotItemName.style.overflow = 'hidden';
        slotItemName.style.textOverflow = 'ellipsis';
        slotItemName.style.whiteSpace = 'nowrap';
        slotElement.appendChild(slotItemName);
        
        // Add click handler
        slotElement.addEventListener('click', () => {
            this.handleSlotClick(slotName, isQuickSlot);
        });
        
        // Add right-click handler for backpack slot
        if (slotName === EQUIPMENT_SLOTS.BACKPACK) {
            slotElement.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent default context menu
                
                const item = this.equipmentManager.slots[slotName];
                if (item && item instanceof BagItem) {
                    // Open the bag window
                    item.open(e.clientX, e.clientY);
                }
            });
        }
        
        return slotElement;
    }
    
    createQuickSlotElement(slotName, key) {
        const slotElement = document.createElement('div');
        slotElement.className = 'quick-slot';
        slotElement.dataset.slot = slotName;
        
        // Style quick slot
        slotElement.style.width = '45px';
        slotElement.style.height = '45px';
        slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        slotElement.style.border = '2px solid rgb(0, 233, 150)';
        slotElement.style.borderRadius = '5px';
        slotElement.style.display = 'flex';
        slotElement.style.alignItems = 'center';
        slotElement.style.justifyContent = 'center';
        slotElement.style.position = 'relative';
        slotElement.style.cursor = 'pointer';
        slotElement.style.transition = 'all 0.2s ease';
        
        // Hover effect
        slotElement.addEventListener('mouseover', () => {
            slotElement.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.5)';
            slotElement.style.backgroundColor = 'rgba(0, 50, 30, 0.5)';
        });
        
        slotElement.addEventListener('mouseout', () => {
            slotElement.style.boxShadow = 'none';
            slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        });
        
        // Add number indicator
        const number = document.createElement('div');
        number.textContent = key;
        number.style.position = 'absolute';
        number.style.top = '2px';
        number.style.left = '2px';
        number.style.fontSize = '10px';
        number.style.color = 'rgb(0, 233, 150)';
        number.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        number.style.padding = '1px 3px';
        number.style.borderRadius = '3px';
        slotElement.appendChild(number);
        
        // Add item placeholder
        const itemPlaceholder = document.createElement('div');
        itemPlaceholder.className = 'slot-icon-placeholder';
        itemPlaceholder.style.width = '35px';
        itemPlaceholder.style.height = '35px';
        itemPlaceholder.style.display = 'flex';
        itemPlaceholder.style.alignItems = 'center';
        itemPlaceholder.style.justifyContent = 'center';
        itemPlaceholder.style.color = 'rgba(0, 233, 150, 0.3)';
        itemPlaceholder.style.fontSize = '20px';
        itemPlaceholder.textContent = '⚒️';
        slotElement.appendChild(itemPlaceholder);
        
        // Click handler for quickslot
        slotElement.addEventListener('click', () => {
            this.equipmentManager.setActiveQuickSlot(slotName);
            this.updateActiveQuickSlot();
        });
        
        return slotElement;
    }
    
    getSlotEmoji(slotName) {
        // Return emoji representing each slot type
        switch(slotName) {
            case EQUIPMENT_SLOTS.HEAD: return '👒';
            case EQUIPMENT_SLOTS.CHEST: return '👕';
            case EQUIPMENT_SLOTS.LEGS: return '👖';
            case EQUIPMENT_SLOTS.FEET: return '👞';
            case EQUIPMENT_SLOTS.LEFT_HAND: return '🛡️';
            case EQUIPMENT_SLOTS.RIGHT_HAND: return '⚔️';
            case EQUIPMENT_SLOTS.NECKLACE: return '📿';
            case EQUIPMENT_SLOTS.RING_LEFT: return '💍';
            case EQUIPMENT_SLOTS.RING_RIGHT: return '💍';
            case EQUIPMENT_SLOTS.BACKPACK: return '🎒';
            default: return '❓';
        }
    }
    
    formatSlotName(slotName) {
        // Convert camelCase to Title Case with spaces
        return slotName
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
    }
    
    handleSlotClick(slotName, isQuickSlot) {
        console.log(`Clicked on ${slotName} slot`);
        
        // Get the equipped item
        const item = isQuickSlot 
            ? this.equipmentManager.quickSlots[slotName] 
            : this.equipmentManager.slots[slotName];
        
        if (isQuickSlot) {
            // For quickslots, we want to select the item, not unequip it
            if (item) {
                // Set this as the active quickslot
                const key = Object.keys(QUICK_SLOTS).find(k => QUICK_SLOTS[k] === slotName);
                if (key) {
                    this.equipmentManager.setActiveQuickSlot(key);
                    console.log(`Selected ${item.name} from quick slot ${key}`);
                }
            } else {
                console.log(`Quick slot ${slotName} is empty`);
            }
        } else {
            // For regular equipment slots, we can toggle equip/unequip
            if (item) {
                this.equipmentManager.unequipItem(slotName);
            } else {
                // In a real implementation, this would open inventory to select an item
                console.log(`No item to equip in ${slotName} slot`);
            }
        }
    }
    
    updateSlot(slotName, isQuickSlot) {
        const slotElement = isQuickSlot 
            ? this.quickSlotElements[slotName] 
            : this.slotElements[slotName];
            
        if (!slotElement) return;
        
        const item = isQuickSlot 
            ? this.equipmentManager.quickSlots[slotName] 
            : this.equipmentManager.slots[slotName];
        
        if (isQuickSlot) {
            // Update quick slot
            const iconPlaceholder = slotElement.querySelector('.slot-icon-placeholder');
            
            if (item) {
                // Clear placeholder
                if (iconPlaceholder) iconPlaceholder.textContent = '';
                
                // Create color block representing item
                const itemIcon = document.createElement('div');
                itemIcon.style.width = '32px';
                itemIcon.style.height = '32px';
                itemIcon.style.backgroundColor = item.color;
                itemIcon.style.border = `2px solid ${item.getRarityColor()}`;
                itemIcon.style.borderRadius = '4px';
                
                // If there's an icon, use it
                if (item.icon) {
                    const iconImg = document.createElement('img');
                    iconImg.src = item.icon;
                    iconImg.style.width = '100%';
                    iconImg.style.height = '100%';
                    iconImg.style.objectFit = 'contain';
                    
                    // Handle image loading errors
                    iconImg.onerror = () => {
                        console.warn(`Failed to load icon: ${item.icon}`);
                        iconImg.style.display = 'none';
                        itemIcon.textContent = item.name.charAt(0);
                        itemIcon.style.display = 'flex';
                        itemIcon.style.justifyContent = 'center';
                        itemIcon.style.alignItems = 'center';
                        itemIcon.style.color = 'white';
                        itemIcon.style.fontWeight = 'bold';
                    };
                    
                    itemIcon.appendChild(iconImg);
                } else {
                    // Otherwise show first letter of item name
                    itemIcon.textContent = item.name.charAt(0);
                    itemIcon.style.display = 'flex';
                    itemIcon.style.justifyContent = 'center';
                    itemIcon.style.alignItems = 'center';
                    itemIcon.style.color = 'white';
                    itemIcon.style.fontWeight = 'bold';
                }
                
                // Add tooltip
                slotElement.title = `${item.name}\n${item.description}\nLevel ${item.level} ${item.rarity}`;
                
                // Clear slot and add the new item icon
                slotElement.innerHTML = '';
                slotElement.appendChild(itemIcon);
                
                // Add key number
                const keyNumber = document.createElement('div');
                keyNumber.textContent = slotName.replace('quickSlot', '');
                keyNumber.style.position = 'absolute';
                keyNumber.style.bottom = '0';
                keyNumber.style.right = '0';
                keyNumber.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                keyNumber.style.color = 'white';
                keyNumber.style.padding = '1px 3px';
                keyNumber.style.fontSize = '10px';
                keyNumber.style.borderRadius = '2px';
                slotElement.appendChild(keyNumber);
            } else {
                // Reset to empty
                if (iconPlaceholder) iconPlaceholder.textContent = '';
                slotElement.title = '';
            }
            
            // Highlight if this is the active slot
            if (slotName === this.equipmentManager.activeQuickSlot) {
                slotElement.style.border = '1px solid gold';
                slotElement.style.boxShadow = '0 0 5px gold';
            } else {
                slotElement.style.border = '1px solid #555';
                slotElement.style.boxShadow = 'none';
            }
        } else {
            // Update regular equipment slot
            const itemNameElement = slotElement.querySelector('.slot-item-name');
            const iconContainer = slotElement.querySelector('.slot-icon');
            
            if (item) {
                // Update item name
                if (itemNameElement) {
                    itemNameElement.textContent = item.name;
                    itemNameElement.style.color = item.getRarityColor();
                }
                
                // Update icon if available
                if (item.icon && iconContainer) {
                    // Clear the icon container
                    iconContainer.innerHTML = '';
                    
                    // Create and add the icon image
                    const iconImg = document.createElement('img');
                    iconImg.src = item.icon;
                    iconImg.style.width = '100%';
                    iconImg.style.height = '100%';
                    iconImg.style.objectFit = 'contain';
                    iconContainer.appendChild(iconImg);
                } else if (iconContainer) {
                    // Use a colored square for the item
                    iconContainer.innerHTML = '';
                    const colorSquare = document.createElement('div');
                    colorSquare.style.width = '70%';
                    colorSquare.style.height = '70%';
                    colorSquare.style.backgroundColor = item.color;
                    colorSquare.style.border = `2px solid ${item.getRarityColor()}`;
                    colorSquare.style.borderRadius = '2px';
                    iconContainer.appendChild(colorSquare);
                }
                
                // Add tooltip with item details
                slotElement.title = `${item.name}\n${item.description}\nLevel ${item.level} ${item.rarity}\nDurability: ${item.durability}/${item.maxDurability}`;
            } else {
                // Clear item name
                if (itemNameElement) {
                    itemNameElement.textContent = 'Empty';
                    itemNameElement.style.color = '#999';
                }
                
                // Clear icon
                if (iconContainer) {
                    iconContainer.innerHTML = '';
                    
                    // Add slot emoji
                    const slotEmoji = document.createElement('div');
                    slotEmoji.textContent = this.getSlotEmoji(slotName);
                    slotEmoji.style.fontSize = '24px';
                    slotEmoji.style.opacity = '0.5';
                    iconContainer.appendChild(slotEmoji);
                }
                
                // Clear tooltip
                slotElement.title = `Empty ${this.formatSlotName(slotName)} slot`;
            }
            
            // Also update compact slot if it exists
            if (this.compactSlotElements && this.compactSlotElements[slotName]) {
                this.updateCompactSlot(slotName);
            }
        }
    }
    
    updateActiveQuickSlot() {
        // Update all quick slots to show which one is active
        for (const slotName in this.quickSlotElements) {
            const slotElement = this.quickSlotElements[slotName];
            
            if (slotName === this.equipmentManager.activeQuickSlot) {
                slotElement.style.border = '2px solid gold';
                slotElement.style.boxShadow = '0 0 10px gold';
                slotElement.style.backgroundColor = 'rgba(50, 40, 0, 0.5)';
            } else {
                slotElement.style.border = '2px solid rgb(0, 233, 150)';
                slotElement.style.boxShadow = 'none';
                slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }
        }
    }
    
    showEquipmentPanel() {
        this.equipmentPanel.style.display = 'block';
        this.isPanelVisible = true;
    }
    
    hideEquipmentPanel() {
        this.equipmentPanel.style.display = 'none';
        this.isPanelVisible = false;
    }
    
    toggleEquipmentPanel() {
        if (this.isPanelVisible) {
            this.hideEquipmentPanel();
        } else {
            this.showEquipmentPanel();
        }
    }
    
    showQuickbar() {
        try {
            if (this.quickbarPanel) {
                this.quickbarPanel.style.display = 'flex';
            } else {
                console.warn('Quickbar panel not initialized yet');
            }
        } catch (err) {
            console.error('Error showing quickbar:', err);
        }
    }
    
    // Create a compact, always-visible equipment display
    createCompactEquipmentDisplay() {
        // Create main container
        this.compactDisplayContainer = document.createElement('div');
        this.compactDisplayContainer.className = 'compact-equipment-display';
        this.compactDisplayContainer.style.position = 'fixed';
        this.compactDisplayContainer.style.left = '20px';
        this.compactDisplayContainer.style.top = '80px'; // Below inventory button
        this.compactDisplayContainer.style.display = 'flex';
        this.compactDisplayContainer.style.flexDirection = 'column';
        this.compactDisplayContainer.style.gap = '5px';
        this.compactDisplayContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.compactDisplayContainer.style.border = '2px solid rgb(0, 233, 150)';
        this.compactDisplayContainer.style.borderRadius = '5px';
        this.compactDisplayContainer.style.padding = '5px';
        this.compactDisplayContainer.style.zIndex = '99';
        this.compactDisplayContainer.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.3)';
        
        // Define the slots to display in compact view
        const compactSlots = [
            { slotId: EQUIPMENT_SLOTS.HEAD, icon: '👑' },
            { slotId: EQUIPMENT_SLOTS.CHEST, icon: '👕' },
            { slotId: EQUIPMENT_SLOTS.LEGS, icon: '👖' },
            { slotId: EQUIPMENT_SLOTS.FEET, icon: '👢' },
            { slotId: EQUIPMENT_SLOTS.LEFT_HAND, icon: '🛡️' },
            { slotId: EQUIPMENT_SLOTS.RIGHT_HAND, icon: '⚔️' },
            { slotId: EQUIPMENT_SLOTS.NECKLACE, icon: '📿' },
            { slotId: EQUIPMENT_SLOTS.RING_LEFT, icon: '💍' },
            { slotId: EQUIPMENT_SLOTS.RING_RIGHT, icon: '💍' },
            { slotId: EQUIPMENT_SLOTS.BACKPACK, icon: '🎒' }
        ];
        
        // Create each slot
        for (const slot of compactSlots) {
            const slotElement = this.createCompactSlotElement(slot.slotId, slot.icon);
            this.compactDisplayContainer.appendChild(slotElement);
            this.compactSlotElements[slot.slotId] = slotElement;
        }
        
        // Add to document
        document.body.appendChild(this.compactDisplayContainer);
        
        // Update all slots
        this.updateAllCompactSlots();
    }
    
    // Create a compact slot element
    createCompactSlotElement(slotId, icon) {
        const slotContainer = document.createElement('div');
        slotContainer.className = 'compact-slot';
        slotContainer.style.display = 'flex';
        slotContainer.style.alignItems = 'center';
        slotContainer.style.gap = '5px';
        slotContainer.style.padding = '3px';
        slotContainer.style.borderRadius = '3px';
        slotContainer.style.cursor = 'pointer';
        
        // Add hover effect
        slotContainer.addEventListener('mouseover', () => {
            slotContainer.style.backgroundColor = 'rgba(0, 233, 150, 0.2)';
        });
        
        slotContainer.addEventListener('mouseout', () => {
            slotContainer.style.backgroundColor = 'transparent';
        });
        
        // Add click handler to equip/unequip
        slotContainer.addEventListener('click', () => {
            this.handleSlotClick(slotId, false);
        });
        
        // Create icon element
        const iconElement = document.createElement('div');
        iconElement.className = 'compact-slot-icon';
        iconElement.textContent = icon;
        iconElement.style.width = '20px';
        iconElement.style.height = '20px';
        iconElement.style.display = 'flex';
        iconElement.style.justifyContent = 'center';
        iconElement.style.alignItems = 'center';
        iconElement.style.fontSize = '16px';
        slotContainer.appendChild(iconElement);
        
        // Create item display element
        const itemElement = document.createElement('div');
        itemElement.className = 'compact-slot-item';
        itemElement.style.width = '20px';
        itemElement.style.height = '20px';
        itemElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        itemElement.style.border = '1px solid rgb(0, 233, 150)';
        itemElement.style.borderRadius = '3px';
        slotContainer.appendChild(itemElement);
        
        return slotContainer;
    }
    
    // Update a compact slot
    updateCompactSlot(slotId) {
        const slotElement = this.compactSlotElements[slotId];
        if (!slotElement) return;
        
        const item = this.equipmentManager.slots[slotId];
        const itemElement = slotElement.querySelector('.compact-slot-item');
        
        if (item) {
            // Clear existing content
            itemElement.innerHTML = '';
            
            // Create item visual
            const itemVisual = document.createElement('div');
            itemVisual.style.width = '100%';
            itemVisual.style.height = '100%';
            itemVisual.style.backgroundColor = item.color;
            itemVisual.style.border = `1px solid ${item.getRarityColor()}`;
            itemVisual.style.borderRadius = '2px';
            
            // Add tooltip
            slotElement.title = `${item.name}\n${item.description}\nLevel ${item.level} ${item.rarity}`;
            
            itemElement.appendChild(itemVisual);
        } else {
            // Empty slot
            itemElement.innerHTML = '';
            slotElement.title = `Empty ${this.formatSlotName(slotId)} slot`;
        }
    }
    
    // Update all compact slots
    updateAllCompactSlots() {
        for (const slotId in this.compactSlotElements) {
            this.updateCompactSlot(slotId);
        }
    }
}

// Example equipment items
const EQUIPMENT_EXAMPLES = {
    leatherHelmet: new EquipmentItem({
        id: 'leather_helmet',
        name: 'Leather Helmet',
        description: 'A simple leather helmet that provides basic protection.',
        slot: EQUIPMENT_SLOTS.HELMET,
        color: '#8B4513',
        stats: { defense: 2 },
        rarity: 'common',
        level: 1
    }),
    
    woodenPickaxe: new EquipmentItem({
        id: 'wooden_pickaxe',
        name: 'Wooden Pickaxe',
        description: 'A basic wooden pickaxe for mining rocks.',
        type: 'tool',
        color: '#A0522D',
        icon: 'sprites/pickaxe_placeholder.png', // Placeholder image for pickaxe
        stats: { strength: 1 },
        rarity: 'common',
        level: 1
    }),
    
    stonePickaxe: new EquipmentItem({
        id: 'stone_pickaxe',
        name: 'Stone Pickaxe',
        description: 'A sturdy stone pickaxe for mining rocks more efficiently.',
        type: 'tool',
        color: '#808080',
        icon: 'sprites/pickaxe_placeholder.png', // Placeholder image for pickaxe
        stats: { strength: 2 },
        rarity: 'common',
        level: 1
    }),
    
    ironPickaxe: new EquipmentItem({
        id: 'iron_pickaxe',
        name: 'Iron Pickaxe',
        description: 'A durable iron pickaxe for mining rocks efficiently.',
        type: 'tool',
        color: '#C0C0C0',
        icon: 'sprites/pickaxe_placeholder.png', // Placeholder image for pickaxe
        stats: { strength: 3 },
        rarity: 'uncommon',
        level: 5
    }),
    
    woodenAxe: new EquipmentItem({
        id: 'wooden_axe',
        name: 'Wooden Axe',
        description: 'A basic wooden axe for chopping trees.',
        type: 'tool',
        color: '#8B4513',
        icon: 'sprites/axe.png', // Use the provided axe sprite
        stats: { strength: 1 },
        rarity: 'common',
        level: 1
    }),
    
    smallBag: new BagItem({
        id: 'small_bag',
        name: 'Small Bag',
        description: 'A small bag with 8 inventory slots.',
        slot: EQUIPMENT_SLOTS.BACKPACK,
        color: '#8B4513',
        icon: 'sprites/bag.png', // Add a bag sprite if available
        slots: 8,
        rarity: 'common',
        level: 1
    })
};

// Export the equipment system
window.Equipment = {
    EQUIPMENT_SLOTS,
    QUICK_SLOTS,
    EquipmentItem,
    BagItem,
    BagWindowUI,
    EquipmentManager,
    EquipmentUI,
    Inventory,
    InventoryUI,
    EQUIPMENT_EXAMPLES
}; 