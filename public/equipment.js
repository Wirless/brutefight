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
    '1': 'quickSlot1',
    '2': 'quickSlot2',
    '3': 'quickSlot3',
    '4': 'quickSlot4',
    '5': 'quickSlot5',
    '6': 'quickSlot6',
    '7': 'quickSlot7',
    '8': 'quickSlot8',
    '9': 'quickSlot9',
    '0': 'quickSlot0'
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
                    itemElement.textContent = item.name.charAt(0);
                    itemElement.style.display = 'flex';
                    itemElement.style.justifyContent = 'center';
                    itemElement.style.alignItems = 'center';
                    itemElement.style.color = 'white';
                    itemElement.style.fontWeight = 'bold';
                };
                
                itemElement.appendChild(iconImg);
            } else {
                // Otherwise show first letter of item name
                itemElement.textContent = item.name.charAt(0);
                itemElement.style.display = 'flex';
                itemElement.style.justifyContent = 'center';
                itemElement.style.alignItems = 'center';
                itemElement.style.color = 'white';
                itemElement.style.fontWeight = 'bold';
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
        this.player = player;
        this.slots = {};
        this.quickSlots = {};
        this.activeQuickSlot = 'quickSlot1'; // Default active slot
        
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
    constructor(equipmentManager) {
        this.equipmentManager = equipmentManager;
        this.isPanelVisible = false;
        this.equipmentPanel = null;
        this.quickbarPanel = null;
        this.slotElements = {};
        this.quickSlotElements = {};
        
        this.createUI();
        
        // Add CSS for drag and drop
        const style = document.createElement('style');
        style.textContent = `
            .dragging {
                opacity: 0.5;
            }
            .drag-over {
                background-color: rgba(100, 100, 255, 0.3) !important;
                border: 2px dashed #aaf !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    createUI() {
        this.createEquipmentPanel();
        this.createQuickbar();
    }
    
    createEquipmentPanel() {
        // Create main container
        this.equipmentPanel = document.createElement('div');
        this.equipmentPanel.id = 'equipmentPanel';
        this.equipmentPanel.className = 'game-panel';
        this.equipmentPanel.style.position = 'absolute';
        this.equipmentPanel.style.left = '10px';
        this.equipmentPanel.style.top = '50%';
        this.equipmentPanel.style.transform = 'translateY(-50%)';
        this.equipmentPanel.style.width = '180px';
        this.equipmentPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.equipmentPanel.style.border = '2px solid #444';
        this.equipmentPanel.style.borderRadius = '5px';
        this.equipmentPanel.style.padding = '10px';
        this.equipmentPanel.style.color = 'white';
        this.equipmentPanel.style.display = 'none'; // Hidden by default
        this.equipmentPanel.style.zIndex = '100';
        
        // Create title
        const title = document.createElement('div');
        title.textContent = 'Equipment';
        title.style.textAlign = 'center';
        title.style.fontSize = '18px';
        title.style.marginBottom = '10px';
        title.style.borderBottom = '1px solid #555';
        title.style.paddingBottom = '5px';
        this.equipmentPanel.appendChild(title);
        
        // Create slots container
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'equipment-slots';
        slotsContainer.style.display = 'grid';
        slotsContainer.style.gridTemplateColumns = '1fr';
        slotsContainer.style.gap = '5px';
        this.equipmentPanel.appendChild(slotsContainer);
        
        // Create each equipment slot
        for (const slotKey in EQUIPMENT_SLOTS) {
            const slotName = EQUIPMENT_SLOTS[slotKey];
            const slotElement = this.createSlotElement(slotName, false);
            slotsContainer.appendChild(slotElement);
            this.slotElements[slotName] = slotElement;
        }
        
        // Create hotkey guide
        const hotkeyGuide = document.createElement('div');
        hotkeyGuide.textContent = 'Press E to toggle equipment panel';
        hotkeyGuide.style.textAlign = 'center';
        hotkeyGuide.style.fontSize = '12px';
        hotkeyGuide.style.marginTop = '10px';
        hotkeyGuide.style.color = '#aaa';
        this.equipmentPanel.appendChild(hotkeyGuide);
        
        // Add to document
        document.body.appendChild(this.equipmentPanel);
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
    
    createSlotElement(slotName, isQuickSlot) {
        // Create slot container
        const slotElement = document.createElement('div');
        slotElement.className = `equipment-slot ${slotName}`;
        slotElement.dataset.slot = slotName;
        slotElement.style.display = 'flex';
        slotElement.style.alignItems = 'center';
        slotElement.style.backgroundColor = 'rgba(40, 40, 40, 0.8)';
        slotElement.style.border = '1px solid #555';
        slotElement.style.borderRadius = '3px';
        slotElement.style.padding = '5px';
        slotElement.style.cursor = 'pointer';
        
        // Create slot icon container
        const iconContainer = document.createElement('div');
        iconContainer.className = 'slot-icon';
        iconContainer.style.width = '30px';
        iconContainer.style.height = '30px';
        iconContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        iconContainer.style.border = '1px solid #666';
        iconContainer.style.borderRadius = '3px';
        iconContainer.style.marginRight = '8px';
        iconContainer.style.position = 'relative';
        iconContainer.style.display = 'flex';
        iconContainer.style.justifyContent = 'center';
        iconContainer.style.alignItems = 'center';
        iconContainer.style.color = '#999';
        
        // Add slot icon or placeholder
        const slotIcon = document.createElement('div');
        slotIcon.textContent = this.getSlotEmoji(slotName);
        slotIcon.style.fontSize = '16px';
        iconContainer.appendChild(slotIcon);
        
        slotElement.appendChild(iconContainer);
        
        // Create slot info container
        const infoContainer = document.createElement('div');
        infoContainer.className = 'slot-info';
        infoContainer.style.flex = '1';
        infoContainer.style.overflow = 'hidden';
        
        // Create slot name
        const slotLabel = document.createElement('div');
        slotLabel.className = 'slot-name';
        slotLabel.textContent = this.formatSlotName(slotName);
        slotLabel.style.fontSize = '12px';
        slotLabel.style.fontWeight = 'bold';
        infoContainer.appendChild(slotLabel);
        
        // Create slot item (empty by default)
        const slotItemName = document.createElement('div');
        slotItemName.className = 'slot-item-name';
        slotItemName.textContent = 'Empty';
        slotItemName.style.fontSize = '10px';
        slotItemName.style.color = '#aaa';
        slotItemName.style.whiteSpace = 'nowrap';
        slotItemName.style.overflow = 'hidden';
        slotItemName.style.textOverflow = 'ellipsis';
        infoContainer.appendChild(slotItemName);
        
        slotElement.appendChild(infoContainer);
        
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
            this.handleSlotClick(slotName, true);
        });
        
        // Add right-click handler
        slotElement.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent default context menu
            
            const item = this.equipmentManager.quickSlots[slotName];
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
                    const bag = this.equipmentManager.getEquippedItem(EQUIPMENT_SLOTS.BACKPACK);
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
                            
                            // Update the quickslot
                            this.updateQuickSlot(slotName);
                        }
                    }
                }
                // If the item is from another quickslot
                else if (draggedItemSource === 'quickslot' && draggedItemSlot) {
                    // Move the item between quickslots
                    const item = this.equipmentManager.getEquippedItem(draggedItemSlot);
                    if (item) {
                        // Unequip from the original slot
                        this.equipmentManager.unequipItem(draggedItemSlot);
                        
                        // Equip to the new slot
                        this.equipmentManager.equipItem(item, slotName);
                        
                        // Update both slots
                        this.updateQuickSlot(draggedItemSlot);
                        this.updateQuickSlot(slotName);
                    }
                }
            }
        });
        
        // Make quickslots draggable too
        slotElement.setAttribute('draggable', 'true');
        
        slotElement.addEventListener('dragstart', (e) => {
            const item = this.equipmentManager.getEquippedItem(slotName);
            if (item) {
                // Set the drag data
                draggedItem = item;
                draggedItemSource = 'quickslot';
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
                iconPlaceholder.textContent = '';
                
                // Create color block representing item
                const itemIcon = document.createElement('div');
                itemIcon.style.width = '32px';
                itemIcon.style.height = '32px';
                itemIcon.style.backgroundColor = item.color;
                itemIcon.style.border = `2px solid ${item.getRarityColor()}`;
                itemIcon.style.borderRadius = '4px';
                
                // If there's an icon image, use it
                if (item.icon) {
                    const iconImg = document.createElement('img');
                    iconImg.src = item.icon;
                    iconImg.style.width = '100%';
                    iconImg.style.height = '100%';
                    iconImg.style.objectFit = 'contain';
                    
                    // Handle image loading errors
                    iconImg.onerror = () => {
                        console.warn(`Failed to load icon: ${item.icon}`);
                        // Fallback to showing first letter of item name
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
                
                iconPlaceholder.appendChild(itemIcon);
                
                // Add tooltip
                slotElement.title = `${item.name}\n${item.description}`;
            } else {
                // Reset to empty
                iconPlaceholder.textContent = '';
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
                itemNameElement.textContent = item.name;
                itemNameElement.style.color = item.getRarityColor();
                
                // Update icon if available
                if (item.icon) {
                    // Clear the icon container
                    iconContainer.innerHTML = '';
                    
                    // Create and add the icon image
                    const iconImg = document.createElement('img');
                    iconImg.src = item.icon;
                    iconImg.style.width = '100%';
                    iconImg.style.height = '100%';
                    iconImg.style.objectFit = 'contain';
                    iconContainer.appendChild(iconImg);
                } else {
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
                // Reset to empty state
                itemNameElement.textContent = 'Empty';
                itemNameElement.style.color = '#aaa';
                
                // Reset icon to slot emoji
                iconContainer.innerHTML = '';
                const slotIcon = document.createElement('div');
                slotIcon.textContent = this.getSlotEmoji(slotName);
                slotIcon.style.fontSize = '16px';
                iconContainer.appendChild(slotIcon);
                
                // Remove tooltip
                slotElement.title = '';
            }
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
        this.quickbarPanel.style.display = 'flex';
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