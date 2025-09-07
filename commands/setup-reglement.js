const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-reglement')
        .setDescription('Crée le salon de règlement avec bouton de validation')
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Le salon où créer le règlement (optionnel, créera un nouveau salon si non spécifié)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Titre du règlement (optionnel)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('force')
                .setDescription('Remplacer le message existant')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;
            const force = interaction.options.getBoolean('force') || false;
            const titre = interaction.options.getString('titre') || '📋 Règlement du Concessionnaire';
            let targetChannel = interaction.options.getChannel('salon');

            // Créer le salon si non spécifié
            if (!targetChannel) {
                // Chercher s'il existe déjà un salon règlement
                targetChannel = guild.channels.cache.find(c => 
                    c.name.includes('règlement') || 
                    c.name.includes('reglement') || 
                    c.name.includes('rules')
                );

                // Créer le salon s'il n'existe pas
                if (!targetChannel) {
                    targetChannel = await guild.channels.create({
                        name: '📋-règlement',
                        type: 0, // Text channel
                        topic: 'Règlement du concessionnaire - Validez votre acceptation',
                        permissionOverwrites: [
                            {
                                id: guild.roles.everyone.id,
                                allow: ['ViewChannel', 'ReadMessageHistory'],
                                deny: ['SendMessages', 'AddReactions']
                            }
                        ]
                    });
                }
            }

            // Vérifier s'il y a déjà un message de règlement
            const existingMessages = await targetChannel.messages.fetch({ limit: 10 });
            const existingRuleMessage = existingMessages.find(msg => 
                msg.author.id === interaction.client.user.id && 
                msg.embeds.length > 0 && 
                msg.embeds[0].title?.includes('Règlement')
            );

            if (existingRuleMessage && !force) {
                return await interaction.editReply({
                    content: `❌ Un message de règlement existe déjà dans ${targetChannel}.\nUtilisez l'option \`force: true\` pour le remplacer.`
                });
            }

            // Contenu du règlement
            const reglementContent = `
            **🏢 RÈGLES GÉNÉRALES**
            
            **1. Respect et courtoisie**
            • Respectez tous les membres du personnel et les clients
            • Langage approprié en toutes circonstances
            • Aucun propos discriminatoire ou offensant
            
            **2. Professionnalisme**
            • Tenue vestimentaire appropriée pendant les heures de service
            • Ponctualité lors des prises de service
            • Représenter dignement l'entreprise
            
            **🕐 HORAIRES ET PRÉSENCE**
            
            **3. Prise de service obligatoire**
            • Utiliser la commande \`/service\` pour prendre et terminer son service
            • Minimum 2h de service consécutives
            • Prévenir en cas d'absence
            
            **4. Absences**
            • Signaler toute absence dans le salon prévu
            • Absences répétées non justifiées = sanctions
            
            **� RELATIONS PROFESSIONNELLES**
            
            **5. Travail d'équipe**
            • Collaboration et entraide entre collègues
            • Communication respectueuse avec la hiérarchie
            • Partage des informations importantes
            
            **6. Accueil et service**
            • Accueil chaleureux et professionnel
            • Écoute active des demandes
            • Orientation et assistance des visiteurs
            
            **⚠️ SANCTIONS**
            
            **Avertissement** : Non-respect mineur des règles
            **Blâme** : Récidive ou manquement grave
            **Exclusion temporaire** : Faute grave
            **Licenciement** : Faute lourde ou récidive d'exclusions
            
            **📞 CONTACT DIRECTION**
            
            Pour toute question ou problème, contactez la direction.
            `;

            // Créer l'embed du règlement
            const reglementEmbed = new EmbedBuilder()
                .setTitle(titre)
                .setDescription(reglementContent)
                .setColor('#E74C3C')
                .setTimestamp()
                .setFooter({ 
                    text: 'En cliquant sur "J\'accepte", vous vous engagez à respecter ce règlement',
                    iconURL: guild.iconURL() 
                });

            // Créer le bouton de validation
            const validateButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('validate_reglement')
                        .setLabel('✅ J\'accepte le règlement')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('📋')
                );

            // Supprimer l'ancien message s'il existe et que force est activé
            if (existingRuleMessage && force) {
                await existingRuleMessage.delete();
            }

            // Envoyer le message de règlement
            await targetChannel.send({
                embeds: [reglementEmbed],
                components: [validateButton]
            });

            // Message de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ Règlement configuré')
                .setDescription(`Le règlement a été créé avec succès dans ${targetChannel}`)
                .addFields(
                    { name: '📍 Salon', value: `${targetChannel}`, inline: true },
                    { name: '🎯 Fonctionnalités', value: '• Message de règlement\n• Bouton de validation\n• Permissions configurées', inline: true }
                )
                .setColor('#27AE60')
                .setTimestamp();

            await interaction.editReply({ embeds: [confirmEmbed] });

        } catch (error) {
            console.error('Erreur setup règlement:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erreur')
                .setDescription(`Impossible de configurer le règlement:\n\`\`\`${error.message}\`\`\``)
                .setColor('#E74C3C')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
