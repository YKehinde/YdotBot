import { readFileSync, writeFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface Playlist {
  name: string;
  tracks: string[];
}

const DATA_DIR = './data';
const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

function loadPlaylists(): Map<string, Playlist> {
  try {
    if (!existsSync(PLAYLISTS_FILE)) {
      return new Map();
    }
    const data = readFileSync(PLAYLISTS_FILE, 'utf-8');
    const playlists = JSON.parse(data) as Record<string, Playlist>;
    return new Map(Object.entries(playlists));
  } catch (error) {
    logger.error('PlaylistService', 'Failed to load playlists', error);
    return new Map();
  }
}

function savePlaylists(playlists: Map<string, Playlist>) {
  try {
    const obj = Object.fromEntries(playlists);
    writeFileSync(PLAYLISTS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (error) {
    logger.error('PlaylistService', 'Failed to save playlists', error);
  }
}

let playlists = loadPlaylists();

export const playlistService = {
  async init() {
    await ensureDataDir();
    playlists = loadPlaylists();
    logger.info('PlaylistService', `Loaded ${playlists.size} playlist(s)`);
  },

  getPlaylist(name: string): Playlist | null {
    return playlists.get(name) || null;
  },

  createPlaylist(name: string, tracks: string[] = []): Playlist {
    const playlist: Playlist = { name, tracks };
    playlists.set(name, playlist);
    savePlaylists(playlists);
    logger.info('PlaylistService', `Created playlist: ${name}`);
    return playlist;
  },

  deletePlaylist(name: string): boolean {
    const deleted = playlists.delete(name);
    if (deleted) {
      savePlaylists(playlists);
      logger.info('PlaylistService', `Deleted playlist: ${name}`);
    }
    return deleted;
  },

  addTrackToPlaylist(playlistName: string, trackUrl: string): boolean {
    const playlist = playlists.get(playlistName);
    if (!playlist) {
      return false;
    }

    if (!playlist.tracks.includes(trackUrl)) {
      playlist.tracks.push(trackUrl);
      savePlaylists(playlists);
    }

    return true;
  },

  removeTrackFromPlaylist(playlistName: string, trackUrl: string): boolean {
    const playlist = playlists.get(playlistName);
    if (!playlist) {
      return false;
    }

    const index = playlist.tracks.indexOf(trackUrl);
    if (index === -1) {
      return false;
    }

    playlist.tracks.splice(index, 1);
    savePlaylists(playlists);
    return true;
  },

  listPlaylists(): string[] {
    return Array.from(playlists.keys());
  },

  getPlaylistTracks(name: string): string[] {
    const playlist = playlists.get(name);
    return playlist ? [...playlist.tracks] : [];
  },
};
