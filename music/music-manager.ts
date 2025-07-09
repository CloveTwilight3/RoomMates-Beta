/**
 * Music Manager - Core music system for The Roommates Helper
 * ----------------------------------------------------------
 * Handles all music-related functionality including queue management,
 * playback control, and voice connections using @discordjs/voice
 * 
 * @license MIT
 * @copyright 2025 Clove Twilight
 */

import {
  Client,
  GuildMember,
  VoiceChannel,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Guild
} from 'discord.js';

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  generateDependencyReport,
  entersState,
  AudioPlayer,
  VoiceConnection,
  AudioResource
} from '@discordjs/voice';

import { createReadStream } from 'fs';
import * as play from 'play-dl';
import { Track } from './track';
import { MusicQueue } from './queue';

export class MusicManager {
  private queues: Map<string, MusicQueue> = new Map();
  private client: Client;

  constructor(client: Client) {
    this.client = client;
    this.setupDependencyCheck();
  }

  /**
   * Check if all required dependencies are installed
   */
  private setupDependencyCheck(): void {
    try {
      console.log('🎵 Music System Dependency Report:');
      console.log(generateDependencyReport());
    } catch (error) {
      console.error('❌ Error generating dependency report:', error);
    }
  }

  /**
   * Get or create a music queue for a guild
   */
  public getQueue(guildId: string): MusicQueue | null {
    return this.queues.get(guildId) || null;
  }

  /**
   * Create a new music queue for a guild
   */
  public createQueue(guild: Guild, textChannel: TextChannel, voiceChannel: VoiceChannel): MusicQueue {
    let queue = this.queues.get(guild.id);
    
    if (queue) {
      return queue;
    }

    queue = new MusicQueue(guild, textChannel, voiceChannel);
    this.queues.set(guild.id, queue);

    // Set up queue event listeners
    this.setupQueueListeners(queue);

    return queue;
  }

  /**
   * Set up event listeners for a music queue
   */
  private setupQueueListeners(queue: MusicQueue): void {
    const player = queue.audioPlayer;

    player.on(AudioPlayerStatus.Playing, () => {
      console.log(`🎵 Now playing in ${queue.guild.name}`);
    });

    player.on(AudioPlayerStatus.Idle, () => {
      console.log(`⏸️ Player is idle in ${queue.guild.name}`);
      queue.processQueue();
    });

    player.on('error', (error) => {
      console.error(`❌ Audio player error in ${queue.guild.name}:`, error);
      queue.textChannel.send('❌ An error occurred while playing music. Skipping to next track...');
      queue.processQueue();
    });

    // Voice connection event listeners
    queue.voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(queue.voiceConnection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(queue.voiceConnection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        console.log(`🔌 Voice connection lost in ${queue.guild.name}, cleaning up...`);
        this.destroyQueue(queue.guild.id);
      }
    });

