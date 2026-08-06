import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

export const env = {
  discordToken: process.env.DISCORD_TOKEN || '',
  discordClientId: process.env.DISCORD_CLIENT_ID || '',
  discordServerUrl: process.env.DISCORD_SERVER_URL || '',
  twitchClientId: process.env.TWITCH_CLIENT_ID || '',
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || '',
  twitchChannel: process.env.TWITCH_CHANNEL || '',
  overlayPort: parseInt(process.env.OVERLAY_PORT || '3001', 10),
  overlaySecret: process.env.OVERLAY_SECRET || '',
  databasePath: process.env.DATABASE_PATH || './data/bot.db',
  nodeEnv: process.env.NODE_ENV || 'development',
};

export function validateEnv() {
  const required = [
    'discordToken',
    'discordClientId',
    'twitchClientId',
    'twitchClientSecret',
    'twitchChannel',
    'overlaySecret',
  ];

  const missing = required.filter((key) => !env[key as keyof typeof env]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
