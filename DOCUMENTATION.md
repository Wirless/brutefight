# BruteFight Game Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Core Systems](#core-systems)
4. [Player Management](#player-management)
5. [Equipment System](#equipment-system)
6. [Resource Gathering](#resource-gathering)
7. [Combat System](#combat-system)
8. [Chat System](#chat-system)
9. [UI Components](#ui-components)
10. [Rendering System](#rendering-system)
11. [Saving & Loading](#saving--loading)
12. [Multiplayer](#multiplayer)

## Introduction

BruteFight is a multiplayer browser-based game where players can explore an open world, gather resources, upgrade equipment, and interact with other players. The game features a real-time chat system, equipment management, resource gathering mechanics, and character progression.

## Architecture Overview

The game follows a modular architecture with clear separation of concerns:

```
/src
  /core
    Game.js            - Main game controller
    AssetLoader.js     - Handles preloading of assets
    Socket.js          - WebSocket connection management
  /managers
    PlayerManager.js   - Handles player data and movement
    OreManager.js      - Manages ores in the game world
    InventoryManager.js - Manages inventory system
    ChatManager.js     - Handles chat functionality
    UIManager.js       - Manages game UI elements
  /rendering
    Renderer.js        - Main rendering engine
    MinimapRenderer.js - Renders the minimap
    ParticleSystem.js  - Manages particle effects
  /ui
    LoginUI.js         - Login screen
    EquipmentUI.js     - Equipment interface
    InventoryUI.js     - Inventory interface
    ChatUI.js          - Chat interface
    LeaderboardUI.js   - Leaderboard UI
  /utils
    Constants.js       - Game constants
    Helpers.js         - Helper functions
  /entities
    Player.js          - Player class
    Ore.js             - Ore class
    ExperienceOrb.js   - Experience orb class
  /systems
    CombatSystem.js    - Handles attacks and damage
    SkillSystem.js     - Manages player skills
```

## Core Systems

### Game Controller

The `Game` class is the central controller that coordinates all game systems. It initializes other managers and handles the game loop.

Key responsibilities:
- Initialize and coordinate game systems
- Manage the game loop
- Handle user input
- Maintain game state
- Coordinate communication between systems

```javascript
// Initialize the game
const game = new Game();
game.init();
```

### Socket Connection

The game uses WebSockets for real-time communication with the server, handling player movement, chat messages, and game state updates.

Features:
- Automatic reconnection
- Authentication with token system
- Real-time player position updates
- Chat message broadcasting
- Player join/leave notifications

## Player Management

The `PlayerManager` class handles all player-related functionality, including movement, collision detection, and player progression.

Key features:
- Smooth movement with collision detection
- Player leveling system
- Skill progression
- Experience tracking
- Equipment effects

```javascript
// Adding experience to player
playerManager.addExperience(50, "mining");
```

## Equipment System

The game features a comprehensive equipment system that allows players to:
- Collect and equip different items
- Manage inventory slots
- Use special equipment effects
- Set quickbar slots for easy access

### Inventory System

The `Inventory` class manages the player's inventory, allowing players to:
- Store and organize items
- Move items between slots
- Drop and pick up items
- Automatically stack compatible items

### Equipment Manager

The `EquipmentManager` handles equipped items and their effects:
- Manage different equipment slots (head, body, hands, etc.)
- Apply/remove equipment effects
- Validate equipment requirements
- Handle quickslot functionality

Key methods:
```javascript
// Equip an item to a slot
equipmentManager.equipItem(item, slotName);

// Unequip an item from a slot
equipmentManager.unequipItem(slotName);

// Set active quickslot
equipmentManager.setActiveQuickSlot(key);
```

## Resource Gathering

Players can gather resources by attacking resource nodes (ores, trees, etc.) with the appropriate tools.

### Ore System

The `OreManager` handles resource nodes in the game world:
- Generate ores around the player
- Handle ore mining and drops
- Manage ore respawning
- Control ore collision

Features:
- Different ore types with varying properties
- Required tools for different ores
- Experience rewards for mining
- Random resource drops
- Visual particles when mining

## Combat System

The game's combat system handles attacks and damage:

- Different attack types (pickaxe, axe)
- Cooldown management
- Collision detection for attacks
- Particle effects and visual feedback
- Tool-specific damage calculations

Key controls:
- Left-click to attack
- Space bar to attack in facing direction
- Number keys (1-2) to switch attack types

## Chat System

The `ChatManager` handles in-game communication between players:

Features:
- Multiple chat channels (all, system, movement)
- Chat filtering
- Message history
- Unread message counting
- Automatic system messages

Controls:
- Enter key to focus chat
- Tab between chat channels
- Click outside chat to return to game

## UI Components

The game includes several UI components:

### Equipment Panel
- Visual representation of equipped items
- Drag and drop interface
- Tooltip information
- Equipment stats

### Inventory Panel
- Grid-based item storage
- Drag and drop functionality
- Item tooltips
- Stackable items

### Quickbar
- Quick access to frequently used items
- Hotkeys (0-9) for immediate access
- Visual cooldown indicators

### Minimap
- Real-time player locations
- Resource indicators
- Current view area display
- Scale controls

## Rendering System

The `Renderer` class handles all visual aspects of the game:

Features:
- Tile-based floor rendering
- Camera system with smooth following
- Particle effects
- Character rendering
- Minimap rendering
- Optimized rendering for performance

Components:
```javascript
// Render the game scene
renderer.render();

// Render the floor
renderer.renderFloor();

// Render all players
renderer.renderPlayers();
```

## Saving & Loading

The game includes an automatic save system:

- Periodic auto-saves (every 60 seconds)
- Save on page unload
- Local storage backup
- Server-side persistence
- Visual save indicator

## Multiplayer

The game supports multiplayer functionality:

- Real-time player position updates
- Player list with online indicator
- Join/leave notifications
- Chat between players
- Leaderboard with top players
- Player appearance customization

### Server Communication

The game communicates with the server through these main events:
- `login` - Authenticate player
- `move` - Update player position
- `chatMessage` - Send/receive chat messages
- `updatePlayerData` - Update player stats and inventory
- `requestLeaderboard` - Get leaderboard data

## Controls Reference

| Key | Action |
|-----|--------|
| W | Move up |
| A | Move left |
| S | Move down |
| D | Move right |
| E | Toggle equipment panel |
| I | Toggle inventory panel |
| K | Toggle skills window |
| 0-9 | Access quickbar slots |
| Space | Attack in facing direction |
| Left-click | Attack toward mouse position |
| Enter | Focus chat input | 