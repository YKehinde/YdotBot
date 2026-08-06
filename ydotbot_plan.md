# YdotBot — Discord Bot Plan

## Stack

- **Language:** TypeScript
- **Library:** discord.js v14
- **Runtime:** Node.js 20+
- **Database:** SQLite (via `better-sqlite3` or Prisma) — swappable for Postgres later if hosted on Railway/Render
- **Web server:** small Express/Fastify instance, serving the queue overlay page/JSON to OBS over the internet
- **Twitch chat:** `tmi.js`, for reading `!join`/`!leave`/mod commands directly from your Twitch chat (separate from the Discord bot connection)
- **Voice/Music:** `@discordjs/voice` + `play-dl` (or `distube`) for audio streaming from YouTube — also doubles as the metadata source for `/sinfo`
- **Hosting:** **Oracle Cloud Always Free** VM (see **Hosting** section below) — built with env vars/no hardcoded paths regardless, so it could still move to another host later without code changes

## Architecture

```
/src
  /commands
    /moderation   (kick, ban, timeout, warn, purge)
    /automod      (spam/caps/link/word filters — phase 2)
    /fun          (dadjoke, sinfo)
    /music        (play, skip, queue, playlist save/load)
    /admin        (config commands: set welcome channel, set twitch channel, etc.)
  /events         (guildMemberAdd, messageCreate, interactionCreate, ready)
  /services
    twitch-events.ts  (EventSub via WebSocket — go-live detection)
    twitch-chat.ts     (tmi.js — !join/!leave/!next/etc. in your Twitch chat)
    queue.ts           (in-memory community queue state + logic)
    music.ts            (queue/player state per Discord guild)
    db.ts                (SQLite client + migrations)
  /utils
  index.ts        (bot bootstrap — starts Discord client, Twitch chat client, and overlay server together)
overlay-server.ts  (Express app — serves /queue-overlay page + JSON endpoint for OBS, token-protected)
ecosystem.config.js  (pm2 process config — keeps the bot running/restarting on the VM)
.env.example
package.json
tsconfig.json
```

**Data model (SQLite):**

| Table | Purpose |
|---|---|
| `guild_config` | per-server settings: welcome channel/message, mod-log channel, twitch announce channel |
| `warnings` | user warning history for escalating auto-mod actions |
| `mod_logs` | audit trail of kicks/bans/timeouts/purges |
| `twitch_subscriptions` | which Twitch channel(s) each guild is subscribed to |
| `playlists` | saved per-guild music queues/playlists |
| `custom_commands` | (phase 4) user-defined text-trigger commands |

Note: the community queue is **in-memory only**, per your call — no table for it. It resets each time the bot restarts, which is fine since it's scoped to a single stream session anyway.

## Twitch integration (EventSub, via WebSocket)

- Register a Twitch Developer app, get client ID/secret.
- Bot opens an EventSub **WebSocket** connection to Twitch (bot connects out to Twitch, not the other way round) and subscribes to the `stream.online` topic for your channel.
- Twitch pushes the event over that open connection the moment you go live, including stream title and game (via a follow-up Twitch API call for category/game info).
- Bot posts an embed to the configured Discord channel: title, game, thumbnail, link to stream.
- This transport works the same regardless of host — it's a WebSocket the bot opens outward, no inbound port needed for EventSub itself.

## Hosting — Oracle Cloud Always Free

Genuinely free forever (not a trial) — an ARM-based VM (Ampere A1 "Always Free" shape) with far more CPU/RAM than this bot needs. Unlike Fly.io or Render's free tiers, it's a real always-on machine you fully control, so the persistent Discord Gateway / Twitch IRC / EventSub connections just stay open — no sleep, no cold starts.

Key difference from a PaaS: it's a raw VM, not a managed deploy pipeline, so a few things are on us to set up once:
- **Process management:** run the bot under `pm2` (or a systemd service) so it auto-restarts on crash and on VM reboot. `ecosystem.config.js` defines this for pm2.
- **Firewall:** Oracle's VM has both a cloud-level "security list" and the OS's own firewall (`iptables`/`firewalld`) — both need a rule opened for the overlay server's port so OBS can reach it from your Windows PC.
- **Deploys:** no one-command `fly deploy` — we'll set up a simple `git pull` + `pm2 restart` flow over SSH (a small deploy script), which is still quick once in place.
- **Queue overlay is public-facing:** same as before, the `/queue-overlay` URL needs a secret token in the query string (e.g. `?key=...`) so it's not viewable by randoms, since it's reachable over the open internet rather than `localhost`.
- **SQLite:** lives directly on the VM's disk — no ephemeral-storage concern like a PaaS, so no extra volume setup needed; just make sure the data directory is included in backups if you ever care about that.
- **Secrets:** kept in a `.env` file on the VM (not committed to git), same idea as local dev, just living on the server instead of a `fly secrets` store.

