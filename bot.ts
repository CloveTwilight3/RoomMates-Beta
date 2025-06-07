/**

- The Roommates Helper - Discord Bot
- -----
- A utility bot for the Roommates Discord server with features including:
- - Color role management
- - Age verification system
- - Message logging system
- - Welcome DM system
- - Warning system with escalating punishments
- - NSFW access toggle system
- - Discord log forwarding
- - Rotating status system
- - Guild management (auto-leave unwanted servers)
- - Guild management (auto-leave unwanted servers)
- 
- @license MIT
- @copyright 2025 Clove Twilight
  */

//=============================================================================
// IMPORTS
//=============================================================================

import {
Client,
GatewayIntentBits,
ActivityType,
REST,
Routes,
SlashCommandBuilder,
ChatInputCommandInteraction,
EmbedBuilder,
ComponentType,
StringSelectMenuBuilder,
StringSelectMenuOptionBuilder,
ActionRowBuilder,
Role,
DiscordAPIError,
ButtonInteraction,
Interaction,
Events,
ModalSubmitInteraction,
GuildMember,
MessageFlags
} from ‘discord.js’;
import dotenv from ‘dotenv’;
import fs from ‘fs’;

//=============================================================================
// IMPORT DISCORD LOGGER
//=============================================================================

import { discordLogger } from ‘./discord-logger’;

//=============================================================================
// IMPORT OTHER SYSTEMS
//=============================================================================

import {
registerVerificationCommands,
setupVerificationSystem,
handleVerifyCommand,
handleModVerifyCommand,
handleVerificationButton,
handleVerificationDecision,
getAgeUnverifiedRoleId,
loadVerificationConfig
} from ‘./verification’;

import {
handleVerificationContinue,
handleVerificationCancel,
handleVerificationUpload,
handleVerificationModal
} from ‘./verification’;

import {
registerMessageLoggerCommands,
setupMessageLogger,
handleLoggerCommand,
loadMessageLoggerConfig,
testLoggerChannel
} from ‘./message-logger’;

import {
setupWelcomeDM,
sendWelcomeDM
} from ‘./welcome-dm’;

import {
registerModCommands,
setupWarningSystem,
handleModCommand,
handleModButtonInteraction,
handleModModalSubmit,
} from ‘./warning-system’;

import { writeHealthStatus } from ‘./healthcheck’;

// Import rotating status system
import {
setupRotatingStatus,
stopRotatingStatus,
setTemporaryStatus,
setStaticStatus
} from ‘./rotating-status’;

// Import bot description manager
import {
setupBotDescription,
setupDescriptionShutdownHandlers,
setBotDescriptionStarting,
setBotDescriptionOnline,
setBotDescriptionUpdating
} from ‘./bot-description’;

//=============================================================================
// BOT INITIALIZATION
//=============================================================================

// Track bot startup time
const startTime = Date.now();
writeHealthStatus(‘starting’, startTime);

// Load environment variables from .env file
dotenv.config();

// Bot configuration
const BOT_NAME = “The Roommates Helper”;
const SERVER_NAME = “Roommates”;
const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;
const AGE_UNVERIFIED_ROLE_ID = process.env.AGE_UNVERIFIED_ROLE_ID;

// NSFW Role configuration
const NSFW_ACCESS_ROLE_ID = process.env.NSFW_ACCESS_ROLE_ID;
const NSFW_NO_ACCESS_ROLE_ID = process.env.NSFW_NO_ACCESS_ROLE_ID;

// Guild management configuration
const GUILD_TO_KEEP = ‘1344865612559679529’; // The guild ID to keep the bot in

// Guild management configuration
const GUILD_TO_KEEP = ‘1344865612559679529’; // The guild ID to keep the bot in

// Create a new client instance with ALL required intents
const client = new Client({
intents: [
// Base intents
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,

```
// Message-related intents - REQUIRED for message logging
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMessageReactions,

// DM intents
GatewayIntentBits.DirectMessages,
GatewayIntentBits.DirectMessageReactions
```

]
});

//=============================================================================
// GUILD MANAGEMENT SYSTEM
//=============================================================================

/**

- Check and leave all guilds except the specified one
  */
  async function manageGuilds() {
  try {
  console.log(‘🔄 Checking guild membership…’);
  
  // Get all guilds the bot is in
  const guilds = client.guilds.cache;
  console.log(`Bot is currently in ${guilds.size} guild(s)`);
  
  if (guilds.size === 0) {
  console.log(‘Bot is not in any guilds.’);
  return;
  }
  
  // List all guilds for reference
  console.log(’\nCurrent guilds:’);
  guilds.forEach(guild => {
  console.log(`- ${guild.name} (ID: ${guild.id})`);
  });
  
  // Check if the bot is in the target guild
  const targetGuild = guilds.get(GUILD_TO_KEEP);
  if (!targetGuild) {
  console.log(`⚠️ Bot is not in the target guild (ID: ${GUILD_TO_KEEP})`);
  console.log(‘Available guild IDs:’);
  guilds.forEach(guild => console.log(`- ${guild.id} (${guild.name})`));
  return;
  }
  
  console.log(`✅ Target guild found: ${targetGuild.name} (${targetGuild.id})`);
  
  // Count guilds to leave
  const guildsToLeave = guilds.filter(guild => guild.id !== GUILD_TO_KEEP);
  
  if (guildsToLeave.size === 0) {
  console.log(‘✅ Bot is only in the target guild. No action needed.’);
  return;
  }
  
  console.log(`🚪 Leaving ${guildsToLeave.size} unwanted guild(s)...`);
  
  // Set temporary status while leaving guilds
  setTemporaryStatus(client, ‘guild cleanup’, ActivityType.Custom, 30000, ‘🧹 Spring cleaning’);
  
  // Leave unwanted guilds
  let leftCount = 0;
  for (const [guildId, guild] of guildsToLeave) {
  try {
  await guild.leave();
  console.log(`✅ Left: ${guild.name} (${guild.id})`);
  leftCount++;
  
  ```
   // Log to Discord
   safeDiscordLog('info', `Left unwanted guild: ${guild.name}`, 'GuildManager');
   
   // Add delay to avoid rate limits
   await new Promise(resolve => setTimeout(resolve, 1000));
  ```
  
  } catch (error) {
  console.error(`❌ Failed to leave ${guild.name}:`, error);
  safeDiscordLog(‘error’, `Failed to leave guild ${guild.name}: ${error}`, ‘GuildManager’);
  }
  }
  
  if (leftCount > 0) {
  console.log(`🎉 Successfully left ${leftCount} guild(s)`);
  console.log(`✅ Remaining in: ${targetGuild.name}`);
  safeDiscordLog(‘info’, `Guild cleanup complete: Left ${leftCount} guild(s), staying in ${targetGuild.name}`, ‘GuildManager’);
  }

} catch (error) {
console.error(‘❌ Error in guild management:’, error);
safeDiscordLog(‘error’, `Guild management error: ${error}`, ‘GuildManager’);
}
}

