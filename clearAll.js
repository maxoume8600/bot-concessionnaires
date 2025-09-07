const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Vider toutes les commandes
async function clearCommands() {
    try {
        const result = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: [] }
        );
        console.log('✅ Toutes les commandes ont été supprimées.');
    } catch (error) {
        console.error('❌ Erreur lors de la suppression des commandes:', error);
    }
}

clearCommands();
