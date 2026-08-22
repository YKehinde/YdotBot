import http from 'http';
import { createInterface } from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:4390/callback';
const SCOPES = ['chat:read', 'chat:edit', 'channel:read:subscriptions', 'user:read:email'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in .env before running this.');
  process.exit(1);
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function exchangeCode(code: string) {
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as { access_token: string; refresh_token: string };
}

async function main() {
  const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
  authUrl.searchParams.set('client_id', CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));

  console.log('\nThis does a one-time authorization as the Twitch account the bot chats as.');
  console.log('IMPORTANT: log into twitch.tv in your browser AS THAT BOT/BROADCASTER ACCOUNT first.');
  console.log(`IMPORTANT: your Twitch app (dev.twitch.tv/console/apps) must list ${REDIRECT_URI} under OAuth Redirect URLs.\n`);
  console.log('1. Open this URL and click Authorize:\n');
  console.log(authUrl.toString());
  console.log('\n2. Waiting for the redirect back to localhost...\n');

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, REDIRECT_URI);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error_description');

      res.end(error ? `Authorization failed: ${error}` : 'Authorized — you can close this tab and return to the terminal.');
      server.close();

      if (code) resolve(code);
      else reject(new Error(error || 'No code returned'));
    });

    server.listen(4390);
  }).catch(async (err) => {
    console.warn(`Local redirect capture failed (${err.message}). Paste the "code" query param from the redirect URL instead:`);
    return ask('code: ');
  });

  const tokens = await exchangeCode(code);

  console.log('\nSuccess. Add this to your .env:\n');
  console.log(`TWITCH_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  console.log('The bot will exchange it for access tokens itself on startup and keep renewing it — you should only need to do this once.');
}

main().catch((error) => {
  console.error('\nAuth flow failed:', error.message);
  process.exit(1);
});