//=============================================================================
// GUILD MANAGEMENT SYSTEM
//=============================================================================

/**

- Check and leave all guilds except the specified one
  */
  async function manageGuilds() {
  try {
  console.log(‘🔄 Checking guild membership…’);
  
  // Get all guilds the bot is in
  const guilds = client.guilds.cache;
  console.log(`Bot is currently in ${guilds.size} guild(s)`);
  
  if (guilds.size === 0) {
  console.log(‘Bot is not in any guilds.’);
  return;
  }
  
  // List all guilds for reference
  console.log(’\nCurrent guilds:’);
  guilds.forEach(guild => {
  console.log(`- ${guild.name} (ID: ${guild.id})`);
  });
  
  // Check if the bot is in the target guild
  const targetGuild = guilds.get(GUILD_TO_KEEP);
  if (!targetGuild) {
  console.log(`⚠️ Bot is not in the target guild (ID: ${GUILD_TO_KEEP})`);
  console.log(‘Available guild IDs:’);
  guilds.forEach(guild => console.log(`- ${guild.id} (${guild.name})`));
  return;
  }
  
  console.log(`✅ Target guild found: ${targetGuild.name} (${targetGuild.id})`);
  
  // Count guilds to leave
  const guildsToLeave = guilds.filter(guild => guild.id !== GUILD_TO_KEEP);
  
  if (guildsToLeave.size === 0) {
  console.log(‘✅ Bot is only in the target guild. No action needed.’);
  return;
  }
  
  console.log(`🚪 Leaving ${guildsToLeave.size} unwanted guild(s)...`);
  
  // Set temporary status while leaving guilds
  setTemporaryStatus(client, ‘guild cleanup’, ActivityType.Custom, 30000, ‘🧹 Spring cleaning’);
  
  // Leave unwanted guilds
  let leftCount = 0;
  for (const [guildId, guild] of guildsToLeave) {
  try {
  await guild.leave();
  console.log(`✅ Left: ${guild.name} (${guild.id})`);
  leftCount++;
  
  ```
   // Log to Discord
   safeDiscordLog('info', `Left unwanted guild: ${guild.name}`, 'GuildManager');
   
   // Add delay to avoid rate limits
   await new Promise(resolve => setTimeout(resolve, 1000));
  ```
  
  } catch (error) {
  console.error(`❌ Failed to leave ${guild.name}:`, error);
  safeDiscordLog(‘error’, `Failed to leave guild ${guild.name}: ${error}`, ‘GuildManager’);
  }
  }
  
  if (leftCount > 0) {
  console.log(`🎉 Successfully left ${leftCount} guild(s)`);
  console.log(`✅ Remaining in: ${targetGuild.name}`);
  safeDiscordLog(‘info’, `Guild cleanup complete: Left ${leftCount} guild(s), staying in ${targetGuild.name}`, ‘GuildManager’);
  }

} catch (error) {
console.error(‘❌ Error in guild management:’, error);
safeDiscordLog(‘error’, `Guild management error: ${error}`, ‘GuildManager’);
}
}

//=============================================================================
// SAFE LOGGING SETUP (NO LOOPS!)
//=============================================================================

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Flag to prevent recursive logging
let isLoggingToDiscord = false;

// Safe Discord logging function
function safeDiscordLog(level: ‘info’ | ‘warn’ | ‘error’, message: string, source: string = ‘Bot’) {
if (isLoggingToDiscord) return; // Prevent recursion

isLoggingToDiscord = true;
try {
switch (level) {
case ‘info’:
discordLogger.info(message, source);
break;
case ‘warn’:
discordLogger.warn(message, source);
break;
case ‘error’:
discordLogger.error(message, source);
break;
}
} catch (error) {
// Use original console to avoid loops
originalConsoleError(‘Error in Discord logging:’, error);
} finally {
isLoggingToDiscord = false;
}
}

// Override console methods (safer version)
console.log = (…args: any[]) => {
const message = args.join(’ ’);
originalConsoleLog(…args);

// Only send important messages to Discord
if (!isLoggingToDiscord && (
message.toLowerCase().includes(‘✅’) ||
message.toLowerCase().includes(‘🚀’) ||
message.toLowerCase().includes(‘ready’) ||
message.toLowerCase().includes(‘online’) ||
message.toLowerCase().includes(‘started’) ||
message.toLowerCase().includes(‘loaded’) ||
message.toLowerCase().includes(‘success’)
)) {
safeDiscordLog(‘info’, message, ‘Bot’);
}
};

console.error = (…args: any[]) => {
const message = args.join(’ ’);
originalConsoleError(…args);

if (!isLoggingToDiscord) {
safeDiscordLog(‘error’, message, ‘Bot’);
}
};

console.warn = (…args: any[]) => {
const message = args.join(’ ’);
originalConsoleWarn(…args);

if (!isLoggingToDiscord) {
safeDiscordLog(‘warn’, message, ‘Bot’);
}
};

// Log what events the client is listening for
console.log(“Discord.js Events supported by this client instance:”);
console.log(“MessageCreate:”, client.listenerCount(Events.MessageCreate));
console.log(“MessageUpdate:”, client.listenerCount(Events.MessageUpdate));
console.log(“MessageDelete:”, client.listenerCount(Events.MessageDelete));

//=============================================================================
// COLOR ROLE MANAGEMENT
//=============================================================================

// Role management
interface ColorRole {
id: string;
name: string;
hexColor: string;
}

// Store our color roles
let colorRoles: ColorRole[] = [];
let colorCategories: Record<string, ColorRole[]> = {};

