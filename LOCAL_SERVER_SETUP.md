# Local Minecraft Server Setup Guide

## Quick Start (Windows)

### Option 1: Official Minecraft Server

1. **Download the server JAR:**
   - Go to https://www.minecraft.net/en-us/download/server
   - Download `minecraft_server.1.20.1.jar` (or your preferred version)
   - Save it to a folder like `C:\minecraft-server\`

2. **Create a start script** (`start-server.bat`):
   ```batch
   @echo off
   java -Xmx1024M -Xms1024M -jar minecraft_server.1.20.1.jar nogui
   pause
   ```

3. **First run:**
   - Run `start-server.bat`
   - It will fail and create `eula.txt`
   - Open `eula.txt` and change `eula=false` to `eula=true`
   - Run `start-server.bat` again

4. **Configure for your bot:**
   - Edit `server.properties`:
     - `online-mode=false` (if you want offline mode for testing)
     - `enable-command-block=true` (if needed)
   - Restart the server

### Option 2: Paper Server (Better Performance)

1. **Download Paper:**
   - Go to https://papermc.io/downloads/paper
   - Download Paper 1.20.1 (or your version)
   - Save to `C:\minecraft-server\`

2. **Use the same start script** but change the JAR name to `paper-1.20.1-xxx.jar`

### Option 3: Using Docker (Advanced)

If you have Docker installed:

```bash
docker run -d -p 25565:25565 -e EULA=TRUE -e VERSION=1.20.1 itzg/minecraft-server
```

## Connecting Your Bot

Once the server is running:

1. **Update your `.env` file:**
   ```
   MINECRAFT_HOST=localhost
   MINECRAFT_PORT=25565
   MINECRAFT_USERNAME=YourBotName
   MINECRAFT_VERSION=1.20.1
   ```

2. **Start your bot:**
   ```bash
   npm start
   ```

## Troubleshooting

- **Port already in use:** Change port in `server.properties` (e.g., `server-port=25566`)
- **Can't connect:** Make sure firewall allows Java through, or disable Windows Firewall temporarily
- **Out of memory:** Increase `-Xmx1024M` to `-Xmx2048M` or higher
- **Bot can't join:** Set `online-mode=false` in `server.properties` for offline mode testing

## Server Commands

Once connected, you can use Minecraft commands:
- `/op YourBotName` - Give operator permissions
- `/gamemode creative` - Switch to creative mode
- `/tp YourBotName 0 64 0` - Teleport to spawn

## Free Cloud Alternatives (if local doesn't work)

- **Aternos** (https://aternos.org) - Free server hosting with limitations
- **Minehut** (https://minehut.com) - Free server with some restrictions
- **Oracle Cloud Free Tier** - Can host a small server for free (requires setup)
