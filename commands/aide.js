const { SlashCommandBuilder, EmbedBuilder , MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aide')
        .setDescription('Affiche l\'aide du bot concessionnaire'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Concessionnaire - Guide d\'utilisation')
            .setDescription('Voici toutes les commandes disponibles pour gérer votre concessionnaire FiveM')
            .setColor('#3498DB')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3774/3774299.png')
            .addFields(
                {
                    name: '👥 **Commandes pour tous**',
                    value: '`/catalogue` - Voir le catalogue des véhicules\n`/aide` - Afficher cette aide',
                    inline: false
                },
                {
                    name: '💼 **Commandes vendeurs**',
                    value: '`/vendre` - Vendre un véhicule à un client\n`/stock voir` - Consulter le stock\n`/ventes` - Statistiques de ventes',
                    inline: false
                },
                {
                    name: '🔧 **Commandes de gestion**',
                    value: '`/stock ajouter/retirer` - Gérer le stock\n`/vehicule` - Ajouter/modifier/supprimer des véhicules\n`/sync` - Gérer la synchronisation FiveM\n`/setup` - Configuration automatique du serveur',
                    inline: false
                },
                {
                    name: '📊 **Statistiques disponibles**',
                    value: '• Ventes par jour/semaine/mois\n• Statistiques par vendeur\n• Top véhicules vendus\n• Chiffre d\'affaires',
                    inline: false
                },
                {
                    name: '⚙️ **Configuration automatique**',
                    value: 'Le bot configure automatiquement votre serveur :\n• Canaux organisés par catégories\n• Rôles avec permissions appropriées\n• Messages de bienvenue\n• Synchronisation FiveM (optionnel)',
                    inline: false
                }
            )
            .setFooter({ 
                text: `Bot développé pour ${process.env.SERVER_NAME || 'votre serveur RP'}`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    },
};
