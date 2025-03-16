# BruteFight Changelog

## v1.1.0 - Code Restructuring Update

### Major Changes
- Complete restructuring of codebase into modular architecture
- Implementation of ES module system
- Enhanced player management system
- Improved combat mechanics
- Added tree system with chopping mechanics
- Added woodcutting skill
- Fixed inventory and equipment systems

### Completed Features
- Fixed module imports and exports
- Fixed inventory system
- Fixed chat system
- Fixed game rendering
- Implemented proper export structure with backward compatibility
- Added proper tree rendering with simple geometric shapes
- Enhanced experience orb system
- Added experience gain from mining and combat
- Fixed rock hit and breaking system
- Added chat input system that properly blocks game hotkeys
- Fixed equipment system initialization
- Fixed ground rendering system
- Added global ore and experience orb synchronization
- Enhanced tree module architecture

### Bug Fixes
- Fixed InventoryManager.js error
- Fixed OreManager.js error
- Fixed ExperienceOrbManager
- Fixed Equipment UI error
- Fixed player rendering during attacks
- Fixed tree import issues
- Fixed tree spawning with direct imports and error handling
- Fixed chat input system to prevent hotkey interference
- Fixed ground rendering to show grid and grass colors
- Fixed equipment panel opening twice on game start
- Fixed inventory system to make it openable with I key

### Known Issues
- Some weapons may not display proper animations in certain angles
- Experience orbs sometimes overlap and are difficult to collect
- Leaderboard occasionally shows duplicate entries
- Combat against mobs still needs implementation
- Inventory drag and drop functionality needs improvement
- Player movement can be jumpy at higher speeds
- Trees respawn instantly in some edge cases
- Tree collision can occasionally cause player to get stuck

### Coming Soon
- Fix for leaderboard duplication issue
- Enhanced tree resource collection
- Improved tree respawn mechanics
- Combat system for mobs
- More inventory management features
- Improved player animation system
- Optimization for large worlds
- More visual effects for skills and abilities
- Proper camera transitions between game states 