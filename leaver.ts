import { Client, GatewayIntentBits } from ‘discord.js’;
import dotenv from ‘dotenv’;

// Load environment variables
dotenv.config();

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

// Configuration
const BOT_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_TO_KEEP = ‘1344865612559679529’; // Guild ID to keep

async function leaveAllGuildsExceptOne() {
try {
console.log(‘Bot is ready! Fetching guilds…’);

```
    // Get all guilds the bot is in
    const guilds = client.guilds.cache;
    console.log(`Bot is in ${guilds.size} guilds`);
    
    if (guilds.size === 0) {
        console.log('Bot is not in any guilds.');
        return;
    }
    
    // List all guilds
    console.log('\nCurrent guilds:');
    guilds.forEach(guild => {
        console.log(`- ${guild.name} (ID: ${guild.id})`);
    });
    
    // Leave all guilds except the specified one
    let leftCount = 0;
    const guildToKeep = guilds.get(GUILD_TO_KEEP);
    
    if (!guildToKeep) {
        console.log(`\nWarning: Guild with ID ${GUILD_TO_KEEP} not found!`);
        console.log('Available guild IDs:');
        guilds.forEach(guild => console.log(`- ${guild.id} (${guild.name})`));
        return;
    }
    
    console.log(`\nKeeping guild: ${guildToKeep.name} (${guildToKeep.id})`);
    console.log('Leaving other guilds...\n');
    
    for (const [guildId, guild] of guilds) {
        if (guildId !== GUILD_TO_KEEP) {
            try {
                await guild.leave();
                console.log(`✅ Left: ${guild.name} (${guild.id})`);
                leftCount++;
                
                // Add a small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`❌ Failed to leave ${guild.name}: ${error}`);
            }
        }
    }
    
    console.log(`\n🎉 Successfully left ${leftCount} guilds`);
    console.log(`Remaining in: ${guildToKeep.name}`);
    
} catch (error) {
    console.error('Error occurred:', error);
} finally {
    // Close the client connection
    client.destroy();
    process.exit(0);
}
```

}

// Event handlers
client.once(‘ready’, () => {
console.log(`Logged in as ${client.user?.tag}`);
leaveAllGuildsExceptOne();
});

client.on(‘error’, (error) => {
console.error(‘Discord client error:’, error);
});

// Login to Discord
if (!BOT_TOKEN) {
console.error(‘❌ DISCORD_TOKEN not found in .env file’);
process.exit(1);
}

client.login(BOT_TOKEN).catch(console.error);