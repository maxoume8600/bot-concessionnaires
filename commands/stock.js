const { SlashCommandBuilder, PermissionFlagsBits , MessageFlags } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const DataManager = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stock')
        .setDescription('Gérer le stock des véhicules')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ajouter')
                .setDescription('Ajouter du stock à un véhicule')
                .addStringOption(option =>
                    option.setName('vehicule')
                        .setDescription('ID du véhicule')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantite')
                        .setDescription('Quantité à ajouter')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('retirer')
                .setDescription('Retirer du stock d\'un véhicule')
                .addStringOption(option =>
                    option.setName('vehicule')
                        .setDescription('ID du véhicule')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantite')
                        .setDescription('Quantité à retirer')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('voir')
                .setDescription('Voir le stock actuel'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'ajouter':
                await this.ajouterStock(interaction);
                break;
            case 'retirer':
                await this.retirerStock(interaction);
                break;
            case 'voir':
                await this.voirStock(interaction);
                break;
        }
    },

    async ajouterStock(interaction) {
        const vehiculeId = interaction.options.getString('vehicule');
        const quantite = interaction.options.getInteger('quantite');

        const vehicule = interaction.client.vehicules.get(vehiculeId);
        if (!vehicule) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed('Véhicule introuvable', `Aucun véhicule avec l'ID \`${vehiculeId}\` n'a été trouvé.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        const ancienStock = vehicule.stock;
        vehicule.stock += quantite;
        interaction.client.vehicules.set(vehicule.id, vehicule);
        
        DataManager.saveVehicules(interaction.client);

        await interaction.reply({
            embeds: [EmbedUtils.createSuccessEmbed(
                'Stock mis à jour',
                `**${vehicule.nom}**\n` +
                `Stock précédent: ${ancienStock}\n` +
                `Ajouté: +${quantite}\n` +
                `**Nouveau stock: ${vehicule.stock}**`
            )]
        });
    },

    async retirerStock(interaction) {
        const vehiculeId = interaction.options.getString('vehicule');
        const quantite = interaction.options.getInteger('quantite');

        const vehicule = interaction.client.vehicules.get(vehiculeId);
        if (!vehicule) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed('Véhicule introuvable', `Aucun véhicule avec l'ID \`${vehiculeId}\` n'a été trouvé.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (vehicule.stock < quantite) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed('Stock insuffisant', `Impossible de retirer ${quantite} unités. Stock actuel: ${vehicule.stock}`)],
                flags: MessageFlags.Ephemeral
            });
        }

        const ancienStock = vehicule.stock;
        vehicule.stock -= quantite;
        interaction.client.vehicules.set(vehicule.id, vehicule);
        
        DataManager.saveVehicules(interaction.client);

        await interaction.reply({
            embeds: [EmbedUtils.createSuccessEmbed(
                'Stock mis à jour',
                `**${vehicule.nom}**\n` +
                `Stock précédent: ${ancienStock}\n` +
                `Retiré: -${quantite}\n` +
                `**Nouveau stock: ${vehicule.stock}**`
            )]
        });
    },

    async voirStock(interaction) {
        const vehicules = Array.from(interaction.client.vehicules.values());
        
        if (vehicules.length === 0) {
            return interaction.reply({
                embeds: [EmbedUtils.createInfoEmbed('Stock vide', 'Aucun véhicule en stock.')],
                flags: MessageFlags.Ephemeral
            });
        }

        const stockEmbed = EmbedUtils.createInfoEmbed('📦 État du Stock', null);
        
        // Trier par stock croissant
        vehicules.sort((a, b) => a.stock - b.stock);
        
        let description = '';
        vehicules.forEach(vehicule => {
            const statusIcon = vehicule.stock === 0 ? '🔴' : vehicule.stock < 3 ? '🟠' : '🟢';
            description += `${statusIcon} **${vehicule.nom}** (${vehicule.id})\n`;
            description += `   Stock: ${vehicule.stock} | Prix: ${vehicule.prix.toLocaleString('fr-FR')} ${process.env.DEVISE || '€'}\n\n`;
        });

        stockEmbed.setDescription(description);
        
        const stats = {
            total: vehicules.length,
            enStock: vehicules.filter(v => v.stock > 0).length,
            rupture: vehicules.filter(v => v.stock === 0).length,
            faible: vehicules.filter(v => v.stock > 0 && v.stock < 3).length
        };

        stockEmbed.addFields(
            { name: '📊 Statistiques', value: `Total: ${stats.total}\nEn stock: ${stats.enStock}\nStock faible: ${stats.faible}\nRupture: ${stats.rupture}`, inline: true }
        );

        await interaction.reply({
            embeds: [stockEmbed]
        });
    },
};
