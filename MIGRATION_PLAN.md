# Migration Plan: BruteFight Code Restructuring

## Introduction
This document outlines the plan for refactoring the BruteFight game from its current monolithic structure into a more modular, maintainable architecture. The migration will involve breaking down the large game.js file into smaller, focused components with clear responsibilities.

## Phases

### Phase 1: Core Infrastructure (COMPLETED)
1. Create directory structure
2. Set up the Game class
3. Create basic documentation
4. Implement main entry point

### Phase 2: Manager Components (COMPLETED)
1. Implement PlayerManager
2. Implement ChatManager
3. Implement UIManager
4. Implement OreManager
5. Implement InventoryManager
6. Implement EquipmentManager
7. Implement AssetLoader

### Phase 3: Systems and Entities (COMPLETED)
1. Implement CombatSystem
2. Create Entity classes (Player, Ore, Item, etc.)
3. Implement rendering systems
4. Implement networking components

### Phase 4: UI Components (IN PROGRESS)
1. Implement various UI components (inventory, equipment, leaderboard)
2. Create UI helper utilities
3. Style and theme consistency

### Phase 5: Testing and Optimization (IN PROGRESS)
1. ✅ Fix module imports and exports
2. 🔄 Fix inventory system
3. 🔄 Fix chat system 
4. 🔄 Fix game rendering
5. Implement automated tests
6. Performance optimizations
7. Browser compatibility testing
8. Bug fixes and refinements

## Issues and Fixes

### Module Structure Fixes
- ✅ Fixed exports in system modules (skills.js, attacks.js, ores.js, experienceOrbs.js)
- ✅ Created Inventory class in equipment module
- ✅ Set up proper export structure for backward compatibility using window.* objects

### Current Known Issues (Ordered by Priority)
1. ✅ Inventory System Error: Fixed InventoryManager.js error by creating the missing Equipment.Inventory class
2. ✅ Ore Constructor Error: Fixed OreManager.js error by properly accessing Ore constructors from window.Ores
3. ✅ Experience Orb Error: Fixed ExperienceOrbManager to properly work with game instance
4. ✅ Equipment UI Error: Fixed binding issues in EquipmentUI constructor and implemented missing methods 
5. ❌ Game Rendering: Game canvas is not rendering properly
6. ❌ Chat System: Chat functionality is broken
7. ❌ UI Integration: Various UI components may need reconnection after module restructuring

### Recent Fixes
- ✅ Created Inventory class in equipment module to fix InventoryManager initialization
- ✅ Fixed OreManager to properly use ore constructors from window.Ores
- ✅ Resolved conflict between systems/ores.js and entities/Ore.js by renaming the global object to OresData
- ✅ Enhanced OreManager with fallback mechanisms for ore creation
- ✅ Updated Ore.js to provide proper constructor functions for OreManager
- ✅ Added initialization of required global objects (hitRocks, rockHitTimes, rockParticles)
- ✅ Implemented ExperienceOrbManager in systems/experienceOrbs.js to fix the undefined playerManager error
- ✅ Added null checks for method binding in UI components to prevent "cannot read properties of undefined" errors
- ✅ Added missing methods to EquipmentUI including createEmptySlotIcon, createQuickbar, updateSlot, and makeDraggable

## Migration Steps
1. ✅ Extract core logic into separate components
2. ✅ Create proper manager classes
3. ✅ Implement ES6 module imports/exports
4. ✅ Set up global objects for backward compatibility
5. ❌ Test each component individually
6. ❌ Integrate components back into a cohesive system
7. ❌ Optimize performance

## Progress Tracking

| Component               | Status       | Completion % |
|-------------------------|--------------|--------------|
| Game.js                 | Completed    | 100%        |
| PlayerManager.js        | Completed    | 100%        |
| ChatManager.js          | Completed    | 100%        |
| UIManager.js            | Completed    | 100%        |
| InventoryManager.js     | Completed    | 100%        |
| OreManager.js           | Completed    | 100%        |
| EquipmentManager.js     | Needs fixing | 90%         |
| AssetLoader.js          | Completed    | 100%        |
| CombatSystem.js         | Completed    | 100%        |
| Player.js               | Completed    | 100%        |
| Ore.js                  | Completed    | 100%        |
| Item.js                 | Completed    | 100%        |
| ExperienceOrb.js        | Completed    | 100%        |
| Inventory.js            | Created      | 100%        |
| InventoryUI.js          | Needs fixing | 90%         |
| EquipmentUI.js          | Needs fixing | 90%         |
| LeaderboardUI.js        | Completed    | 100%        |
| index.js modules        | Completed    | 100%        |
| MinimapRenderer.js      | Completed    | 100%        |
| Socket.js               | Completed    | 100%        |

## Next Steps and Priorities

### Immediate Next Steps (Priority Order)
1. Test the Inventory system fix to verify it resolves the reported error
2. Debug game rendering issues - check canvas initialization and rendering code
3. Fix the chat system - investigate why it's not functioning
4. Verify all component connections in the Game class
5. Implement complete error handling and logging throughout the codebase

### Technical Debt to Address
1. Ensure consistent naming conventions across the codebase
2. Improve documentation for all complex components
3. Refactor remaining global state dependencies
4. Implement unit tests for core components

## Future Enhancements
1. Implement asset preloading system
2. Add offline mode support
3. Improve mobile responsiveness
4. Add configuration options for graphics quality and performance

## Considerations and Risks
- Backward compatibility with older save games
- Browser compatibility concerns
- Performance impact of modular architecture
- Potential race conditions during component initialization 