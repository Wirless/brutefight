/**
 * EquipmentUI.js - Handles the equipment interface for the game
 */
class EquipmentUI {
    /**
     * Create the equipment UI
     * @param {EquipmentManager} equipmentManager - Reference to the equipment manager
     * @param {Object} options - Configuration options
     */
    constructor(equipmentManager, options = {}) {
        this.equipmentManager = equipmentManager;
        this.isPanelVisible = true;
        this.equipmentPanel = null;
        this.quickbarPanel = null;
        this.slotElements = {};
        this.quickSlotElements = {};
        this.options = options;
        this.compactDisplayContainer = null;
        this.compactSlotElements = {};
        
        // Define default equipment slots if not available globally
        this.EQUIPMENT_SLOTS = window.Equipment && window.Equipment.EQUIPMENT_SLOTS ? 
            window.Equipment.EQUIPMENT_SLOTS : {
                HEAD: 'head',
                CHEST: 'body',
                LEGS: 'legs',
                FEET: 'feet',
                NECKLACE: 'accessory1',
                RING_LEFT: 'accessory2',
                RING_RIGHT: 'accessory3',
                LEFT_HAND: 'offhand',
                RIGHT_HAND: 'pickaxe',
                BACKPACK: 'bag'
            };
            
        // Define default quick slots if not available globally
        this.QUICK_SLOTS = window.Equipment && window.Equipment.QUICK_SLOTS ?
            window.Equipment.QUICK_SLOTS : {
                '0': '0',
                '1': '1',
                '2': '2',
                '3': '3',
                '4': '4',
                '5': '5',
                '6': '6',
                '7': '7',
                '8': '8',
                '9': '9'
            };
        
        // Bind methods
        if (this.updateSlot) this.updateSlot = this.updateSlot.bind(this);
        if (this.toggleEquipmentPanel) this.toggleEquipmentPanel = this.toggleEquipmentPanel.bind(this);
        if (this.handleSlotClick) this.handleSlotClick = this.handleSlotClick.bind(this);
        
        // Initialize UI
        this.init();
    }
    
    /**
     * Initialize the UI components
     */
    init() {
        try {
            this.createUI();
            this.showQuickbar();
            this.showEquipmentPanel();
            this.restoreWindowPosition();
        } catch (err) {
            console.error('Error creating equipment UI:', err);
        }
    }
    
    /**
     * Create all UI elements
     */
    createUI() {
        this.createEquipmentPanel();
        this.createQuickbar();
        this.createInventoryButton();
        this.createEquipmentButton();
    }
    
    /**
     * Create the main equipment panel
     */
    createEquipmentPanel() {
        // Create main container
        this.equipmentPanel = document.createElement('div');
        this.equipmentPanel.id = 'equipmentPanel';
        this.equipmentPanel.className = 'game-panel';
        this.setupPanelStyles(this.equipmentPanel);
        
        // Create header
        const header = this.createPanelHeader();
        this.equipmentPanel.appendChild(header);
        
        // Create grid container for equipment slots
        const gridContainer = this.createSlotGrid();
        this.equipmentPanel.appendChild(gridContainer);
        
        // Add inventory button
        const inventoryButton = this.createInventoryButton();
        this.equipmentPanel.appendChild(inventoryButton);
        
        // Add to document
        document.body.appendChild(this.equipmentPanel);
        
        // Make draggable
        this.makeDraggable(header);
    }
    
    /**
     * Set up the panel's base styles
     * @param {HTMLElement} panel - The panel element to style
     */
    setupPanelStyles(panel) {
        Object.assign(panel.style, {
            position: 'fixed',
            width: '250px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid rgb(0, 233, 150)',
            borderRadius: '5px',
            padding: '15px',
            zIndex: '100',
            display: 'none',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 0 15px rgba(0, 233, 150, 0.3)',
            transition: 'opacity 0.3s ease, transform 0.3s ease'
        });
        
        // Position based on options
        if (this.options.position === 'left') {
            panel.style.left = this.options.outside ? '-250px' : '20px';
            panel.style.top = '50%';
            panel.style.transform = 'translateY(-50%)';
        } else {
            panel.style.right = this.options.outside ? '-250px' : '20px';
            panel.style.top = '50%';
            panel.style.transform = 'translateY(-50%)';
        }
    }
    
