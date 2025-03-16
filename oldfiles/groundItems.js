// Ground Items System
// This system manages items that are on the ground in the game world

class GroundItem {
    constructor(item, x, y) {
        this.item = item;       // The actual item object
        this.x = x;             // World X position
        this.y = y;             // World Y position
        this.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9); // Unique ID
        this.floatOffset = 0;   // For floating animation
        this.floatDir = 1;      // Direction of float (1 up, -1 down)
        this.floatSpeed = 0.05; // Speed of floating animation
        this.scale = 1;         // Scale for "pop" animation
        this.created = Date.now(); // When item was created
        this.scaleDir = -1;     // Direction of scale animation
        this.isDragging = false; // Whether the item is being dragged
        this.dragOffsetX = 0;   // Offset from mouse when dragging
        this.dragOffsetY = 0;   // Offset from mouse when dragging
        
        // Configure interaction radius based on item type
        this.interactionRadius = 20; // Default interaction radius
        
        // Add glow effect for rare/valuable items
        this.glow = 0;
        if (item.rarity && item.rarity > 1) {
            this.glow = item.rarity * 0.2; // More glow for higher rarity
        }
        
        // Set despawn time (2 minutes for normal items, 5 minutes for rare items)
        this.despawnTime = item.rarity && item.rarity > 1 ? 5 * 60 * 1000 : 2 * 60 * 1000;
        
