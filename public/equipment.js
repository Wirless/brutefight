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

// Quick slot system for toolbar (1-0 keys)
const QUICK_SLOTS = {
    SLOT_1: 'quickSlot0',
    SLOT_2: 'quickSlot1',
    SLOT_3: 'quickSlot2',
    SLOT_4: 'quickSlot3',
    SLOT_5: 'quickSlot4'
};

// Add these variables at the top of the file (outside any class)
let draggedItem = null;
let draggedItemSource = null;
let draggedItemSlot = null;
let draggedItemElement = null;

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
    }
    
    // Add an item to the bag
    addItem(item, slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.slots) {
            if (this.contents[slotIndex] === null) {
                this.contents[slotIndex] = item;
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
    
    // Add a method to check if an item can be added to the bag
    canAddItem(item) {
        // Check if the item is valid
        if (!item || !(item instanceof EquipmentItem)) {
            return false;
        }
        
        // Check if there's an empty slot
        return this.contents.some(slot => slot === null);
    }
    
    // Add a method to find the first empty slot
    findEmptySlot() {
        for (let i = 0; i < this.slots; i++) {
            if (this.contents[i] === null) {
                return i;
            }
        }
        return -1;
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
        this.container.style.border = '2px solid #555';
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
        header.appendChild(title);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
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
            
            // Prevent text selection during drag
            e.preventDefault();
        });
        
        // Add the header to the window
        this.container.appendChild(header);
        
        // Create the slots container
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'bag-slots';
        slotsContainer.style.display = 'grid';
        slotsContainer.style.gridTemplateColumns = 'repeat(4, 1fr)'; // 4 slots per row
        slotsContainer.style.gap = '5px';
        slotsContainer.style.padding = '5px';
        
        // Create slots
        for (let i = 0; i < this.bag.slots; i++) {
            const slotElement = this.createSlotElement(i);
            slotsContainer.appendChild(slotElement);
            this.slotElements.push(slotElement);
        }
        
        // Add the slots container to the window
        this.container.appendChild(slotsContainer);
        
        // Add the window to the document
        document.body.appendChild(this.container);
        
        // Add global mouse event listeners for dragging
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Update the slots with current contents
        this.updateAllSlots();
    }
    
    createSlotElement(slotIndex) {
        // Create slot container
        const slotElement = document.createElement('div');
        slotElement.className = `bag-slot slot-${slotIndex}`;
        slotElement.dataset.slotIndex = slotIndex;
        slotElement.style.width = '50px';
        slotElement.style.height = '50px';
        slotElement.style.backgroundColor = 'rgba(40, 40, 40, 0.8)';
        slotElement.style.border = '1px solid #555';
        slotElement.style.borderRadius = '3px';
        slotElement.style.display = 'flex';
        slotElement.style.justifyContent = 'center';
        slotElement.style.alignItems = 'center';
        slotElement.style.position = 'relative';
        slotElement.style.cursor = 'pointer';
        
        // Add click handler
        slotElement.addEventListener('click', () => {
            this.handleSlotClick(slotIndex);
        });
        
        // Add drag and drop handlers
        slotElement.setAttribute('draggable', 'true');
        
        slotElement.addEventListener('dragstart', (e) => {
            const item = this.bag.getItem(slotIndex);
            if (item) {
                // Set the drag data
                draggedItem = item;
                draggedItemSource = 'bag';
                draggedItemSlot = slotIndex;
                draggedItemElement = e.target;
                
                // Create a drag image
                const dragImage = document.createElement('div');
                dragImage.style.width = '40px';
                dragImage.style.height = '40px';
                dragImage.style.backgroundColor = item.color;
                dragImage.style.border = `2px solid ${item.getRarityColor()}`;
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                document.body.appendChild(dragImage);
                
                e.dataTransfer.setDragImage(dragImage, 20, 20);
                e.dataTransfer.effectAllowed = 'move';
                
                // Add a class to show it's being dragged
                slotElement.classList.add('dragging');
                
                // Remove the drag image after a short delay
                setTimeout(() => {
                    document.body.removeChild(dragImage);
                }, 100);
            } else {
                // Prevent dragging empty slots
                e.preventDefault();
            }
        });
        
        slotElement.addEventListener('dragend', () => {
            slotElement.classList.remove('dragging');
            
            // Reset drag state
            draggedItem = null;
            draggedItemSource = null;
            draggedItemSlot = null;
            draggedItemElement = null;
        });
        
        return slotElement;
    }
    
    handleSlotClick(slotIndex) {
        console.log(`Clicked on bag slot ${slotIndex}`);
        
        // Get the item in this slot
        const item = this.bag.getItem(slotIndex);
        
        if (item) {
            // For now, just log the item info
            console.log(`Bag slot ${slotIndex} contains: ${item.name}`);
            
            // Here you could implement item usage, moving to inventory, etc.
            // But don't remove the item by default
        } else {
            // In a real implementation, this would allow adding an item from inventory
            console.log(`Bag slot ${slotIndex} is empty`);
        }
    }
    
    updateSlot(slotIndex) {
        const slotElement = this.slotElements[slotIndex];
        if (!slotElement) return;
        
        // Clear the slot
        slotElement.innerHTML = '';
        
        // Get the item in this slot
        const item = this.bag.getItem(slotIndex);
        
        if (item) {
            // Create item representation
            const itemElement = document.createElement('div');
            itemElement.style.width = '40px';
            itemElement.style.height = '40px';
            itemElement.style.backgroundColor = item.color;
            itemElement.style.border = `2px solid ${item.getRarityColor()}`;
            itemElement.style.borderRadius = '3px';
            
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
                    
                    // Show emoji instead
                    let emoji = '📦'; // Default box
                    if (item.name.toLowerCase().includes('pickaxe')) emoji = '⛏️';
                    else if (item.name.toLowerCase().includes('axe')) emoji = '🪓';
                    else if (item.name.toLowerCase().includes('bag')) emoji = '👜';
                    
                    itemElement.textContent = emoji;
                    itemElement.style.display = 'flex';
                    itemElement.style.justifyContent = 'center';
                    itemElement.style.alignItems = 'center';
                    itemElement.style.fontSize = '24px';
                };
                
                itemElement.appendChild(iconImg);
            } else {
                // Show emoji based on item type
                let emoji = '📦'; // Default box
                if (item.name.toLowerCase().includes('pickaxe')) emoji = '⛏️';
                else if (item.name.toLowerCase().includes('axe')) emoji = '🪓';
                else if (item.name.toLowerCase().includes('bag')) emoji = '👜';
                
                itemElement.textContent = emoji;
                itemElement.style.display = 'flex';
                itemElement.style.justifyContent = 'center';
                itemElement.style.alignItems = 'center';
                itemElement.style.fontSize = '24px';
            }
            
            // Add tooltip
            slotElement.title = `${item.name}\n${item.description}`;
            
            // Add the item element to the slot
            slotElement.appendChild(itemElement);
        } else {
            // Empty slot
            slotElement.title = '';
        }
    }
    
    updateAllSlots() {
        for (let i = 0; i < this.bag.slots; i++) {
            this.updateSlot(i);
        }
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            const newX = e.clientX - this.dragOffsetX;
            const newY = e.clientY - this.dragOffsetY;
            
            // Keep the window within the viewport
            const maxX = window.innerWidth - this.width;
            const maxY = window.innerHeight - this.height;
            
            this.x = Math.max(0, Math.min(newX, maxX));
            this.y = Math.max(0, Math.min(newY, maxY));
            
            this.container.style.left = `${this.x}px`;
            this.container.style.top = `${this.y}px`;
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
    }
    
    close() {
        // Remove event listeners
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Remove the window from the document
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Equipment Manager class
class EquipmentManager {
    constructor(player) {
        console.log('Creating EquipmentManager');
        this.player = player;
        this.slots = {};
        this.quickSlots = {};
        this.activeQuickSlot = null;
        this.ui = null;
        
        // Initialize empty slots
        for (const slotName of Object.values(EQUIPMENT_SLOTS)) {
            this.slots[slotName] = null;
        }
        
        for (const slotName of Object.values(QUICK_SLOTS)) {
            this.quickSlots[slotName] = null;
        }
        
        console.log('EquipmentManager created with slots:', this.slots, 'and quickSlots:', this.quickSlots);
        
        // Create UI
        this.ui = new EquipmentUI(this);
        
        // Show the quickbar UI immediately
        this.ui.showQuickbar();
    }
    
    // Equip an item to a slot
    equipItem(item, slotName) {
        if (!item) {
            console.warn('Cannot equip null item');
            return false;
        }
        
        if (!slotName) {
            console.warn(`Cannot equip ${item.name} to undefined slot`);
            return false;
        }
        
        // Check if the slot is valid for this item
        const isQuickSlot = Object.values(QUICK_SLOTS).includes(slotName);
        const isEquipmentSlot = Object.values(EQUIPMENT_SLOTS).includes(slotName);
        
        if (!isQuickSlot && !isEquipmentSlot) {
            console.warn(`Invalid slot name: ${slotName}`);
            return false;
        }
        
        if (item.slot !== slotName && !isQuickSlot) {
            console.warn(`Cannot equip ${item.name} in ${slotName} slot (item slot: ${item.slot})`);
            return false;
        }
        
        // If equipping to a regular equipment slot
        if (isEquipmentSlot) {
            // Unequip any existing item in this slot
            const existingItem = this.slots[slotName];
            if (existingItem) {
                // Don't actually unequip if it's the same item
                if (existingItem.id === item.id) return true;
                
                // Otherwise unequip the existing item
                this.unequipItem(slotName);
            }
            
            // Equip the new item
            this.slots[slotName] = item;
            
            // If this is a tool that should be in quickslots, also add it there
            if (item.type === 'tool' && !this.isItemInQuickSlots(item)) {
                // Find first empty quickslot
                const emptyQuickSlot = this.findEmptyQuickSlot();
                if (emptyQuickSlot) {
                    this.quickSlots[emptyQuickSlot] = item;
                    this.updateQuickSlots();
                }
            }
            
            this.updateSlots();
            return true;
        }
        
        // If equipping to a quickslot
        if (isQuickSlot) {
            // Unequip any existing item in this quickslot
            const existingItem = this.quickSlots[slotName];
            if (existingItem && existingItem.id === item.id) return true;
            
            // Equip the new item to the quickslot
            this.quickSlots[slotName] = item;
            this.updateQuickSlots();
            return true;
        }
        
        return false;
    }
    
    // Unequip an item from a slot
    unequipItem(slotName) {
        // Check if the slot is valid
        if (Object.values(EQUIPMENT_SLOTS).includes(slotName)) {
            const item = this.slots[slotName];
            if (item) {
                // Remove the item from the slot
                this.slots[slotName] = null;
                
                // Drop the item in the world
                this.dropItemInWorld(item);
                
                // Update the UI
                this.updateSlots();
                return item;
            }
        } else if (Object.values(QUICK_SLOTS).includes(slotName)) {
            const item = this.quickSlots[slotName];
            if (item) {
                // Remove the item from the quickslot
                this.quickSlots[slotName] = null;
                
                // Drop the item in the world
                this.dropItemInWorld(item);
                
                // Update the UI
                this.updateQuickSlots();
                return item;
            }
        }
        return null;
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
    
    // Add a method to drop an item in the world
    dropItemInWorld(item) {
        // Clone the item to avoid reference issues
        const droppedItem = Object.assign({}, item);
        
        // Add position properties
        droppedItem.x = window.player.x;
        droppedItem.y = window.player.y;
        
        // Add a slight random offset
        droppedItem.x += (Math.random() - 0.5) * 50;
        droppedItem.y += (Math.random() - 0.5) * 50;
        
        // Add to the dropped items array
        window.droppedItems.push(droppedItem);
        
        console.log(`Dropped ${item.name} at (${droppedItem.x}, ${droppedItem.y})`);
    }
}

// Equipment UI class
class EquipmentUI {
    constructor(equipmentManager) {
        console.log('Creating EquipmentUI');
        this.equipmentManager = equipmentManager;
        this.equipmentManager.ui = this;
        
        this.slotElements = {};
        this.quickSlotElements = {};
        
        this.createEquipmentPanel();
        console.log('EquipmentUI created with slotElements:', this.slotElements);
    }
    
    createUI() {
        this.createEquipmentPanel();
        this.createQuickbar();
    }
    
    createEquipmentPanel() {
        // Create the panel container
        this.panel = document.createElement('div');
        this.panel.className = 'equipment-panel';
        this.panel.style.position = 'absolute';
        this.panel.style.top = '50px';
        this.panel.style.right = '10px';
        this.panel.style.width = '220px';
        this.panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.panel.style.border = '2px solid #555';
        this.panel.style.borderRadius = '5px';
        this.panel.style.padding = '10px';
        this.panel.style.color = 'white';
        this.panel.style.fontFamily = 'Arial, sans-serif';
        this.panel.style.zIndex = '100';
        this.panel.style.display = 'flex';
        this.panel.style.flexDirection = 'column';
        this.panel.style.gap = '10px';
        
        // Add title
        const title = document.createElement('div');
        title.textContent = 'Equipment';
        title.style.fontWeight = 'bold';
        title.style.textAlign = 'center';
        title.style.marginBottom = '10px';
        title.style.borderBottom = '1px solid #555';
        title.style.paddingBottom = '5px';
        this.panel.appendChild(title);
        
        // Create equipment slots
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'equipment-slots';
        slotsContainer.style.display = 'grid';
        slotsContainer.style.gridTemplateAreas = `
            ".    head   ."
            "left  chest right"
            ".     legs   ."
            ".     feet   ."
            ".   backpack ."
        `;
        slotsContainer.style.gridTemplateColumns = 'auto auto auto';
        slotsContainer.style.gap = '10px';
        slotsContainer.style.justifyItems = 'center';
        
        // Create and add each equipment slot
        const headSlot = this.createSlotElement(EQUIPMENT_SLOTS.HEAD);
        headSlot.style.gridArea = 'head';
        slotsContainer.appendChild(headSlot);
        
        const chestSlot = this.createSlotElement(EQUIPMENT_SLOTS.CHEST);
        chestSlot.style.gridArea = 'chest';
        slotsContainer.appendChild(chestSlot);
        
        const legsSlot = this.createSlotElement(EQUIPMENT_SLOTS.LEGS);
        legsSlot.style.gridArea = 'legs';
        slotsContainer.appendChild(legsSlot);
        
        const feetSlot = this.createSlotElement(EQUIPMENT_SLOTS.FEET);
        feetSlot.style.gridArea = 'feet';
        slotsContainer.appendChild(feetSlot);
        
        const leftHandSlot = this.createSlotElement(EQUIPMENT_SLOTS.LEFT_HAND);
        leftHandSlot.style.gridArea = 'left';
        slotsContainer.appendChild(leftHandSlot);
        
        const rightHandSlot = this.createSlotElement(EQUIPMENT_SLOTS.RIGHT_HAND);
        rightHandSlot.style.gridArea = 'right';
        slotsContainer.appendChild(rightHandSlot);
        
        const backpackSlot = this.createSlotElement(EQUIPMENT_SLOTS.BACKPACK);
        backpackSlot.style.gridArea = 'backpack';
        slotsContainer.appendChild(backpackSlot);
        
        // Store references to slot elements
        this.slotElements = {
            [EQUIPMENT_SLOTS.HEAD]: headSlot,
            [EQUIPMENT_SLOTS.CHEST]: chestSlot,
            [EQUIPMENT_SLOTS.LEGS]: legsSlot,
            [EQUIPMENT_SLOTS.FEET]: feetSlot,
            [EQUIPMENT_SLOTS.LEFT_HAND]: leftHandSlot,
            [EQUIPMENT_SLOTS.RIGHT_HAND]: rightHandSlot,
            [EQUIPMENT_SLOTS.BACKPACK]: backpackSlot
        };
        
        // Add the slots container to the panel
        this.panel.appendChild(slotsContainer);
        
        // Add slot labels
        const addLabel = (slotElement, text) => {
            const label = document.createElement('div');
            label.textContent = text;
            label.style.fontSize = '10px';
            label.style.textAlign = 'center';
            label.style.marginTop = '2px';
            slotElement.appendChild(label);
        };
        
        addLabel(headSlot, 'Head');
        addLabel(chestSlot, 'Chest');
        addLabel(legsSlot, 'Legs');
        addLabel(feetSlot, 'Feet');
        addLabel(leftHandSlot, 'Left Hand');
        addLabel(rightHandSlot, 'Right Hand');
        addLabel(backpackSlot, 'Backpack');
        
        // Add the panel to the document
        document.body.appendChild(this.panel);
        
        // Create quickslots panel
        this.createQuickSlotsPanel();
    }
    
    createQuickbar() {
        // Create quick slot bar (at bottom of screen)
        this.quickbarPanel = document.createElement('div');
        this.quickbarPanel.id = 'quickbarPanel';
        this.quickbarPanel.className = 'game-panel';
        this.quickbarPanel.style.position = 'fixed'; // Use fixed positioning
        this.quickbarPanel.style.left = '50%'; // Center horizontally
        this.quickbarPanel.style.transform = 'translateX(-50%)'; // Center properly
        this.quickbarPanel.style.bottom = '10px'; // Position at bottom
        this.quickbarPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.quickbarPanel.style.border = '2px solid #444';
        this.quickbarPanel.style.borderRadius = '5px';
        this.quickbarPanel.style.padding = '5px';
        this.quickbarPanel.style.display = 'flex';
        this.quickbarPanel.style.flexDirection = 'row'; // Horizontal layout
        this.quickbarPanel.style.gap = '5px';
        this.quickbarPanel.style.zIndex = '100';
        
        // Create each quick slot
        for (const key in QUICK_SLOTS) {
            const slotName = QUICK_SLOTS[key];
            const slotElement = this.createQuickSlotElement(slotName, key);
            this.quickbarPanel.appendChild(slotElement);
            this.quickSlotElements[slotName] = slotElement;
        }
        
        // Add to document
        document.body.appendChild(this.quickbarPanel);
    }
    
    createSlotElement(slotName, isQuickSlot = false) {
        const slotElement = document.createElement('div');
        slotElement.className = isQuickSlot ? 'quickslot' : 'equipment-slot';
        slotElement.dataset.slotName = slotName;
        
        // Set slot styles
        slotElement.style.width = '50px';
        slotElement.style.height = '50px';
        slotElement.style.backgroundColor = 'rgba(40, 40, 40, 0.8)';
        slotElement.style.border = '1px solid #555';
        slotElement.style.borderRadius = '3px';
        slotElement.style.display = 'flex';
        slotElement.style.justifyContent = 'center';
        slotElement.style.alignItems = 'center';
        slotElement.style.position = 'relative';
        slotElement.style.cursor = 'pointer';
        
        // Add click handler
        slotElement.addEventListener('click', () => {
            this.handleSlotClick(slotName);
            console.log(`Clicked on ${slotName} slot`);
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
        
        // Add drag and drop handlers
        slotElement.addEventListener('dragover', (e) => {
            // Allow dropping
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            slotElement.classList.add('drag-over');
        });
        
        slotElement.addEventListener('dragleave', () => {
            slotElement.classList.remove('drag-over');
        });
        
        slotElement.addEventListener('drop', (e) => {
            e.preventDefault();
            slotElement.classList.remove('drag-over');
            
            // Handle the drop
            if (window.draggedWorldItem) {
                const item = window.draggedWorldItem.item;
                
                // Check if this slot is valid for this item
                if (item.slot === slotName || isQuickSlot) {
                    // Try to equip the item
                    const success = this.equipmentManager.equipItem(item, slotName);
                    
                    if (success) {
                        console.log(`Equipped ${item.name} to ${slotName}`);
                        
                        // Update the UI
                        this.updateSlot(slotName);
                        
                        // Remove the dragged item
                        window.draggedWorldItem = null;
                    }
                }
            }
        });
        
        return slotElement;
    }
    
    createQuickSlotElement(slotName, key) {
        // Get the quick slot number
        const slotNumber = key;
        
        // Create slot container
        const slotElement = document.createElement('div');
        slotElement.className = `quick-slot ${slotName}`;
        slotElement.dataset.slot = slotName;
        slotElement.dataset.key = key;
        slotElement.style.width = '50px';
        slotElement.style.height = '50px';
        slotElement.style.backgroundColor = 'rgba(40, 40, 40, 0.8)';
        slotElement.style.border = '1px solid #555';
        slotElement.style.borderRadius = '3px';
        slotElement.style.cursor = 'pointer';
        slotElement.style.position = 'relative';
        slotElement.style.display = 'flex';
        slotElement.style.justifyContent = 'center';
        slotElement.style.alignItems = 'center';
        
        // Create number label
        const numberLabel = document.createElement('div');
        numberLabel.className = 'slot-number';
        numberLabel.textContent = slotNumber;
        numberLabel.style.position = 'absolute';
        numberLabel.style.top = '2px';
        numberLabel.style.left = '2px';
        numberLabel.style.fontSize = '10px';
        numberLabel.style.color = '#999';
        slotElement.appendChild(numberLabel);
        
        // Create empty icon placeholder
        const iconPlaceholder = document.createElement('div');
        iconPlaceholder.className = 'slot-icon-placeholder';
        iconPlaceholder.textContent = ''; // Empty by default
        iconPlaceholder.style.fontSize = '24px';
        iconPlaceholder.style.color = '#666';
        slotElement.appendChild(iconPlaceholder);
        
        // Add click handler
        slotElement.addEventListener('click', () => {
            this.handleSlotClick(slotName);
        });
        
        // Add right-click handler
        slotElement.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent default context menu
            
            const item = this.equipmentManager.slots[slotName];
            if (item && item instanceof BagItem) {
                // Open the bag window
                item.open(e.clientX, e.clientY);
            }
        });
        
        // Add drag and drop handlers
        slotElement.addEventListener('dragover', (e) => {
            // Allow dropping
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            slotElement.classList.add('drag-over');
        });
        
        slotElement.addEventListener('dragleave', () => {
            slotElement.classList.remove('drag-over');
        });
        
        slotElement.addEventListener('drop', (e) => {
            e.preventDefault();
            slotElement.classList.remove('drag-over');
            
            // Handle the drop
            if (draggedItem) {
                console.log(`Dropping ${draggedItem.name} into quickslot ${slotName}`);
                
                // If the item is from a bag
                if (draggedItemSource === 'bag' && draggedItemSlot !== null) {
                    // Get the bag
                    const bag = this.equipmentManager.slots[EQUIPMENT_SLOTS.BACKPACK];
                    if (bag && bag instanceof BagItem) {
                        // Remove the item from the bag
                        const item = bag.removeItem(draggedItemSlot);
                        if (item) {
                            // Equip the item to the quickslot
                            this.equipmentManager.equipItem(item, slotName);
                            
                            // Update the bag slot
                            if (bag.windowUI) {
                                bag.windowUI.updateSlot(draggedItemSlot);
                            }
                        }
                    }
                }
                // If the item is from another quickslot
                else if (draggedItemSource === 'quickslot' && draggedItemSlot) {
                    // Move the item between quickslots
                    const item = this.equipmentManager.slots[draggedItemSlot];
                    if (item) {
                        // Unequip from the original slot
                        this.equipmentManager.unequipItem(draggedItemSlot);
                        
                        // Equip to the new slot
                        this.equipmentManager.equipItem(item, slotName);
                    }
                }
            }
        });
        
        // Make quickslots draggable too
        slotElement.setAttribute('draggable', 'true');
        
        slotElement.addEventListener('dragstart', (e) => {
            const item = this.equipmentManager.slots[slotName];
            if (item) {
                // Set the drag data
                draggedItem = item;
                draggedItemSource = 'equipment';
                draggedItemSlot = slotName;
                draggedItemElement = e.target;
                
                // Create a drag image
                const dragImage = document.createElement('div');
                dragImage.style.width = '40px';
                dragImage.style.height = '40px';
                dragImage.style.backgroundColor = item.color;
                dragImage.style.border = `2px solid ${item.getRarityColor()}`;
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                document.body.appendChild(dragImage);
                
                e.dataTransfer.setDragImage(dragImage, 20, 20);
                e.dataTransfer.effectAllowed = 'move';
                
                // Add a class to show it's being dragged
                slotElement.classList.add('dragging');
                
                // Remove the drag image after a short delay
                setTimeout(() => {
                    document.body.removeChild(dragImage);
                }, 100);
            } else {
                // Prevent dragging empty slots
                e.preventDefault();
            }
        });
        
        slotElement.addEventListener('dragend', () => {
            slotElement.classList.remove('dragging');
            
            // Reset drag state
            draggedItem = null;
            draggedItemSource = null;
            draggedItemSlot = null;
            draggedItemElement = null;
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
    
    handleSlotClick(slotName) {
        // Get the item in this slot
        const item = this.equipmentManager.slots[slotName];
        
        // Special handling for bags - don't unequip when clicked
        if (item && item instanceof BagItem) {
            // Just open the bag instead of unequipping it
            item.open(
                window.innerWidth / 2 - 125, // Center horizontally
                window.innerHeight / 2 - 150  // Center vertically
            );
            return;
        }
        
        // For quickslots, just set as active
        if (Object.values(QUICK_SLOTS).includes(slotName)) {
            if (item) {
                this.equipmentManager.setActiveQuickSlot(slotName);
                console.log(`Set ${slotName} as active quickslot with ${item.name}`);
            } else {
                console.log(`Quick slot ${slotName} is empty`);
            }
            return;
        }
        
        // Original behavior for non-bag items in regular slots
        if (item) {
            // Unequip the item
            this.equipmentManager.unequipItem(slotName);
            this.updateSlot(slotName);
        } else {
            // No item in this slot
            console.log(`No item equipped in ${slotName}`);
        }
    }
    
    updateSlot(slotName) {
        const slotElement = this.slotElements[slotName];
        if (!slotElement) {
            console.warn(`Slot element not found for ${slotName}`);
            return;
        }
        
        // Clear the slot
        slotElement.innerHTML = '';
        
        // Get the item in this slot
        const item = this.equipmentManager.slots[slotName];
        
        if (item) {
            // Create item representation
            const itemElement = document.createElement('div');
            itemElement.style.width = '40px';
            itemElement.style.height = '40px';
            itemElement.style.backgroundColor = item.color;
            itemElement.style.border = `2px solid ${item.getRarityColor()}`;
            itemElement.style.borderRadius = '3px';
            
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
                    
                    // Show emoji instead
                    let emoji = '📦'; // Default box
                    if (item.name.toLowerCase().includes('pickaxe')) emoji = '⛏️';
                    else if (item.name.toLowerCase().includes('axe')) emoji = '🪓';
                    else if (item.name.toLowerCase().includes('bag')) emoji = '👜';
                    
                    itemElement.textContent = emoji;
                    itemElement.style.display = 'flex';
                    itemElement.style.justifyContent = 'center';
                    itemElement.style.alignItems = 'center';
                    itemElement.style.fontSize = '24px';
                };
                
                itemElement.appendChild(iconImg);
            } else {
                // Show emoji based on item type
                let emoji = '📦'; // Default box
                if (item.name.toLowerCase().includes('pickaxe')) emoji = '⛏️';
                else if (item.name.toLowerCase().includes('axe')) emoji = '🪓';
                else if (item.name.toLowerCase().includes('bag')) emoji = '👜';
                
                itemElement.textContent = emoji;
                itemElement.style.display = 'flex';
                itemElement.style.justifyContent = 'center';
                itemElement.style.alignItems = 'center';
                itemElement.style.fontSize = '24px';
            }
            
            // Add tooltip
            slotElement.title = `${item.name}\n${item.description}`;
            
            // Add the item element to the slot
            slotElement.appendChild(itemElement);
        } else {
            // Empty slot
            slotElement.title = '';
        }
    }
    
    updateActiveQuickSlot() {
        // Update all quick slots to show which one is active
        for (const slotName in this.quickSlotElements) {
            const slotElement = this.quickSlotElements[slotName];
            
            if (slotName === this.equipmentManager.activeQuickSlot) {
                slotElement.style.border = '1px solid gold';
                slotElement.style.boxShadow = '0 0 5px gold';
            } else {
                slotElement.style.border = '1px solid #555';
                slotElement.style.boxShadow = 'none';
            }
        }
    }
    
    showEquipmentPanel() {
        this.panel.style.display = 'block';
    }
    
    hideEquipmentPanel() {
        this.panel.style.display = 'none';
    }
    
    toggleEquipmentPanel() {
        if (this.panel.style.display === 'none') {
            this.showEquipmentPanel();
        } else {
            this.hideEquipmentPanel();
        }
    }
    
    showQuickbar() {
        this.quickbarPanel.style.display = 'flex';
    }
    
    createQuickSlotsPanel() {
        // Create the quickslots container
        this.quickSlotsPanel = document.createElement('div');
        this.quickSlotsPanel.className = 'quickslots-panel';
        this.quickSlotsPanel.style.position = 'absolute';
        this.quickSlotsPanel.style.bottom = '10px';
        this.quickSlotsPanel.style.left = '50%';
        this.quickSlotsPanel.style.transform = 'translateX(-50%)';
        this.quickSlotsPanel.style.display = 'flex';
        this.quickSlotsPanel.style.gap = '10px';
        this.quickSlotsPanel.style.padding = '10px';
        this.quickSlotsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.quickSlotsPanel.style.border = '2px solid #555';
        this.quickSlotsPanel.style.borderRadius = '5px';
        this.quickSlotsPanel.style.zIndex = '100';
        
        // Create quickslots
        this.quickSlotElements = {};
        
        // Add each quickslot
        for (let i = 0; i < 5; i++) {
            const slotName = `quickSlot${i}`;
            const key = i + 1;
            
            const slotElement = this.createQuickSlotElement(slotName, key);
            this.quickSlotsPanel.appendChild(slotElement);
            this.quickSlotElements[slotName] = slotElement;
        }
        
        // Add the quickslots panel to the document
        document.body.appendChild(this.quickSlotsPanel);
        
        // Add keyboard shortcuts for quickslots
        document.addEventListener('keydown', (e) => {
            // Number keys 1-5
            if (e.key >= '1' && e.key <= '5') {
                const slotIndex = parseInt(e.key) - 1;
                const slotName = `quickSlot${slotIndex}`;
                
                // Set this quickslot as active
                this.equipmentManager.setActiveQuickSlot(slotName);
            }
        });
    }
}

// Example equipment items
const EQUIPMENT_EXAMPLES = {
    leatherHelmet: new EquipmentItem({
        id: 'leather_helmet',
        name: 'Leather Helmet',
        description: 'A simple leather helmet that provides basic protection.',
        slot: EQUIPMENT_SLOTS.HEAD,
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
    EQUIPMENT_EXAMPLES
}; 