/**

- Load color roles from the file
  */
  function loadColorRolesFromFile(filePath: string = ‘roommates_roles.txt’): void {
  try {
  console.log(`🔄 Loading color roles from ${filePath}...`);
  const fileContent = fs.readFileSync(filePath, ‘utf8’);
  const lines = fileContent.split(’\n’);
  
  // Reset the roles array
  colorRoles = [];
  
  // Parse each line in the format [ROLE_NAME, ROLE_ID]
  for (const line of lines) {
  // Skip empty lines
  if (!line.trim()) continue;
  
  // Extract role name and ID
  const match = line.match(/[(.*?), (\d+)]/);
  if (match && match.length >= 3) {
  const name = match[1];
  const id = match[2];
  
  ```
   // Skip non-color roles
   const skipRoles = [
     '@everyone', 'moderator', 'verified!', 'PluralKit', 'TTS Bot', 
     'carl-bot', 'Captcha.bot', 'Zahra', 'Doughmination System',
     'You have name privileges', 'You\'ve lost name privileges', 
     'MF BOTS ARE ASSHOLES', '18+', 'new role', 'soundboard',
     'Age Unverified', 'NSFW Access', 'NSFW No Access'
   ];
   
   if (skipRoles.includes(name)) continue;
   
   // Add to our color roles array
   colorRoles.push({
     id,
     name,
     hexColor: '#FFFFFF'
   });
  ```
  
  }
  }
  
  console.log(`✅ Loaded ${colorRoles.length} color roles successfully`);
  
  // Categorize color roles
  categorizeColorRoles();

} catch (error) {
console.error(`❌ Error loading color roles from ${filePath}:`, error);
safeDiscordLog(‘error’, `Error loading color roles: ${error}`, ‘ColorRoles’);
writeHealthStatus(‘offline’, startTime);
}
}

/**

- Categorize color roles for easier selection
  */
  function categorizeColorRoles(): void {
  // Reset categories
  colorCategories = {};

// Create categories based on color names
const categories = {
‘Red’: [‘Red’, ‘Crimson’, ‘Scarlet’, ‘Cherry’, ‘Bean’, ‘Love’, ‘Wine’, ‘Valentine’, ‘Maroon’],
‘Pink’: [‘Pink’, ‘Rose’, ‘Blush’, ‘Hot Pink’, ‘Deep Pink’, ‘Neon Pink’, ‘Cadillac Pink’, ‘Carnation Pink’, ‘Light Pink’, ‘Watermelon Pink’, ‘Pig Pink’],
‘Orange’: [‘Orange’, ‘Mango’, ‘Cantaloupe’, ‘Coral’, ‘Light Coral’, ‘Light Salmon’, ‘Saffron’],
‘Yellow’: [‘Yellow’, ‘Gold’, ‘Light Yellow’, ‘Sun Yellow’, ‘Electric Yellow’, ‘Lemon’, ‘Harvest Gold’, ‘Bright Gold’, ‘Mustard’, ‘Champagne’, ‘Cream’, ‘Parchment’],
‘Green’: [‘Green’, ‘Lime’, ‘Forest’, ‘Mint’, ‘Sage’, ‘Sea’, ‘Kelly’, ‘Avocado’, ‘Fern’, ‘Jungle’, ‘Lawn’, ‘Chartreuse’, ‘Dragon’, ‘Venom’, ‘Algae’, ‘Alien’, ‘Stoplight Go’, ‘Hummingbird’, ‘Nebula’, ‘Hoja’, ‘Literally Shrek’, ‘Light Sea Green’, ‘Medium Sea Green’, ‘Sea Turtle Green’],
‘Cyan’: [‘Cyan’, ‘Teal’, ‘Aquamarine’, ‘Light Aquamarine’, ‘Medium Aquamarine’, ‘Turquoise’, ‘Medium Turquoise’, ‘Light Cyan’, ‘Dark Turquoise’, ‘Tiffany Blue’, ‘Cyan Opaque’],
‘Blue’: [‘Blue’, ‘Navy’, ‘Sky’, ‘Light Blue’, ‘Deep Sky Blue’, ‘Baby Blue’, ‘Royal Blue’, ‘Steel Blue’, ‘Light Steel Blue’, ‘Powder Blue’, ‘Alice Blue’, ‘Dodger Blue’, ‘Cornflower Blue’, ‘Medium Blue’, ‘Midnight Blue’, ‘Light Sky Blue’, ‘Day Sky Blue’, ‘Columbia Blue’, ‘Jeans Blue’, ‘Denim Blue’, ‘Denim Dark Blue’, ‘Dark Slate Blue’, ‘Blue Lagoon’, ‘Blue Jay’, ‘Blue Angel’, ‘Blue Eyes’, ‘Blue Whale’, ‘Blue Koi’, ‘Blue Ivy’, ‘Blue Dress’, ‘Blue Diamond’, ‘Blue Zircon’, ‘Blue Green’, ‘Blue Gray’, ‘Blue Hosta’, ‘Blueberry Blue’, ‘Electric Blue’, ‘Cobalt Blue’, ‘Sapphire Blue’, ‘Crystal Blue’, ‘Earth Blue’, ‘Ocean Blue’, ‘Windows Blue’, ‘Pastel Blue’, ‘Northern Lights Blue’, ‘Robbin Egg Blue’, ‘Light Slate Blue’, ‘Iceberg’, ‘Butterfly Blue’, ‘Glacial Blue Ice’, ‘Silk Blue’, ‘Lapis Blue’, ‘Jelly Fish’],
‘Purple’: [‘Purple’, ‘Violet’, ‘Indigo’, ‘Lavender’, ‘Plum’, ‘Mauve’, ‘Magneta’, ‘Helitrope Purple’, ‘Crocus Purple’, ‘Lovely Purple’, ‘Purple Flower’, ‘Purple Iris’, ‘Purple Mimosa’, ‘Aztech Purple’, ‘Purple Ametyhst’, ‘Tyrian Purple’, ‘Plum Velvet’, ‘Lavender Blue’],
‘Gray’: [‘Gray’, ‘Light Slate Gray’, ‘Dark Slate Gray’, ‘Light Slate’, ‘Gray Goose’, ‘Platinum’, ‘Metallic Silver’],
‘Black & White’: [‘Black’, ‘White’, ‘Night’, ‘Oil’, ‘Discord Shadow’]
};

// Function to find which category a role belongs to
const findCategory = (roleName: string): string => {
for (const [category, keywords] of Object.entries(categories)) {
if (keywords.some(keyword =>
roleName.toLowerCase().includes(keyword.toLowerCase()))) {
return category;
}
}
return ‘Other’;
};

// Categorize each role
for (const role of colorRoles) {
const category = findCategory(role.name);

```
if (!colorCategories[category]) {
  colorCategories[category] = [];
}

colorCategories[category].push(role);
```

}

// Sort roles alphabetically within each category
for (const category in colorCategories) {
colorCategories[category].sort((a, b) => a.name.localeCompare(b.name));
}

// Log categories
const categoryInfo = Object.entries(colorCategories)
.map(([category, roles]) => `${category}: ${roles.length}`)
.join(’, ’);

console.log(`✅ Color categories created: ${categoryInfo}`);
}

