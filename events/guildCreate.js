const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        console.log(`📥 Bot ajouté au serveur: ${guild.name} (${guild.memberCount} membres)`);
        console.log(`ℹ️ Configuration automatique désactivée - utilisez /setup pour configurer manuellement`);
        
        // Configuration automatique désactivée - utilisez /setup manuellement
    },
};
