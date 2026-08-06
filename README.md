# YdotBot

A feature-rich Discord bot for streamers with Twitch integration, music playback, moderation, leveling, community gaming queue, and support tickets.

**Status:** Fully featured and production-ready. Deployed on Railway (~$10-15/month).

## Features

**Discord Community:**
- Leveling/XP system with leaderboard (`/rank`)
- Welcome messages with customizable text
- Support tickets (`/ticket create`)
- Dad jokes (`/dadjoke`)

**Moderation:**
- Manual commands: `/kick`, `/ban`, `/timeout`, `/warn`, `/purge`
- Auto-moderation: spam detection, caps filter, link blocking, banned word filter
- Configurable escalation (3 strikes = ban)
- Full mod-log with audit trail

**Twitch Integration:**
- Go-live alerts posted to Discord
- Twitch chat: first-time visitor greetings
- Stream start announcements (`/stream-starting`)
- Chat command: `!discord` — posts Discord invite link

**Gaming Queue:**
- `!join`/`!leave` in Twitch chat
- `!queue` to view queue
- OBS overlay at `http://localhost:3001/queue-overlay?key=<secret>`
- Mod controls: `!next`, `!lock`, `!remove`, `!clear`

**Admin:**
- `/ydotbot-help` — Command reference for mods
- Config commands for all features

## Local Development

### Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials:
   - Discord bot token and client ID
   - Twitch client ID and secret
   - Your Twitch channel name
   - Your Discord server invite URL
   - Random overlay secret

3. Install and run:
   ```bash
   npm install
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

Railway keeps your bot running 24/7 with auto-redeploy on git push. Cost: $10-15/month.

**Alternative: Self-hosted** (see [DEPLOYMENT.md](DEPLOYMENT.md) for Oracle Cloud setup)

## Project Structure

```
/src
  /commands
    /fun             (ping, dadjoke, rank)
    /music           (play, skip, pause, resume, stop, queue, sinfo)
    /moderation      (kick, ban, timeout, warn, purge)
    /admin           (set-welcome, set-modlog, set-twitch-announce, automod, ticket, stream-starting, ydotbot-help)
  /events            (message handling, member join)
  /services          (music, leveling, tickets, playlists, queues, auto-mod, Twitch)
  /utils             (env, logging, types, command loader)
  index.ts           (bot bootstrap)
```

## Data Files

- `data/levels.json` — User levels and XP
- `data/playlists.json` — Saved music playlists
- `data/tickets.json` — Support ticket history
- `data/guilds.json` — Per-guild configuration

All data persists across bot restarts.