//=============================================================================
// NSFW ACCESS MANAGEMENT
//=============================================================================

/**

- Handle the NSFW toggle command
  */
  async function handleNSFWCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
  await interaction.reply({ content: ‘This command can only be used in a server!’, flags: MessageFlags.Ephemeral });
  return;
  }

// Check if NSFW roles are configured
if (!NSFW_ACCESS_ROLE_ID || !NSFW_NO_ACCESS_ROLE_ID) {
await interaction.reply({
content: ‘NSFW roles are not properly configured. Please contact an administrator.’,
flags: MessageFlags.Ephemeral
});
return;
}

const member = interaction.guild.members.cache.get(interaction.user.id);
if (!member) {
await interaction.reply({ content: ‘Could not find you in this server!’, ephemeral: true });
return;
}

const nsfwValue = interaction.options.getBoolean(‘value’, true);

try {
// Get the roles
const nsfwAccessRole = interaction.guild.roles.cache.get(NSFW_ACCESS_ROLE_ID);
const nsfwNoAccessRole = interaction.guild.roles.cache.get(NSFW_NO_ACCESS_ROLE_ID);

```
if (!nsfwAccessRole || !nsfwNoAccessRole) {
  await interaction.reply({
    content: 'NSFW roles not found in this server. Please contact an administrator.',
    flags: MessageFlags.Ephemeral
  });
  return;
}

if (nsfwValue) {
  // User wants NSFW access
  if (member.roles.cache.has(NSFW_NO_ACCESS_ROLE_ID)) {
    await member.roles.remove(nsfwNoAccessRole);
  }
  
  if (!member.roles.cache.has(NSFW_ACCESS_ROLE_ID)) {
    await member.roles.add(nsfwAccessRole);
  }
  
  safeDiscordLog('info', `User ${interaction.user.tag} enabled NSFW access`, 'NSFW');
  
  // Set temporary status for NSFW access change
  setTemporaryStatus(client, 'NSFW access requests', ActivityType.Custom, 10000, '🔓 Access granted');
  
  const embed = new EmbedBuilder()
    .setTitle('NSFW Access Enabled')
    .setDescription('You now have access to NSFW content.')
    .setColor(0x00FF00)
    .setTimestamp();
  
  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
} else {
  // User wants to disable NSFW access
  if (member.roles.cache.has(NSFW_ACCESS_ROLE_ID)) {
    await member.roles.remove(nsfwAccessRole);
  }
  
  if (!member.roles.cache.has(NSFW_NO_ACCESS_ROLE_ID)) {
    await member.roles.add(nsfwNoAccessRole);
  }
  
  safeDiscordLog('info', `User ${interaction.user.tag} disabled NSFW access`, 'NSFW');
  
  // Set temporary status for NSFW access change
  setTemporaryStatus(client, 'NSFW access requests', ActivityType.Custom, 10000, '🔒 Access revoked');
  
  const embed = new EmbedBuilder()
    .setTitle('NSFW Access Disabled')
    .setDescription('You no longer have access to NSFW content.')
    .setColor(0xFF9900)
    .setTimestamp();
  
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}
```

} catch (error) {
console.error(`❌ Error handling NSFW toggle for ${interaction.user.tag}:`, error);
await interaction.reply({
content: ‘There was an error updating your NSFW access. Please try again later.’,
flags: MessageFlags.Ephemeral
});
}
}

//=============================================================================
// COMMAND REGISTRATION
//=============================================================================

/**

- Register slash commands
  */
  async function registerCommands() {
  const commands = [
  new SlashCommandBuilder()
  .setName(‘color’)
  .setDescription(‘Manage your color role’)
  .addSubcommand(subcommand =>
  subcommand
  .setName(‘select’)
  .setDescription(‘Choose a color role’)
  )
  .addSubcommand(subcommand =>
  subcommand
  .setName(‘remove’)
  .setDescription(‘Remove your current color role’)
  )
  .toJSON(),
  
  new SlashCommandBuilder()
  .setName(‘nsfw’)
  .setDescription(‘Toggle your NSFW content access’)
  .addBooleanOption(option =>
  option
  .setName(‘value’)
  .setDescription(‘Enable (true) or disable (false) NSFW access’)
  .setRequired(true)
  )
  .toJSON(),
  ];

// Add verification commands to the array
registerVerificationCommands(commands);

// Add message logger commands to the array
registerMessageLoggerCommands(commands);

// Add moderation commands to the array
registerModCommands(commands);

try {
console.log(‘🔄 Started refreshing application (/) commands’);
const rest = new REST({ version: ‘10’ }).setToken(TOKEN);

```
// Check if we have a specific guild ID for development
const GUILD_ID = process.env.GUILD_ID;

if (GUILD_ID) {
  // Guild commands update instantly
  console.log(`🔄 Registering commands to guild: ${GUILD_ID}`);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands },
  );
  console.log(`✅ Successfully registered ${commands.length} commands to guild`);
} else {
  // Global commands can take up to an hour to propagate
  console.log('🔄 Registering global commands (this can take up to an hour to propagate)');
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands },
  );
  console.log(`✅ Successfully registered ${commands.length} global commands`);
}
```

} catch (error) {
console.error(‘❌ Error registering commands:’, error);
writeHealthStatus(‘offline’, startTime);
}
}