        // Preload item image if it has an icon path
        this.loadItemImage();
    }
    
    // Preload the item image to ensure it displays correctly
    loadItemImage() {
        if (this.item.icon && typeof this.item.icon === 'string') {
            this.itemImage = new Image();
            this.itemImage.src = this.item.icon;
            
            // Log when image is loaded or failed
            this.itemImage.onload = () => {
                console.log(`Loaded item image for ${this.item.name}: ${this.item.icon}`);
            };
            
            this.itemImage.onerror = () => {
                console.error(`Failed to load item image for ${this.item.name}: ${this.item.icon}`);
                this.itemImage = null; // Set to null so we know to use fallback
            };
        }
    }
    
    update(deltaTime) {
        // Don't do floating animation if being dragged
        if (!this.isDragging) {
            // Floating animation
            this.floatOffset += this.floatDir * this.floatSpeed * deltaTime;
            if (Math.abs(this.floatOffset) > 5) {
                this.floatDir *= -1; // Reverse direction
            }
        }
        
        // Scale animation for new items (pop in effect)
        const age = Date.now() - this.created;
        if (age < 500) {
            // Pop in
            this.scale = Math.min(1, age / 500);
        } else if (this.despawnTime - age < 2000) {
            // Start fading out when close to despawn time
            this.scale = Math.max(0.3, (this.despawnTime - age) / 2000);
        } else if (!this.isDragging) {
            // Subtle pulse (only if not being dragged)
            if (age % 2000 < 1000) {
                this.scale = 1 + Math.sin((age % 1000) / 1000 * Math.PI) * 0.1;
            } else {
                this.scale = 1;
            }
        }
        
        // Glow pulse effect for rare items
        if (this.glow > 0) {
            this.glowIntensity = this.glow * (0.7 + 0.3 * Math.sin(age * 0.003));
        }
        
        // Return true if the item should be despawned
        return !this.isDragging && age > this.despawnTime;
    }
    
    draw(ctx, cameraX, cameraY) {
        // Calculate screen position
        let screenX, screenY;
        
        if (this.isDragging) {
            // If being dragged, use mouse position with offsets
            screenX = window.mouseX + this.dragOffsetX;
            screenY = window.mouseY + this.dragOffsetY;
        } else {
            // Normal positioning based on world coordinates
            screenX = this.x - Math.floor(cameraX);
            screenY = this.y - Math.floor(cameraY) + this.floatOffset;
        }
        
        // Don't draw if off screen (with a larger buffer to ensure visibility)
        if (!this.isDragging && (
            screenX < -100 || screenX > ctx.canvas.width + 100 || 
            screenY < -100 || screenY > ctx.canvas.height + 100)) {
            return;
        }
        
        // Draw glow effect for rare items
        if (this.glow > 0) {
            const glowRadius = 35 * this.scale * this.glowIntensity;
            const gradient = ctx.createRadialGradient(
                screenX, screenY, 5,
                screenX, screenY, glowRadius
            );
            gradient.addColorStop(0, `rgba(255, 215, 0, ${this.glowIntensity})`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw shadow beneath item for better visibility
        ctx.beginPath();
        ctx.arc(screenX, screenY + 5, 15 * this.scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();
        
        // Draw item base (circular background)
        ctx.beginPath();
        ctx.arc(screenX, screenY, 18 * this.scale, 0, Math.PI * 2);
        ctx.fillStyle = this.isDragging ? 'rgba(80, 80, 80, 0.8)' : 'rgba(30, 30, 30, 0.7)';
        ctx.fill();
        
        // Draw border (highlighted if being dragged)
        ctx.beginPath();
        ctx.arc(screenX, screenY, 18 * this.scale, 0, Math.PI * 2);
        ctx.strokeStyle = this.isDragging ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = this.isDragging ? 3 : 2;
        ctx.stroke();
        
        // Draw item icon if available
        if (this.itemImage && this.itemImage.complete && this.itemImage.naturalWidth > 0) {
            // Use the preloaded image
            try {
                const size = 32 * this.scale;
                ctx.drawImage(this.itemImage, screenX - size/2, screenY - size/2, size, size);
                // Log successful draw periodically
                if (Date.now() % 1000 < 10) {
                    console.log(`Drew item at screen position (${screenX}, ${screenY}), world position (${this.x}, ${this.y})`);
                }
            } catch (e) {
                console.error("Error drawing item image:", e);
                this.drawFallbackIcon(ctx, screenX, screenY);
            }
        } else if (this.item.icon && typeof this.item.icon === 'string') {
            // Try direct image drawing if preload didn't work
            try {
                const img = new Image();
                img.src = this.item.icon;
                
                const size = 32 * this.scale;
                ctx.drawImage(img, screenX - size/2, screenY - size/2, size, size);
            } catch (e) {
                console.error("Error with direct image drawing:", e);
                this.drawFallbackIcon(ctx, screenX, screenY);
            }
        } else {
            // Draw fallback icon
            this.drawFallbackIcon(ctx, screenX, screenY);
        }
        
        // Draw item count if stackable and more than 1
        if (this.item.stackable && this.item.count && this.item.count > 1) {
            // Draw background for count
            const countText = String(this.item.count);
            ctx.font = 'bold 12px Arial';
            const countWidth = ctx.measureText(countText).width + 6;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(screenX + 8, screenY + 8, countWidth, 16);
            
            // Draw count
            ctx.textAlign = 'center';
            ctx.fillStyle = 'white';
            ctx.fillText(this.item.count, screenX + 8 + countWidth/2, screenY + 20);
        }
        
        // If being dragged, draw a ghost copy at original position
        if (this.isDragging) {
            const origScreenX = this.x - Math.floor(cameraX);
            const origScreenY = this.y - Math.floor(cameraY) + this.floatOffset;
            
            if (origScreenX >= -100 && origScreenX <= ctx.canvas.width + 100 && 
                origScreenY >= -100 && origScreenY <= ctx.canvas.height + 100) {
                
                // Draw ghost item base at original position
                ctx.beginPath();
                ctx.arc(origScreenX, origScreenY, 18 * this.scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(30, 30, 30, 0.3)';
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(origScreenX, origScreenY, 18 * this.scale, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }
    
    drawFallbackIcon(ctx, x, y) {
        // Use colors based on item type
        let color = '#AAAAAA'; // Default gray
        
        // Adjust color based on item type
        if (this.item.type === 'resource') {
            color = '#8B4513'; // Brown for resources
        } else if (this.item.type === 'equipment' || this.item.type === 'tool') {
            color = '#4682B4'; // Steel blue for equipment/tools
        } else if (this.item.type === 'consumable') {
            color = '#228B22'; // Forest green for consumables
        }
        
        // Draw a simple colored square
        const size = 20 * this.scale;
        ctx.fillStyle = color;
        ctx.fillRect(x - size/2, y - size/2, size, size);
        
        // Add a border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - size/2, y - size/2, size, size);
        
        // Add the first letter of the item name
        if (this.item.name) {
            const letter = this.item.name.charAt(0).toUpperCase();
            ctx.font = `bold ${Math.floor(16 * this.scale)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(letter, x, y);
        }
    }
    
    // Start dragging the item
    startDrag(mouseX, mouseY, screenX, screenY) {
        this.isDragging = true;
        
        // Calculate offset from mouse position to item center
        this.dragOffsetX = screenX - mouseX;
        this.dragOffsetY = screenY - mouseY;
        
        // Set scale to normal while dragging
        this.scale = 1;
        
        return true;
    }
    
    // Update position while dragging
    updateDrag(mouseX, mouseY, cameraX, cameraY) {
        if (!this.isDragging) return false;
        
        // Update world position based on mouse and camera
        const worldX = mouseX + Math.floor(cameraX);
        const worldY = mouseY + Math.floor(cameraY);
        
        return { x: worldX, y: worldY };
    }
    
    // End dragging
    endDrag(newX, newY) {
        if (!this.isDragging) return false;
        
        this.isDragging = false;
        
        // If new coordinates are provided, update item position
        if (newX !== undefined && newY !== undefined) {
            this.x = newX;
            this.y = newY;
        }
        
        // Reset drag offsets
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        return true;
    }
    
    // Check if a point is within interaction range of this item
    isInRange(x, y, interactionRange) {
        const dx = this.x - x;
        const dy = this.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= (interactionRange || this.interactionRadius);
    }
    
    // Hit test for mouse interaction (check if mouse is over item)
    isPointOver(mouseX, mouseY, cameraX, cameraY) {
        const screenX = this.x - Math.floor(cameraX);
        const screenY = this.y - Math.floor(cameraY) + this.floatOffset;
        
        const dx = screenX - mouseX;
        const dy = screenY - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= 20 * this.scale; // 20px hit radius scaled by item scale
    }
}

class GroundItemManager {
    constructor() {
        this.items = [];
        this.hoverItem = null;
        this.pickupRange = 40; // Default range for picking up items
        this.draggedItem = null; // Currently dragged item
        this.dragStartTime = 0; // When dragging started (to prevent accidental drags)
        
        // Bind event handlers
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // We'll add these to the window when the canvas is available
        this.onMouseDown = this.handleMouseDown.bind(this);
        this.onMouseMove = this.handleMouseMove.bind(this);
        this.onMouseUp = this.handleMouseUp.bind(this);
        
        // This will be called from game.js after canvas is initialized
        if (window.addEventListener) {
            window.addGroundItemEvents = () => {
                if (window.canvas) {
                    window.canvas.addEventListener('mousedown', this.onMouseDown);
                    window.addEventListener('mousemove', this.onMouseMove);
                    window.addEventListener('mouseup', this.onMouseUp);
                    console.log("Ground item drag events initialized");
                } else {
                    console.error("Canvas not available for ground item events");
                }
            };
        }
    }
    
    handleMouseDown(e) {
        if (!window.canvas || !window.cameraX || !window.cameraY) return;
        
        // Get mouse position
        const rect = window.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Store global mouse position for dragging
        window.mouseX = mouseX;
        window.mouseY = mouseY;
        
        // Check if player is interacting with UI
        if (window.uiManager && window.uiManager.isInteractingWithUI()) {
            return; // Don't interact with ground items when UI is active
        }
        
        // Check if mouse is over any ground item
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (item.isPointOver(mouseX, mouseY, window.cameraX, window.cameraY)) {
                // Start dragging the item
                const screenX = item.x - Math.floor(window.cameraX);
                const screenY = item.y - Math.floor(window.cameraY) + item.floatOffset;
                
                item.startDrag(mouseX, mouseY, screenX, screenY);
                this.draggedItem = item;
                this.dragStartTime = Date.now();
                
                console.log(`Started dragging item: ${item.item.name}`);
                return;
            }
        }
        
        // Check if an item is being dragged from inventory to ground
        if (window.playerInventory && window.playerInventory.isDraggingItem && 
            window.playerInventory.draggedItem) {
            
            // Convert screen coords to world coords
            const worldX = mouseX + Math.floor(window.cameraX);
            const worldY = mouseY + Math.floor(window.cameraY);
            
            // Create a copy of the inventory item
            const invItem = window.playerInventory.draggedItem;
            
            // Drop the item on the ground
            this.dropItem(invItem, worldX, worldY);
            
            // Remove from inventory
            window.playerInventory.removeItem(invItem.slotIndex);
            
            console.log(`Dropped item from inventory to ground: ${invItem.name}`);
        }
    }
    
    handleMouseMove(e) {
        if (!window.canvas) return;
        
        // Get mouse position
        const rect = window.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Store global mouse position for dragging
        window.mouseX = mouseX;
        window.mouseY = mouseY;
        
        // Update dragged item position
        if (this.draggedItem) {
            const newPos = this.draggedItem.updateDrag(mouseX, mouseY, window.cameraX, window.cameraY);
            // We don't update the actual position until drop
        }
        
        // Update hover state for items near mouse
        if (!this.draggedItem) {
            this.hoverItem = null;
            let closestDistance = 30; // Smaller hover radius than pickup radius
            
            for (let i = this.items.length - 1; i >= 0; i--) {
                const item = this.items[i];
                if (item.isPointOver(mouseX, mouseY, window.cameraX, window.cameraY)) {
                    const screenX = item.x - Math.floor(window.cameraX);
                    const screenY = item.y - Math.floor(window.cameraY) + item.floatOffset;
                    
                    const dx = screenX - mouseX;
                    const dy = screenY - mouseY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        this.hoverItem = item;
                    }
                }
            }
        }
    }
    
    handleMouseUp(e) {
        if (!this.draggedItem) return;
        
        // Get mouse position
        const rect = window.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check duration - prevent accidental move on quick clicks
        const dragDuration = Date.now() - this.dragStartTime;
        if (dragDuration < 150) {
            // Short drag is a click - try to pick up item
            if (window.playerInventory) {
                const pickedUp = this.pickUpItem(
                    this.draggedItem.x, 
                    this.draggedItem.y, 
                    this.pickupRange, 
                    window.playerInventory
                );
                
                if (pickedUp) {
                    console.log(`Picked up item: ${this.draggedItem.item.name}`);
                    // Remove dragged reference since item is gone
                    this.draggedItem = null;
                    return;
                }
            }
        }
        
        // Convert screen coords to world coords for new position
        const worldX = mouseX + Math.floor(window.cameraX);
        const worldY = mouseY + Math.floor(window.cameraY);
        
        // Check if dropping over inventory
        let droppedInInventory = false;
        if (window.playerInventory && window.playerInventory.isPointOverInventory(mouseX, mouseY)) {
            // Try to add to inventory
            const slotIndex = window.playerInventory.addItem(this.draggedItem.item);
            
            if (slotIndex !== -1) {
                // Successfully added to inventory, remove from ground
                this.items = this.items.filter(item => item.id !== this.draggedItem.id);
                droppedInInventory = true;
                
                console.log(`Added ground item to inventory: ${this.draggedItem.item.name}`);
                
                // Show message
                if (window.addChatMessage) {
                    window.addChatMessage({
                        type: 'system',
                        message: `Added ${this.draggedItem.item.name} to your inventory.`
                    });
                }
            }
        }
        
        if (!droppedInInventory) {
            // Drop back to ground at new position
            this.draggedItem.endDrag(worldX, worldY);
            console.log(`Dropped item at new position: (${worldX}, ${worldY})`);
        }
        
        // Clear dragged item
        this.draggedItem = null;
    }
    
    // Add an item to the ground at the specified position
    dropItem(item, x, y, isPlayerBroken = false) {
        // Don't drop empty items
        if (!item) return null;
        
        // Create spread effect for multiple items being dropped at once
        if (item.stackable && item.count > 1 && item.count <= 5) {
            // Drop individual items with slight position variations
            const droppedItems = [];
            for (let i = 0; i < item.count; i++) {
                const spreadX = x + (Math.random() * 40 - 20);
                const spreadY = y + (Math.random() * 40 - 20);
                
                // Create a copy of the item with count of 1
                const singleItem = { ...item, count: 1 };
                const groundItem = new GroundItem(singleItem, spreadX, spreadY);
                
                // Mark if this is from a player-broken ore
                if (isPlayerBroken) {
                    groundItem.isPlayerBroken = true;
                    // If the playerBrokenOreItems array exists, add to it
                    if (window.playerBrokenOreItems) {
                        window.playerBrokenOreItems.push(groundItem);
                    }
                }
                
                this.items.push(groundItem);
                droppedItems.push(groundItem);
            }
            return droppedItems;
        } else {
            // Drop as a single stack
            const groundItem = new GroundItem(item, x, y);
            
            // Mark if this is from a player-broken ore
            if (isPlayerBroken) {
                groundItem.isPlayerBroken = true;
                // If the playerBrokenOreItems array exists, add to it
                if (window.playerBrokenOreItems) {
                    window.playerBrokenOreItems.push(groundItem);
                }
            }
            
            this.items.push(groundItem);
            return groundItem;
        }
    }
    
    // Update all ground items
    update(deltaTime, playerX, playerY) {
        // Update hover state for items near player
        if (!this.draggedItem) {
            this.hoverItem = null;
            let closestDistance = this.pickupRange;
            
            for (let i = this.items.length - 1; i >= 0; i--) {
                // Update item and check if it should be removed (despawned)
                if (this.items[i].update(deltaTime)) {
                    this.items.splice(i, 1);
                    continue;
                }
                
                // Check if player is hovering over an item
                const dx = this.items[i].x - playerX;
                const dy = this.items[i].y - playerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    this.hoverItem = this.items[i];
                }
            }
        } else {
            // Just update the dragged item without checking for despawn
            this.draggedItem.update(deltaTime);
        }
    }
    
    // Draw all ground items
    draw(ctx, cameraX, cameraY) {
        // Sort items by Y position for proper depth rendering
        this.items.sort((a, b) => a.y - b.y);
        
        // Draw all items
        for (const item of this.items) {
            item.draw(ctx, cameraX, cameraY);
            
            // Draw pickup indicator for hover item
            if (item === this.hoverItem && !this.draggedItem) {
                this.drawPickupIndicator(ctx, item, cameraX, cameraY);
            }
        }
    }
    
    // Draw a pickup indicator around the item being hovered
    drawPickupIndicator(ctx, item, cameraX, cameraY) {
        const screenX = item.x - Math.floor(cameraX);
        const screenY = item.y - Math.floor(cameraY) + item.floatOffset;
        
        // Draw pickup circle
        ctx.beginPath();
        ctx.arc(screenX, screenY, 25, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw item name above
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'black';
        ctx.fillRect(screenX - 60, screenY - 40, 120, 20);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(screenX - 60, screenY - 40, 120, 20);
        
        // Item name
        ctx.fillStyle = 'white';
        let displayName = item.item.name;
        if (item.item.stackable && item.item.count > 1) {
            displayName += ` (${item.item.count})`;
        }
        ctx.fillText(displayName, screenX, screenY - 28);
        
        // Draw pickup key hint
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(screenX - 30, screenY + 20, 60, 20);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(screenX - 30, screenY + 20, 60, 20);
        ctx.fillStyle = 'white';
        ctx.fillText('Press E', screenX, screenY + 33);
    }
    
    // Try to pick up an item at the specified position
    pickUpItem(x, y, range, inventory) {
        // Find closest item within range
        let closestItem = null;
        let closestDistance = range || this.pickupRange;
        
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const dx = item.x - x;
            const dy = item.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestItem = item;
            }
        }
        
        // If no item found, return null
        if (!closestItem) return null;
        
        // Try to add item to inventory
        if (inventory) {
            const slotIndex = inventory.addItem(closestItem.item);
            if (slotIndex !== -1) {
                // Remove item from ground
                this.items = this.items.filter(item => item.id !== closestItem.id);
                
                // Remove from player broken items array if it exists
                if (window.playerBrokenOreItems) {
                    window.playerBrokenOreItems = window.playerBrokenOreItems.filter(
                        item => item.id !== closestItem.id
                    );
                }
                
                // Show pickup message
                if (window.addChatMessage) {
                    window.addChatMessage({
                        type: 'system',
                        message: `Picked up ${closestItem.item.name}`
                    });
                }
                
                return closestItem.item;
            } else {
                // Inventory is full
                if (window.addChatMessage) {
                    window.addChatMessage({
                        type: 'system',
                        message: `Your inventory is full!`
                    });
                }
            }
        }
        
        // Could not add to inventory (it might be full)
        return null;
    }
    
    // Get the item currently being hovered over
    getHoverItem() {
        return this.hoverItem;
    }
    
    // Get item at specific screen position
    getItemAtScreenPosition(screenX, screenY, cameraX, cameraY) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const itemScreenX = item.x - Math.floor(cameraX);
            const itemScreenY = item.y - Math.floor(cameraY) + item.floatOffset;
            
            const dx = itemScreenX - screenX;
            const dy = itemScreenY - screenY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= 20) { // 20px hit radius
                return item;
            }
        }
        return null;
    }
}

// Make ground item system available globally
window.GroundItemManager = GroundItemManager;
window.GroundItem = GroundItem; 