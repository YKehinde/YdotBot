import express, { Express, Request, Response } from 'express';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { queueService } from './queueService.js';
import { musicService } from './musicService.js';

let app: Express | null = null;

function authenticateToken(req: Request, res: Response): boolean {
  const token = req.query.key as string;

  if (!token || token !== env.overlaySecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

export const overlayServer = {
  async start() {
    app = express();

    app.use(express.json());

    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    app.get('/api/queue', (req: Request, res: Response) => {
      if (!authenticateToken(req, res)) return;

      const queue = queueService.getQueue(env.twitchChannel);
      const locked = queueService.isLocked(env.twitchChannel);

      res.json({
        queue: queue.map((m, i) => ({
          position: i + 1,
          username: m.username,
          joinedAt: m.joinedAt,
        })),
        locked,
        size: queue.length,
      });
    });

    app.get('/queue-overlay', (req: Request, res: Response) => {
      if (!authenticateToken(req, res)) return;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stream Queue</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      min-height: 100vh;
    }

    .container {
      max-width: 400px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .header h1 {
      font-size: 24px;
      margin-bottom: 5px;
    }

    .status {
      font-size: 12px;
      color: #888;
      margin-bottom: 10px;
    }

    .status.locked {
      color: #ff6b6b;
    }

    .queue-list {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .queue-item {
      padding: 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .queue-item:last-child {
      border-bottom: none;
    }

    .queue-position {
      font-size: 18px;
      font-weight: bold;
      color: #00d4ff;
      min-width: 35px;
      text-align: center;
    }

    .queue-username {
      flex: 1;
      font-size: 16px;
    }

    .empty {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .updating {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎮 Stream Queue</h1>
      <div class="status" id="status">
        Loading...
      </div>
    </div>

    <div class="queue-list" id="queue-container">
      <div class="updating">Updating...</div>
    </div>

    <div class="updating">
      Auto-refreshing every 2s
    </div>
  </div>

  <script>
    async function updateQueue() {
      try {
        const response = await fetch(\`/api/queue?key=\${new URLSearchParams(window.location.search).get('key')}\`);

        if (!response.ok) {
          document.getElementById('queue-container').innerHTML = '<div class="empty">Access denied</div>';
          return;
        }

        const data = await response.json();
        const container = document.getElementById('queue-container');
        const statusEl = document.getElementById('status');

        statusEl.textContent = data.locked ? '🔒 LOCKED' : '🔓 OPEN';
        statusEl.className = data.locked ? 'status locked' : 'status';

        if (data.queue.length === 0) {
          container.innerHTML = '<div class="empty">No one in queue</div>';
        } else {
          container.innerHTML = data.queue
            .map(
              (member) =>
                \`
                <div class="queue-item">
                  <div class="queue-position">#\${member.position}</div>
                  <div class="queue-username">\${member.username}</div>
                </div>
              \`
            )
            .join('');
        }
      } catch (error) {
        console.error('Failed to update queue:', error);
        document.getElementById('queue-container').innerHTML = '<div class="empty">Error loading queue</div>';
      }
    }

    updateQueue();
    setInterval(updateQueue, 2000);
  </script>
</body>
</html>
      `;

      res.type('text/html').send(html);
    });

    app.get('/api/current-song', (req: Request, res: Response) => {
      const channel = env.twitchChannel;
      const current = musicService.getCurrentSongInfo(channel);

      if (current) {
        res.json(current);
      } else {
        const nextUrl = musicService.getNextDefaultPlaylistSong(channel);
        if (nextUrl) {
          res.json({ url: nextUrl, isFromDefaultPlaylist: true });
        } else {
          res.status(404).json({ error: 'No song currently playing' });
        }
      }
    });

    app.post('/webhook/song-finished', (req: Request, res: Response) => {
      const channel = env.twitchChannel;

      try {
        const nextUrl = musicService.getNextDefaultPlaylistSong(channel);

        res.json({
          success: true,
          nextSong: nextUrl ? { url: nextUrl, isFromDefaultPlaylist: true } : null,
        });
      } catch (error) {
        logger.error('OverlayServer', 'Error in song-finished webhook', error);
        res.status(500).json({ error: 'Failed to get next song' });
      }
    });

    return new Promise((resolve) => {
      app!.listen(env.overlayPort, () => {
        logger.info('OverlayServer', `Overlay server running on port ${env.overlayPort}`);
        logger.info(
          'OverlayServer',
          `Queue overlay: http://localhost:${env.overlayPort}/queue-overlay?key=${env.overlaySecret}`
        );
        resolve(null);
      });
    });
  },

  stop() {
    if (app) {
      (app as any).close();
      app = null;
    }
  },
};
