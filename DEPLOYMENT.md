# YdotBot Deployment to Oracle Cloud

## Step 1: Oracle Cloud VM Setup

Once Ampere A1 capacity frees up, create the instance:

1. **VCN First** (recommended): Create a VCN with Internet Connectivity
   - Oracle Cloud Console → Networking → Virtual Cloud Networks
   - Click "Create VCN"
   - Choose "Create VCN with Internet Connectivity"
   - Accept defaults, click Create
   - Note the VCN name and public subnet

2. **Create Instance**:
   - Compute → Instances → Create Instance
   - Name: `ydotbot`
   - Image: Ubuntu 22.04 (or latest LTS)
   - Shape: Ampere A1 Compute (Always Free eligible)
   - VCN: Select the VCN created above
   - Subnet: Select the public subnet
   - **Public IPv4 Address**: Assign (this should be auto-selected if VCN was set up via wizard)
   - SSH Key: Generate new key pair or use existing, download the `.key` file
   - Click Create
   - Wait for RUNNING state (2-3 mins)

3. **Note the Public IP**: Copy the public IPv4 address from the Instance Details page

4. **Open Firewall Port 3001**:
   - Networking → Virtual Cloud Networks → Select your VCN
   - Security Lists → Default Security List → Add Ingress Rule
   - Stateless: No
   - Source Type: CIDR
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: TCP
   - Destination Port Range: `3001`
   - Click Add

## Step 2: SSH Into VM

```bash
# Make SSH key executable
chmod 600 /path/to/downloaded-key.key

# SSH into the VM
ssh -i /path/to/downloaded-key.key ubuntu@<public-ip>
```

You're now on the Oracle Cloud Ubuntu VM.

## Step 3: Install Node.js and PM2

Run these commands on the VM:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally
sudo npm install -g pm2

# Verify PM2
pm2 --version
```

## Step 4: Clone Repository

On the VM:

```bash
# Clone the repo (requires git auth setup or HTTPS access)
# If using HTTPS:
git clone https://github.com/<your-username>/YdotBot.git ~/ydotbot

# Or, if you have SSH keys set up:
git clone git@github.com:<your-username>/YdotBot.git ~/ydotbot

cd ~/ydotbot

# Install Node dependencies
npm install

# Build TypeScript
npm run build
```

## Step 5: Configure Environment

On the VM:

```bash
# Copy example to .env
cp .env.example .env

# Edit with your credentials
nano .env
```

Fill in:
- `DISCORD_TOKEN` — From Discord Developer Portal
- `DISCORD_CLIENT_ID` — Application ID from Developer Portal
- `TWITCH_CLIENT_ID` — From Twitch Developer Console
- `TWITCH_CLIENT_SECRET` — From Twitch Developer Console
- `TWITCH_CHANNEL` — Your Twitch username
- `OVERLAY_SECRET` — Generate a random string (e.g., `openssl rand -hex 32`)

**Save** (Ctrl+O, Enter, Ctrl+X in nano)

## Step 6: Start Bot with PM2

On the VM:

```bash
# Start the bot
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs ydotbot

# Set up auto-start on reboot
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

The bot should now be running and connected to Discord. Test with `/ping` in any server.

## Step 7: Verify Overlay Server

The overlay server should be accessible at:
```
http://<public-ip>:3001/queue-overlay?key=<OVERLAY_SECRET>
```

You can test with:
```bash
curl http://localhost:3001/health
```

(from the VM; from your local machine, use the public IP)

## Deployments Going Forward

Each time you push code:

```bash
# On the VM
cd ~/ydotbot
git pull
npm run build
pm2 restart ydotbot
```

Or create a deploy script on the VM:

```bash
# ~/.local/bin/deploy-ydotbot
#!/bin/bash
cd ~/ydotbot
git pull
npm run build
pm2 restart ydotbot
pm2 save
```

Then just run: `deploy-ydotbot`

## Monitoring

```bash
# View real-time logs
pm2 logs ydotbot

# Check resource usage
pm2 monit

# View process info
pm2 info ydotbot

# Restart bot
pm2 restart ydotbot

# Stop bot
pm2 stop ydotbot

# Restart everything on boot
pm2 save
```

## Troubleshooting

**Bot not responding to commands?**
- Check logs: `pm2 logs ydotbot`
- Verify Discord token is correct in `.env`
- Ensure bot has permissions in the Discord server (Administrator or specific command permissions)

**Overlay server not accessible?**
- Verify port 3001 is open in Oracle Cloud security list
- Check OS firewall: `sudo netstat -tlnp | grep 3001`
- Verify overlay server is running: `pm2 logs ydotbot` should show no errors

**PM2 not auto-starting on reboot?**
```bash
pm2 save
sudo systemctl enable pm2-ubuntu
```

**Out of disk space?**
```bash
df -h
pm2 logs --lines 100  # Reduce log retention if needed
```
