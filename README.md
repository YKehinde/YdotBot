# YdotBot

A Discord bot for streamers with deep Twitch integration: go-live alerts, Twitch chat commands, auto-moderation, leveling, a community gaming queue, and support tickets.

**Status:** Production-ready. Deployed on Railway.

## Features

**Discord Community:**
- Leveling/XP system with leaderboard (`/rank me`, `/rank leaderboard`)
- Welcome messages with customizable text (`/set-welcome`)
- Support tickets (`/ticket create`, `/ticket close`)
- Dad jokes (`/dadjoke`)

**Moderation:**
- Manual commands: `/kick`, `/ban`, `/timeout`, `/warn`, `/purge`
- Discord auto-moderation: spam detection, caps filter, link blocking, banned word filter (`/automod`)
- Twitch chat auto-moderation: spam detection, link blocking, banned word filter — caps checking is off by default (`/twitch-automod`)
- Configurable escalation (1st → delete, 2nd → timeout, 3rd → ban)
- Full mod-log with audit trail (`/set-modlog`)

**Twitch Integration:**
- Go-live alerts posted to Discord with an `@everyone` ping (`/set-twitch-announce`)
- Automatic shoutouts when someone gifts 5+ subs
- Twitch chat: one-time greeting for first-time chatters
- Periodic "thanks for watching" reminder posted every 20 minutes while live
- Stream start announcements (`/stream-starting`)
- Chat commands: `!discord`, `!so <username>`, `!lurk`

**Gaming Queue:**
- `!join`/`!leave` in Twitch chat
- `!queue` to view queue
- OBS overlay at `http://localhost:3001/queue-overlay?key=<secret>`
- Mod controls: `!next`, `!lock`, `!remove`, `!clear`, `!unlock`

**Admin:**
- `/ydotbot-help` — Command reference for mods
- Config commands for all features

See `/ydotbot-help` in Discord for the full, up-to-date command list.

## Local Development

### Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials:
   - Discord bot token and client ID
   - Twitch client ID and secret
   - Your Twitch channel name (must match the account you authorize in the next step)
   - Your Discord server invite URL
   - Random overlay secret

3. Install dependencies, then get a Twitch refresh token (needs `chat:read`, `chat:edit`, `channel:read:subscriptions`, `user:read:email` scopes — the bot logs into Twitch chat as this account and needs `channel:read:subscriptions` for gift-sub shoutouts):
   ```bash
   npm install
   npm run twitch:auth
   ```
   This opens a one-time browser authorization and prints a `TWITCH_REFRESH_TOKEN` to add to `.env`. Log into twitch.tv as the bot/broadcaster account first, and make sure `http://localhost:4390/callback` is listed under your Twitch app's OAuth Redirect URLs at [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps). The bot exchanges this for access tokens itself on startup and keeps renewing them — you only do this once (a new one is only needed if the refresh token is revoked).

4. Run:
   ```bash
   npm run dev
   ```

### Scripts

- `npm run dev` — Start with hot reload
- `npm run build` — Compile TypeScript
- `npm start` — Run built bot
- `npm run lint` — Check code style
- `npm run lint:fix` — Auto-fix code style

## Deployment

**Recommended: Railway** (see [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for full guide)

Railway keeps your bot running 24/7 with auto-redeploy on git push.

**Alternative: Self-hosted** (see [DEPLOYMENT.md](DEPLOYMENT.md) for Oracle Cloud setup)

## Project Structure

```
/src
  /commands
    /fun             (ping, dadjoke, rank)
    /moderation      (kick, ban, timeout, warn, purge)
    /admin           (set-welcome, set-modlog, set-twitch-announce, automod, twitch-automod, ticket, stream-starting, ydotbot-help)
  /events            (message handling, member join, Twitch stream online, Twitch subscription gift)
  /services          (leveling, tickets, queues, Discord auto-mod, Twitch chat, Twitch auto-mod, Twitch EventSub, Twitch API, overlay server)
  /utils             (env, logging, types, command loader)
  index.ts           (bot bootstrap)
```

## Data Files

- `data/levels.json` — User levels and XP
- `data/tickets.json` — Support ticket history
- `data/guilds.json` — Per-guild configuration
- `data/twitch-automod.json` — Twitch chat auto-mod configuration

All data persists across bot restarts.
