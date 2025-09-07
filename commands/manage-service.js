const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage-service')
        .setDescription('Gestion des prises et fins de service')
        .addSubcommand(subcommand =>
            subcommand
                .setName('prendre')
                .setDescription('Signaler votre prise de service')
                .addStringOption(option =>
                    option
                        .setName('poste')
                        .setDescription('Votre poste de travail (optionnel)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('terminer')
                .setDescription('Signaler votre fin de service')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const userName = interaction.user.username;
        const dataPath = path.join(__dirname, '..', 'data');
        const filePath = path.join(dataPath, 'services.json');
        
        let serviceData = [];
        
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            serviceData = JSON.parse(fileContent);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Erreur lecture fichier services:', error);
            }
            // Si le fichier n'existe pas, on continue avec un tableau vide
            await fs.mkdir(dataPath, { recursive: true });
        }

        if (subcommand === 'prendre') {
            // Vérifier si déjà en service
            const existingService = serviceData.find(s => s.userId === userId);
            
            if (existingService) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('⚠️ Déjà en Service')
                        .setDescription(`Vous êtes déjà en service sur le poste **${existingService.poste}**`)
                        .setColor('#ff9900')],
                    ephemeral: true
                });
            }

            // Récupérer le poste depuis les rôles ou l'option
            let poste = interaction.options.getString('poste') || '❓ Non spécifié';
            
            if (!poste || poste === '❓ Non spécifié') {
                const userRoles = interaction.member.roles.cache
                    .filter(role => !role.name.toLowerCase().includes('en service'));
                
                if (userRoles.size > 0) {
                    const highestRole = userRoles.first();
                    poste = `🏷️ ${highestRole.name}`;
                }
            }

            // Ajouter le rôle "En Service"
            let enServiceRole = interaction.guild.roles.cache.find(r => 
                r.name.toLowerCase() === 'en service'
            );

            if (!enServiceRole) {
                try {
                    enServiceRole = await interaction.guild.roles.create({
                        name: 'En Service',
                        color: '#2ecc71',
                        reason: 'Rôle pour les membres en service'
                    });
                    console.log('✅ Rôle "En Service" créé avec succès');
                } catch (error) {
                    console.error('❌ Erreur création rôle En Service:', error);
                    return interaction.reply({
                        content: '❌ Erreur lors de la création du rôle En Service. Contactez un administrateur.',
                        ephemeral: true
                    });
                }
            }

            // Ajouter le rôle au membre
            try {
                await interaction.member.roles.add(enServiceRole);
                console.log(`✅ Rôle En Service ajouté à ${userName}`);
            } catch (error) {
                console.error(`❌ Erreur ajout rôle En Service à ${userName}:`, error);
                return interaction.reply({
                    content: '❌ Erreur lors de l\'ajout du rôle En Service. Contactez un administrateur.',
                    ephemeral: true
                });
            }

            // Enregistrer la prise de service
            const serviceEntry = {
                userId,
                userName,
                poste,
                startTime: new Date().toISOString()
            };

            serviceData.push(serviceEntry);
            
            try {
                await fs.writeFile(filePath, JSON.stringify(serviceData, null, 2));
                console.log(`✅ Service de ${userName} enregistré`);
            } catch (error) {
                console.error('❌ Erreur sauvegarde service:', error);
            }

            // Notifier dans le salon de logs
            const logChannel = interaction.guild.channels.cache.find(c => 
                c.name.includes('logs🟢-prise-de-service') || 
                c.name.includes('prise-de-service')
            );

            const serviceEmbed = new EmbedBuilder()
                .setTitle('🟢 Prise de Service')
                .setDescription(`**${userName}** a pris son service`)
                .addFields(
                    { name: '👤 Nom', value: userName, inline: true },
                    { name: '💼 Poste', value: poste, inline: true },
                    { name: '🕐 Heure', value: new Date().toLocaleTimeString('fr-FR'), inline: true }
                )
                .setColor('#2ecc71')
                .setTimestamp();

            if (logChannel) {
                try {
                    await logChannel.send({ embeds: [serviceEmbed] });
                    console.log(`✅ Log envoyé dans ${logChannel.name}`);
                } catch (error) {
                    console.error('❌ Erreur envoi log:', error);
                }
            } else {
                console.warn('⚠️ Aucun salon de logs trouvé pour la prise de service');
            }

            // Réponse à l'utilisateur
            return interaction.reply({
                embeds: [serviceEmbed],
                ephemeral: true
            });

        } else if (subcommand === 'terminer') {
            // Vérifier si en service
            const serviceIndex = serviceData.findIndex(s => s.userId === userId);
            
            if (serviceIndex === -1) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('⚠️ Pas en Service')
                        .setDescription('Vous n\'êtes actuellement pas en service')
                        .setColor('#ff9900')],
                    ephemeral: true
                });
            }

            const service = serviceData[serviceIndex];
            const startTime = new Date(service.startTime);
            const endTime = new Date();
            const duration = endTime - startTime;
            
            // Calculer la durée
            function formatDuration(ms) {
                const seconds = Math.floor((ms / 1000) % 60);
                const minutes = Math.floor((ms / (1000 * 60)) % 60);
                const hours = Math.floor(ms / (1000 * 60 * 60));

                if (hours > 0) {
                    return `${hours}h ${minutes}min ${seconds}s`;
                } else if (minutes > 0) {
                    return `${minutes}min ${seconds}s`;
                } else {
                    return `${seconds}s`;
                }
            }

            // Retirer le rôle "En Service"
            const enServiceRole = interaction.guild.roles.cache.find(r => 
                r.name.toLowerCase() === 'en service'
            );

            if (enServiceRole && interaction.member.roles.cache.has(enServiceRole.id)) {
                try {
                    await interaction.member.roles.remove(enServiceRole);
                    console.log(`✅ Rôle En Service retiré de ${userName}`);
                } catch (error) {
                    console.error(`❌ Erreur retrait rôle En Service de ${userName}:`, error);
                }
            }

            // Supprimer l'entrée du service
            serviceData.splice(serviceIndex, 1);
            try {
                await fs.writeFile(filePath, JSON.stringify(serviceData, null, 2));
                console.log(`✅ Service de ${userName} terminé et enregistré`);
            } catch (error) {
                console.error('❌ Erreur sauvegarde fin de service:', error);
            }

            // Préparer l'embed
            const endEmbed = new EmbedBuilder()
                .setTitle('🔴 Fin de Service')
                .setDescription(`**${userName}** a terminé son service`)
                .addFields(
                    { name: '👤 Nom', value: userName, inline: true },
                    { name: '💼 Poste', value: service.poste, inline: true },
                    { name: '⏱️ Durée', value: formatDuration(duration), inline: true }
                )
                .setColor('#e74c3c')
                .setTimestamp();

            // Notifier dans le salon de logs
            const logChannel = interaction.guild.channels.cache.find(c => 
                c.name.includes('logs-🔴-fin-de-service') || 
                c.name.includes('fin-de-service')
            );

            if (logChannel) {
                try {
                    await logChannel.send({ embeds: [endEmbed] });
                    console.log(`✅ Log envoyé dans ${logChannel.name}`);
                } catch (error) {
                    console.error('❌ Erreur envoi log:', error);
                }
            } else {
                console.warn('⚠️ Aucun salon de logs trouvé pour la fin de service');
            }

            // Réponse à l'utilisateur
            return interaction.reply({
                embeds: [endEmbed],
                ephemeral: true
            });
        }
    }
};