//=============================================================================
// COMMAND ID LOGGING
//=============================================================================

/**

- Fetch and log all registered command IDs in mention format
  */
  async function logCommandIds(client: Client) {
  try {
  console.log(‘🔄 Fetching command IDs…’);
  
  const GUILD_ID = process.env.GUILD_ID;
  let commands;
  
  if (GUILD_ID) {
  const guild = await client.guilds.fetch(GUILD_ID);
  commands = await guild.commands.fetch();
  console.log(`\nGuild Commands (${guild.name}):`);
  } else {
  commands = await client.application?.commands.fetch();
  console.log(’\nGlobal Commands:’);
  }
  
  if (!commands || commands.size === 0) {
  console.log(‘❌ No commands found!’);
  safeDiscordLog(‘warn’, ‘No commands found during ID fetch’, ‘Commands’);
  return;
  }
  
  console.log(`✅ Found ${commands.size} commands\n`);
  
  // Sort commands alphabetically by name
  const sortedCommands = Array.from(commands.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  console.log(‘📋 COMMAND MENTIONS (Copy these to use in Discord):’);
  console.log(‘═’.repeat(60));
  
  // Build command mentions for Discord
  let commandMentions = ‘**Command Mentions:**\n’;
  
  sortedCommands.forEach(command => {
  // Handle commands with subcommands
  if (command.options && command.options.length > 0) {
  const subcommands = command.options.filter(option => option.type === 1); // SUB_COMMAND type
  if (subcommands.length > 0) {
  console.log(`\n🔸 ${command.name.toUpperCase()} (has subcommands):`);
  commandMentions += `\n**${command.name.toUpperCase()}** (subcommands):\n`;
  subcommands.forEach(sub => {
  const mention = `</${command.name} ${sub.name}:${command.id}>`;
  console.log(`   ${mention}`);
  commandMentions += `• ${mention}\n`;
  });
  } else {
  const mention = `</${command.name}:${command.id}>`;
  console.log(mention);
  commandMentions += `• ${mention}\n`;
  }
  } else {
  const mention = `</${command.name}:${command.id}>`;
  console.log(mention);
  commandMentions += `• ${mention}\n`;
  }
  });
  
  console.log(’\n’ + ‘═’.repeat(60));
  console.log(‘📊 RAW COMMAND DATA:’);
  console.log(‘═’.repeat(60));
  
  let rawData = ‘**Raw Command Data:**\n`\n'; sortedCommands.forEach(command => { const line = `${command.name.padEnd(20)} | ${command.id}`; console.log(line); rawData += `${line}\n`; }); rawData += '`’;
  
  // Send to Discord safely
  safeDiscordLog(‘info’, `Command IDs fetched successfully - ${commands.size} commands found`, ‘Commands’);
  
  console.log(’\n=== COMMAND ID FETCH COMPLETE ===\n’);

} catch (error) {
console.error(‘❌ Error fetching command IDs:’, error);
}
}

//=============================================================================
// COLOR ROLE COMMANDS
//=============================================================================

/**

- Handle the color select subcommand
  */
  async function handleColorSelectCommand(interaction: ChatInputCommandInteraction) {
  // Check if we have any color categories
  if (Object.keys(colorCategories).length === 0) {
  await interaction.reply({
  content: ‘No color roles found. Please contact a server administrator.’,
  flags: MessageFlags.Ephemeral
  });
  return;
  }

// Create a select menu for color categories
const selectMenu = new StringSelectMenuBuilder()
.setCustomId(‘color_category_select’)
.setPlaceholder(‘Choose a color category’)
.addOptions(
Object.keys(colorCategories)
.filter(category => colorCategories[category].length > 0)
.map(category =>
new StringSelectMenuOptionBuilder()
.setLabel(category)
.setDescription(`${colorCategories[category].length} colors available`)
.setValue(category)
)
);

const row = new ActionRowBuilder<StringSelectMenuBuilder>()
.addComponents(selectMenu);

// Set a higher time limit for the interaction (2 minutes instead of 1)
const message = await interaction.reply({
content: ‘Select a color category:’,
components: [row],
flags: MessageFlags.Ephemeral,
fetchReply: true // Make sure to fetch the reply for the collector
});

// Set up a collector for the menu interaction
const filter = (i: any) => i.user.id === interaction.user.id;
const collector = message.createMessageComponentCollector({
filter,
time: 120000, // Increased timeout to 2 minutes
componentType: ComponentType.StringSelect
});

collector.on(‘collect’, async (i) => {
try {
if (i.customId === ‘color_category_select’) {
const selectedCategory = i.values[0];
await showColorsForCategory(i, selectedCategory);
}
else if (i.customId === ‘color_select’) {
const roleId = i.values[0];
await assignColorRole(i, roleId);
}
} catch (error) {
// Handle any errors that occur during interaction
console.error(‘Error handling interaction:’, error);

```
  // Only attempt to reply if the interaction hasn't been responded to yet
  if (!i.replied && !i.deferred) {
    try {
      await i.reply({
        content: 'An error occurred while processing your selection. Please try again.',
        ephemeral: true
      });
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}
```

});

collector.on(‘end’, async (collected, reason) => {
if (reason === ‘time’) {
try {
// Check if the message still exists and can be edited
await interaction.editReply({
content: ‘Color selection timed out. Please use the command again if you still want to select a color.’,
components: []
});
} catch (error) {
console.error(‘Error updating message after timeout:’, error);
}
}
});
}

/**

- Show colors for a specific category
  */
  async function showColorsForCategory(interaction: any, category: string) {
  try {
  if (!colorCategories[category] || colorCategories[category].length === 0) {
  await interaction.update({
  content: ‘No colors available in this category. Please try another one.’,
  components: []
  }).catch((error: any) => {
  console.error(‘Error updating interaction with no colors message:’, error);
  });
  return;
  }
  
  // Get colors from this category
  const colors = colorCategories[category];
  
  // Discord has a 25-option limit for select menus
  const maxOptionsPerMenu = 25;
  
  // If we have more than 25 colors, we’ll need to handle it
  if (colors.length > maxOptionsPerMenu) {
  // For simplicity, just take the first 25 for now
  // In a production bot, you’d implement pagination here
  const colorsToShow = colors.slice(0, maxOptionsPerMenu);
  
  const colorSelect = new StringSelectMenuBuilder()
  .setCustomId(‘color_select’)
  .setPlaceholder(`Choose a color from ${category}`)
  .addOptions(
  colorsToShow.map(color =>
  new StringSelectMenuOptionBuilder()
  .setLabel(color.name)
  .setValue(color.id)
  )
  );
  
  const row = new ActionRowBuilder<StringSelectMenuBuilder>()
  .addComponents(colorSelect);
  
  await interaction.update({
  content: `Select a color from ${category} (showing first ${maxOptionsPerMenu} of ${colors.length}):`,
  components: [row]
  }).catch((error: any) => {
  console.error(‘Error updating interaction with color options:’, error);
  });
  } else {
  const colorSelect = new StringSelectMenuBuilder()
  .setCustomId(‘color_select’)
  .setPlaceholder(`Choose a color from ${category}`)
  .addOptions(
  colors.map(color =>
  new StringSelectMenuOptionBuilder()
  .setLabel(color.name)
  .setValue(color.id)
  )
  );
  
  const row = new ActionRowBuilder<StringSelectMenuBuilder>()
  .addComponents(colorSelect);
  
  await interaction.update({
  content: `Select a color from ${category}:`,
  components: [row]
  }).catch((error: any) => {
  console.error(‘Error updating interaction with color options:’, error);
  
  ```
   // If the error is an Unknown Interaction error, the interaction has expired
   if (error instanceof DiscordAPIError && error.code === 10062) {
     console.log('Interaction has expired. The user will need to run the command again.');
   }
  ```
  
  });
  }
  } catch (error) {
  console.error(‘Error in showColorsForCategory:’, error);
  }
  }

/**

- Assign the selected color role
  */
  async function assignColorRole(interaction: any, roleId: string) {
  try {
  if (!interaction.guild) {
  await interaction.update({
  content: ‘This command can only be used in a server!’,
  components: []
  }).catch((error: any) => {
  console.error(‘Error updating interaction with guild error message:’, error);
  });
  return;
  }
  
  const member = interaction.guild.members.cache.get(interaction.user.id);
  if (!member) {
  await interaction.update({
  content: ‘Could not find you in this server!’,
  components: []
  }).catch((error: any) => {
  console.error(‘Error updating interaction with member error message:’, error);
  });
  return;
  }
  
  // Find the role
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
  await interaction.update({
  content: ‘Error: Color role not found. Please try again or contact an admin.’,
  components: []
  }).catch((error: any) => {
  console.error(‘Error updating interaction with role error message:’, error);
  });
  return;
  }
  
  try {
  // Remove any existing color roles
  await removeExistingColorRoles(member);
  
  // Assign the new role
  await member.roles.add(role);
  
  // Log the color change
  safeDiscordLog(‘info’, `User ${interaction.user.tag} changed color to ${role.name}`, ‘ColorRoles’);
  
  // Set temporary status for color change
  setTemporaryStatus(client, ‘with colors’, ActivityType.Playing, 8000);
  
  // Create an embed to show the result
  const embed = new EmbedBuilder()
  .setTitle(‘Color Changed!’)
  .setDescription(`You now have the ${role.name} color!`)
  .setColor(role.color);
  
  await interaction.update({
  content: ‘’,
  embeds: [embed],
  components: []
  }).catch((error: any) => {
  console.error(‘Error updating interaction with success message:’, error);
  
  ```
   // If it's an Unknown Interaction error, just log it
   if (error instanceof DiscordAPIError && error.code === 10062) {
     console.log('Interaction has expired, but the role was still assigned successfully.');
   }
  ```
  
  });
  } catch (error) {
  console.error(‘Error assigning color role:’, error);
  
  // Try to update the interaction with an error message
  try {
  await interaction.update({
  content: ‘There was an error assigning the color role. Please try again later.’,
  components: []
  });
  } catch (updateError) {
  console.error(‘Error sending error message:’, updateError);
  }
  }
  } catch (error) {
  console.error(‘Error in assignColorRole:’, error);
  }
  }

/**

- Handle the color remove subcommand
  */
  async function handleColorRemoveCommand(interaction: ChatInputCommandInteraction, member: any) {
  try {
  const removed = await removeExistingColorRoles(member);
  
  if (removed) {
  safeDiscordLog(‘info’, `User ${interaction.user.tag} removed their color role`, ‘ColorRoles’);
  
  // Set temporary status for color removal
  setTemporaryStatus(client, ‘color removal’, ActivityType.Custom, 8000, ‘🗑️ Color deleted’);
  
  await interaction.reply({
  content: ‘Your color role has been removed!’,
  flags: MessageFlags.Ephemeral
  });
  } else {
  await interaction.reply({
  content: ‘You don't have any color roles to remove.’,
  flags: MessageFlags.Ephemeral
  });
  }
  } catch (error) {
  console.error(‘Error removing color roles:’, error);
  await interaction.reply({
  content: ‘There was an error removing your color roles. Please try again later.’,
  flags: MessageFlags.Ephemeral
  });
  }
  }

/**

- Helper function to remove existing color roles
  */
  async function removeExistingColorRoles(member: any) {
  // Get all color role IDs
  const colorRoleIds = new Set<string>();
  colorRoles.forEach(role => {
  colorRoleIds.add(role.id);
  });

// Filter member’s roles to find color roles
const colorRolesToRemove = member.roles.cache.filter((role: Role) => colorRoleIds.has(role.id));

if (colorRolesToRemove.size === 0) {
return false;
}

// Remove the color roles
await member.roles.remove(colorRolesToRemove);
return true;
}

//=============================================================================
// EVENT HANDLERS
//=============================================================================

/**

- Bot ready event handler
  */
  client.once(Events.ClientReady, async () => {
  // Initialize Discord logger first
  discordLogger.initialize(client);

console.log(`🚀 ${BOT_NAME} is online and ready to serve ${SERVER_NAME}!`);

// Perform guild management check first
await manageGuilds();

// Set up bot description
await setupBotDescription(client);

// Set up rotating status system
setupRotatingStatus(client);

// Load color roles and register commands
loadColorRolesFromFile();
await registerCommands();

// Set up all systems
setupVerificationSystem(client);
loadVerificationConfig();
setupMessageLogger(client);
setupWelcomeDM(client);
setupWarningSystem(client);
await testLoggerChannel(client);

// Update health status when bot is ready
writeHealthStatus(‘online’, startTime);

// Set up a heartbeat interval
setInterval(() => {
writeHealthStatus(‘online’, startTime);
}, 60 * 1000); // Every minute

// Log command IDs after everything is set up
setTimeout(async () => {
await logCommandIds(client);
}, 3000); // Wait 3 seconds to ensure commands are fully registered

// Send startup notification to Discord
setTimeout(async () => {
await discordLogger.sendStartupMessage();
// Set a temporary “just started” status for 2 minutes
setTemporaryStatus(client, ‘just booted up!’, ActivityType.Custom, 120000, ‘🚀 Fresh and ready’);
}, 5000); // Wait 5 seconds for everything to be ready
});

/**

- Error event handler
  */
  client.on(‘error’, (error) => {
  console.error(‘❌ Discord client error:’, error);
  writeHealthStatus(‘offline’, startTime);
  });

/**

- Member join event handler
  */
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
  try {
  console.log(`✅ New member joined: ${member.user.tag}`);
  
  // Set temporary status for new member
  setTemporaryStatus(client, ‘new roommate arriving’, ActivityType.Custom, 15000, ‘👋 Welcome wagon’);
  
  // Send welcome DM to the new member
  await sendWelcomeDM(member);
  
  // Get the unverified role ID (either from env or config)
  const unverifiedRoleId = getAgeUnverifiedRoleId();
  
  // Array to store roles to assign
  const rolesToAssign: string[] = [];
  
  // Add Age Unverified role if configured
  if (unverifiedRoleId) {
  const ageUnverifiedRole = member.guild.roles.cache.get(unverifiedRoleId);
  if (ageUnverifiedRole) {
  rolesToAssign.push(unverifiedRoleId);
  } else {
  console.error(`Age Unverified role with ID ${unverifiedRoleId} not found in server.`);
  }
  } else {
  console.warn(‘No Age Unverified role ID configured. Skipping age unverified role assignment for new member.’);
  }
  
  // Add NSFW No Access role if configured
  if (NSFW_NO_ACCESS_ROLE_ID) {
  const nsfwNoAccessRole = member.guild.roles.cache.get(NSFW_NO_ACCESS_ROLE_ID);
  if (nsfwNoAccessRole) {
  rolesToAssign.push(NSFW_NO_ACCESS_ROLE_ID);
  } else {
  console.error(`NSFW No Access role with ID ${NSFW_NO_ACCESS_ROLE_ID} not found in server.`);
  }
  } else {
  console.warn(‘No NSFW No Access role ID configured. Skipping NSFW no access role assignment for new member.’);
  }
  
  // Assign all roles at once if any are configured
  if (rolesToAssign.length > 0) {
  await member.roles.add(rolesToAssign);
  console.log(`✅ Assigned ${rolesToAssign.length} role(s) to new member: ${member.user.tag}`);
  }
  } catch (error) {
  console.error(‘❌ Error processing new member:’, error);
  }
  });

