# WorldEdit Setup Guide for B.O.B

This guide explains how to set up WorldEdit with B.O.B for significantly faster builds.

## Why Use WorldEdit?

WorldEdit provides a **50-100x performance boost** for large builds:
- **Vanilla**: ~50 blocks/second (10-second house, 3-minute castle)
- **WorldEdit**: ~25,000 blocks/second (<1-second house, 10-second castle)

## Installation

### Step 1: Download WorldEdit

Choose the version for your server type:

#### Bukkit/Spigot/Paper Servers
```bash
# Download from https://dev.bukkit.org/projects/worldedit
# Or use direct link:
wget https://dev.bukkit.org/projects/worldedit/files/latest
```

#### Fabric Servers
```bash
# Download from https://www.curseforge.com/minecraft/mc-mods/worldedit
# Requires Fabric API
```

### Step 2: Install Plugin/Mod

1. Place the downloaded `.jar` file in your server's directory:
   - **Bukkit/Spigot/Paper**: `plugins/` folder
   - **Fabric**: `mods/` folder

2. Restart your Minecraft server

3. Verify installation:
   ```
   /plugins  (Bukkit/Spigot/Paper)
   /mods     (Fabric)
   ```
   You should see WorldEdit in the list.

### Step 3: Grant Bot Permissions

B.O.B requires specific WorldEdit permissions to function.

#### Method 1: LuckPerms (Recommended)

```bash
# Create a group for B.O.B
lp creategroup bob_builder

# Grant WorldEdit permissions
lp group bob_builder permission set worldedit.selection.* true
lp group bob_builder permission set worldedit.region.set true
lp group bob_builder permission set worldedit.region.walls true
lp group bob_builder permission set worldedit.region.replace true
lp group bob_builder permission set worldedit.generation.pyramid true
lp group bob_builder permission set worldedit.generation.cylinder true
lp group bob_builder permission set worldedit.generation.sphere true
lp group bob_builder permission set minecraft.command.setblock true
lp group bob_builder permission set minecraft.command.tp true

# Assign bot to group (replace BOB_Builder with your bot's username)
lp user BOB_Builder parent add bob_builder
```

#### Method 2: PermissionsEx

```bash
pex user BOB_Builder add worldedit.selection.*
pex user BOB_Builder add worldedit.region.*
pex user BOB_Builder add worldedit.generation.*
pex user BOB_Builder add minecraft.command.setblock
pex user BOB_Builder add minecraft.command.tp
```

#### Method 3: permissions.yml (Basic Servers)

Edit `permissions.yml`:

```yaml
BOB_Builder:
  permissions:
    worldedit.selection.*: true
    worldedit.region.set: true
    worldedit.region.walls: true
    worldedit.region.replace: true
    worldedit.generation.pyramid: true
    worldedit.generation.cylinder: true
    worldedit.generation.sphere: true
    minecraft.command.setblock: true
    minecraft.command.tp: true
```

#### Method 4: OP (Quick Setup, Not Recommended for Production)

```bash
/op BOB_Builder
```

**Warning**: This gives the bot full server permissions. Only use for testing.

### Step 4: Configure WorldEdit Limits

Edit `plugins/WorldEdit/config.yml` (or `config/worldedit/worldedit.yml`):

```yaml
limits:
  default:
    # Maximum blocks BOB can change in one operation
    max-blocks-changed: 50000

    # Maximum radius for cylinder/sphere operations
    max-radius: 50

    # Maximum polygon points (not used by BOB)
    max-polygonal-points: -1

    # Disable timeout (BOB handles its own rate limiting)
    timeout: 0

history:
  # Size of undo history
  size: 15

  # How long to keep history (minutes)
  expiration: 10

# Enable these for better performance
use-inventory:
  enable: false  # BOB doesn't use inventory

allowed-data-cycle-blocks:
  - '*'  # Allow all block types
```

### Step 5: Verify Setup

1. Start your Minecraft server
2. Start B.O.B: `npm start`
3. Check the console output for:
   ```
   Detecting WorldEdit plugin...
   ✓ WorldEdit detected and available
   ```

4. Test with a simple build:
   ```
   !build small stone cube
   ```

5. Check console for WorldEdit command execution:
   ```
   [WorldEdit] //sel cuboid
   [WorldEdit] //pos1 x,y,z
   [WorldEdit] //pos2 x,y,z
   [WorldEdit] //set stone
   ```

## Troubleshooting

### WorldEdit Not Detected

**Problem**: B.O.B says "WorldEdit not available"

**Solutions**:
1. Verify WorldEdit is installed: `/plugins` or `/mods`
2. Check server logs for WorldEdit errors
3. Ensure server has fully started before launching B.O.B
4. Try manually: `/version WorldEdit` in server console

### Permission Errors

**Problem**: Console shows "You don't have permission" errors

