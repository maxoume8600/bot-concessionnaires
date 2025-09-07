const { REST, Routes } = require('discord.js');
require('dotenv').config();

const command = require('./commands/manage-service.js');

const commands = [command.data.toJSON()];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Déployer les commandes
(async () => {
    try {
        console.log(`Démarrage du déploiement de la commande.`);
        
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log(`✅ Commande déployée avec succès !`);
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
})();