/**

- Message create event handler for message debugging
  */
  client.on(Events.MessageCreate, (message) => {
  // Ignore bot messages to prevent loops
  if (message.author.bot) return;

// Only log in debug mode or for specific conditions
if (process.env.NODE_ENV === ‘development’) {
console.log(`MESSAGE RECEIVED: ID=${message.id}, Author=${message.author.tag}, Content=${message.content}`);
}
});

/**

- Message update event handler for debugging
  */
  client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
  // Ignore bot messages to prevent loops
  if (newMessage.author?.bot) return;

// Only log in debug mode
if (process.env.NODE_ENV === ‘development’) {
console.log(`MESSAGE UPDATED: ID=${newMessage.id}, Author=${newMessage.author?.tag}`);
console.log(`Old content: ${oldMessage.content}`);
console.log(`New content: ${newMessage.content}`);
}
});

/**

- Message delete event handler for debugging
  */
  client.on(Events.MessageDelete, (message) => {
  // Ignore bot messages to prevent loops
  if (message.author?.bot) return;

// Only log in debug mode
if (process.env.NODE_ENV === ‘development’) {
console.log(`MESSAGE DELETED: ID=${message.id}, Author=${message.author?.tag}`);
}
});

/**

- Interaction create event handler
  */
  client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
  handleCommandInteraction(interaction);
  } else if (interaction.isButton()) {
  handleButtonInteraction(interaction);
  } else if (interaction.isModalSubmit()) {
  handleModalInteraction(interaction);
  }
  });

