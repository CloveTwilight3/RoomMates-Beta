/**
 * Music System Types
 * -----------------
 * Type definitions for the music system
 */

// Re-export common types to avoid conflicts
export interface MusicEmbedData {
  title: string;
  description: string;
  fields: Array<{
    name: string;
    value: string;
    inline: boolean;
  }>;
  color: number;
  timestamp: string;
  thumbnail?: {
    url: string;
  };
}