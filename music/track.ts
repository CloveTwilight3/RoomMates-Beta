/**
 * Track - Represents a music track
 * --------------------------------
 * Data structure for individual music tracks
 */

import { GuildMember } from 'discord.js';

export class Track {
  public title: string;
  public url: string;
  public duration: number; // in milliseconds
  public requestedBy: GuildMember;
  public thumbnail?: string;

  constructor(
    title: string,
    url: string,
    duration: number,
    requestedBy: GuildMember,
    thumbnail?: string
  ) {
    this.title = title;
    this.url = url;
    this.duration = duration;
    this.requestedBy = requestedBy;
    this.thumbnail = thumbnail;
  }

  /**
   * Get formatted duration
   */
  public getFormattedDuration(): string {
    if (this.duration === 0) return 'Unknown';
    
    const seconds = Math.floor(this.duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  }
}