    queue.voiceConnection.on('error', (error) => {
      console.error(`❌ Voice connection error in ${queue.guild.name}:`, error);
    });
  }

  /**
   * Add a track to the queue
   */
  public async addTrack(guildId: string, track: Track): Promise<void> {
    const queue = this.queues.get(guildId);
    if (!queue) {
      throw new Error('No queue found for this guild');
    }

    queue.addTrack(track);

    // If queue was empty and not playing, start playing
    if (queue.tracks.length === 1 && queue.audioPlayer.state.status === AudioPlayerStatus.Idle) {
      queue.processQueue();
    }
  }

  /**
   * Play a track from URL or search query
   */
  public async play(
    guild: Guild,
    textChannel: TextChannel,
    voiceChannel: VoiceChannel,
    query: string,
    requestedBy: GuildMember
  ): Promise<void> {
    try {
      // Get or create queue
      let queue = this.getQueue(guild.id);
      if (!queue) {
        queue = this.createQueue(guild, textChannel, voiceChannel);
      }

      // Search for the track
      const searchResults = await this.searchTrack(query);
      if (!searchResults || searchResults.length === 0) {
        await textChannel.send('❌ No tracks found for your search query.');
        return;
      }

      const trackInfo = searchResults[0];
      const track = new Track(
        trackInfo.title || 'Unknown Title',
        trackInfo.url || '',
        trackInfo.durationInSec ? trackInfo.durationInSec * 1000 : 0,
        requestedBy,
        trackInfo.thumbnails?.[0]?.url
      );

      // Add to queue
      await this.addTrack(guild.id, track);

      // Send confirmation
      const embed = new EmbedBuilder()
        .setTitle('🎵 Track Added to Queue')
        .setDescription(`**${track.title}**`)
        .addFields(
          { name: 'Duration', value: this.formatDuration(track.duration), inline: true },
          { name: 'Position in Queue', value: queue.tracks.length.toString(), inline: true },
          { name: 'Requested By', value: requestedBy.toString(), inline: true }
        )
        .setColor(0x00FF00)
        .setTimestamp();

      if (track.thumbnail) {
        embed.setThumbnail(track.thumbnail);
      }

      await textChannel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Error playing track:', error);
      await textChannel.send('❌ An error occurred while trying to play the track.');
    }
  }

  /**
   * Search for tracks using play-dl
   */
  private async searchTrack(query: string): Promise<any[] | null> {
    try {
      // Check if it's a URL
      if (play.yt_validate(query) === 'video') {
        const info = await play.video_info(query);
        return [info.video_details];
      }

      // Search for tracks
      const searchResults = await play.search(query, {
        source: { youtube: 'video' },
        limit: 1
      });

      return searchResults;
    } catch (error) {
      console.error('Error searching for track:', error);
      return null;
    }
  }

  /**
   * Skip the current track
   */
  public skip(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue || queue.tracks.length === 0) {
      return false;
    }

    queue.audioPlayer.stop();
    return true;
  }

  /**
   * Stop playing and clear the queue
   */
  public stop(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue) {
      return false;
    }

    queue.tracks = [];
    queue.audioPlayer.stop();
    return true;
  }

  /**
   * Pause the current track
   */
  public pause(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue) {
      return false;
    }

    return queue.audioPlayer.pause();
  }

  /**
   * Resume the current track
   */
  public resume(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue) {
      return false;
    }

    return queue.audioPlayer.unpause();
  }

  /**
   * Set the volume (0-100)
   */
  public setVolume(guildId: string, volume: number): boolean {
    const queue = this.queues.get(guildId);
    if (!queue) {
      return false;
    }

    // Clamp volume between 0 and 100
    volume = Math.max(0, Math.min(100, volume));
    queue.volume = volume / 100; // Convert to 0-1 range
    
    return true;
  }

  /**
   * Get current queue information
   */
  public getQueueInfo(guildId: string): any {
    const queue = this.queues.get(guildId);
    if (!queue) {
      return null;
    }

    return {
      tracks: queue.tracks,
      currentTrack: queue.currentTrack,
      isPlaying: queue.audioPlayer.state.status === AudioPlayerStatus.Playing,
      isPaused: queue.audioPlayer.state.status === AudioPlayerStatus.Paused,
      volume: Math.round(queue.volume * 100)
    };
  }

  /**
   * Destroy a queue and disconnect from voice
   */
  public destroyQueue(guildId: string): void {
    const queue = this.queues.get(guildId);
    if (!queue) {
      return;
    }

    // Stop the player
    queue.audioPlayer.stop();

    // Disconnect from voice
    queue.voiceConnection.destroy();

    // Remove from our queues map
    this.queues.delete(guildId);

    console.log(`🗑️ Music queue destroyed for ${queue.guild.name}`);
  }

  /**
   * Format duration from milliseconds to readable string
   */
  private formatDuration(duration: number): string {
    if (duration === 0) return 'Unknown';
    
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  }

  /**
   * Shuffle the queue
   */
  public shuffle(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue || queue.tracks.length <= 1) {
      return false;
    }

    // Fisher-Yates shuffle
    for (let i = queue.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
    }

    return true;
  }

  /**
   * Clear all queues and connections (for bot shutdown)
   */
  public cleanup(): void {
    for (const [guildId] of this.queues) {
      this.destroyQueue(guildId);
    }
  }
}