//=============================================================================
// INTERACTION HANDLERS
//=============================================================================

/**

- Handle command interactions
  */
  async function handleCommandInteraction(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
  await interaction.reply({ content: ‘This command can only be used in a server!’, flags: MessageFlags.Ephemeral });
  return;
  }

const { commandName } = interaction;

// Log command usage (but not to Discord to avoid spam)
console.log(`🔍 Command used: /${commandName} by ${interaction.user.tag}`);

// Handle warning system commands
if ([‘warn’, ‘warnings’, ‘clearwarnings’, ‘mute’, ‘unmute’,
‘ban’, ‘unban’, ‘kick’, ‘note’, ‘modconfig’, ‘appeal’,
‘check’, ‘echo’].includes(commandName)) {
await handleModCommand(interaction);
// Set temporary status for moderation actions
if ([‘warn’, ‘mute’, ‘ban’, ‘kick’].includes(commandName)) {
setTemporaryStatus(client, ‘moderation duties’, ActivityType.Custom, 12000, ‘⚖️ Justice served’);
}
return;
}

// Get the member from the interaction
const member = interaction.guild.members.cache.get(interaction.user.id);
if (!member) {
await interaction.reply({ content: ‘Could not find you in this server!’, flags: MessageFlags.Ephemeral });
return;
}