## Build order (phased MVP)

**Phase 0 — Scaffolding**
- Repo init, TypeScript config, ESLint/Prettier
- discord.js client boot + slash command registration script
- `.env` handling (local dev and on the VM), basic command handler framework
- Provision the Oracle Cloud VM, install Node.js + pm2, set up the `git pull` + `pm2 restart` deploy flow, open the firewall port for the overlay
- Deploy "ping" test command to confirm everything works end to end — running on the VM, not just locally

**Phase 1 — Core MVP**
- Welcome new members (configurable channel + message, optional auto-role)
- Basic moderation: `/kick`, `/ban`, `/timeout`, `/warn`, `/purge`
- Twitch go-live alert via EventSub WebSocket (subscribe command + game name in announcement)

**Phase 1.5 — Community Queue (Twitch chat)**
- Twitch chat listener (`tmi.js`) connects to your channel's chat
- Viewer commands: `!join` (adds them to the end of the queue), `!leave` (removes themselves)
- Mod-only commands: `!next` (pops and announces the next person in chat), `!queue` (lists current order in chat), `!remove <user>`, `!clear` (empty the queue), `!lock` / `!unlock` (stop/allow new joins — handy mid-game)
- Overlay server serves a plain, functional `/queue-overlay?key=...` page — for your eyes only via an OBS Browser Source, not intended to be shown to viewers, so no need for branded styling. The token in the URL keeps it private now that it's reachable over the internet rather than just `localhost`.
- Overlay auto-refreshes (simple polling, e.g. every 2s) so the list stays current as people join/leave/get called
- Queue is in-memory — resets on bot restart, scoped to that stream session

**Phase 2 — Advanced moderation (MEE6-style)**
- Auto-mod: spam detection, excessive caps, invite/link filter, banned word filter
- Warning system with persistent counts and escalating actions (warn → timeout → kick → ban)
- Mod-log channel with full audit trail
- Reaction roles / self-assignable roles

**Phase 3 — Fun & utility**
- `/dadjoke` — random dad joke (icanhazdadjoke API, free, no key needed)
- Music playlist system: join VC, queue, play/pause/skip/queue-list, save/load named playlists per server — sourced from YouTube (via `play-dl` or `distube`), no Spotify/paid API needed
- `/sinfo` — reports on the currently playing (or last-queued) track, sourced directly from the player's own metadata (title, artist/channel, duration, thumbnail, URL) — no external API required since `play-dl`/`distube` already returns this when a track is queued

**Phase 4 — Suggested additions**
- Leveling/XP system with a rank command (keeps the server active, very popular MEE6-style feature)
- Reaction-based giveaways command
- Custom commands (let mods add their own text-trigger responses without touching code)
- Ticket/support system (private channel per support request)
- Live server stats channel (member count, online count in a voice channel name)
- Scheduled stream-reminder announcements (pairs well with your overlay frames)

## Immediate next steps

1. Create the Discord application + bot user in the Developer Portal, grab the token
2. Create a Twitch Developer app (client ID/secret) — used for both EventSub and the chat bot login
3. Sign up for Oracle Cloud, create an **Always Free** Ampere A1 VM instance (Ubuntu is the easiest choice), and download its SSH key
4. I scaffold Phase 0 (repo, pm2 config, working "ping" command), SSH in to install Node.js and get it running on the VM so we can confirm everything connects before building further

**Note on streaming the bot's music:** the Discord music player and your Twitch stream are separate systems — the bot only plays audio into a Discord voice channel. To get that audio into your Twitch broadcast, you'd join the voice channel yourself and route your Discord audio output into OBS (e.g. via VoiceMeeter or a virtual audio cable), the same way people stream Spotify audio. Also worth knowing: playing YouTube-sourced music live on Twitch can trigger Twitch's automated copyright detection, same risk as any commercial music on stream.
