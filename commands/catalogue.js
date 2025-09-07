const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder , MessageFlags } = require('discord.js');
const EmbedUtils = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('catalogue')
        .setDescription('Affiche le catalogue des véhicules disponibles')
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Filtrer par catégorie')
                .setRequired(false)
                .addChoices(
                    { name: 'Toutes', value: 'toutes' },
                    { name: 'Compactes', value: 'compactes' },
                    { name: 'Berlines', value: 'berlines' },
                    { name: 'SUV', value: 'suv' },
                    { name: 'Coupés', value: 'coupés' },
                    { name: 'Muscle', value: 'muscle' },
                    { name: 'Sports Classiques', value: 'sports classiques' },
                    { name: 'Sportives', value: 'sportives' },
                    { name: 'Super', value: 'super' },
                    { name: 'Motos', value: 'motos' },
                    { name: 'Tout-terrain', value: 'tout-terrain' },
                    { name: 'Utilitaires', value: 'utilitaires' },
                    { name: 'Fourgonnettes', value: 'fourgonnettes' },
                    { name: 'Vélos', value: 'vélos' },
                    { name: 'Bateaux', value: 'bateaux' },
                    { name: 'Hélicoptères', value: 'hélicoptères' },
                    { name: 'Avions', value: 'avions' },
                    { name: 'Service', value: 'service' },
                    { name: 'Urgence', value: 'urgence' },
                    { name: 'Militaire', value: 'militaire' },
                    { name: 'Commercial', value: 'commercial' },
                    { name: 'Industriels', value: 'industriels' },
                    { name: 'Formule 1', value: 'formule 1' }
                )),

    async execute(interaction) {
        const categorie = interaction.options.getString('categorie') || 'toutes';
        
        let vehicules = Array.from(interaction.client.vehicules.values());
        
        // Filtrer par catégorie si spécifiée
        if (categorie !== 'toutes') {
            vehicules = vehicules.filter(v => v.categorie.toLowerCase() === categorie.toLowerCase());
        }

        if (vehicules.length === 0) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed('Catalogue vide', 'Aucun véhicule disponible dans cette catégorie.')],
                flags: MessageFlags.Ephemeral
            });
        }

        // Créer l'embed principal
        const catalogueEmbed = new EmbedBuilder()
            .setTitle('🏪 Catalogue du Concessionnaire')
            .setDescription(`**${vehicules.length}** véhicule(s) disponible(s)${categorie !== 'toutes' ? ` dans la catégorie **${categorie}**` : ''}`)
            .setColor('#FFD700')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3774/3774299.png')
            .setTimestamp();

        // Ajouter les véhicules (max 25 fields)
        const vehiculesToShow = vehicules.slice(0, 25);
        vehiculesToShow.forEach(vehicule => {
            catalogueEmbed.addFields({
                name: `🚗 ${vehicule.nom}`,
                value: `**Prix:** ${vehicule.prix.toLocaleString('fr-FR')} ${process.env.DEVISE || '€'}\n**Catégorie:** ${vehicule.categorie}`,
                inline: true
            });
        });

        // Créer le menu de sélection pour voir les détails
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('vehicule_details')
            .setPlaceholder('Sélectionner un véhicule pour voir les détails')
            .addOptions(
                vehiculesToShow.map(vehicule => ({
                    label: vehicule.nom,
                    description: `${vehicule.prix.toLocaleString('fr-FR')} ${process.env.DEVISE || '€'}`,
                    value: vehicule.id,
                    emoji: '🚗'
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            embeds: [catalogueEmbed],
            components: [row]
        });
    },
};