    /**
     * Create the panel header with title and close button
     * @returns {HTMLElement} The header element
     */
    createPanelHeader() {
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            cursor: 'grab'
        });
        
        // Add drag handle and title
        const titleContainer = this.createTitleContainer();
        header.appendChild(titleContainer);
        
        // Add close button
        const closeButton = this.createCloseButton();
        header.appendChild(closeButton);
        
        return header;
    }
    
    /**
     * Create the title container with drag handle
     * @returns {HTMLElement} The title container element
     */
    createTitleContainer() {
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        
        // Add drag handle icon
        const dragIcon = document.createElement('div');
        dragIcon.innerHTML = '&#8801;'; // Triple bar icon
        dragIcon.style.marginRight = '10px';
        dragIcon.style.fontSize = '18px';
        dragIcon.style.color = 'rgba(0, 233, 150, 0.7)';
        
        // Add title
        const title = document.createElement('h2');
        title.textContent = 'Equipment';
        title.style.color = 'rgb(0, 233, 150)';
        title.style.margin = '0';
        
        titleContainer.appendChild(dragIcon);
        titleContainer.appendChild(title);
        
        return titleContainer;
    }
    
    /**
     * Create the close button
     * @returns {HTMLElement} The close button element
     */
    createCloseButton() {
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        Object.assign(closeButton.style, {
            backgroundColor: 'transparent',
            border: 'none',
            color: 'rgb(0, 233, 150)',
            fontSize: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        });
        
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.transform = 'scale(1.2)';
            closeButton.style.textShadow = '0 0 8px rgba(0, 233, 150, 0.8)';
        });
        
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.transform = 'scale(1)';
            closeButton.style.textShadow = 'none';
        });
        
        closeButton.addEventListener('click', () => this.toggleEquipmentPanel());
        
        return closeButton;
    }
    
    /**
     * Create the slot grid for equipment
     * @returns {HTMLElement} The grid container element
     */
    createSlotGrid() {
        const gridContainer = document.createElement('div');
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        gridContainer.style.gridTemplateRows = 'repeat(4, auto)';
        gridContainer.style.gap = '10px';
        gridContainer.style.justifyItems = 'center';
        
        // Define the grid layout
        const gridLayout = [
            { slotId: this.EQUIPMENT_SLOTS.NECKLACE, name: 'Necklace', icon: '📿', col: 1, row: 1 },
            { slotId: this.EQUIPMENT_SLOTS.HEAD, name: 'Helmet', icon: '👑', col: 2, row: 1 },
            { slotId: this.EQUIPMENT_SLOTS.BACKPACK, name: 'Bag', icon: '🎒', col: 3, row: 1 },
            { slotId: this.EQUIPMENT_SLOTS.LEFT_HAND, name: 'Left Hand', icon: '🛡️', col: 1, row: 2 },
            { slotId: this.EQUIPMENT_SLOTS.CHEST, name: 'Armor', icon: '👕', col: 2, row: 2 },
            { slotId: this.EQUIPMENT_SLOTS.RIGHT_HAND, name: 'Right Hand', icon: '⚔️', col: 3, row: 2 },
            { slotId: this.EQUIPMENT_SLOTS.RING_LEFT, name: 'Left Ring', icon: '💍', col: 1, row: 3 },
            { slotId: this.EQUIPMENT_SLOTS.LEGS, name: 'Legs', icon: '👖', col: 2, row: 3 },
            { slotId: this.EQUIPMENT_SLOTS.RING_RIGHT, name: 'Right Ring', icon: '💍', col: 3, row: 3 },
            { slotId: this.EQUIPMENT_SLOTS.FEET, name: 'Boots', icon: '👢', col: 2, row: 4 }
        ];
        
        // Create slots based on the grid layout
        for (const slot of gridLayout) {
            const slotElement = this.createSlotElement(slot.slotId, false);
            slotElement.style.gridColumn = slot.col;
            slotElement.style.gridRow = slot.row;
            gridContainer.appendChild(slotElement);
            this.slotElements[slot.slotId] = slotElement;
        }
        
        return gridContainer;
    }
    
    /**
     * Create a slot element
     * @param {string} slotName - Name of the slot
     * @param {boolean} isQuickSlot - Whether this is a quick slot
     * @returns {HTMLElement} The slot element
     */
    createSlotElement(slotName, isQuickSlot) {
        const slotElement = document.createElement('div');
        slotElement.className = isQuickSlot ? 'quick-slot' : 'equipment-slot';
        slotElement.dataset.slot = slotName;
        
        // Style the slot
        Object.assign(slotElement.style, {
            width: '60px',
            height: '60px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '2px solid rgb(0, 233, 150)',
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        });
        
        // Add hover effects
        this.addSlotHoverEffects(slotElement);
        
        // Add drag and drop functionality
        if (!isQuickSlot) {
            this.setupSlotDragDrop(slotElement, slotName);
        }
        
        // Add empty slot icon/emoji
        const emptyIcon = this.createEmptySlotIcon(slotName);
        slotElement.appendChild(emptyIcon);
        
        return slotElement;
    }
    
    /**
     * Add hover effects to a slot
     * @param {HTMLElement} slotElement - The slot element
     */
    addSlotHoverEffects(slotElement) {
        slotElement.addEventListener('mouseover', () => {
            slotElement.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.5)';
            slotElement.style.backgroundColor = 'rgba(0, 50, 30, 0.5)';
        });
        
        slotElement.addEventListener('mouseout', () => {
            slotElement.style.boxShadow = 'none';
            slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        });
    }
    
    /**
     * Set up drag and drop functionality for a slot
     * @param {HTMLElement} slotElement - The slot element
     * @param {string} slotName - Name of the slot
     */
    setupSlotDragDrop(slotElement, slotName) {
        slotElement.addEventListener('dragover', (e) => {
            if (window.draggedItem) {
                e.preventDefault();
                slotElement.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.8)';
                slotElement.style.backgroundColor = 'rgba(0, 80, 50, 0.7)';
            }
        });
        
        slotElement.addEventListener('dragleave', () => {
            slotElement.style.boxShadow = 'none';
            slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        });
        
        slotElement.addEventListener('drop', (e) => this.handleSlotDrop(e, slotElement, slotName));
        slotElement.addEventListener('mousedown', (e) => this.handleSlotMouseDown(e, slotElement, slotName));
    }
    
    /**
     * Handle item drop on a slot
     * @param {DragEvent} e - The drag event
     * @param {HTMLElement} slotElement - The slot element
     * @param {string} slotName - Name of the slot
     */
    handleSlotDrop(e, slotElement, slotName) {
        e.preventDefault();
        slotElement.style.boxShadow = 'none';
        slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        
        if (window.draggedItem) {
            this.equipmentManager.handleItemDrop(window.draggedItem, slotName);
        }
    }
    
    /**
     * Handle mouse down on a slot
     * @param {MouseEvent} e - The mouse event
     * @param {HTMLElement} slotElement - The slot element
     * @param {string} slotName - Name of the slot
     */
    handleSlotMouseDown(e, slotElement, slotName) {
        // Left click - drag item if there is one
        if (e.button === 0) {
            const item = this.equipmentManager.getItemInSlot(slotName);
            if (item) {
                this.startDraggingItem(item, slotElement, slotName);
            }
        }
    }
    
    /**
     * Start dragging an item
     * @param {Object} item - The item being dragged
     * @param {HTMLElement} slotElement - The slot element
     * @param {string} slotName - Name of the slot
     */
    startDraggingItem(item, slotElement, slotName) {
        slotElement.draggable = true;
        
        slotElement.addEventListener('dragstart', (e) => {
            window.draggedItem = item;
            window.draggedItemSource = 'equipment';
            window.draggedItemSlot = slotName;
            
            // Create drag image
            const dragImage = this.createDragImage(item);
            document.body.appendChild(dragImage);
            window.draggedItemElement = dragImage;
            
            e.dataTransfer.setDragImage(dragImage, 10, 10);
            e.dataTransfer.effectAllowed = 'move';
        });
        
        slotElement.addEventListener('dragend', () => {
            slotElement.draggable = false;
            if (window.draggedItemElement) {
                window.draggedItemElement.remove();
                window.draggedItemElement = null;
            }
        });
    }
    
    /**
     * Create a drag image for an item
     * @param {Object} item - The item
     * @returns {HTMLElement} The drag image element
     */
    createDragImage(item) {
        const dragImage = document.createElement('div');
        Object.assign(dragImage.style, {
            position: 'absolute',
            left: '-9999px',
            background: 'rgba(0,0,0,0.7)',
            padding: '10px',
            borderRadius: '5px'
        });
        dragImage.textContent = item.name;
        return dragImage;
    }
    
    /**
     * Toggle the equipment panel visibility
     */
    toggleEquipmentPanel() {
        if (!this.isPanelVisible) {
            this.showEquipmentPanel();
        } else {
            this.hideEquipmentPanel();
        }
    }
    
    /**
     * Show the equipment panel
     */
    showEquipmentPanel() {
        this.equipmentPanel.style.display = 'flex';
        this.equipmentPanel.style.opacity = '0';
        this.equipmentPanel.style.transform = 'scale(0.9) translateY(-20px)';
        
        setTimeout(() => {
            this.equipmentPanel.style.opacity = '1';
            this.equipmentPanel.style.transform = 'scale(1) translateY(0)';
        }, 10);
        
        this.addPulseEffect();
        this.isPanelVisible = true;
        
        if (this.equipmentButton) {
            this.equipmentButton.style.border = '2px solid rgb(0, 233, 150)';
            this.equipmentButton.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.5)';
        }
    }
    
    /**
     * Hide the equipment panel
     */
    hideEquipmentPanel() {
        this.equipmentPanel.style.opacity = '0';
        this.equipmentPanel.style.transform = 'scale(0.9) translateY(-10px)';
        
        setTimeout(() => {
            this.equipmentPanel.style.display = 'none';
            this.equipmentPanel.style.transform = 'scale(1) translateY(0)';
            this.removePulseEffect();
        }, 300);
        
        this.isPanelVisible = false;
        
        if (this.equipmentButton) {
            this.equipmentButton.style.border = '2px solid rgba(0, 233, 150, 0.5)';
            this.equipmentButton.style.boxShadow = '0 0 5px rgba(0, 233, 150, 0.2)';
        }
    }
    
    /**
     * Add pulse effect to the panel
     */
    addPulseEffect() {
        const styleElement = document.createElement('style');
        styleElement.id = 'equipment-pulse-animation';
        styleElement.textContent = `
            @keyframes equipmentBorderPulse {
                0% { box-shadow: 0 0 15px rgba(0, 233, 150, 0.5); }
                50% { box-shadow: 0 0 25px rgba(0, 233, 150, 0.8); }
                100% { box-shadow: 0 0 15px rgba(0, 233, 150, 0.5); }
            }
        `;
        document.head.appendChild(styleElement);
        
        this.equipmentPanel.style.animation = 'equipmentBorderPulse 2s ease-in-out 3';
        
        setTimeout(() => this.removePulseEffect(), 6000);
    }
    
    /**
     * Remove pulse effect from the panel
     */
    removePulseEffect() {
        if (!this.equipmentPanel) return;
        
        this.equipmentPanel.style.animation = 'none';
        const styleElement = document.getElementById('equipment-pulse-animation');
        if (styleElement) {
            document.head.removeChild(styleElement);
        }
    }
    
    /**
     * Save window position to localStorage
     */
    saveWindowPosition() {
        if (!this.equipmentPanel) return;
        
        const position = {
            left: this.equipmentPanel.style.left,
            top: this.equipmentPanel.style.top,
            right: this.equipmentPanel.style.right
        };
        
        try {
            localStorage.setItem('equipmentWindowPosition', JSON.stringify(position));
            console.log('Equipment window position saved:', position);
        } catch (error) {
            console.error('Error saving equipment window position:', error);
        }
    }
    
    /**
     * Restore window position from localStorage
     */
    restoreWindowPosition() {
        try {
            const savedPosition = localStorage.getItem('equipmentWindowPosition');
            if (savedPosition && this.equipmentPanel) {
                const position = JSON.parse(savedPosition);
                
                if (position.left && position.left !== 'auto') {
                    this.equipmentPanel.style.left = position.left;
                    this.equipmentPanel.style.right = 'auto';
                    this.equipmentPanel.style.transform = 'none';
                } else if (position.right && position.right !== 'auto') {
                    this.equipmentPanel.style.right = position.right;
                    this.equipmentPanel.style.left = 'auto';
                    this.equipmentPanel.style.transform = 'none';
                }
                
                if (position.top && position.top !== 'auto') {
                    this.equipmentPanel.style.top = position.top;
                    this.equipmentPanel.style.transform = 'none';
                }
            }
        } catch (error) {
            console.error('Error restoring equipment window position:', error);
        }
    }
}

// Export the class
export default EquipmentUI; 