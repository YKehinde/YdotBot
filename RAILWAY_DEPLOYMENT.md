# YdotBot Deployment on Railway

Railway is a container platform that keeps your bot running 24/7. Much simpler than Oracle Cloud, and cost-effective for low-traffic bots ($10-15/month).

## Prerequisites

1. **GitHub account** with your YdotBot repository pushed
2. **Railway account** (free at railway.app)
3. Your environment secrets ready:
   - Discord token
   - Twitch credentials
   - Overlay secret
   - Discord server URL

## Step 1: Connect GitHub to Railway

1. Go to [railway.app](https://railway.app)
2. Sign up (or log in)
3. Click **"Create New Project"**
4. Select **"Deploy from GitHub repo"**
5. Click **"Connect GitHub"** and authorize Railway
6. Select your YdotBot repository
7. Click **"Deploy"**

Railway will automatically detect the Node.js project and start building.

## Step 2: Add Environment Variables

Once the project is created:

1. Go to your project dashboard
2. Click the **"Variables"** tab
3. Add each variable:
   - `DISCORD_TOKEN` = your Discord bot token
   - `DISCORD_CLIENT_ID` = your application ID
   - `DISCORD_SERVER_URL` = your Discord invite link
   - `TWITCH_CLIENT_ID` = your Twitch client ID
   - `TWITCH_CLIENT_SECRET` = your Twitch secret
   - `TWITCH_CHANNEL` = your Twitch username
   - `OVERLAY_SECRET` = random secret (e.g., `openssl rand -hex 32`)
   - `OVERLAY_PORT` = `3001`
   - `NODE_ENV` = `production`

4. Click **"Deploy"** to redeploy with the new variables

## Step 3: Verify Deployment

1. Go to the **"Deployments"** tab
2. Wait for the build to complete (green checkmark)
3. Once live, you'll see a public URL (something like `https://ydotbot-production.up.railway.app`)
4. Click **"View Logs"** to see the bot starting up

Look for these messages:
```
[INFO] [Bot] Environment validation passed
[INFO] [ConfigService] Loaded config for 0 guild(s)
[INFO] [Bot] Logged in as YdotBot#5621
```

## Step 4: Configure Your Bot

The bot is now running! Set up your Discord server:

1. **Go to your Discord server** and run:
   - `/set-welcome channel #introductions` (or your welcome channel)
   - `/set-modlog channel #mod-logs`
   - `/set-twitch-announce channel #go-live` (for stream alerts)

## Accessing Your Bot

**Public URL**: Railway gives you a public URL, but your bot doesn't need it for Discord/Twitch integration. The queue overlay will be:
```
https://[your-railway-url]/queue-overlay?key=[OVERLAY_SECRET]
```

However, since Discord Gateway and Twitch EventSub are **outbound connections** (bot connects to them, not the other way around), you don't need a public URL.

## Managing Your Deployment

### View Logs
1. Go to project dashboard
2. Click **"View Logs"** (bottom right)
3. See real-time bot output

### Redeploy
1. Make changes to your code
2. Commit and push to GitHub
3. Railway auto-detects and redeploys (1-2 minutes)

### Restart the Bot
1. Click the **"Settings"** tab
2. Scroll to **"Deployment"** section
3. Click **"Redeploy"** or **"Restart"**

### Update Environment Variables
1. Click **"Variables"** tab
2. Edit and save
3. Railway auto-redeploys

## Monitoring Costs

1. Go to **"Settings"** → **"Usage"**
2. See RAM/CPU/Storage usage
3. Estimated monthly cost shown at the top

**Typical bot cost**: $5-15/month after the initial $5 credit

## Troubleshooting

### Bot not responding in Discord
- Check logs for errors
- Verify Discord token is correct
- Make sure bot has permissions in server

### Database/config files not persisting
- Railway restarts the container occasionally
- Data is lost if stored in memory only
- SQLite files (data/\*.json) are persisted between restarts
- Use Railway's **Volumes** if you need guaranteed persistence (paid feature, not needed for this bot)

## Upgrading Resources

If you need more RAM or CPU:

1. Go to **"Settings"**
2. Under **"Deployments"**, you can set:
   - **RAM**: Default is fine (0.5GB), cost increases if you increase
   - **CPU**: Scaled automatically
3. Changes take effect on next redeploy

## Switching Back to Oracle (Optional)

When Oracle capacity opens up, deployment is the same:
1. Provision the VM
2. Clone your repo: `git clone https://github.com/you/YdotBot.git`
3. Follow the README deployment section
4. Stop the Railway deployment when ready

Your code is the same—just different hosting.

## Support

- **Railway docs**: https://docs.railway.app
- **Check your project logs** for errors before contacting support
- Railway's support is helpful and responsive
