const { Events, ActivityType } = require('discord.js');
const ServerSetup = require('../utils/serverSetup');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ ${client.user.tag} est maintenant en ligne !`);
        console.log(`📊 Connecté sur ${client.guilds.cache.size} serveur(s)`);
        console.log(`👥 Au service de ${client.users.cache.size} utilisateurs`);
        
        // Statut du bot
        client.user.setActivity('🚗 Gérer le concessionnaire', { 
            type: ActivityType.Playing 
        });
        
        // Chargement des données
        loadData(client);
        
        // Démarrer la synchronisation FiveM
        if (process.env.FIVEM_SERVER_IP) {
            console.log('🔄 Démarrage de la synchronisation FiveM...');
            client.fivemSync.startAutoSync();
        } else {
            console.log('⚠️ Synchronisation FiveM désactivée (pas d\'IP configurée)');
        }
        
        // Envoyer un message de démarrage dans le canal de logs
        sendStartupMessage(client);
        
        // Configuration automatique du serveur si nécessaire - DÉSACTIVÉE
        // setTimeout(async () => {
        //     await checkAndSetupServers(client);
        // }, 5000); // Attendre 5 secondes que tout soit chargé
    },
};

function loadData(client) {
    try {
        // Charger les véhicules depuis le fichier JSON
        const vehiculesData = require('../data/vehicules.json');
        vehiculesData.forEach(vehicule => {
            client.vehicules.set(vehicule.id, vehicule);
        });
        console.log(`📋 ${client.vehicules.size} véhicules chargés`);
    } catch (error) {
        console.log('⚠️ Aucun fichier de véhicules trouvé, création des données par défaut...');
        createDefaultData(client);
    }
}

function createDefaultData(client) {
    // Véhicules par défaut
    const defaultVehicules = [
        {
            id: 'adder',
            nom: 'Truffade Adder',
            marque: 'Truffade',
            prix: 1500000,
            categorie: 'Super',
            stock: 5,
            image: 'https://wiki.rage.mp/images/1/1e/Adder.jpg'
        },
        {
            id: 'sultan',
            nom: 'Karin Sultan',
            marque: 'Karin',
            prix: 180000,
            categorie: 'Sports',
            stock: 10,
            image: 'https://wiki.rage.mp/images/b/b4/Sultan.jpg'
        },
        {
            id: 'elegy',
            nom: 'Annis Elegy RH8',
            marque: 'Annis',
            prix: 240000,
            categorie: 'Sports',
            stock: 8,
            image: 'https://wiki.rage.mp/images/6/66/Elegy.jpg'
        }
    ];
    
    defaultVehicules.forEach(vehicule => {
        client.vehicules.set(vehicule.id, vehicule);
    });
}

/**
 * Vérifier et configurer automatiquement les serveurs
 */
async function checkAndSetupServers(client) {
    console.log('🔍 Vérification de la configuration des serveurs...');
    
    for (const [guildId, guild] of client.guilds.cache) {
        try {
            // Vérifier si le serveur a déjà les canaux concessionnaire
            const hasConcessionnaire = guild.channels.cache.some(channel => 
                channel.name.includes('catalogue-vehicules') || 
                channel.name.includes('concessionnaire')
            );
            
            const hasRoles = guild.roles.cache.some(role => 
                role.name.includes('Vendeur') || 
                role.name.includes('Concessionnaire')
            );
            
            if (!hasConcessionnaire && !hasRoles) {
                console.log(`🏗️ Configuration automatique du serveur: ${guild.name}`);
                
                const setupManager = new ServerSetup(client);
                await setupManager.setupServer(guild);
                
                console.log(`✅ Serveur ${guild.name} configuré automatiquement !`);
                
                // Envoyer un message de bienvenue au propriétaire du serveur
                try {
                    const owner = await guild.fetchOwner();
                    const welcomeEmbed = {
                        title: '🎉 Configuration automatique terminée !',
                        description: `Votre serveur **${guild.name}** a été automatiquement configuré pour le concessionnaire !\n\n` +
                            `**✅ Éléments créés :**\n` +
                            `• 📁 Catégories et canaux organisés\n` +
                            `• 👥 Rôles avec permissions appropriées\n` +
                            `• 🔒 Système de permissions sécurisé\n` +
                            `• 📝 Configuration .env mise à jour\n\n` +
                            `**🚀 Prochaines étapes :**\n` +
                            `1️⃣ Assignez les rôles à votre équipe\n` +
                            `2️⃣ Utilisez \`/catalogue\` pour tester\n` +
                            `3️⃣ Configurez la sync FiveM avec \`/sync\`\n\n` +
                            `*Le concessionnaire est maintenant opérationnel sur votre serveur !*`,
                        color: 0x00FF00,
                        timestamp: new Date().toISOString(),
                        footer: { text: 'Bot Concessionnaire - Configuration automatique' }
                    };
                    
                    await owner.send({ embeds: [welcomeEmbed] });
                } catch (error) {
                    console.log('Impossible d\'envoyer le message au propriétaire');
                }
                
            } else {
                console.log(`ℹ️ Serveur ${guild.name} déjà configuré`);
            }
            
        } catch (error) {
            console.error(`❌ Erreur configuration serveur ${guild.name}:`, error.message);
        }
    }
}

/**
 * Envoie un message de démarrage dans le canal de logs
 */
async function sendStartupMessage(client) {
    try {
        const logChannelId = process.env.CHANNEL_LOGS;
        if (!logChannelId) {
            console.log('⚠️ CHANNEL_LOGS non configuré, pas de logs Discord');
            return;
        }
        
        const channel = client.channels.cache.get(logChannelId);
        if (!channel) {
            console.log(`⚠️ Canal de logs ${logChannelId} introuvable`);
            return;
        }
        
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Concessionnaire - Démarrage')
            .setColor('#00FF00')
            .addFields(
                { name: '✅ Statut', value: 'En ligne et opérationnel', inline: true },
                { name: '📊 Serveurs', value: `${client.guilds.cache.size} serveur(s)`, inline: true },
                { name: '👥 Utilisateurs', value: `${client.users.cache.size} utilisateur(s)`, inline: true },
                { name: '📋 Véhicules', value: `${client.vehicules.size} véhicules chargés`, inline: true },
                { name: '🔄 Sync FiveM', value: process.env.FIVEM_SERVER_IP ? 'Activée' : 'Désactivée', inline: true },
                { name: '⚡ Monitoring', value: 'Surveillance en temps réel active', inline: true }
            )
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Bot Concessionnaire - Système de logs' });
            
        await channel.send({ embeds: [embed] });
        console.log('✅ Message de démarrage envoyé dans le canal de logs');
        
    } catch (error) {
        console.error('❌ Erreur envoi message de démarrage:', error);
    }
}
