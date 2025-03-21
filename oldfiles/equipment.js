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

// Add this global function near the top of the file, after variable declarations
// Function to remove all tooltips from the document
function clearAllTooltips() {
    // Find all tooltip elements and remove them
    const tooltips = document.querySelectorAll('.item-tooltip');
    tooltips.forEach(tooltip => {
        tooltip.remove();
    });
    
    // Clear all tooltip references and handlers
    document.querySelectorAll('.inventory-item, .equipment-slot, .bag-slot').forEach(element => {
        if (element.tooltip) {
            element.tooltip = null;
        }
        if (element.tooltipMoveHandler) {
            document.removeEventListener('mousemove', element.tooltipMoveHandler);
            element.tooltipMoveHandler = null;
        }
    });
}

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
                
                // Synchronize resources with inventory after adding an item
                if (window.playerProgression && item && item.type === 'resource') {
                    setTimeout(() => {
                        window.playerProgression.syncResourcesFromInventory();
                    }, 100);
                }
                
                return i;
            }
        }
        return -1; // Inventory full
    }
    
    // Remove an item from a slot
    removeItem(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.size && this.slots[slotIndex] !== null) {
            const removedItem = this.slots[slotIndex];
            this.slots[slotIndex] = null;
            if (this.ui) this.ui.updateSlot(slotIndex);
            
            // Synchronize resources with inventory after removing an item
            if (window.playerProgression && removedItem && removedItem.type === 'resource') {
                setTimeout(() => {
                    window.playerProgression.syncResourcesFromInventory();
                }, 100);
            }
            
            return removedItem;
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
        this.isDragging = false;
        
        this.createUI();
        
        // Restore saved position if available
        this.restoreWindowPosition();
    }
    
    createUI() {
        // Create the inventory container
        this.container = document.createElement('div');
        this.container.className = 'inventory-container';
        this.container.style.position = 'absolute';
        this.container.style.top = '50%';
        this.container.style.left = '50%';
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        this.container.style.border = '2px solid rgb(0, 233, 150)';
        this.container.style.borderRadius = '8px';
        this.container.style.padding = '15px';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '10px';
        this.container.style.zIndex = '1000';
        this.container.style.display = 'none';
        this.container.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.3)';
        this.container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        // Add header with drag handle
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        header.style.cursor = 'grab'; // Show grab cursor to indicate draggable
        
        // Add drag handle icon
        const dragIcon = document.createElement('div');
        dragIcon.innerHTML = '&#8801;'; // Triple bar icon
        dragIcon.style.marginRight = '10px';
        dragIcon.style.fontSize = '18px';
        dragIcon.style.color = 'rgba(0, 233, 150, 0.7)';
        
        // Add title
        const title = document.createElement('div');
        title.textContent = 'Inventory';
        title.style.color = 'white';
        title.style.fontSize = '18px';
        title.style.fontWeight = 'bold';
        
        // Add drag handle and title to a container
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        titleContainer.appendChild(dragIcon);
        titleContainer.appendChild(title);
        header.appendChild(titleContainer);
        
        // Add close button
        const closeButton = document.createElement('span');
        closeButton.textContent = '×';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '24px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.color = 'rgb(0, 233, 150)';
        closeButton.style.transition = 'all 0.2s ease';
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.transform = 'scale(1.2)';
            closeButton.style.textShadow = '0 0 8px rgba(0, 233, 150, 0.8)';
        });
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.transform = 'scale(1)';
            closeButton.style.textShadow = 'none';
        });
        closeButton.addEventListener('click', () => this.toggle());
        header.appendChild(closeButton);
        
        this.container.appendChild(header);
        
        // Create grid for inventory slots
        const slotsGrid = document.createElement('div');
        slotsGrid.className = 'inventory-slots-grid';
        slotsGrid.style.display = 'grid';
        slotsGrid.style.gridTemplateColumns = 'repeat(4, 50px)'; // Change to 4 columns with slightly larger slots
        slotsGrid.style.gridGap = '5px';
        slotsGrid.style.justifyContent = 'center';
        
        // Create inventory slots
        for (let i = 0; i < this.inventory.size; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slotIndex = i;
            slot.style.width = '50px'; // Slightly larger slots
            slot.style.height = '50px'; // Slightly larger slots
            slot.style.backgroundColor = 'rgba(50, 50, 50, 0.8)';
            slot.style.border = '1px solid #666';
            slot.style.borderRadius = '4px';
            slot.style.display = 'flex';
            slot.style.justifyContent = 'center';
            slot.style.alignItems = 'center';
            slot.style.position = 'relative';
            slot.style.cursor = 'pointer';
            
            // Make slot droppable
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.style.backgroundColor = 'rgba(0, 233, 150, 0.3)';
            });
            
            slot.addEventListener('dragleave', () => {
                slot.style.backgroundColor = 'rgba(50, 50, 50, 0.8)';
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.style.backgroundColor = 'rgba(50, 50, 50, 0.8)';
                
                if (draggedItem && draggedItemSource) {
                    const targetIndex = parseInt(slot.dataset.slotIndex);
                    
                    // Check if target slot has an item
                    const targetItem = this.inventory.getItem(targetIndex);
                    
                    if (draggedItemSource === 'inventory') {
                        // Move within inventory
                        if (targetItem) {
                            // Swap items
                            this.inventory.setItem(draggedItemSlot, targetItem);
                            this.inventory.setItem(targetIndex, draggedItem);
                        } else {
                            // Move to empty slot
                            this.inventory.removeItem(draggedItemSlot);
                            this.inventory.setItem(targetIndex, draggedItem);
                        }
                    } else if (draggedItemSource === 'equipment' && window.equipmentManager) {
                        // Move from equipment to inventory
                        const equipSlot = draggedItemSlot;
                        const equippedItem = window.equipmentManager.unequipItem(equipSlot);
                        
                        if (equippedItem) {
                            if (targetItem) {
                                // Check if target item can be equipped
                                if (targetItem.isEquippable && window.equipmentManager.canEquip(targetItem, equipSlot)) {
                                    // Swap with equipped item
                                    window.equipmentManager.equipItem(targetItem, equipSlot);
                                    this.inventory.setItem(targetIndex, equippedItem);
                                }
                            } else {
                                // Move to empty inventory slot
                                this.inventory.setItem(targetIndex, equippedItem);
                            }
                        }
                    } else if (draggedItemSource === 'quickslot' && window.equipmentManager) {
                        // Move from quickslot to inventory
                        const slotName = QUICK_SLOTS[draggedItemSlot.split(':')[1]];
                        const equippedItem = window.equipmentManager.quickSlots[slotName];
                        
                        if (equippedItem) {
                            // Remove from quickslot
                            window.equipmentManager.quickSlots[slotName] = null;
                            window.equipmentManager.ui.updateSlot(slotName, true);
                            
                            // Add to inventory
                            this.inventory.addItem(equippedItem);
                            this.updateSlot(targetIndex);
                        }
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
                    
                    // Update the UI
                    this.updateSlot(targetIndex);
                    if (draggedItemSource === 'inventory') {
                        this.updateSlot(draggedItemSlot);
                    }
                    
                    draggedItem = null;
                    draggedItemSource = null;
                    draggedItemSlot = null;
                    
                    if (draggedItemElement) {
                        draggedItemElement.remove();
                        draggedItemElement = null;
                    }
                    
                    this.isDragging = false;
                }
            });
            
            // Click to equip/use
            slot.addEventListener('click', () => {
                const item = this.inventory.getItem(i);
                if (item) {
                    if (item.isEquippable && window.equipmentManager) {
                        // Try to equip the item
                        if (window.equipmentManager.equipFromInventory(i)) {
                            // Update the slot after equipping
                            this.updateSlot(i);
                        }
                    } else if (item.isResource) {
                        // For resources, do nothing on click (just show tooltip)
                    }
                }
            });
            
            this.slotElements.push(slot);
            slotsGrid.appendChild(slot);
        }
        
        this.container.appendChild(slotsGrid);
        
        // Add to document
        document.body.appendChild(this.container);
        
        // Initialize all slots
        for (let i = 0; i < this.inventory.size; i++) {
            this.updateSlot(i);
        }
        
        // Make the inventory container draggable
        this.makeDraggable(header);
    }
    
    updateSlot(slotIndex) {
        const slot = this.slotElements[slotIndex];
        if (!slot) return;
        
        // Clear the slot
        slot.innerHTML = '';
        
        const item = this.inventory.getItem(slotIndex);
        if (item) {
            // Create item element
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.style.width = '90%';
            itemElement.style.height = '90%';
            itemElement.style.display = 'flex';
            itemElement.style.justifyContent = 'center';
            itemElement.style.alignItems = 'center';
            itemElement.style.position = 'relative';
            
            // Add draggable attribute
            itemElement.draggable = true;
            
            // Set up drag events
            itemElement.addEventListener('dragstart', (e) => {
                draggedItem = item;
                draggedItemSource = 'inventory';
                draggedItemSlot = slotIndex;
                this.isDragging = true;
                
                // Create a drag image
                const dragImage = document.createElement('div');
                dragImage.style.position = 'absolute';
                dragImage.style.left = '-9999px';
                dragImage.style.background = 'rgba(0,0,0,0.7)';
                dragImage.style.padding = '10px';
                dragImage.style.borderRadius = '5px';
                dragImage.textContent = item.name;
                document.body.appendChild(dragImage);
                draggedItemElement = dragImage;
                
                e.dataTransfer.setDragImage(dragImage, 10, 10);
                e.dataTransfer.effectAllowed = 'move';
            });
            
            itemElement.addEventListener('dragend', () => {
                this.isDragging = false;
                if (draggedItemElement) {
                    draggedItemElement.remove();
                    draggedItemElement = null;
                }
            });
            
            // Add icon or colored square for the item
            if (item.icon) {
                if (item.icon.endsWith('-svg') && window.ResourceIcons && window.ResourceIcons[item.icon]) {
                    // Use SVG icon
                    itemElement.innerHTML = window.ResourceIcons[item.icon];
                    itemElement.querySelector('svg').style.width = '70%';
                    itemElement.querySelector('svg').style.height = '70%';
                } else {
                    // Use image icon
                    const iconImg = document.createElement('img');
                    iconImg.src = item.icon;
                    iconImg.style.width = '80%';
                    iconImg.style.height = '80%';
                    iconImg.style.objectFit = 'contain';
                    itemElement.appendChild(iconImg);
                }
            } else {
                // Fallback to colored square
                const colorSquare = document.createElement('div');
                colorSquare.style.width = '80%';
                colorSquare.style.height = '80%';
                colorSquare.style.backgroundColor = item.isEquippable ? 'rgb(0, 233, 150)' : '#888';
                colorSquare.style.borderRadius = '4px';
                itemElement.appendChild(colorSquare);
            }
            
            // Add count for stackable items
            if (item.stackable && item.count > 1) {
                const countBadge = document.createElement('div');
                countBadge.textContent = item.count;
                countBadge.style.position = 'absolute';
                countBadge.style.bottom = '2px';
                countBadge.style.right = '2px';
                countBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                countBadge.style.color = 'white';
                countBadge.style.padding = '2px 4px';
                countBadge.style.borderRadius = '4px';
                countBadge.style.fontSize = '12px';
                countBadge.style.fontWeight = 'bold';
                countBadge.style.border = '1px solid rgb(0, 233, 150)';
                countBadge.style.minWidth = '20px';
                countBadge.style.textAlign = 'center';
                itemElement.appendChild(countBadge);
            }
            
            // Add tooltip
            itemElement.addEventListener('mouseenter', (e) => {
                if (this.isDragging) return;
                
                const tooltip = document.createElement('div');
                tooltip.className = 'item-tooltip';
                tooltip.style.position = 'fixed';
                tooltip.style.top = `${e.clientY + 15}px`;
                tooltip.style.left = `${e.clientX + 10}px`;
                tooltip.style.transform = 'none';
                tooltip.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
                tooltip.style.color = 'white';
                tooltip.style.padding = '10px';
                tooltip.style.borderRadius = '4px';
                tooltip.style.border = '1px solid rgb(0, 233, 150)';
                tooltip.style.zIndex = '1001';
                tooltip.style.minWidth = '150px';
                tooltip.style.textAlign = 'left';
                tooltip.style.whiteSpace = 'nowrap';
                
                // Item name (with color based on type)
                const nameElem = document.createElement('div');
                nameElem.textContent = item.name;
                nameElem.style.fontWeight = 'bold';
                nameElem.style.marginBottom = '5px';
                nameElem.style.color = item.isEquippable ? 'rgb(0, 233, 150)' : 'rgb(255, 215, 0)';
                tooltip.appendChild(nameElem);
                
                // Item description
                if (item.description) {
                    const descElem = document.createElement('div');
                    descElem.textContent = item.description;
                    descElem.style.fontSize = '12px';
                    descElem.style.marginBottom = '5px';
                    tooltip.appendChild(descElem);
                }
                
                // Item stats
                if (item.stats && Object.keys(item.stats).length > 0) {
                    const statsElem = document.createElement('div');
                    statsElem.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
                    statsElem.style.paddingTop = '5px';
                    statsElem.style.marginTop = '5px';
                    statsElem.style.fontSize = '12px';
                    
                    for (const [stat, value] of Object.entries(item.stats)) {
                        const statLine = document.createElement('div');
                        statLine.textContent = `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${value}`;
                        statsElem.appendChild(statLine);
                    }
                    
                    tooltip.appendChild(statsElem);
                }
                
                // Add usage hint
                const usageElem = document.createElement('div');
                usageElem.style.marginTop = '5px';
                usageElem.style.fontSize = '11px';
                usageElem.style.fontStyle = 'italic';
                usageElem.style.color = 'rgba(255, 255, 255, 0.7)';
                
                if (item.isEquippable) {
                    usageElem.textContent = 'Click to equip, drag to move';
                } else if (item.isResource) {
                    usageElem.textContent = 'Resource item';
                } else {
                    usageElem.textContent = 'Drag to move';
                }
                
                tooltip.appendChild(usageElem);
                
                document.body.appendChild(tooltip);
                
                // Update tooltip position on mousemove
                const moveHandler = (moveEvent) => {
                    tooltip.style.top = `${moveEvent.clientY + 15}px`;
                    tooltip.style.left = `${moveEvent.clientX + 10}px`;
                    
                    // Ensure tooltip stays within viewport
                    const tooltipRect = tooltip.getBoundingClientRect();
                    if (tooltipRect.right > window.innerWidth) {
                        tooltip.style.left = `${moveEvent.clientX - tooltipRect.width - 10}px`;
                    }
                    if (tooltipRect.bottom > window.innerHeight) {
                        tooltip.style.top = `${moveEvent.clientY - tooltipRect.height - 10}px`;
                    }
                };
                
                document.addEventListener('mousemove', moveHandler);
                
                // Store the tooltip and move handler on the item element
                itemElement.tooltip = tooltip;
                itemElement.tooltipMoveHandler = moveHandler;
            });
            
            itemElement.addEventListener('mouseleave', () => {
                if (itemElement.tooltip) {
                    itemElement.tooltip.remove();
                    itemElement.tooltip = null;
                    
                    // Remove the mousemove event listener
                    if (itemElement.tooltipMoveHandler) {
                        document.removeEventListener('mousemove', itemElement.tooltipMoveHandler);
                        itemElement.tooltipMoveHandler = null;
                    }
                }
            });
            
            slot.appendChild(itemElement);
        }
    }
    
    toggle() {
        if (!this.isVisible) {
            // Show window with animation
            this.container.style.display = 'flex';
            this.container.style.opacity = '0';
            this.container.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            // Trigger animation after a small delay (needed for the transition to work)
            setTimeout(() => {
                this.container.style.opacity = '1';
                this.container.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
            
            // Add a pulsing glow effect to the border
            this.addPulseEffect();
        } else {
            // Hide window with fade out
            this.container.style.opacity = '0';
            this.container.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            // Clear all tooltips
            clearAllTooltips();
            
            // Remove the window after animation completes
            setTimeout(() => {
                this.container.style.display = 'none';
                // Reset transform for next time
                this.container.style.transform = 'translate(-50%, -50%) scale(1)';
                // Remove pulse effect
                this.removePulseEffect();
            }, 300);
        }
        
        this.isVisible = !this.isVisible;
    }
    
    // Save window position to localStorage
    saveWindowPosition() {
        if (!this.container) return;
        
        const position = {
            left: this.container.style.left,
            top: this.container.style.top,
            transform: this.container.style.transform
        };
        
        try {
            localStorage.setItem('inventoryWindowPosition', JSON.stringify(position));
            console.log('Inventory window position saved:', position);
        } catch (error) {
            console.error('Error saving inventory window position:', error);
        }
    }
    
    // Restore window position from localStorage
    restoreWindowPosition() {
        try {
            const savedPosition = localStorage.getItem('inventoryWindowPosition');
            if (savedPosition && this.container) {
                const position = JSON.parse(savedPosition);
                
                // Only restore if we have valid positions
                if (position.left && position.left !== '50%') {
                    this.container.style.left = position.left;
                    this.container.style.top = position.top;
                    this.container.style.transform = 'none'; // Reset the transform
                }
                
                console.log('Inventory window position restored:', position);
            }
        } catch (error) {
            console.error('Error restoring inventory window position:', error);
        }
    }
    
    // Make the inventory window draggable
    makeDraggable(dragHandle) {
        let isDragging = false;
        let offsetX, offsetY;
        
        // Mouse down event - start dragging
        dragHandle.addEventListener('mousedown', (e) => {
            // Only allow left mouse button for dragging
            if (e.button !== 0) return;
            
            // Prevent text selection during drag
            e.preventDefault();
            
            // Change cursor style
            dragHandle.style.cursor = 'grabbing';
            
            // Get current position and dimensions
            const rect = this.container.getBoundingClientRect();
            
            // Calculate the offset of the mouse pointer from the window's top-left corner
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            // If the window is using transform for centering, convert to absolute positioning
            // while maintaining the visual position
            if (this.container.style.transform && this.container.style.transform.includes('translate(-50%, -50%)')) {
                // Get the current position before changing transform
                const currentLeft = rect.left;
                const currentTop = rect.top;
                
                // Reset transform
                this.container.style.transform = 'none';
                
                // Set absolute position to match previous visual position
                this.container.style.left = `${currentLeft}px`;
                this.container.style.top = `${currentTop}px`;
            }
            
            isDragging = true;
        });
        
        // Mouse move event - move the window
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // Calculate new position
            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;
            
            // Apply new position
            this.container.style.left = `${newLeft}px`;
            this.container.style.top = `${newTop}px`;
        });
        
        // Mouse up event - stop dragging
        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            
            isDragging = false;
            dragHandle.style.cursor = 'grab';
            
            // Save the new position
            this.saveWindowPosition();
        });
        
        // Mouse leave event - stop dragging if mouse leaves the window
        document.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                dragHandle.style.cursor = 'grab';
                
                // Save the new position
                this.saveWindowPosition();
            }
        });
        
        // Add a tooltip to indicate draggable
        dragHandle.title = 'Drag to move window';
    }
    
    // Add pulsing glow effect to the window
    addPulseEffect() {
        // Create a keyframe animation for the border glow
        const styleElement = document.createElement('style');
        styleElement.id = 'inventory-pulse-animation';
        styleElement.textContent = `
            @keyframes inventoryBorderPulse {
                0% { box-shadow: 0 0 15px rgba(0, 233, 150, 0.5); }
                50% { box-shadow: 0 0 25px rgba(0, 233, 150, 0.8); }
                100% { box-shadow: 0 0 15px rgba(0, 233, 150, 0.5); }
            }
        `;
        document.head.appendChild(styleElement);
        
        // Apply the animation to the window
        this.container.style.animation = 'inventoryBorderPulse 2s ease-in-out 3';
        
        // Remove the animation after it completes
        setTimeout(() => {
            this.removePulseEffect();
        }, 6000); // 3 pulses at 2 seconds each
    }
    
    // Remove the pulse effect
    removePulseEffect() {
        if (!this.container) return;
        
        this.container.style.animation = 'none';
        const styleElement = document.getElementById('inventory-pulse-animation');
        if (styleElement) {
            document.head.removeChild(styleElement);
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
        this.slot = EQUIPMENT_SLOTS.BACKPACK; // Ensure bag has the correct slot
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
            this.windowUI.open(x, y);
            return true;
        } else if (this.windowUI) {
            // If already open, just show the window
            this.windowUI.open(x, y);
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
        this.windowElement = null;
        this.slotElements = [];
        this.x = x || window.innerWidth / 2;
        this.y = y || window.innerHeight / 2;
        this.isVisible = false;
        
        this.createWindow();
        
        // Restore saved position if available
        this.restoreWindowPosition();
    }
    
    createWindow() {
        // Create the window
        this.windowElement = document.createElement('div');
        this.windowElement.className = 'bag-window';
        this.windowElement.style.position = 'absolute';
        this.windowElement.style.left = `${this.x - 110}px`; // Center the window
        this.windowElement.style.top = `${this.y - 150}px`; // Position slightly above click point
        this.windowElement.style.width = '220px';
        this.windowElement.style.backgroundColor = 'rgba(20, 20, 20, 0.9)';
        this.windowElement.style.border = '2px solid rgb(0, 233, 150)';
        this.windowElement.style.borderRadius = '8px';
        this.windowElement.style.padding = '15px';
        this.windowElement.style.zIndex = '1001'; // Above inventory
        this.windowElement.style.display = 'none';
        this.windowElement.style.flexDirection = 'column';
        this.windowElement.style.gap = '10px';
        this.windowElement.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.3)';
        this.windowElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        // Create header with drag handle
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        header.style.cursor = 'grab'; // Show grab cursor to indicate draggable
        
        // Add drag handle icon
        const dragIcon = document.createElement('div');
        dragIcon.innerHTML = '&#8801;'; // Triple bar icon
        dragIcon.style.marginRight = '10px';
        dragIcon.style.fontSize = '18px';
        dragIcon.style.color = 'rgba(0, 233, 150, 0.7)';
        
        // Add title
        const title = document.createElement('div');
        title.textContent = this.bag.name || 'Bag';
        title.style.color = 'white';
        title.style.fontSize = '18px';
        title.style.fontWeight = 'bold';
        
        // Add drag handle and title to a container
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        titleContainer.appendChild(dragIcon);
        titleContainer.appendChild(title);
        header.appendChild(titleContainer);
        
        // Add close button
        const closeButton = document.createElement('span');
        closeButton.textContent = '×';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '24px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.color = 'rgb(0, 233, 150)';
        closeButton.style.transition = 'all 0.2s ease';
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.transform = 'scale(1.2)';
            closeButton.style.textShadow = '0 0 8px rgba(0, 233, 150, 0.8)';
        });
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.transform = 'scale(1)';
            closeButton.style.textShadow = 'none';
        });
        closeButton.addEventListener('click', () => this.close());
        header.appendChild(closeButton);
        
        this.windowElement.appendChild(header);
        
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
        
        this.windowElement.appendChild(slotsContainer);
        
        // Add to document
        document.body.appendChild(this.windowElement);
        
        // Bind event handlers
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        
        // Update all slots
        this.updateAllSlots();
        
        // Make the bag window draggable
        this.makeDraggable(header);
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
            
            // Remove native tooltip
            slot.removeAttribute('title');
            
            // Add custom tooltip
            itemVisual.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'item-tooltip';
                tooltip.style.position = 'fixed';
                tooltip.style.top = `${e.clientY + 15}px`;
                tooltip.style.left = `${e.clientX + 10}px`;
                tooltip.style.transform = 'none';
                tooltip.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
                tooltip.style.color = 'white';
                tooltip.style.padding = '10px';
                tooltip.style.borderRadius = '4px';
                tooltip.style.border = '1px solid rgb(0, 233, 150)';
                tooltip.style.zIndex = '1001';
                tooltip.style.minWidth = '150px';
                tooltip.style.textAlign = 'left';
                tooltip.style.whiteSpace = 'nowrap';
                
                // Item name (with color based on rarity)
                const nameElem = document.createElement('div');
                nameElem.textContent = item.name;
                nameElem.style.fontWeight = 'bold';
                nameElem.style.marginBottom = '5px';
                nameElem.style.color = item.getRarityColor();
                tooltip.appendChild(nameElem);
                
                // Item description
                if (item.description) {
                    const descElem = document.createElement('div');
                    descElem.textContent = item.description;
                    descElem.style.fontSize = '12px';
                    descElem.style.marginBottom = '5px';
                    tooltip.appendChild(descElem);
                }
                
                // Item level and rarity
                const levelElem = document.createElement('div');
                levelElem.textContent = `Level ${item.level} ${item.rarity}`;
                levelElem.style.fontSize = '12px';
                levelElem.style.marginBottom = '5px';
                tooltip.appendChild(levelElem);
                
                document.body.appendChild(tooltip);
                
                // Update tooltip position on mousemove
                const moveHandler = (moveEvent) => {
                    tooltip.style.top = `${moveEvent.clientY + 15}px`;
                    tooltip.style.left = `${moveEvent.clientX + 10}px`;
                    
                    // Ensure tooltip stays within viewport
                    const tooltipRect = tooltip.getBoundingClientRect();
                    if (tooltipRect.right > window.innerWidth) {
                        tooltip.style.left = `${moveEvent.clientX - tooltipRect.width - 10}px`;
                    }
                    if (tooltipRect.bottom > window.innerHeight) {
                        tooltip.style.top = `${moveEvent.clientY - tooltipRect.height - 10}px`;
                    }
                };
                
                document.addEventListener('mousemove', moveHandler);
                
                // Store the tooltip and move handler on the item element
                itemVisual.tooltip = tooltip;
                itemVisual.tooltipMoveHandler = moveHandler;
            });
            
            itemVisual.addEventListener('mouseleave', () => {
                if (itemVisual.tooltip) {
                    itemVisual.tooltip.remove();
                    itemVisual.tooltip = null;
                    
                    // Remove the mousemove event listener
                    if (itemVisual.tooltipMoveHandler) {
                        document.removeEventListener('mousemove', itemVisual.tooltipMoveHandler);
                        itemVisual.tooltipMoveHandler = null;
                    }
                }
            });
            
            slot.appendChild(itemVisual);
        } else {
            // Empty slot
            slot.removeAttribute('title');
        }
    }
    
    updateAllSlots() {
        for (let i = 0; i < this.bag.slots; i++) {
            this.updateSlot(i);
        }
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            this.windowElement.style.left = `${e.clientX - this.dragOffsetX}px`;
            this.windowElement.style.top = `${e.clientY - this.dragOffsetY}px`;
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
        if (this.windowElement && this.windowElement.parentNode) {
            this.windowElement.parentNode.removeChild(this.windowElement);
        }
    }
    
    // Make the window draggable
    makeDraggable(dragHandle) {
        let isDragging = false;
        let offsetX, offsetY;
        
        // Mouse down event - start dragging
        dragHandle.addEventListener('mousedown', (e) => {
            // Only allow left mouse button for dragging
            if (e.button !== 0) return;
            
            // Prevent text selection during drag
            e.preventDefault();
            
            // Change cursor style
            dragHandle.style.cursor = 'grabbing';
            
            // Get current position and dimensions
            const rect = this.windowElement.getBoundingClientRect();
            
            // Calculate the offset of the mouse pointer from the window's top-left corner
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            // If transform is applied, reset it while preserving visual position
            if (this.windowElement.style.transform && this.windowElement.style.transform !== 'none') {
                // Get the current position before changing transform
                const currentLeft = rect.left;
                const currentTop = rect.top;
                
                // Reset transform
                this.windowElement.style.transform = 'none';
                
                // Set absolute position to match previous visual position
                this.windowElement.style.left = `${currentLeft}px`;
                this.windowElement.style.top = `${currentTop}px`;
            }
            
            isDragging = true;
        });
        
        // Mouse move event - move the window
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // Calculate new position
            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;
            
            // Apply new position
            this.windowElement.style.left = `${newLeft}px`;
            this.windowElement.style.top = `${newTop}px`;
        });
        
        // Mouse up event - stop dragging
        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            
            isDragging = false;
            dragHandle.style.cursor = 'grab';
            
            // Save the current position
            this.saveWindowPosition();
        });
        
        // Mouse leave event - stop dragging if mouse leaves the window
        document.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                dragHandle.style.cursor = 'grab';
                
                // Save the current position
                this.saveWindowPosition();
            }
        });
        
        // Add a tooltip to indicate draggable
        dragHandle.title = 'Drag to move window';
    }
    
    // Save window position to localStorage
    saveWindowPosition() {
        if (!this.windowElement || !this.bag) return;
        
        const position = {
            left: this.windowElement.style.left,
            top: this.windowElement.style.top
        };
        
        try {
            localStorage.setItem(`bagWindow_${this.bag.id}_position`, JSON.stringify(position));
            console.log(`Bag window position saved for ${this.bag.id}:`, position);
        } catch (error) {
            console.error('Error saving bag window position:', error);
        }
    }
    
    // Restore window position from localStorage
    restoreWindowPosition() {
        if (!this.bag) return;
        
        try {
            const savedPosition = localStorage.getItem(`bagWindow_${this.bag.id}_position`);
            if (savedPosition && this.windowElement) {
                const position = JSON.parse(savedPosition);
                
                if (position.left && position.top) {
                    this.windowElement.style.left = position.left;
                    this.windowElement.style.top = position.top;
                }
                
                console.log(`Bag window position restored for ${this.bag.id}:`, position);
            }
        } catch (error) {
            console.error('Error restoring bag window position:', error);
        }
    }
    
    // Add pulsing glow effect to the window
    addPulseEffect() {
        // Create a keyframe animation for the border glow
        const styleElement = document.createElement('style');
        styleElement.id = `bag-pulse-animation-${this.bag.id}`;
        styleElement.textContent = `
            @keyframes bagBorderPulse {
                0% { box-shadow: 0 0 15px rgba(0, 233, 150, 0.5); }
                50% { box-shadow: 0 0 25px rgba(0, 233, 150, 0.8); }
                100% { box-shadow: 0 0 15px rgba(0, 233, 150, 0.5); }
            }
        `;
        document.head.appendChild(styleElement);
        
        // Apply the animation to the window
        this.windowElement.style.animation = 'bagBorderPulse 2s ease-in-out 3';
        
        // Remove the animation after it completes
        setTimeout(() => {
            this.removePulseEffect();
        }, 6000); // 3 pulses at 2 seconds each
    }
    
    // Remove the pulse effect
    removePulseEffect() {
        if (!this.windowElement) return;
        
        this.windowElement.style.animation = 'none';
        const styleElement = document.getElementById(`bag-pulse-animation-${this.bag.id}`);
        if (styleElement) {
            document.head.removeChild(styleElement);
        }
    }
    
    // Show the window with animation
    open(x, y) {
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
            this.windowElement.style.left = `${x - 110}px`;
            this.windowElement.style.top = `${y - 150}px`;
        }
        
        // Show window with animation
        this.windowElement.style.display = 'flex';
        this.windowElement.style.opacity = '0';
        this.windowElement.style.transform = 'scale(0.9)';
        
        // Trigger animation after a small delay (needed for the transition to work)
        setTimeout(() => {
            this.windowElement.style.opacity = '1';
            this.windowElement.style.transform = 'scale(1)';
        }, 10);
        
        // Add a pulsing glow effect to the border
        this.addPulseEffect();
        
        this.isVisible = true;
        
        // Update all slots
        this.updateAllSlots();
    }
    
    // Close the window with animation
    close() {
        // Hide window with fade out
        this.windowElement.style.opacity = '0';
        this.windowElement.style.transform = 'scale(0.9)';
        
        // Clear all tooltips
        clearAllTooltips();
        
        // Remove the window after animation completes
        setTimeout(() => {
            this.windowElement.style.display = 'none';
            // Reset transform for next time
            this.windowElement.style.transform = 'scale(1)';
            // Remove pulse effect
            this.removePulseEffect();
            
            this.isVisible = false;
            
            // Make sure to call the bag's close method if it exists
            if (this.bag && typeof this.bag.close === 'function') {
                this.bag.close();
            }
        }, 300);
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
            // Special handling for backpack slot
            if (slotName === EQUIPMENT_SLOTS.BACKPACK) {
                // Allow any bag type item in the backpack slot
                if (item.type !== 'bag') {
                    console.error(`Cannot equip ${item.name} to ${slotName} slot, must be a bag`);
                    return false;
                }
            } 
            // Special handling for hand slots
            else if (slotName === EQUIPMENT_SLOTS.LEFT_HAND || slotName === EQUIPMENT_SLOTS.RIGHT_HAND) {
                // Allow any tool or weapon in hand slots
                if (item.type !== 'tool' && item.type !== 'weapon') {
                    console.error(`Cannot equip ${item.name} to ${slotName} slot, must be a tool or weapon`);
                    return false;
                }
            }
            // Check if the item can be equipped to this slot for other slots
            else if (item.slot !== slotName) {
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
            // Make sure the item has the correct slot property
            if (slotName === EQUIPMENT_SLOTS.BACKPACK && item.type === 'bag') {
                item.slot = EQUIPMENT_SLOTS.BACKPACK;
            }
            
            item.applyEffects(this.player);
        }
        
        // Update UI
        this.ui.updateSlot(slotName, isQuickSlot);
        
        // If this is a bag being equipped to the backpack slot, make sure it's properly initialized
        if (slotName === EQUIPMENT_SLOTS.BACKPACK && item.type === 'bag') {
            console.log(`Equipped bag ${item.name} with ${item.slots} slots to backpack slot`);
        }
        
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
        if (this.ui) {
            this.ui.toggleEquipmentPanel();
        }
    }
    
    // Check if an item can be equipped to a specific slot
    canEquip(item, slotName) {
        // Check if this is a quick slot
        const isQuickSlot = Object.values(QUICK_SLOTS).includes(slotName);
        
        // For quick slots, we don't need to check item slot compatibility
        if (!isQuickSlot) {
            // Special handling for backpack slot
            if (slotName === EQUIPMENT_SLOTS.BACKPACK) {
                // Allow any bag type item in the backpack slot
                if (item.type !== 'bag') {
                    return false;
                }
            } 
            // Special handling for hand slots
            else if (slotName === EQUIPMENT_SLOTS.LEFT_HAND || slotName === EQUIPMENT_SLOTS.RIGHT_HAND) {
                // Allow any tool or weapon in hand slots
                if (item.type !== 'tool' && item.type !== 'weapon') {
                    return false;
                }
            }
            // Check if the item can be equipped to this slot for other slots
            else if (item.slot !== slotName) {
                return false;
            }
            
            // Check if the player meets requirements
            if (!item.canBeEquippedBy(this.player)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Equip an item from inventory
    equipFromInventory(inventorySlotIndex) {
        if (!this.inventory) {
            console.error('No inventory reference set');
            return false;
        }
        
        const item = this.inventory.getItem(inventorySlotIndex);
        if (!item) {
            console.error(`No item in inventory slot ${inventorySlotIndex}`);
            return false;
        }
        
        // Determine the appropriate equipment slot
        let targetSlot = item.slot;
        
        // For tools and weapons, use the appropriate hand slot
        if (item.type === 'tool' || item.type === 'weapon') {
            // Try right hand first, then left hand if right is occupied
            if (!this.slots[EQUIPMENT_SLOTS.RIGHT_HAND]) {
                targetSlot = EQUIPMENT_SLOTS.RIGHT_HAND;
            } else if (!this.slots[EQUIPMENT_SLOTS.LEFT_HAND]) {
                targetSlot = EQUIPMENT_SLOTS.LEFT_HAND;
            } else {
                // Both hands occupied, use right hand by default
                targetSlot = EQUIPMENT_SLOTS.RIGHT_HAND;
            }
        }
        
        // For bags, use the backpack slot
        if (item.type === 'bag') {
            targetSlot = EQUIPMENT_SLOTS.BACKPACK;
        }
        
        if (!targetSlot) {
            console.error(`Cannot determine equipment slot for ${item.name}`);
            return false;
        }
        
        // Check if we can equip to this slot
        if (!this.canEquip(item, targetSlot)) {
            console.error(`Cannot equip ${item.name} to ${targetSlot} slot`);
            return false;
        }
        
        // Get current item in the target slot (if any)
        const currentItem = this.slots[targetSlot];
        
        // Equip the new item
        if (this.equipItem(item, targetSlot)) {
            // Remove from inventory
            this.inventory.removeItem(inventorySlotIndex);
            
            // If there was an item in the slot, add it to inventory
            if (currentItem) {
                const addedSlot = this.inventory.addItem(currentItem);
                if (addedSlot < 0) {
                    console.warn('Inventory full, item dropped');
                    // In a real game, you might want to drop the item on the ground
                }
            }
            
            return true;
        }
        
        return false;
    }
}

// Equipment UI class
class EquipmentUI {
    constructor(equipmentManager, options = {}) {
        this.equipmentManager = equipmentManager;
        this.isPanelVisible = true; // Changed to true by default
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
            
            // Show equipment panel immediately - always visible now
            this.showEquipmentPanel();
            
            // Remove compact equipment display - we're using the main panel instead
            // this.createCompactEquipmentDisplay();
            
            // Restore saved position if available
            this.restoreWindowPosition();
        } catch (err) {
            console.error('Error creating equipment UI:', err);
        }
    }
    
    createUI() {
        this.createEquipmentPanel();
        this.createQuickbar();
        this.createInventoryButton();
        this.createEquipmentButton();
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
        this.equipmentPanel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        // Create header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        header.style.cursor = 'grab'; // Show grab cursor to indicate draggable
        
        // Add drag handle icon
        const dragIcon = document.createElement('div');
        dragIcon.innerHTML = '&#8801;'; // Triple bar icon
        dragIcon.style.marginRight = '10px';
        dragIcon.style.fontSize = '18px';
        dragIcon.style.color = 'rgba(0, 233, 150, 0.7)';
        
        const title = document.createElement('h2');
        title.textContent = 'Equipment';
        title.style.color = 'rgb(0, 233, 150)';
        title.style.margin = '0';
        
        // Add drag handle and title to a container
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        titleContainer.appendChild(dragIcon);
        titleContainer.appendChild(title);
        header.appendChild(titleContainer);
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'rgb(0, 233, 150)';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.transition = 'all 0.2s ease';
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.transform = 'scale(1.2)';
            closeButton.style.textShadow = '0 0 8px rgba(0, 233, 150, 0.8)';
        });
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.transform = 'scale(1)';
            closeButton.style.textShadow = 'none';
        });
        closeButton.addEventListener('click', () => this.toggleEquipmentPanel());
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
        
        // Make the equipment panel draggable
        this.makeDraggable(header);
        
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
        const slotElement = document.createElement('div');
        slotElement.className = isQuickSlot ? 'quick-slot' : 'equipment-slot';
        slotElement.dataset.slot = slotName;
        
        // Style the slot
        slotElement.style.width = '60px';
        slotElement.style.height = '60px';
        slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        slotElement.style.border = '2px solid rgb(0, 233, 150)';
        slotElement.style.borderRadius = '5px';
        slotElement.style.display = 'flex';
        slotElement.style.alignItems = 'center';
        slotElement.style.justifyContent = 'center';
        slotElement.style.position = 'relative';
        slotElement.style.cursor = 'pointer';
        slotElement.style.transition = 'all 0.2s ease';
        
        // Add label for equipment slots
        if (!isQuickSlot) {
            const label = document.createElement('div');
            label.style.position = 'absolute';
            label.style.bottom = '-20px';
            label.style.left = '0';
            label.style.right = '0';
            label.style.textAlign = 'center';
            label.style.color = 'rgb(0, 233, 150)';
            label.style.fontSize = '12px';
            label.textContent = this.formatSlotName(slotName);
            slotElement.appendChild(label);
        }
        
        // Hover effect
        slotElement.addEventListener('mouseover', () => {
            slotElement.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.5)';
            slotElement.style.backgroundColor = 'rgba(0, 50, 30, 0.5)';
        });
        
        slotElement.addEventListener('mouseout', () => {
            slotElement.style.boxShadow = 'none';
            slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        });
        
        // Add empty slot icon/emoji
        const emptyIcon = document.createElement('div');
        emptyIcon.className = 'slot-icon-placeholder';
        emptyIcon.style.width = '40px';
        emptyIcon.style.height = '40px';
        emptyIcon.style.display = 'flex';
        emptyIcon.style.alignItems = 'center';
        emptyIcon.style.justifyContent = 'center';
        emptyIcon.style.color = 'rgba(255, 255, 255, 0.2)';
        emptyIcon.style.fontSize = '24px';
        emptyIcon.textContent = this.getSlotEmoji(slotName);
        slotElement.appendChild(emptyIcon);
        
        // Click handler for slot
        slotElement.addEventListener('click', () => {
            this.handleSlotClick(slotName, isQuickSlot);
        });
        
        // Setup drag drop for equipment slots
        if (!isQuickSlot) {
            // Make equipment slots droppable
            slotElement.addEventListener('dragover', (e) => {
                // Only allow dropping if we have a draggedItem
                if (draggedItem) {
                    e.preventDefault(); // Allow drop
                    slotElement.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.8)';
                    slotElement.style.backgroundColor = 'rgba(0, 80, 50, 0.7)';
                }
            });
            
            slotElement.addEventListener('dragleave', () => {
                slotElement.style.boxShadow = 'none';
                slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            });
            
            slotElement.addEventListener('drop', (e) => {
                e.preventDefault();
                slotElement.style.boxShadow = 'none';
                slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                
                // Handle the dropped item
                if (draggedItem) {
                    // Check if this is a valid slot for the item
                    const canEquip = this.canEquipItemToSlot(draggedItem, slotName);
                    
                    if (canEquip) {
                        // Get the current item in this slot (to swap if needed)
                        const currentItem = this.equipmentManager.slots[slotName];
                        
                        // Equip the dragged item
                        const equipped = this.equipmentManager.equipItem(draggedItem, slotName);
                        
                        if (equipped) {
                            console.log(`Equipped ${draggedItem.name} to ${slotName}`);
                            
                            // Return current item to inventory if there was one
                            if (currentItem && window.playerInventory) {
                                window.playerInventory.addItem(currentItem);
                            }
                            
                            // Remove dragged item from its source
                            if (draggedItemSource === 'inventory' && window.playerInventory) {
                                window.playerInventory.removeItem(draggedItemSlot);
                                if (window.playerInventoryUI) {
                                    window.playerInventoryUI.updateSlot(draggedItemSlot);
                                }
                            }
                        }
                    } else {
                        console.warn(`Cannot equip ${draggedItem.name} to ${slotName} slot`);
                    }
                    
                    // Reset drag state
                    draggedItem = null;
                    draggedItemSource = null;
                    draggedItemSlot = null;
                }
            });
            
            // Make equipment slots draggable (when they contain an item)
            slotElement.addEventListener('mousedown', (e) => {
                // Left click - drag item if there is one
                if (e.button === 0) {
                    const item = this.equipmentManager.slots[slotName];
                    if (item) {
                        // Make element draggable
                        slotElement.draggable = true;
                        
                        // Set dragstart handler on the slot
                        slotElement.addEventListener('dragstart', (e) => {
                            draggedItem = item;
                            draggedItemSource = 'equipment';
                            draggedItemSlot = slotName;
                            
                            // Create a drag image
                            const dragImage = document.createElement('div');
                            dragImage.style.position = 'absolute';
                            dragImage.style.left = '-9999px';
                            dragImage.style.background = 'rgba(0,0,0,0.7)';
                            dragImage.style.padding = '10px';
                            dragImage.style.borderRadius = '5px';
                            dragImage.textContent = item.name;
                            document.body.appendChild(dragImage);
                            draggedItemElement = dragImage;
                            
                            e.dataTransfer.setDragImage(dragImage, 10, 10);
                            e.dataTransfer.effectAllowed = 'move';
                        });
                        
                        slotElement.addEventListener('dragend', () => {
                            slotElement.draggable = false;
                            if (draggedItemElement) {
                                draggedItemElement.remove();
                                draggedItemElement = null;
                            }
                        });
                    } else {
                        slotElement.draggable = false;
                    }
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
        
        // Get the item in the slot
        const item = isQuickSlot 
            ? this.equipmentManager.quickSlots[slotName] 
            : this.equipmentManager.slots[slotName];
        
        // If we have a dragged item, try to equip it
        if (draggedItem) {
            // Check if we can equip the dragged item to this slot
            if (isQuickSlot || this.canEquipItemToSlot(draggedItem, slotName)) {
                // Get the current item in the slot (if any)
                const currentItem = isQuickSlot 
                    ? this.equipmentManager.quickSlots[slotName] 
                    : this.equipmentManager.slots[slotName];
                
                // Equip the dragged item
                if (isQuickSlot) {
                    this.equipmentManager.quickSlots[slotName] = draggedItem;
                } else {
                    this.equipmentManager.equipItem(draggedItem, slotName);
                }
                
                // Update the slot
                this.updateSlot(slotName, isQuickSlot);
                
                // If there was an item in the slot, put it where the dragged item was
                if (currentItem) {
                    if (draggedItemSource === 'inventory') {
                        window.playerInventory.setItem(draggedItemSlot, currentItem);
                    } else if (draggedItemSource === 'equipment') {
                        this.equipmentManager.equipItem(currentItem, draggedItemSlot);
                    } else if (draggedItemSource === 'quickslot') {
                        this.equipmentManager.quickSlots[draggedItemSlot] = currentItem;
                        this.updateSlot(draggedItemSlot, true);
                    }
                } else {
                    // Remove the item from its original location
                    if (draggedItemSource === 'inventory') {
                        window.playerInventory.removeItem(draggedItemSlot);
                    } else if (draggedItemSource === 'equipment') {
                        this.equipmentManager.unequipItem(draggedItemSlot);
                    } else if (draggedItemSource === 'quickslot') {
                        this.equipmentManager.quickSlots[draggedItemSlot] = null;
                        this.updateSlot(draggedItemSlot, true);
                    }
                }
            } else {
                console.log(`Cannot equip ${draggedItem.name} to ${slotName} slot`);
                this.showErrorMessage(`Cannot equip ${draggedItem.name} to ${this.formatSlotName(slotName)} slot`);
            }
            
            // Clear dragged item
            if (draggedItemElement) {
                document.body.removeChild(draggedItemElement);
            }
            draggedItem = null;
            draggedItemSource = null;
            draggedItemSlot = null;
            draggedItemElement = null;
        } else {
            // For regular equipment slots, we can toggle equip/unequip
            if (item) {
                // Special handling for bags - open the bag window instead of unequipping
                if (slotName === EQUIPMENT_SLOTS.BACKPACK && item.type === 'bag') {
                    // Get mouse position for bag window placement
                    const mouseX = event ? event.clientX : window.innerWidth / 2;
                    const mouseY = event ? event.clientY : window.innerHeight / 2;
                    
                    // Open the bag window
                    if (!item.isOpen) {
                        // Make sure the bag has the open method
                        if (typeof item.open === 'function') {
                            item.open(mouseX, mouseY);
                            console.log(`Opened ${item.name}`);
                        } else {
                            console.error(`Bag ${item.name} does not have an open method`);
                        }
                    } else {
                        // If already open, close it
                        if (typeof item.close === 'function') {
                            item.close();
                            console.log(`Closed ${item.name}`);
                        } else {
                            console.error(`Bag ${item.name} does not have a close method`);
                        }
                    }
                } else {
                    // For other items, unequip to inventory if possible
                    if (window.playerInventory) {
                        // Try to add to inventory
                        const slotIndex = window.playerInventory.addItem(item);
                        
                        if (slotIndex >= 0) {
                            // Successfully added to inventory, now unequip
                            this.equipmentManager.unequipItem(slotName);
                            console.log(`Unequipped ${item.name} to inventory slot ${slotIndex}`);
                        } else {
                            // Inventory is full, show error message
                            this.showErrorMessage("Inventory is full!");
                            console.log(`Failed to unequip ${item.name}: inventory full`);
                        }
                    } else {
                        // No inventory available, just unequip
                        this.equipmentManager.unequipItem(slotName);
                    }
                }
            }
        }
    }
    
    // Helper method to show error messages
    showErrorMessage(message) {
        // Create error message element
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = message;
        errorMsg.style.position = 'fixed';
        errorMsg.style.top = '20%';
        errorMsg.style.left = '50%';
        errorMsg.style.transform = 'translateX(-50%)';
        errorMsg.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
        errorMsg.style.color = 'white';
        errorMsg.style.padding = '10px 20px';
        errorMsg.style.borderRadius = '5px';
        errorMsg.style.fontWeight = 'bold';
        errorMsg.style.zIndex = '2000';
        errorMsg.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        
        // Add to document
        document.body.appendChild(errorMsg);
        
        // Remove after delay
        setTimeout(() => {
            errorMsg.style.opacity = '0';
            errorMsg.style.transition = 'opacity 0.5s';
            
            // Remove from DOM after fade out
            setTimeout(() => {
                if (errorMsg.parentNode) {
                    errorMsg.parentNode.removeChild(errorMsg);
                }
            }, 500);
        }, 2000);
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
                itemIcon.className = 'quick-slot-item-icon';
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
                
                // Remove native tooltip and add custom tooltip
                slotElement.removeAttribute('title');
                
                // Add tooltip on mouseenter
                slotElement.addEventListener('mouseenter', (e) => {
                    // Remove existing tooltip if any
                    if (slotElement.tooltip) {
                        slotElement.tooltip.remove();
                        slotElement.tooltip = null;
                    }
                    
                    // Create tooltip
                    const tooltip = document.createElement('div');
                    tooltip.className = 'item-tooltip';
                    tooltip.style.position = 'fixed';
                    tooltip.style.top = `${e.clientY + 15}px`;
                    tooltip.style.left = `${e.clientX + 10}px`;
                    tooltip.style.transform = 'none';
                    tooltip.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
                    tooltip.style.color = 'white';
                    tooltip.style.padding = '10px';
                    tooltip.style.borderRadius = '4px';
                    tooltip.style.border = `1px solid ${item.getRarityColor()}`;
                    tooltip.style.zIndex = '1001';
                    tooltip.style.minWidth = '150px';
                    tooltip.style.textAlign = 'left';
                    tooltip.style.whiteSpace = 'nowrap';
                    
                    // Item name with rarity color
                    const nameElem = document.createElement('div');
                    nameElem.textContent = item.name;
                    nameElem.style.fontWeight = 'bold';
                    nameElem.style.marginBottom = '5px';
                    nameElem.style.color = item.getRarityColor();
                    tooltip.appendChild(nameElem);
                    
                    // Item description
                    if (item.description) {
                        const descElem = document.createElement('div');
                        descElem.textContent = item.description;
                        descElem.style.fontSize = '12px';
                        descElem.style.marginBottom = '5px';
                        tooltip.appendChild(descElem);
                    }
                    
                    // Key binding info
                    const keyInfo = document.createElement('div');
                    keyInfo.textContent = `Hotkey: ${slotName.replace('quickSlot', '')}`;
                    keyInfo.style.fontSize = '11px';
                    keyInfo.style.color = 'rgb(0, 233, 150)';
                    keyInfo.style.marginTop = '5px';
                    tooltip.appendChild(keyInfo);
                    
                    document.body.appendChild(tooltip);
                    
                    // Set up mousemove handler
                    const moveHandler = (moveEvent) => {
                        tooltip.style.top = `${moveEvent.clientY + 15}px`;
                        tooltip.style.left = `${moveEvent.clientX + 10}px`;
                        
                        // Ensure tooltip stays within viewport
                        const tooltipRect = tooltip.getBoundingClientRect();
                        if (tooltipRect.right > window.innerWidth) {
                            tooltip.style.left = `${moveEvent.clientX - tooltipRect.width - 10}px`;
                        }
                        if (tooltipRect.bottom > window.innerHeight) {
                            tooltip.style.top = `${moveEvent.clientY - tooltipRect.height - 10}px`;
                        }
                    };
                    
                    document.addEventListener('mousemove', moveHandler);
                    
                    // Store references for cleanup
                    slotElement.tooltip = tooltip;
                    slotElement.tooltipMoveHandler = moveHandler;
                });
                
                // Remove tooltip on mouseleave
                slotElement.addEventListener('mouseleave', () => {
                    if (slotElement.tooltip) {
                        slotElement.tooltip.remove();
                        slotElement.tooltip = null;
                        
                        // Remove the mousemove event listener
                        if (slotElement.tooltipMoveHandler) {
                            document.removeEventListener('mousemove', slotElement.tooltipMoveHandler);
                            slotElement.tooltipMoveHandler = null;
                        }
                    }
                });
                
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
                slotElement.removeAttribute('title');
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
                // Remove native tooltip
                slotElement.removeAttribute('title');
                
                // Add tooltip on mouseenter
                slotElement.addEventListener('mouseenter', (e) => {
                    // Remove existing tooltip if any
                    if (slotElement.tooltip) {
                        slotElement.tooltip.remove();
                        slotElement.tooltip = null;
                    }
                    
                    // Create tooltip
                    const tooltip = document.createElement('div');
                    tooltip.className = 'item-tooltip';
                    tooltip.style.position = 'fixed';
                    tooltip.style.top = `${e.clientY + 15}px`;
                    tooltip.style.left = `${e.clientX + 10}px`;
                    tooltip.style.transform = 'none';
                    tooltip.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
                    tooltip.style.color = 'white';
                    tooltip.style.padding = '10px';
                    tooltip.style.borderRadius = '4px';
                    tooltip.style.border = `1px solid ${item.getRarityColor()}`;
                    tooltip.style.zIndex = '1001';
                    tooltip.style.minWidth = '150px';
                    tooltip.style.textAlign = 'left';
                    tooltip.style.whiteSpace = 'nowrap';
                    
                    // Item name with rarity color
                    const nameElem = document.createElement('div');
                    nameElem.textContent = item.name;
                    nameElem.style.fontWeight = 'bold';
                    nameElem.style.marginBottom = '5px';
                    nameElem.style.color = item.getRarityColor();
                    tooltip.appendChild(nameElem);
                    
                    // Item description
                    if (item.description) {
                        const descElem = document.createElement('div');
                        descElem.textContent = item.description;
                        descElem.style.fontSize = '12px';
                        descElem.style.marginBottom = '5px';
                        tooltip.appendChild(descElem);
                    }
                    
                    // Item stats
                    if (item.stats && Object.keys(item.stats).length > 0) {
                        const statsElem = document.createElement('div');
                        statsElem.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
                        statsElem.style.paddingTop = '5px';
                        statsElem.style.marginTop = '5px';
                        statsElem.style.fontSize = '12px';
                        
                        for (const [stat, value] of Object.entries(item.stats)) {
                            const statLine = document.createElement('div');
                            statLine.textContent = `${stat.charAt(0).toUpperCase() + stat.slice(1)}: +${value}`;
                            statLine.style.color = 'rgb(0, 233, 150)';
                            statsElem.appendChild(statLine);
                        }
                        
                        tooltip.appendChild(statsElem);
                    }
                    
                    // Item level and rarity
                    const levelElem = document.createElement('div');
                    levelElem.textContent = `Level ${item.level} ${item.rarity}`;
                    levelElem.style.fontSize = '12px';
                    levelElem.style.marginTop = '5px';
                    tooltip.appendChild(levelElem);
                    
                    // Add durability if applicable
                    if (item.durability !== undefined && item.maxDurability !== undefined) {
                        const durabilityElem = document.createElement('div');
                        durabilityElem.textContent = `Durability: ${item.durability}/${item.maxDurability}`;
                        durabilityElem.style.fontSize = '12px';
                        durabilityElem.style.marginTop = '3px';
                        const durabilityPercent = (item.durability / item.maxDurability) * 100;
                        durabilityElem.style.color = durabilityPercent > 50 ? 'green' : durabilityPercent > 25 ? 'orange' : 'red';
                        tooltip.appendChild(durabilityElem);
                    }
                    
                    document.body.appendChild(tooltip);
                    
                    // Set up mousemove handler
                    const moveHandler = (moveEvent) => {
                        tooltip.style.top = `${moveEvent.clientY + 15}px`;
                        tooltip.style.left = `${moveEvent.clientX + 10}px`;
                        
                        // Ensure tooltip stays within viewport
                        const tooltipRect = tooltip.getBoundingClientRect();
                        if (tooltipRect.right > window.innerWidth) {
                            tooltip.style.left = `${moveEvent.clientX - tooltipRect.width - 10}px`;
                        }
                        if (tooltipRect.bottom > window.innerHeight) {
                            tooltip.style.top = `${moveEvent.clientY - tooltipRect.height - 10}px`;
                        }
                    };
                    
                    document.addEventListener('mousemove', moveHandler);
                    
                    // Store references for cleanup
                    slotElement.tooltip = tooltip;
                    slotElement.tooltipMoveHandler = moveHandler;
                });
                
                // Remove tooltip on mouseleave
                slotElement.addEventListener('mouseleave', () => {
                    if (slotElement.tooltip) {
                        slotElement.tooltip.remove();
                        slotElement.tooltip = null;
                        
                        // Remove the mousemove event listener
                        if (slotElement.tooltipMoveHandler) {
                            document.removeEventListener('mousemove', slotElement.tooltipMoveHandler);
                            slotElement.tooltipMoveHandler = null;
                        }
                    }
                });
                
                // Update item name
                if (itemNameElement) {
                    itemNameElement.textContent = item.name;
                    itemNameElement.style.color = item.getRarityColor();
                }
                
                // ... rest of the method stays the same ...
            } else {
                // Clear tooltip
                slotElement.removeAttribute('title');
                
                // Clear item name
                if (itemNameElement) {
                    itemNameElement.textContent = 'Empty';
                    itemNameElement.style.color = '#999';
                }
                
                // ... rest of the method stays the same ...
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
        // Show window with animation
        this.equipmentPanel.style.display = 'flex';
        this.equipmentPanel.style.opacity = '0';
        this.equipmentPanel.style.transform = 'scale(0.9) translateY(-20px)';
        
        // Trigger animation after a small delay (needed for the transition to work)
        setTimeout(() => {
            this.equipmentPanel.style.opacity = '1';
            this.equipmentPanel.style.transform = 'scale(1) translateY(0)';
        }, 10);
        
        // Add a pulsing glow effect to the border
        this.addPulseEffect();
        
        this.isPanelVisible = true;
        
        // Update button appearance for visible panel
        if (this.equipmentButton) {
            this.equipmentButton.style.border = '2px solid rgb(0, 233, 150)';
            this.equipmentButton.style.boxShadow = '0 0 10px rgba(0, 233, 150, 0.5)';
        }
    }
    
    hideEquipmentPanel() {
        // Hide window with fade out
        this.equipmentPanel.style.opacity = '0';
        this.equipmentPanel.style.transform = 'scale(0.9) translateY(-10px)';
        
        // Clear all tooltips
        clearAllTooltips();
        
        // Remove the window after animation completes
        setTimeout(() => {
            this.equipmentPanel.style.display = 'none';
            // Reset transform for next time
            this.equipmentPanel.style.transform = 'scale(1) translateY(0)';
            // Remove pulse effect
            this.removePulseEffect();
        }, 300);
        
        this.isPanelVisible = false;
        
        // Update button appearance for hidden panel
        if (this.equipmentButton) {
            this.equipmentButton.style.border = '2px solid rgba(0, 233, 150, 0.5)';
            this.equipmentButton.style.boxShadow = '0 0 5px rgba(0, 233, 150, 0.2)';
        }
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

    // Helper function to check if an item can be equipped to a slot
    canEquipItemToSlot(item, slotName) {
        // For backpack slot, check if the item is a bag
        if (slotName === EQUIPMENT_SLOTS.BACKPACK && item.type === 'bag') {
            return true;
        }
        
        // For hand slots, allow tools (pickaxes, axes)
        if ((slotName === EQUIPMENT_SLOTS.LEFT_HAND || slotName === EQUIPMENT_SLOTS.RIGHT_HAND) && 
            (item.type === 'tool' || item.type === 'weapon')) {
            return true;
        }
        
        // For other slots, use the standard slot check
        return item.slot === slotName;
    }

    createEquipmentButton() {
        // Create a floating button to toggle equipment panel
        const equipmentButton = document.createElement('div');
        equipmentButton.className = 'equipment-button';
        equipmentButton.style.position = 'fixed';
        equipmentButton.style.top = '20px';
        equipmentButton.style.left = '80px'; // Position to the right of inventory button
        equipmentButton.style.width = '50px';
        equipmentButton.style.height = '50px';
        equipmentButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        equipmentButton.style.border = this.isPanelVisible ? 
            '2px solid rgb(0, 233, 150)' : 
            '2px solid rgba(0, 233, 150, 0.5)';
        equipmentButton.style.borderRadius = '50%';
        equipmentButton.style.display = 'flex';
        equipmentButton.style.justifyContent = 'center';
        equipmentButton.style.alignItems = 'center';
        equipmentButton.style.cursor = 'pointer';
        equipmentButton.style.zIndex = '100';
        equipmentButton.style.boxShadow = this.isPanelVisible ? 
            '0 0 10px rgba(0, 233, 150, 0.5)' : 
            '0 0 5px rgba(0, 233, 150, 0.2)';
        equipmentButton.style.fontSize = '24px';
        equipmentButton.textContent = '🛡️'; // Armor/shield emoji
        
        // Hover effect
        equipmentButton.addEventListener('mouseover', () => {
            equipmentButton.style.boxShadow = '0 0 15px rgba(0, 233, 150, 0.5)';
            equipmentButton.style.transform = 'scale(1.1)';
        });
        
        equipmentButton.addEventListener('mouseout', () => {
            equipmentButton.style.boxShadow = this.isPanelVisible ? 
                '0 0 10px rgba(0, 233, 150, 0.5)' : 
                '0 0 5px rgba(0, 233, 150, 0.2)';
            equipmentButton.style.transform = 'scale(1)';
        });
        
        // Click handler
        equipmentButton.addEventListener('click', () => {
            this.toggleEquipmentPanel();
        });
        
        // Add tooltip
        equipmentButton.title = 'Toggle Equipment Panel (E)';
        
        // Add to document
        document.body.appendChild(equipmentButton);
        this.equipmentButton = equipmentButton;
    }
    
    // Save window position to localStorage
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
    
    // Restore window position from localStorage
    restoreWindowPosition() {
        try {
            const savedPosition = localStorage.getItem('equipmentWindowPosition');
            if (savedPosition && this.equipmentPanel) {
                const position = JSON.parse(savedPosition);
                
                // If we have stored positions, use them
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
                
                console.log('Equipment window position restored:', position);
            }
        } catch (error) {
            console.error('Error restoring equipment window position:', error);
        }
    }
    
    // Make the equipment panel draggable
    makeDraggable(dragHandle) {
        let isDragging = false;
        let offsetX, offsetY;
        
        // Mouse down event - start dragging
        dragHandle.addEventListener('mousedown', (e) => {
            // Only allow left mouse button for dragging
            if (e.button !== 0) return;
            
            // Prevent text selection during drag
            e.preventDefault();
            
            // Change cursor style
            dragHandle.style.cursor = 'grabbing';
            
            // Get current computed position and dimensions
            const rect = this.equipmentPanel.getBoundingClientRect();
            
            // Calculate the offset of the mouse pointer from the window's top-left corner
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            // Check if we need to convert from transform-based positioning
            if (this.equipmentPanel.style.transform && this.equipmentPanel.style.transform !== 'none') {
                // Get the current position before changing transform
                const currentLeft = rect.left;
                const currentTop = rect.top;
                
                // Reset transform to ensure proper positioning
                this.equipmentPanel.style.transform = 'none';
                
                // Set absolute position to match previous visual position
                this.equipmentPanel.style.left = `${currentLeft}px`;
                this.equipmentPanel.style.top = `${currentTop}px`;
                this.equipmentPanel.style.right = 'auto';
            }
            // Handle right-based positioning
            else if (window.getComputedStyle(this.equipmentPanel).right !== 'auto') {
                // Set left position based on current visual position
                this.equipmentPanel.style.left = `${rect.left}px`;
                this.equipmentPanel.style.right = 'auto';
            }
            
            isDragging = true;
        });
        
        // Mouse move event - move the window
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // Calculate new position
            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;
            
            // Apply new position
            this.equipmentPanel.style.left = `${newLeft}px`;
            this.equipmentPanel.style.top = `${newTop}px`;
        });
        
        // Mouse up event - stop dragging
        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            
            isDragging = false;
            dragHandle.style.cursor = 'grab';
            
            // Save the new position
            this.saveWindowPosition();
        });
        
        // Mouse leave event - stop dragging if mouse leaves the window
        document.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                dragHandle.style.cursor = 'grab';
                
                // Save the new position
                this.saveWindowPosition();
            }
        });
        
        // Add a tooltip to indicate draggable
        dragHandle.title = 'Drag to move window';
    }
    
    // Add pulsing glow effect to the window
    addPulseEffect() {
        // Create a keyframe animation for the border glow
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
        
        // Apply the animation to the window
        this.equipmentPanel.style.animation = 'equipmentBorderPulse 2s ease-in-out 3';
        
        // Remove the animation after it completes
        setTimeout(() => {
            this.removePulseEffect();
        }, 6000); // 3 pulses at 2 seconds each
    }
    
    // Remove the pulse effect
    removePulseEffect() {
        if (!this.equipmentPanel) return;
        
        this.equipmentPanel.style.animation = 'none';
        const styleElement = document.getElementById('equipment-pulse-animation');
        if (styleElement) {
            document.head.removeChild(styleElement);
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

// Add these event listeners at the end of the file, just before the closing comment
// Document level events to ensure tooltips are properly cleaned up
document.addEventListener('mouseleave', () => {
    clearAllTooltips();
});

document.addEventListener('click', (e) => {
    // If the click is not on an item element, clear tooltips
    if (!e.target.closest('.inventory-item') && 
        !e.target.closest('.equipment-slot') && 
        !e.target.closest('.bag-slot')) {
        clearAllTooltips();
    }
}); 

// Add document-level event handlers for clearing tooltips
document.addEventListener('mouseleave', () => {
    clearAllTooltips();
});

document.addEventListener('click', (e) => {
    // Check if the click is outside of item elements
    const isItemClick = e.target.closest('.inventory-item') || 
                        e.target.closest('.equipment-slot') || 
                        e.target.closest('.bag-slot');
    
    if (!isItemClick) {
        clearAllTooltips();
    }
}); 