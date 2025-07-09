/**
 * Music Commands - All music-related slash commands
 * -------------------------------------------------
 * Defines all music commands for the bot
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';

import { MusicManager } from './music-manager';

/**
 * Register all music commands
 */
export function registerMusicCommands(commandsArray: any[], musicManager: MusicManager): void {
  // Play command
  const playCommand = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song name or YouTube URL')
        .setRequired(true)
    )
    .toJSON();

  // Skip command
  const skipCommand = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song')
    .toJSON();

  // Stop command
  const stopCommand = new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playing music and clear the queue')
    .toJSON();

  // Pause command
  const pauseCommand = new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song')
    .toJSON();

  // Resume command
  const resumeCommand = new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused song')
    .toJSON();

  // Queue command
  const queueCommand = new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue')
    .toJSON();

  // Volume command
  const volumeCommand = new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the music volume (0-100)')
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('Volume level (0-100)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    )
    .toJSON();

  // Shuffle command
  const shuffleCommand = new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the current queue')
    .toJSON();

  // Leave command
  const leaveCommand = new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Make the bot leave the voice channel')
    .toJSON();

  // Now playing command
  const nowPlayingCommand = new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song')
    .toJSON();

  // Remove command
  const removeCommand = new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a song from the queue')
    .addIntegerOption(option =>
      option
        .setName('position')
        .setDescription('Position in queue to remove (1-based)')
        .setRequired(true)
        .setMinValue(1)
    )
    .toJSON();

  commandsArray.push(
    playCommand,
    skipCommand,
    stopCommand,
    pauseCommand,
    resumeCommand,
    queueCommand,
    volumeCommand,
    shuffleCommand,
    leaveCommand,
    nowPlayingCommand,
    removeCommand
  );
}

/**
 * Handle music command interactions
 */
