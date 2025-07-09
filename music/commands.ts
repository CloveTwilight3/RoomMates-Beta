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
    await interaction