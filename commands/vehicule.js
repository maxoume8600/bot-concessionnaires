const { SlashCommandBuilder, PermissionFlagsBits , MessageFlags } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const DataManager = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vehicule')
        .setDescription('Gérer les véhicules du concessionnaire')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ajouter')
                .setDescription('Ajouter un nouveau véhicule')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID unique du véhicule (ex: adder)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('nom')
                        .setDescription('Nom complet du véhicule')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('marque')
                        .setDescription('Marque du véhicule')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('prix')
                        .setDescription('Prix du véhicule')
                        .setRequired(true)
                        .setMinValue(1000))
                .addStringOption(option =>
                    option.setName('categorie')
                        .setDescription('Catégorie du véhicule')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Super', value: 'Super' },
                            { name: 'Sports', value: 'Sports' },
                            { name: 'SUV', value: 'SUV' },
                            { name: 'Berline', value: 'Berline' },
                            { name: 'Compacte', value: 'Compacte' },
                            { name: 'Moto', value: 'Moto' }
                        ))
                .addIntegerOption(option =>
                    option.setName('stock')
                        .setDescription('Stock initial')
                        .setRequired(false)
                        .setMinValue(0))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('URL de l\'image du véhicule')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('modifier')
                .setDescription('Modifier un véhicule existant')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID du véhicule à modifier')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('prix')
                        .setDescription('Nouveau prix')
                        .setRequired(false)
                        .setMinValue(1000))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('Nouvelle URL d\'image')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('supprimer')
                .setDescription('Supprimer un véhicule')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID du véhicule à supprimer')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Voir les détails d\'un véhicule')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID du véhicule')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'ajouter':
                await this.ajouterVehicule(interaction);
                break;
            case 'modifier':
                await this.modifierVehicule(interaction);
                break;
            case 'supprimer':
                await this.supprimerVehicule(interaction);
                break;
            case 'info':
                await this.infoVehicule(interaction);
                break;
        }
    },

    async ajouterVehicule(interaction) {
        const id = interaction.options.getString('id').toLowerCase();
        const nom = interaction.options.getString('nom');
        const marque = interaction.options.getString('marque');
        const prix = interaction.options.getInteger('prix');
        const categorie = interaction.options.getString('categorie');
        const stock = interaction.options.getInteger('stock') || 0;
        const image = interaction.options.getString('image');

        // Vérifier si le véhicule existe déjà
        if (interaction.client.vehicules.has(id)) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed('Véhicule existant', `Un véhicule avec l'ID \`${id}\` existe déjà.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        const nouveauVehicule = {
            id,
            nom,
            marque,
            prix,
            categorie,
            stock,
            image: image || null,
            dateAjout: new Date().toISOString()
        };

        interaction.client.vehicules.set(id, nouveauVehicule);
        DataManager.saveVehicules(interaction.client);

        const embed = EmbedUtils.createVehiculeEmbed(nouveauVehicule);
        embed.setTitle('✅ Véhicule ajouté avec succès');

        await interaction.reply({
            embeds: [embed]
        });
    },

    async modifierVehicule(interaction) {
        const id = interaction.options.getString('id').toLowerCase();
        const nouveauPrix = interaction.options.getInteger('prix');
        const nouvelleImage = interaction.options.getString('image');

        const vehicule = interaction.client.vehicules.get(id);
        if (!vehicule) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed('Véhicule introuvable', `Aucun véhicule avec l'ID \`${id}\` n'a été trouvé.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        let modifications = [];
        
        if (nouveauPrix) {
            const ancienPrix = vehicule.prix;
            vehicule.prix = nouveauPrix;
            modifications.push(`Prix: ${ancienPrix.toLocaleString('fr-FR')} → ${nouveauPrix.toLocaleString('fr-FR')} ${process.env.DEVISE || '€'}`);
        }

        if (nouvelleImage !== null) {
            vehicule.image = nouvelleImage;
            modifications.push(`Image: ${nouvelleImage ? 'Mise à jour' : 'Supprimée'}`);
        }

        if (modifications.length === 0) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed('Aucune modification', 'Aucune modification spécifiée.')],
                flags: MessageFlags.Ephemeral
            });
        }

        interaction.client.vehicules.set(id, vehicule);
        DataManager.saveVehicules(interaction.client);

        const embed = EmbedUtils.createSuccessEmbed(
            'Véhicule modifié',
            `**${vehicule.nom}** a été modifié:\n\n${modifications.join('\n')}`
        );

        await interaction.reply({
            embeds: [embed]
        });
    },

    async supprimerVehicule(interaction) {
        const id = interaction.options.getString('id').toLowerCase();

        const vehicule = interaction.client.vehicules.get(id);
        if (!vehicule) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed('Véhicule introuvable', `Aucun véhicule avec l'ID \`${id}\` n'a été trouvé.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        interaction.client.vehicules.delete(id);
        DataManager.saveVehicules(interaction.client);

        await interaction.reply({
            embeds: [EmbedUtils.createSuccessEmbed(
                'Véhicule supprimé',
                `**${vehicule.nom}** (${id}) a été supprimé du catalogue.`
            )]
        });
    },

    async infoVehicule(interaction) {
        const id = interaction.options.getString('id').toLowerCase();

        const vehicule = interaction.client.vehicules.get(id);
        if (!vehicule) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed('Véhicule introuvable', `Aucun véhicule avec l'ID \`${id}\` n'a été trouvé.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = EmbedUtils.createVehiculeEmbed(vehicule);
        embed.addFields(
            { name: '🆔 ID', value: vehicule.id, inline: true },
            { name: '📅 Ajouté le', value: new Date(vehicule.dateAjout).toLocaleDateString('fr-FR'), inline: true }
        );

        await interaction.reply({
            embeds: [embed]
        });
    },
};
