import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from './types.js';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadCommandsFromDir(dir: string): Promise<Command[]> {
  const commands: Command[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subCommands = await loadCommandsFromDir(fullPath);
      commands.push(...subCommands);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
      if (entry.name.endsWith('.d.ts')) continue;
      try {
        const module = await import(`file://${fullPath}`);
        if (module.default && module.default.data && module.default.execute) {
          commands.push(module.default);
          logger.debug('CommandLoader', `Loaded command: ${entry.name}`);
        }
      } catch (error) {
        logger.error('CommandLoader', `Failed to load ${entry.name}`, error);
      }
    }
  }

  return commands;
}

export async function loadCommands(): Promise<Command[]> {
  const commandsDir = path.resolve(__dirname, '../commands');
  return loadCommandsFromDir(commandsDir);
}
