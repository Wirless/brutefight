/**
 * InventoryUI.js
 * 
 * Handles the rendering and interaction of the player inventory UI
 */
class InventoryUI {
    /**
     * @param {Game} game - The main game instance
     * @param {Object} options - UI configuration options
     */
    constructor(game, options = {}) {
        this.game = game;
        this.inventory = null;
        this.options = Object.assign({
            slotSize: 50,
            columns: 4,
            rows: 4,
            container: document.body,
            draggable: true,
            title: 'Inventory',
            defaultPosition: { x: 20, y: 80 }
        }, options);

        // UI Elements
        this.uiElement = null;
        this.slotElements = [];
        this.isDraggingItem = false;
        this.draggedItem = null;
        this.draggedElement = null;
        this.dragOriginSlot = null;
        this.isVisible = false;

        // Hover tooltip
        this.hoverTimeout = null;
        this.currentTooltip = null;

        // Bind methods
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.toggle = this.toggle.bind(this);

        // Event listeners for global mouse events (when dragging)
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    /**
     * Initialize the UI
     * @param {Inventory} inventory - The inventory to display
     * @returns {InventoryUI} - This instance for chaining
     */
    init(inventory) {
        this.inventory = inventory;
        this.createUI();
        
        // Start hidden
        this.hide();

        return this;
    }

    /**
     * Create the inventory UI elements
     */
    createUI() {
        // Main container
        this.uiElement = document.createElement('div');
        this.uiElement.className = 'inventory-ui';
        this.uiElement.style.position = 'absolute';
        this.uiElement.style.width = `${this.options.columns * this.options.slotSize + 20}px`;
        this.uiElement.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        this.uiElement.style.borderRadius = '6px';
        this.uiElement.style.border = '2px solid #555';
        this.uiElement.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        this.uiElement.style.padding = '10px';
        this.uiElement.style.zIndex = '100';
        this.uiElement.style.userSelect = 'none';
        this.uiElement.style.touchAction = 'none';

        // Set initial position
        const { x, y } = this.options.defaultPosition;
        this.uiElement.style.left = `${x}px`;
        this.uiElement.style.top = `${y}px`;

        // Title
        const titleBar = document.createElement('div');
        titleBar.className = 'inventory-title-bar';
        titleBar.style.display = 'flex';
        titleBar.style.justifyContent = 'space-between';
        titleBar.style.alignItems = 'center';
        titleBar.style.marginBottom = '10px';
        titleBar.style.cursor = 'move';
        titleBar.style.padding = '5px';
        titleBar.style.backgroundColor = 'rgba(50, 50, 50, 0.7)';
        titleBar.style.borderRadius = '4px';

        const title = document.createElement('div');
        title.className = 'inventory-title';
        title.textContent = this.options.title;
        title.style.color = 'white';
        title.style.fontWeight = 'bold';
        titleBar.appendChild(title);

        // Close button
        const closeButton = document.createElement('button');
        closeButton.className = 'inventory-close-button';
        closeButton.textContent = '×';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '0 5px';
        closeButton.style.marginLeft = '10px';
        closeButton.addEventListener('click', () => this.hide());
        titleBar.appendChild(closeButton);

        this.uiElement.appendChild(titleBar);

        // Grid container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'inventory-grid';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = `repeat(${this.options.columns}, ${this.options.slotSize}px)`;
        gridContainer.style.gridGap = '4px';
        gridContainer.style.justifyContent = 'center';
        this.uiElement.appendChild(gridContainer);

        // Create slots
        const totalSlots = this.options.rows * this.options.columns;
        for (let i = 0; i < totalSlots; i++) {
            const slot = this.createSlotElement(i);
            gridContainer.appendChild(slot);
            this.slotElements.push(slot);
        }

        // Add to DOM
        this.options.container.appendChild(this.uiElement);

        // Make draggable
        if (this.options.draggable) {
            this.makeDraggable(titleBar);
        }

        // Restore previous position
        this.restoreWindowPosition();
    }

    /**
     * Create a single inventory slot element
     * @param {number} slotIndex - The index of the slot
     * @returns {HTMLElement} - The created slot element
     */
    createSlotElement(slotIndex) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.slotIndex = slotIndex;
        slot.style.width = `${this.options.slotSize}px`;
        slot.style.height = `${this.options.slotSize}px`;
        slot.style.backgroundColor = 'rgba(70, 70, 70, 0.5)';
        slot.style.border = '1px solid #555';
        slot.style.borderRadius = '4px';
        slot.style.display = 'flex';
        slot.style.justifyContent = 'center';
        slot.style.alignItems = 'center';
        slot.style.position = 'relative';
        slot.style.cursor = 'pointer';

        // Add event listeners
        slot.addEventListener('click', () => this.handleSlotClick(slotIndex));
        slot.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleSlotRightClick(slotIndex);
        });

        // Hover effects
        slot.addEventListener('mouseenter', () => {
            slot.style.backgroundColor = 'rgba(90, 90, 90, 0.6)';
            this.showItemTooltip(slotIndex, slot);
        });

        slot.addEventListener('mouseleave', () => {
            slot.style.backgroundColor = 'rgba(70, 70, 70, 0.5)';
            this.hideTooltip();
        });

        // Drag start
        slot.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left click
            const item = this.inventory.getItem(slotIndex);
            if (item) {
                e.preventDefault();
                this.startDrag(slotIndex, e);
            }
        });

        return slot;
    }

    /**
     * Handle left-click on an inventory slot
     * @param {number} slotIndex - The index of the clicked slot
     */
    handleSlotClick(slotIndex) {
        // Get the item in the slot
        const item = this.inventory.getItem(slotIndex);
        
        // If there's an item and we're not dragging
        if (item && !this.isDraggingItem) {
            // Here you can implement different actions:
            // - Equip the item if it's equipment
            // - Use the item if it's usable
            // - Etc.
            
            console.log(`Clicked on ${item.name} in slot ${slotIndex}`);
            
            // Example: Try to equip if there's an equipment manager
            if (this.game.equipmentManager && 
                (item.type === 'weapon' || item.type === 'tool' || item.type === 'armor')) {
                this.game.equipmentManager.equipFromInventory(slotIndex);
            }
            // Example: Use if it's a consumable
            else if (item.type === 'consumable') {
                if (item.use(this.game.myPlayer)) {
                    // If the item was fully consumed (returned true), remove it
                    this.inventory.removeItem(slotIndex);
                }
                // Update the UI to reflect changes
                this.updateSlot(slotIndex);
            }
        }
    }

    /**
     * Handle right-click on an inventory slot
     * @param {number} slotIndex - The index of the right-clicked slot
     */
    handleSlotRightClick(slotIndex) {
        // Get the item in the slot
        const item = this.inventory.getItem(slotIndex);
        
        if (item) {
            // Create a context menu
            this.showContextMenu(item, slotIndex);
        }
    }

    /**
     * Show a context menu for an item
     * @param {Item} item - The item to show menu for
     * @param {number} slotIndex - The slot index
     */
    showContextMenu(item, slotIndex) {
        // Remove any existing context menu
        this.hideContextMenu();
        
        // Create menu
        const menu = document.createElement('div');
        menu.className = 'item-context-menu';
        menu.style.position = 'absolute';
        menu.style.zIndex = '1000';
        menu.style.backgroundColor = 'rgba(40, 40, 40, 0.95)';
        menu.style.border = '1px solid #555';
        menu.style.borderRadius = '4px';
        menu.style.padding = '5px 0';
        menu.style.minWidth = '150px';
        menu.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        
        // Position menu near the cursor
        const slot = this.slotElements[slotIndex];
        const rect = slot.getBoundingClientRect();
        menu.style.left = `${rect.right}px`;
        menu.style.top = `${rect.top}px`;
        
        // Add menu items
        const addMenuItem = (label, action) => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = label;
            menuItem.style.padding = '5px 10px';
            menuItem.style.cursor = 'pointer';
            menuItem.style.color = 'white';
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = 'rgba(100, 100, 100, 0.5)';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });
            
            menuItem.addEventListener('click', () => {
                action();
                this.hideContextMenu();
            });
            
            menu.appendChild(menuItem);
        };
        
        // Add common actions
        addMenuItem('Use', () => {
            if (item.use(this.game.myPlayer)) {
                this.inventory.removeItem(slotIndex);
                this.updateSlot(slotIndex);
            }
        });
        
        if (item.type === 'weapon' || item.type === 'tool' || item.type === 'armor') {
            addMenuItem('Equip', () => {
                if (this.game.equipmentManager) {
                    this.game.equipmentManager.equipFromInventory(slotIndex);
                }
            });
        }
        
        addMenuItem('Drop', () => {
            // Drop the item in the world
            const player = this.game.myPlayer;
            if (player && item) {
                // Remove from inventory
                this.inventory.removeItem(slotIndex);
                
                // Add to world at player's position
                item.drop(player.x, player.y);
                
                // TODO: Notify the game to add this item to the world
                if (this.game.itemManager) {
                    this.game.itemManager.addItemToWorld(item);
                }
                
                this.updateSlot(slotIndex);
            }
        });
        
        // Add to DOM and set up click-outside-to-close
        document.body.appendChild(menu);
        
        // Close when clicking outside
        const closeOnClickOutside = (e) => {
            if (!menu.contains(e.target)) {
                this.hideContextMenu();
                document.removeEventListener('click', closeOnClickOutside);
            }
        };
        
        // Use timeout to avoid immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeOnClickOutside);
        }, 0);
        
        // Store reference
        this.contextMenu = menu;
    }

    /**
     * Hide any visible context menu
     */
    hideContextMenu() {
        if (this.contextMenu && this.contextMenu.parentNode) {
            this.contextMenu.parentNode.removeChild(this.contextMenu);
        }
        this.contextMenu = null;
    }

    /**
     * Show tooltip for an item
     * @param {number} slotIndex - The slot index
     * @param {HTMLElement} element - The element to show tooltip for
     */
    showItemTooltip(slotIndex, element) {
        const item = this.inventory.getItem(slotIndex);
        if (!item) return;
        
        // Clear any existing timeout
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
        }
        
        // Set timeout to show tooltip (delay to prevent flickering)
        this.hoverTimeout = setTimeout(() => {
            // Hide any existing tooltip
            this.hideTooltip();
            
            // Create tooltip
            const tooltip = item.createTooltip();
            
            // Position tooltip
            item.positionTooltip(tooltip, element);
            
            // Add to DOM
            document.body.appendChild(tooltip);
            
            // Store reference
            this.currentTooltip = tooltip;
        }, 300);
    }

    /**
     * Hide any visible tooltip
     */
    hideTooltip() {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
        
        if (this.currentTooltip && this.currentTooltip.parentNode) {
            this.currentTooltip.parentNode.removeChild(this.currentTooltip);
        }
        this.currentTooltip = null;
    }

    /**
     * Start dragging an item
     * @param {number} slotIndex - The index of the slot to drag from
     * @param {MouseEvent} e - The mouse event
     */
    startDrag(slotIndex, e) {
        const item = this.inventory.getItem(slotIndex);
        if (!item) return;
        
        this.isDraggingItem = true;
        this.draggedItem = item;
        this.dragOriginSlot = slotIndex;
        
        // Create drag visual
        const dragElement = document.createElement('div');
        dragElement.className = 'dragged-item';
        dragElement.style.position = 'absolute';
        dragElement.style.width = `${this.options.slotSize}px`;
        dragElement.style.height = `${this.options.slotSize}px`;
        dragElement.style.backgroundColor = item.color;
        dragElement.style.border = `2px solid ${item.getRarityColor()}`;
        dragElement.style.borderRadius = '4px';
        dragElement.style.pointerEvents = 'none';
        dragElement.style.zIndex = '1000';
        dragElement.style.opacity = '0.8';
        dragElement.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        
        // If item has an icon
        if (item.icon) {
            const img = document.createElement('img');
            img.src = item.icon;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            dragElement.appendChild(img);
        } else {
            // Display the first letter of the item name
            dragElement.textContent = item.name.charAt(0);
            dragElement.style.display = 'flex';
            dragElement.style.justifyContent = 'center';
            dragElement.style.alignItems = 'center';
            dragElement.style.color = 'white';
            dragElement.style.fontSize = '20px';
            dragElement.style.fontWeight = 'bold';
        }
        
        // Show count if stackable
        if (item.stackable && item.count > 1) {
            const countElement = document.createElement('div');
            countElement.className = 'item-count';
            countElement.textContent = item.count;
            countElement.style.position = 'absolute';
            countElement.style.bottom = '2px';
            countElement.style.right = '2px';
            countElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            countElement.style.color = 'white';
            countElement.style.padding = '2px 4px';
            countElement.style.borderRadius = '3px';
            countElement.style.fontSize = '12px';
            
            dragElement.appendChild(countElement);
        }
        
        // Position at cursor
        const moveHandler = (moveEvent) => {
            dragElement.style.left = `${moveEvent.clientX - this.options.slotSize / 2}px`;
            dragElement.style.top = `${moveEvent.clientY - this.options.slotSize / 2}px`;
        };
        
        // Initial position
        moveHandler(e);
        
        // Add to DOM
        document.body.appendChild(dragElement);
        
        // Store reference
        this.draggedElement = dragElement;
    }

    /**
     * Handle mouse movement while dragging
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseMove(e) {
        if (this.isDraggingItem && this.draggedElement) {
            // Move the dragged element with cursor
            this.draggedElement.style.left = `${e.clientX - this.options.slotSize / 2}px`;
            this.draggedElement.style.top = `${e.clientY - this.options.slotSize / 2}px`;
            
            // Highlight the slot under the cursor
            this.highlightSlotUnderCursor(e);
        }
    }

    /**
     * Highlight the inventory slot under the cursor while dragging
     * @param {MouseEvent} e - The mouse event
     */
    highlightSlotUnderCursor(e) {
        // Remove previous highlights
        this.slotElements.forEach(slot => {
            slot.style.backgroundColor = 'rgba(70, 70, 70, 0.5)';
        });
        
        // Find slot under cursor
        for (let i = 0; i < this.slotElements.length; i++) {
            const slot = this.slotElements[i];
            const rect = slot.getBoundingClientRect();
            
            if (e.clientX >= rect.left && e.clientX <= rect.right && 
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                // Highlight this slot
                slot.style.backgroundColor = 'rgba(100, 100, 100, 0.7)';
                break;
            }
        }
    }

    /**
     * Handle mouse up event (end dragging)
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseUp(e) {
        if (this.isDraggingItem && this.draggedElement) {
            // Find the slot under the cursor
            for (let i = 0; i < this.slotElements.length; i++) {
                const slot = this.slotElements[i];
                const rect = slot.getBoundingClientRect();
                
                if (e.clientX >= rect.left && e.clientX <= rect.right && 
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    
                    const targetSlotIndex = parseInt(slot.dataset.slotIndex);
                    this.moveItem(this.dragOriginSlot, targetSlotIndex);
                    break;
                }
            }
            
            // Clean up drag state
            this.endDrag();
        }
    }

    /**
     * Move an item between slots
     * @param {number} fromSlot - Source slot index
     * @param {number} toSlot - Target slot index
     */
    moveItem(fromSlot, toSlot) {
        if (fromSlot === toSlot) return;
        
        const fromItem = this.inventory.getItem(fromSlot);
        const toItem = this.inventory.getItem(toSlot);
        
        if (!fromItem) return;
        
        // Swap items
        if (toItem) {
            // If same item type and stackable
            if (fromItem.name === toItem.name && fromItem.stackable && toItem.stackable) {
                // Combine stacks
                const totalCount = fromItem.count + toItem.count;
                const maxStack = fromItem.maxStack;
                
                if (totalCount <= maxStack) {
                    // Can fit in one stack
                    toItem.count = totalCount;
                    this.inventory.removeItem(fromSlot);
                } else {
                    // Split between stacks
                    toItem.count = maxStack;
                    fromItem.count = totalCount - maxStack;
                }
            } else {
                // Different items, just swap
                this.inventory.setItem(fromSlot, toItem);
                this.inventory.setItem(toSlot, fromItem);
            }
        } else {
            // Move to empty slot
            this.inventory.setItem(toSlot, fromItem);
            this.inventory.removeItem(fromSlot);
        }
        
        // Update UI
        this.updateSlot(fromSlot);
        this.updateSlot(toSlot);
    }

    /**
     * End the item drag operation
     */
    endDrag() {
        this.isDraggingItem = false;
        
        // Remove the dragged element
        if (this.draggedElement && this.draggedElement.parentNode) {
            this.draggedElement.parentNode.removeChild(this.draggedElement);
        }
        
        // Reset slot highlights
        this.slotElements.forEach(slot => {
            slot.style.backgroundColor = 'rgba(70, 70, 70, 0.5)';
        });
        
        // Clear references
        this.draggedElement = null;
        this.draggedItem = null;
        this.dragOriginSlot = null;
    }

    /**
     * Update a specific inventory slot display
     * @param {number} slotIndex - The index of the slot to update
     */
    updateSlot(slotIndex) {
        const slot = this.slotElements[slotIndex];
        if (!slot) return;
        
        // Clear the slot
        while (slot.firstChild) {
            slot.removeChild(slot.firstChild);
        }
        
        // Get the item
        const item = this.inventory.getItem(slotIndex);
        
        if (item) {
            // Create item display
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.style.width = '80%';
            itemElement.style.height = '80%';
            itemElement.style.backgroundColor = item.color;
            itemElement.style.border = `2px solid ${item.getRarityColor()}`;
            itemElement.style.borderRadius = '4px';
            itemElement.style.display = 'flex';
            itemElement.style.justifyContent = 'center';
            itemElement.style.alignItems = 'center';
            
            // If item has an icon
            if (item.icon) {
                const img = document.createElement('img');
                img.src = item.icon;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                
                // Handle image loading errors
                img.onerror = () => {
                    console.warn(`Failed to load icon: ${item.icon}`);
                    img.style.display = 'none';
                    itemElement.textContent = item.name.charAt(0);
                    itemElement.style.color = 'white';
                    itemElement.style.fontSize = '18px';
                    itemElement.style.fontWeight = 'bold';
                };
                
                itemElement.appendChild(img);
            } else {
                // Display the first letter of the item name
                itemElement.textContent = item.name.charAt(0);
                itemElement.style.color = 'white';
                itemElement.style.fontSize = '18px';
                itemElement.style.fontWeight = 'bold';
            }
            
            // Show count if stackable
            if (item.stackable && item.count > 1) {
                const countElement = document.createElement('div');
                countElement.className = 'item-count';
                countElement.textContent = item.count;
                countElement.style.position = 'absolute';
                countElement.style.bottom = '2px';
                countElement.style.right = '2px';
                countElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                countElement.style.color = 'white';
                countElement.style.padding = '2px 4px';
                countElement.style.borderRadius = '3px';
                countElement.style.fontSize = '12px';
                
                itemElement.appendChild(countElement);
            }
            
            slot.appendChild(itemElement);
        } else {
            // Empty slot indicator
            const emptyIndicator = document.createElement('div');
            emptyIndicator.className = 'slot-indicator';
            emptyIndicator.textContent = '';
            emptyIndicator.style.fontSize = '20px';
            emptyIndicator.style.color = '#555';
            
            slot.appendChild(emptyIndicator);
        }
    }

    /**
     * Update all slots at once
     */
    updateAllSlots() {
        for (let i = 0; i < this.slotElements.length; i++) {
            this.updateSlot(i);
        }
    }

    /**
     * Toggle the inventory visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show the inventory
     */
    show() {
        if (this.uiElement) {
            this.uiElement.style.display = 'block';
            this.isVisible = true;
            this.updateAllSlots();
            this.addPulseEffect();
        }
    }

    /**
     * Hide the inventory
     */
    hide() {
        if (this.uiElement) {
            this.uiElement.style.display = 'none';
            this.isVisible = false;
            this.hideTooltip();
            this.hideContextMenu();
            this.endDrag();
        }
    }

    /**
     * Save the window position to localStorage
     */
    saveWindowPosition() {
        if (!this.uiElement) return;
        
        const position = {
            x: parseInt(this.uiElement.style.left),
            y: parseInt(this.uiElement.style.top)
        };
        
        try {
            localStorage.setItem('inventory_position', JSON.stringify(position));
        } catch (e) {
            console.warn('Failed to save inventory position:', e);
        }
    }

    /**
     * Restore the window position from localStorage
     */
    restoreWindowPosition() {
        try {
            const positionStr = localStorage.getItem('inventory_position');
            if (positionStr) {
                const position = JSON.parse(positionStr);
                this.uiElement.style.left = `${position.x}px`;
                this.uiElement.style.top = `${position.y}px`;
            }
        } catch (e) {
            console.warn('Failed to restore inventory position:', e);
        }
    }

    /**
     * Make the inventory window draggable
     * @param {HTMLElement} dragHandle - Element that triggers dragging
     */
    makeDraggable(dragHandle) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        dragHandle.addEventListener('mousedown', (e) => {
            // Only handle left mouse button
            if (e.button !== 0) return;
            
            isDragging = true;
            offsetX = e.clientX - parseInt(this.uiElement.style.left);
            offsetY = e.clientY - parseInt(this.uiElement.style.top);
            
            // Prevent text selection while dragging
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            // Keep within window bounds
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const uiWidth = this.uiElement.offsetWidth;
            const uiHeight = this.uiElement.offsetHeight;
            
            const boundedX = Math.max(0, Math.min(x, windowWidth - uiWidth));
            const boundedY = Math.max(0, Math.min(y, windowHeight - uiHeight));
            
            this.uiElement.style.left = `${boundedX}px`;
            this.uiElement.style.top = `${boundedY}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.saveWindowPosition();
            }
        });
    }

    /**
     * Add a pulse effect to the inventory (for attention)
     */
    addPulseEffect() {
        if (!this.uiElement) return;
        
        // Remove any existing pulse
        this.removePulseEffect();
        
        // Add pulse class
        this.uiElement.classList.add('pulse-effect');
        
        // Add CSS if needed
        if (!document.getElementById('pulse-effect-style')) {
            const style = document.createElement('style');
            style.id = 'pulse-effect-style';
            style.textContent = `
                .pulse-effect {
                    animation: pulse 1s ease-out;
                }
                
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(255, 255, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        // Remove pulse after animation
        setTimeout(() => {
            this.removePulseEffect();
        }, 1000);
    }

    /**
     * Remove the pulse effect
     */
    removePulseEffect() {
        if (this.uiElement) {
            this.uiElement.classList.remove('pulse-effect');
        }
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        if (this.uiElement && this.uiElement.parentNode) {
            this.uiElement.parentNode.removeChild(this.uiElement);
        }
    }
}

// Make globally available
window.InventoryUI = InventoryUI; 