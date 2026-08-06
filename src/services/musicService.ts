import {
  VoiceConnection,
  AudioPlayer,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  joinVoiceChannel,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import { VoiceChannel, TextChannel, EmbedBuilder } from 'discord.js';
import play from 'play-dl';
import { logger } from '../utils/logger.js';
import { playlistService } from './playlistService.js';

export interface Track {
  title: string;
  url: string;
  duration: number;
  thumbnail?: string;
  channel?: string;
}

interface GuildPlayer {
  connection: VoiceConnection | null;
  player: AudioPlayer;
  queue: Track[];
  currentTrack: Track | null;
  isPaused: boolean;
  defaultPlaylist?: string;
  playlistIndex?: number;
}

const players = new Map<string, GuildPlayer>();

function getOrCreatePlayer(guildId: string): GuildPlayer {
  if (!players.has(guildId)) {
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });

    players.set(guildId, {
      connection: null,
      player,
      queue: [],
      currentTrack: null,
      isPaused: false,
    });
  }

  return players.get(guildId)!;
}

async function playNextTrack(guildId: string, textChannel?: TextChannel) {
  const player = getOrCreatePlayer(guildId);

  if (player.queue.length === 0) {
    if (player.defaultPlaylist) {
      const playlistTracks = playlistService.getPlaylistTracks(player.defaultPlaylist);

      if (playlistTracks.length > 0) {
        player.playlistIndex = (player.playlistIndex || 0) % playlistTracks.length;
        const trackUrl = playlistTracks[player.playlistIndex];
        player.playlistIndex += 1;

        try {
          const track = await musicService.queue(trackUrl, guildId);
          if (track) {
            await playNextTrack(guildId, textChannel);
            return;
          }
        } catch (error) {
          logger.error('MusicService', 'Failed to queue default playlist track', error);
        }
      }
    }

    player.currentTrack = null;
    return;
  }

  const track = player.queue.shift();
  if (!track) return;

  player.currentTrack = track;

  try {
    const stream = await play.stream(track.url);

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    player.player.play(resource);

    if (textChannel) {
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎵 Now Playing')
        .setDescription(track.title)
        .addFields({
          name: 'Duration',
          value: `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`,
          inline: true,
        });

      if (track.thumbnail) embed.setThumbnail(track.thumbnail);
      if (track.channel) embed.addFields({ name: 'Channel', value: track.channel, inline: true });

      await textChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('MusicService', `Failed to play track: ${track.title}`, error);
    playNextTrack(guildId, textChannel);
  }
}

export const musicService = {
  async join(voiceChannel: VoiceChannel, guildId: string) {
    const player = getOrCreatePlayer(guildId);

    if (player.connection?.state.status === VoiceConnectionStatus.Ready) {
      return player.connection;
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator as any,
    });

    connection.subscribe(player.player);

    player.player.on(AudioPlayerStatus.Idle, () => {
      playNextTrack(guildId);
    });

    player.connection = connection;
    return connection;
  },

  async queue(url: string, guildId: string): Promise<Track | null> {
    try {
      const player = getOrCreatePlayer(guildId);
      const info = await play.video_info(url);

      const track: Track = {
        title: info.video_details.title || 'Unknown Track',
        url,
        duration: info.video_details.durationInSec || 0,
        thumbnail: info.video_details.thumbnails?.[0]?.url,
        channel: info.video_details.channel?.name,
      };

      player.queue.push(track);

      if (!player.currentTrack && player.player.state.status === AudioPlayerStatus.Idle) {
        playNextTrack(guildId);
      }

      return track;
    } catch (error) {
      logger.error('MusicService', 'Failed to queue track', error);
      return null;
    }
  },

  skip(guildId: string) {
    const player = getOrCreatePlayer(guildId);
    player.player.stop();
  },

  pause(guildId: string) {
    const player = getOrCreatePlayer(guildId);
    player.isPaused = true;
    player.player.pause();
  },

  resume(guildId: string) {
    const player = getOrCreatePlayer(guildId);
    player.isPaused = false;
    player.player.unpause();
  },

  stop(guildId: string) {
    const player = getOrCreatePlayer(guildId);
    player.queue = [];
    player.currentTrack = null;
    player.player.stop();
  },

  getQueue(guildId: string): Track[] {
    const player = getOrCreatePlayer(guildId);
    return [...player.queue];
  },

  getCurrentTrack(guildId: string): Track | null {
    const player = getOrCreatePlayer(guildId);
    return player.currentTrack;
  },

  getStatus(guildId: string) {
    const player = getOrCreatePlayer(guildId);
    return {
      isConnected: player.connection?.state.status === VoiceConnectionStatus.Ready,
      isPaused: player.isPaused,
      currentTrack: player.currentTrack,
      queueSize: player.queue.length,
    };
  },

  disconnect(guildId: string) {
    const player = getOrCreatePlayer(guildId);
    if (player.connection) {
      player.connection.destroy();
      player.connection = null;
    }
    player.queue = [];
    player.currentTrack = null;
    player.player.stop();
  },

  setDefaultPlaylist(guildId: string, playlistName: string) {
    const player = getOrCreatePlayer(guildId);
    player.defaultPlaylist = playlistName;
    player.playlistIndex = 0;
    logger.info('MusicService', `Set default playlist for ${guildId}: ${playlistName}`);
  },

  getDefaultPlaylist(guildId: string): string | undefined {
    const player = getOrCreatePlayer(guildId);
    return player.defaultPlaylist;
  },

  clearDefaultPlaylist(guildId: string) {
    const player = getOrCreatePlayer(guildId);
    player.defaultPlaylist = undefined;
    player.playlistIndex = 0;
  },
};
