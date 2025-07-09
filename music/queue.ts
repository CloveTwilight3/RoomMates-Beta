/**
 * Music Queue - Manages music queue for a guild
 * ---------------------------------------------
 * Handles queue operations and playback for individual guilds
 */

import {
  Guild,
  TextChannel,
  VoiceChannel,
  GuildMember
} from 'discord.js';

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayer,
  VoiceConnection,
  AudioPlayerStatus
} from '@discordjs/voice';

import * as play from 'play-dl';
import { Track } from './track';

export class MusicQueue {
  public guild: Guild;
  public textChannel: TextChannel;
  public voiceChannel: VoiceChannel;
  public audioPlayer: AudioPlayer;
  public voiceConnection: VoiceConnection;
  public tracks: Track[] = [];
  public currentTrack: Track | null = null;
  public volume: number = 0.5;
  public loop: 'none' | 'track' | 'queue' = 'none';

  constructor(guild: Guild, textChannel: TextChannel, voiceChannel: VoiceChannel) {
    this.guild = guild;
    this.textChannel = textChannel;
    this.voiceChannel = voiceChannel;

    // Create audio player
    this.audioPlayer = createAudioPlayer();

    // Join voice channel
    this.voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    // Subscribe the connection to the audio player
    this.voiceConnection.subscribe(this.audioPlayer);
  }

  /**
   * Add a track to the queue
   */
  public addTrack(track: Track): void {
    this.tracks.push(track);
  }

  /**
   * Remove a track from the queue by index
   */
  public removeTrack(index: number): Track | null {
    if (index < 0 || index >= this.tracks.length) {
      return null;
    }
    return this.tracks.splice(index, 1)[0];
  }

  /**
   * Process the queue and play the next track
   */
  public async processQueue(): Promise<void> {
    // Handle looping
    if (this.loop === 'track' && this.currentTrack) {
      await this.playTrack(this.currentTrack);
      return;
    }

    if (this.loop === 'queue' && this.currentTrack) {
      this.tracks.push(this.currentTrack);
    }

    // Get next track
    const nextTrack = this.tracks.shift();
    if (!nextTrack) {
      this.currentTrack = null;
      return;
    }

    this.currentTrack = nextTrack;
    await this.playTrack(nextTrack);
  }

  /**
   * Play a specific track
   */
  private async playTrack(track: Track): Promise<void> {
    try {
      // Get audio stream
      const stream = await play.stream(track.url, {
        quality: 2 // High quality
      });

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });

      // Set volume
      if (resource.volume) {
        resource.volume.setVolume(this.volume);
      }

      // Play the resource
      this.audioPlayer.play(resource);

      // Send now playing message
      await this.sendNowPlayingMessage(track);

    } catch (error) {
      console.error('Error playing track:', error);
      await this.textChannel.send(`❌ Error playing **${track.title}**. Skipping to next track...`);
      this.processQueue();
    }
  }

  /**
   * Send now playing message
   */
  private async sendNowPlayingMessage(track: Track): Promise<void> {
    const embed = {
      title: '🎵 Now Playing',
      description: `**${track.title}**`,
      fields: [
        {
          name: 'Duration',
          value: this.formatDuration(track.duration),
          inline: true
        },
        {
          name: 'Requested By',
          value: track.requestedBy.toString(),
          inline: true
        },
        {
          name: 'Queue Position',
          value: `${this.tracks.length} track(s) remaining`,
          inline: true
        }
      ],
      color: 0x00FF00,
      timestamp: new Date().toISOString()
    };

    if (track.thumbnail) {
      embed['thumbnail'] = { url: track.thumbnail };
    }

    await this.textChannel.send({ embeds: [embed] });
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
}