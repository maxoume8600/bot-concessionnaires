const { REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

const commands = [];

// Récupérer toutes les commandes
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const command = require(join(__dirname, 'commands', file));
        if (command.data && command.data.toJSON) {
            commands.push(command.data.toJSON());
        } else {
            console.warn(`⚠️ La commande ${file} n'a pas de propriété data ou toJSON`);
        }
    } catch (error) {
        console.error(`❌ Erreur lors du chargement de ${file}:`, error);
    }
}

// Construire et préparer une instance du module REST
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Déployer les commandes
(async () => {
    try {
        console.log(`Démarrage du rafraîchissement de ${commands.length} commande(s) slash.`);

        // Méthode PUT pour rafraîchir complètement toutes les commandes dans la guilde avec l'ensemble actuel
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`✅ ${data.length} commande(s) slash rechargées avec succès.`);
        console.log('Commandes déployées:');
        data.forEach(cmd => console.log(`  - /${cmd.name}: ${cmd.description}`));
        
    } catch (error) {
        console.error('❌ Erreur lors du déploiement des commandes:', error);
    }
})();