export async function handleMusicCommand(
  interaction: ChatInputCommandInteraction,
  musicManager: MusicManager
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: 'This command can only be used in a server!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const member = interaction.member as GuildMember;
  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'play':
        await handlePlayCommand(interaction, musicManager, member);
        break;
      
      case 'skip':
        await handleSkipCommand(interaction, musicManager);
        break;
      
      case 'stop':
        await handleStopCommand(interaction, musicManager);
        break;
      
      case 'pause':
        await handlePauseCommand(interaction, musicManager);
        break;
      
      case 'resume':
        await handleResumeCommand(interaction, musicManager);
        break;
      
      case 'queue':
        await handleQueueCommand(interaction, musicManager);
        break;
      
      case 'volume':
        await handleVolumeCommand(interaction, musicManager);
        break;
      
      case 'shuffle':
        await handleShuffleCommand(interaction, musicManager);
        break;
      
      case 'leave':
        await handleLeaveCommand(interaction, musicManager);
        break;
      
      case 'nowplaying':
        await handleNowPlayingCommand(interaction, musicManager);
        break;
      
      case 'remove':
        await handleRemoveCommand(interaction, musicManager);
        break;
      
      default:
        await interaction.reply({
          content: 'Unknown music command.',
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error(`Error handling music command ${commandName}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while processing the music command.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

/**
 * Handle the play command
 */
async function handlePlayCommand(
  interaction: ChatInputCommandInteraction,
  musicManager: MusicManager,
  member: GuildMember
): Promise<void> {
  // Check if user is in a voice channel
  if (!member.voice.channel) {
    await interaction.reply({
      content: '❌ You need to be in a voice channel to play music!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check bot permissions
  const permissions = member.voice.channel.permissionsFor(interaction.guild!.members.me!);
  if (!permissions.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
    await interaction.reply({
      content: '❌ I need permission to connect and speak in your voice channel!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const query = interaction.options.getString('query', true);
  
  await interaction.deferReply();

  try {
    await musicManager.play(
      interaction.guild!,
      interaction.channel as any,
      member.voice.channel as any,
      query,
      member
    );
  } catch (error) {
    await interaction.editReply('❌ An error occurred while trying to play the track.');
  }
}

/**
 * Handle the skip command
 */
async function handleSkipCommand(
  interaction: ChatInputCommandInteraction,
  musicManager: MusicManager
): Promise<void> {
  const queue = musicManager.getQueue(interaction.guild!.id);
  if (!queue) {
    await interaction.reply({
      content: '❌ No music is currently playing!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (musicManager.skip(interaction.guild!.id)) {
    await interaction.reply('⏭️ Skipped the current track!');
  } else {
    await interaction.reply({
      content: '❌ Nothing to skip!',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle the stop command
 */
async function handleStopCommand(
  interaction: ChatInputCommandInteraction,
  musicManager: MusicManager
): Promise<void> {
  const queue = musicManager.getQueue(interaction.guild!.id);
  if (!queue) {
    await interaction.reply({
      content: '❌ No music is currently playing!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (musicManager.stop(interaction.guild!.id)) {
    await interaction.reply('⏹️ Stopped playing music and cleared the queue!');
  } else {
    await interaction.reply({
      content: '❌ Nothing to stop!',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle the pause command
 */
async function handlePauseCommand(
  interaction: ChatInputCommandInteraction,
  musicManager: MusicManager
): Promise<void> {
  const queue = musicManager.getQueue(interaction.guild!.id);
  if (!queue) {
    await interaction.reply({
      content: '❌ No music is currently playing!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (musicManager.pause(interaction.guild!.id)) {
    await interaction.reply('⏸️ Paused the current track!');
 } else {
   await interaction.reply({
     content: '❌ Nothing to pause!',
     flags: MessageFlags.Ephemeral
   });
 }
}

/**
* Handle the resume command
*/
async function handleResumeCommand(
 interaction: ChatInputCommandInteraction,
 musicManager: MusicManager
): Promise<void> {
 const queue = musicManager.getQueue(interaction.guild!.id);
 if (!queue) {
   await interaction.reply({
     content: '❌ No music is currently playing!',
     flags: MessageFlags.Ephemeral
   });
   return;
 }

 if (musicManager.resume(interaction.guild!.id)) {
   await interaction.reply('▶️ Resumed the current track!');
 } else {
   await interaction.reply({
     content: '❌ Nothing to resume!',
     flags: MessageFlags.Ephemeral
   });
 }
}

/**
* Handle the queue command
*/
async function handleQueueCommand(
 interaction: ChatInputCommandInteraction,
 musicManager: MusicManager
): Promise<void> {
 const queueInfo = musicManager.getQueueInfo(interaction.guild!.id);
 if (!queueInfo) {
   await interaction.reply({
     content: '❌ No music queue found!',
     flags: MessageFlags.Ephemeral
   });
   return;
 }

 const embed = new EmbedBuilder()
   .setTitle('🎵 Music Queue')
   .setColor(0x00FF00)
   .setTimestamp();

 if (queueInfo.currentTrack) {
   embed.addFields({
     name: '🎵 Now Playing',
     value: `**${queueInfo.currentTrack.title}**\nRequested by: ${queueInfo.currentTrack.requestedBy}`,
     inline: false
   });
 }

 if (queueInfo.tracks.length > 0) {
   const queueList = queueInfo.tracks
     .slice(0, 10) // Show only first 10 tracks
     .map((track: any, index: number) => 
       `${index + 1}. **${track.title}** - ${track.getFormattedDuration()}\n   Requested by: ${track.requestedBy}`
     )
     .join('\n\n');

   embed.addFields({
     name: `📝 Up Next (${queueInfo.tracks.length} track${queueInfo.tracks.length !== 1 ? 's' : ''})`,
     value: queueList || 'Queue is empty',
     inline: false
   });

   if (queueInfo.tracks.length > 10) {
     embed.setFooter({ text: `And ${queueInfo.tracks.length - 10} more tracks...` });
   }
 } else {
   embed.addFields({
     name: '📝 Up Next',
     value: 'Queue is empty',
     inline: false
   });
 }

 embed.addFields(
   {
     name: '🔊 Volume',
     value: `${queueInfo.volume}%`,
     inline: true
   },
   {
     name: '▶️ Status',
     value: queueInfo.isPlaying ? 'Playing' : queueInfo.isPaused ? 'Paused' : 'Idle',
     inline: true
   }
 );

 await interaction.reply({ embeds: [embed] });
}

/**
* Handle the volume command
*/
async function handleVolumeCommand(
 interaction: ChatInputCommandInteraction,
 musicManager: MusicManager
): Promise<void> {
 const queue = musicManager.getQueue(interaction.guild!.id);
 if (!queue) {
   await interaction.reply({
     content: '❌ No music is currently playing!',
     flags: MessageFlags.Ephemeral
   });
   return;
 }

 const volume = interaction.options.getInteger('level', true);
 
 if (musicManager.setVolume(interaction.guild!.id, volume)) {
   await interaction.reply(`🔊 Volume set to ${volume}%!`);
 } else {
   await interaction.reply({
     content: '❌ Failed to set volume!',
     flags: MessageFlags.Ephemeral
   });
 }
}

/**
* Handle the shuffle command
*/
async function handleShuffleCommand(
 interaction: ChatInputCommandInteraction,
 musicManager: MusicManager
): Promise<void> {
 const queue = musicManager.getQueue(interaction.guild!.id);
 if (!queue) {
   await interaction.reply({
     content: '❌ No music queue found!',
     flags: MessageFlags.Ephemeral
   });
   return;
 }

 if (musicManager.shuffle(interaction.guild!.id)) {
   await interaction.reply('🔀 Queue has been shuffled!');
 } else {
   await interaction.reply({
     content: '❌ Not enough tracks in queue to shuffle!',
     flags: MessageFlags.Ephemeral
   });
 }
}

/**
* Handle the leave command
*/
async function handleLeaveCommand(
 interaction: ChatInputCommandInteraction,
 musicManager: MusicManager
): Promise<void> {
 const queue = musicManager.getQueue(interaction.guild!.id);
 if (!queue) {
   await interaction.reply({
     content: '❌ I\'m not currently in a voice channel!',
     flags: MessageFlags.Ephemeral
   });
   return;
 }

 musicManager.destroyQueue(interaction.guild!.id);
 await interaction.reply('👋 Left the voice channel and cleared the queue!');
}

/**
* Handle the now playing command
*/
async function handleNowPlayingCommand(
 interaction: ChatInputCommandInteraction,
 musicManager: MusicManager
): Promise<void> {
 const queueInfo = musicManager.getQueueInfo(interaction.guild!.id);
 if (!queueInfo || !queueInfo.currentTrack) {
   await interaction.reply({
     content: '❌ No music is currently playing!',
     flags: MessageFlags.Ephemeral
   });
   return;
 }

 const track = queueInfo.currentTrack;
 const embed = new EmbedBuilder()
   .setTitle('🎵 Now Playing')
   .setDescription(`**${track.title}**`)
   .addFields(
     {
       name: 'Duration',
       value: track.getFormattedDuration(),
       inline: true
     },
     {
       name: 'Requested By',
       value: track.requestedBy.toString(),
       inline: true
     },
     {
       name: 'Volume',
       value: `${queueInfo.volume}%`,
       inline: true
     },
     {
       name: 'Status',
       value: queueInfo.isPlaying ? '▶️ Playing' : queueInfo.isPaused ? '⏸️ Paused' : '⏹️ Stopped',
       inline: true
     },
     {
       name: 'Queue',
       value: `${queueInfo.tracks.length} track${queueInfo.tracks.length !== 1 ? 's' : ''} remaining`,
       inline: true
     }
   )
   .setColor(0x00FF00)
   .setTimestamp();

 if (track.thumbnail) {
   embed.setThumbnail(track.thumbnail);
 }

 // Add control buttons
 const row = new ActionRowBuilder<ButtonBuilder>()
   .addComponents(
     new ButtonBuilder()
       .setCustomId('music_pause')
       .setLabel(queueInfo.isPlaying ? 'Pause' : 'Resume')
       .setStyle(ButtonStyle.Primary)
       .setEmoji(queueInfo.isPlaying ? '⏸️' : '▶️'),
     new ButtonBuilder()
       .setCustomId('music_skip')
       .setLabel('Skip')
       .setStyle(ButtonStyle.Secondary)
       .setEmoji('⏭️'),
     new ButtonBuilder()
       .setCustomId('music_stop')
       .setLabel('Stop')
       .setStyle(ButtonStyle.Danger)
       .setEmoji('⏹️')
   );

 await interaction.reply({ embeds: [embed], components: [row] });
}

/**
* Handle the remove command
*/
async function handleRemoveCommand(
 interaction: ChatInputCommandInteraction,
 musicManager: MusicManager
): Promise<void> {
 const queue = musicManager.getQueue(interaction.guild!.id);
 if (!queue) {
   await interaction.reply({
     content: '❌ No music queue found!',
     flags: MessageFlags.Ephemeral
   });
   return;
 }

 const position = interaction.options.getInteger('position', true);
 const index = position - 1; // Convert to 0-based index

 if (index < 0 || index >= queue.tracks.length) {
   await interaction.reply({
     content: '❌ Invalid queue position!',
     flags: MessageFlags.Ephemeral
   });
   return;
 }

 const removedTrack = queue.removeTrack(index);
 if (removedTrack) {
   await interaction.reply(`🗑️ Removed **${removedTrack.title}** from the queue!`);
 } else {
   await interaction.reply({
     content: '❌ Failed to remove track from queue!',
     flags: MessageFlags.Ephemeral
   });
 }
}