try {
switch (commandName) {
case ‘color’:
const subcommand = interaction.options.getSubcommand();

```
    switch (subcommand) {
      case 'select':
        await handleColorSelectCommand(interaction);
        break;
      case 'remove':
        await handleColorRemoveCommand(interaction, member);
        break;
    }
    break;
  
  case 'nsfw':
    await handleNSFWCommand(interaction);
    break;
  
  case 'verify':
    await handleVerifyCommand(interaction);
    // Set temporary status for verification
    setTemporaryStatus(client, 'age verification', ActivityType.Custom, 10000, '✅ Checking ID');
    break;
  
  case 'modverify':
    await handleModVerifyCommand(interaction);
    break;
    
  case 'logger':
    await handleLoggerCommand(interaction);
    break;
    
  default:
    await interaction.reply({ 
      content: 'Unknown command. Please use a valid command.', 
      flags: MessageFlags.Ephemeral
    });
}
```

} catch (error) {
console.error(`❌ Error handling command ${commandName}:`, error);

```
// Only reply if the interaction hasn't been responded to yet
if (!interaction.replied && !interaction.deferred) {
  await interaction.reply({ 
    content: 'There was an error executing this command. Please try again later.', 
    ephemeral: true 
  }).catch((err) => console.error('Error sending error message:', err));
}
```

}
}

/**

- Handle button interactions
  */
  async function handleButtonInteraction(interaction: ButtonInteraction) {
  const customId = interaction.customId;

try {
// Handle warning system buttons
if (customId.startsWith(‘open_appeal_modal_’) ||
customId.startsWith(‘approve_appeal_’) ||
customId.startsWith(‘deny_appeal_’)) {
await handleModButtonInteraction(interaction);
return;
}

```
// Handle color selection
if (customId === 'color_category_select' || customId === 'color_select') {
  // These are handled by the collectors in handleColorSelectCommand
  return;
}

// Handle verification buttons
if (customId === 'start_verification') {
  await handleVerificationButton(interaction);
} 
// Handle verification continue button in DM
else if (customId.startsWith('verification_continue_')) {
  await handleVerificationContinue(interaction);
}
// Handle verification cancel button in DM
else if (customId.startsWith('verification_cancel_')) {
  await handleVerificationCancel(interaction);
}
// Handle verification upload button in DM
else if (customId.startsWith('verification_upload_')) {
  await handleVerificationUpload(interaction);
}
// Handle verification approval/denial
else if (customId.startsWith('approve_verification_') || customId.startsWith('deny_verification_')) {
  await handleVerificationDecision(interaction);
  // Set temporary status for verification decision
  if (customId.startsWith('approve_')) {
    setTemporaryStatus(client, 'age verification', ActivityType.Custom, 10000, '✅ Someone got verified');
  }
  return;
}
else {
  // Unknown button
  await interaction.reply({ 
    content: 'This button interaction is not recognized.', 
    ephemeral: true 
  });
}
```

} catch (error) {
console.error(`❌ Error handling button interaction ${customId}:`, error);

```
// Only reply if the interaction hasn't been responded to yet
if (!interaction.replied && !interaction.deferred) {
  await interaction.reply({ 
    content: 'There was an error processing this button. Please try again later.', 
    ephemeral: true 
  }).catch((err) => console.error('Error sending error message:', err));
}
```

}
}

/**

- Handle modal interactions
  */
  async function handleModalInteraction(interaction: ModalSubmitInteraction) {
  const customId = interaction.customId;

try {
// Handle warning system modals
if (customId.startsWith(‘appeal_modal_’) ||
customId.startsWith(‘appeal_decision_’)) {
await handleModModalSubmit(interaction);
return;
}

```
// Handle verification modals
if (customId.startsWith('verification_modal_')) {
  await handleVerificationModal(interaction);
}
else {
  // Unknown modal
  await interaction.reply({ 
    content: 'This modal submission is not recognized.', 
    flags: MessageFlags.Ephemeral 
  });
}
```

} catch (error) {
console.error(`❌ Error handling modal interaction ${customId}:`, error);

```
// Only reply if the interaction hasn't been responded to yet
if (!interaction.replied && !interaction.deferred) {
  await interaction.reply({ 
    content: 'There was an error processing this submission. Please try again later.', 
    flags: MessageFlags.Ephemeral 
  }).catch((err) => console.error('Error sending error message:', err));
}
```

}
}

//=============================================================================
// GRACEFUL SHUTDOWN
//=============================================================================

// Setup description shutdown handlers
setupDescriptionShutdownHandlers(client);

// Handle graceful shutdown
process.on(‘SIGINT’, async () => {
console.log(’\n🛑 Received SIGINT, shutting down gracefully…’);
try {
// Stop rotating status
stopRotatingStatus();

```
// Set updating status
setStaticStatus(client, 'shutting down...', ActivityType.Custom, '🛑 Updating');

// Set description to updating
await setBotDescriptionUpdating(client);

// Send shutdown message
await discordLogger.sendShutdownMessage();

// Give it a moment to process
await new Promise(resolve => setTimeout(resolve, 2000));
```

} catch (error) {
originalConsoleError(‘Error during shutdown:’, error);
} finally {
client.destroy();
process.exit(0);
}
});

process.on(‘SIGTERM’, async () => {
console.log(’\n🛑 Received SIGTERM, shutting down gracefully…’);
try {
// Stop rotating status
stopRotatingStatus();

```
// Set updating status
setStaticStatus(client, 'shutting down...', ActivityType.Custom, '🛑 Updating');

// Set description to updating
await setBotDescriptionUpdating(client);

// Send shutdown message
await discordLogger.sendShutdownMessage();

// Give it a moment to process
await new Promise(resolve => setTimeout(resolve, 2000));
```

} catch (error) {
originalConsoleError(‘Error during shutdown:’, error);
} finally {
client.destroy();
process.exit(0);
}
});

// Handle uncaught exceptions
process.on(‘uncaughtException’, (error) => {
originalConsoleError(‘❌ Uncaught Exception:’, error);
safeDiscordLog(‘error’, `Uncaught Exception: ${error.message}`, ‘Process’);
});

process.on(‘unhandledRejection’, (reason, promise) => {
originalConsoleError(‘❌ Unhandled Rejection at:’, promise, ‘reason:’, reason);
safeDiscordLog(‘error’, `Unhandled Rejection: ${reason}`, ‘Process’);
});

//=============================================================================
// BOT LOGIN
//=============================================================================

// Login to Discord with your app’s token
client.login(TOKEN);