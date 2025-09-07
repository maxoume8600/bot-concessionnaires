const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reglement')
        .setDescription('Affiche le règlement du concessionnaire'),

    async execute(interaction) {
        const reglementEmbed = new EmbedBuilder()
            .setTitle('📋 Règlement du Concessionnaire')
            .setColor('#FF6B6B')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/1828/1828833.png')
            .setDescription('**Règles à respecter impérativement**')
            .addFields(
                {
                    name: '🕐 **Horaires de Service**',
                    value: [
                        '• **Durée minimum:** 2 heures consécutives',
                        '• **Pause maximum:** 30 minutes entre deux services',
                        '• **Service de nuit:** Autorisé avec autorisation'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⏰ **Prises de Service**',
                    value: [
                        '• **Obligatoire:** Prendre son service avant toute activité',
                        '• **Interdiction:** Plusieurs services simultanés',
                        '• **Oubli:** Fin de service automatique après 6h'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🚫 **Sanctions**',
                    value: [
                        '• **1ère infraction:** Avertissement',
                        '• **2ème infraction:** Rétrogradation temporaire',
                        '• **3ème infraction:** Exclusion définitive'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📞 **Absences**',
                    value: [
                        '• **Justifiées:** Utiliser le bouton d\'absence',
                        '• **Prévenir:** Minimum 2h à l\'avance',
                        '• **Urgence:** Contacter un responsable'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💼 **Rôles et Responsabilités**',
                    value: [
                        '• **Recrue:** Formation obligatoire',
                        '• **Vendeur:** Minimum 5 ventes/semaine',
                        '• **Commercial:** Encadrement des nouvelles recrues',
                        '• **Responsable:** Gestion d\'équipe'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🎯 **Objectifs**',
                    value: [
                        '• **Hebdomadaires:** Définis selon le rôle',
                        '• **Qualité:** Priorité sur la quantité',
                        '• **Teamwork:** Collaboration encouragée'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({
                text: 'Le non-respect du règlement entraîne des sanctions',
                iconURL: 'https://cdn-icons-png.flaticon.com/512/564/564619.png'
            })
            .setTimestamp();

        const controleEmbed = new EmbedBuilder()
            .setTitle('🔍 Contrôles Automatiques')
            .setColor('#4ECDC4')
            .setDescription('**Système de vérification en temps réel**')
            .addFields(
                {
                    name: '⚡ **Contrôles en temps réel**',
                    value: [
                        '• Vérification de la prise de service avant vente',
                        '• Détection des services trop longs (>6h)',
                        '• Surveillance des pauses prolongées',
                        '• Alerte pour les objectifs non atteints'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📊 **Statistiques surveillées**',
                    value: [
                        '• Temps de service quotidien/hebdomadaire',
                        '• Nombre de ventes par période',
                        '• Taux d\'absences justifiées',
                        '• Respect des horaires'
                    ].join('\n'),
                    inline: false
                }
            );

        await interaction.reply({
            embeds: [reglementEmbed, controleEmbed],
            flags: MessageFlags.Ephemeral
        });
    },
};
