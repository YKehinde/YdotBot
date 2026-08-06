# YdotBot

A Discord bot for streamers with Twitch integration, music playback, moderation, and community queue features.

## Local Development

### Setup

1. Copy `.env.example` to `.env` and fill in your credentials:
   - Discord bot token and client ID
   - Twitch client ID and secret
   - Your Twitch channel name
   - A random secret for the overlay server

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

### Scripts

- `npm run dev` — Start with hot reload (requires tsx)
- `npm run build` — Compile TypeScript to JavaScript
- `npm start` — Run the built bot
- `npm run lint` — Check for linting issues
- `npm run lint:fix` — Fix linting issues automatically
- `npm run deploy` — Build and restart via pm2

## Deployment on Oracle Cloud

### Initial VM Setup

1. Create an Ampere A1 Always Free instance on Oracle Cloud
2. Download the SSH private key
3. SSH into the VM: `ssh -i <key-file> ubuntu@<public-ip>`

### First-Time Setup on VM

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pm2 globally
sudo npm install -g pm2

# Clone or pull the repository
git clone <repo-url> ~/ydotbot
cd ~/ydotbot

# Install dependencies
npm install

# Build
npm run build

# Create .env from .env.example
cp .env.example .env
# Edit .env with your actual credentials
nano .env

# Start with pm2
pm2 start ecosystem.config.js

# Save PM2 config to auto-start on reboot
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Firewall Setup

The overlay server runs on port 3001. Open it on the Oracle Cloud VM:

1. Go to Oracle Cloud Console → Networking → Virtual Cloud Networks
2. Select your VCN → Security Lists → Default Security List
3. Add an Ingress Rule:
   - Source CIDR: `0.0.0.0/0`
   - Destination Port Range: `3001`
   - Protocol: TCP

Also verify the VM's OS firewall isn't blocking it:
```bash
# Check if port 3001 is listening
sudo netstat -tlnp | grep 3001

# If using ufw, allow the port
sudo ufw allow 3001/tcp
```

### Deploying Updates

```bash
# On your local machine
git add .
git commit -m "your message"
git push

# On the VM via SSH
cd ~/ydotbot
git pull
npm run deploy
```

## Project Structure

```
/src
  /commands          (slash commands grouped by category)
    /fun             (fun/utility commands like /ping)
    /moderation      (kick, ban, timeout, etc.)
    /admin           (config commands)
  /events            (Discord event handlers)
  /services          (Twitch integration, music player, queue)
  /utils             (shared utilities and types)
  index.ts           (bot bootstrap)
ecosystem.config.js  (pm2 configuration)
```

## Features (Phased)

### Phase 0 (Current)
- ✅ Slash command framework
- ✅ `/ping` test command
- ✅ Environment configuration
- ✅ PM2 process management

### Phase 1
- Welcome messages
- Basic moderation (/kick, /ban, /timeout, /warn, /purge)
- Twitch go-live alerts via EventSub

### Phase 1.5
- Community queue (!join, !leave, !next)
- Overlay server for queue display

### Phase 2
- Auto-moderation (spam, caps, links, banned words)
- Persistent warning system
- Mod log channel

### Phase 3
- `/dadjoke` command
- Music system (play, skip, queue, playlists from YouTube)
- `/sinfo` command (now-playing info)

### Phase 4
- Leveling/XP system
- Giveaway system
- Custom commands
- Ticket system