**Solutions**:
1. Verify bot has required permissions: `/lp user BOB_Builder permission check worldedit.region.set`
2. Try OPing the bot temporarily: `/op BOB_Builder`
3. Check permission plugin is working: `/lp user BOB_Builder info`

### Spam Kick Warnings

**Problem**: Bot gets kicked for "spam" or "sending commands too quickly"

**Solutions**:
1. B.O.B has built-in spam protection with adaptive backoff
2. Increase delay in `src/config/limits.js`:
   ```javascript
   worldEdit: {
     commandMinDelayMs: 300,  // Increase from 200
   }
   ```
3. Check server anti-spam settings (plugins like AntiCheat)

### Commands Not Executing

**Problem**: WorldEdit commands appear in logs but nothing happens

**Solutions**:
1. Verify bot is OP or has all permissions
2. Check WorldEdit configuration allows regions of this size
3. Ensure bot is in correct world (not in a protected spawn area)
4. Try manual WorldEdit command as bot: `/execute as BOB_Builder run //version`

### Builds Still Slow

**Problem**: Builds are still slow even with WorldEdit

**Solutions**:
1. Check console - WorldEdit operations should show in logs
2. Verify builds are large enough (WorldEdit only helps with >100 blocks)
3. Check if fallback is triggering due to errors
4. Increase `maxSelectionVolume` in limits.js for very large builds

### Selection Size Errors

**Problem**: "Selection too large" errors

**Solutions**:
1. Increase limits in `src/config/limits.js`:
   ```javascript
   worldEdit: {
     maxSelectionVolume: 100000,  // Increase from 50000
     maxSelectionDimension: 100,  // Increase from 50
   }
   ```
2. Also update WorldEdit's config.yml `max-blocks-changed`
3. Note: Very large operations may cause server lag

## Advanced Configuration

### Custom Limits

Edit `src/config/limits.js`:

```javascript
export const SAFETY_LIMITS = {
  // ... existing limits ...

  worldEdit: {
    enabled: true,                    // Enable/disable WorldEdit
    maxSelectionVolume: 50000,        // Max blocks per operation
    maxSelectionDimension: 50,        // Max single dimension
    commandRateLimit: 5,              // Commands per second
    commandMinDelayMs: 200,           // Delay between commands
    maxCommandsPerBuild: 100,         // Total commands per build
    fallbackOnError: true,            // Auto-fallback to vanilla
  }
};
```

### Environment Variables

Add to `.env`:

```env
# WorldEdit configuration
WORLDEDIT_ENABLED=true
WORLDEDIT_MAX_SELECTION_VOLUME=50000
WORLDEDIT_MAX_COMMANDS_PER_BUILD=100
WORLDEDIT_FALLBACK_ON_ERROR=true
```

## Performance Tips

### Optimize for Speed
- Give bot OP or full WorldEdit permissions (fewer permission checks)
- Increase `max-blocks-changed` in WorldEdit config
- Use dedicated server (not shared hosting)
- Allocate more RAM to server (4GB+ recommended)

### Optimize for Safety
- Keep lower limits for public servers
- Enable `fallbackOnError` to prevent build failures
- Use permission groups instead of OP
- Monitor server TPS during large builds

### Balance Speed and Safety
```javascript
// Good defaults for most servers:
worldEdit: {
  maxSelectionVolume: 50000,      // Handles most builds
  commandMinDelayMs: 200,         // Prevents spam kicks
  maxCommandsPerBuild: 100,       // Reasonable limit
  fallbackOnError: true,          // Graceful degradation
}
```

## Comparison Table

| Build Type | Vanilla Time | WorldEdit Time | Speedup |
|------------|--------------|----------------|---------|
| Small house (500 blocks) | 10 seconds | <1 second | 10x |
| Medium tower (2k blocks) | 40 seconds | 2 seconds | 20x |
| Large castle (10k blocks) | 3-4 minutes | 5-10 seconds | 50x |
| Massive structure (50k blocks) | 15-20 minutes | 20-30 seconds | 40x |

## Supported Operations

### WorldEdit Operations
- `we_fill`: Large rectangular fills (foundations, floors)
- `we_walls`: Hollow structures (walls only)
- `we_pyramid`: Pyramids and roofs
- `we_cylinder`: Towers and columns
- `we_sphere`: Domes and curved structures
- `we_replace`: Material replacement

### Vanilla Operations (used for details)
- `stairs`, `slab`, `door`: Architectural details
- `fence_connect`: Railings and barriers
- `spiral_staircase`: Complex staircases
- `balcony`: Protruding balconies
- `roof_hip`: Four-sided roofs

## Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review server logs for errors
3. Enable debug mode in B.O.B for verbose logging
4. Open an issue on GitHub with logs and error messages

## References

- [WorldEdit Documentation](https://worldedit.enginehub.org/en/latest/)
- [LuckPerms Documentation](https://luckperms.net/)
- [B.O.B README](README.md)
- [B.O.B Plan](PLAN.md)
