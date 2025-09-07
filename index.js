const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const FiveMSync = require('./utils/fivemSync');
const PlayerMonitoring = require('./utils/playerMonitoring');
const PresenceMonitor = require('./utils/presenceMonitor');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Collections pour stocker les commandes et données
client.commands = new Collection();
client.vehicules = new Collection();
client.clients = new Collection();

// Ajouter une méthode pour recharger les véhicules
client.loadVehicules = function() {
    return new Promise((resolve, reject) => {
        try {
            // Vider la collection actuelle
            this.vehicules.clear();
            
            // Supprimer le cache du require
            const vehiculesPath = require.resolve('./data/vehicules.json');
            delete require.cache[vehiculesPath];
            
            // Recharger les véhicules depuis le fichier JSON
            const vehiculesData = require('./data/vehicules.json');
            vehiculesData.forEach(vehicule => {
                this.vehicules.set(vehicule.id, vehicule);
            });
            
            console.log(`🔄 ${this.vehicules.size} véhicules rechargés depuis vehicules.json`);
            resolve({ count: this.vehicules.size });
        } catch (error) {
            console.error('❌ Erreur rechargement véhicules:', error);
            reject(error);
        }
    });
};

// Initialiser le système de synchronisation FiveM
client.fivemSync = new FiveMSync(client);

// Initialiser le système de monitoring des joueurs
client.playerMonitoring = new PlayerMonitoring(client);

// Initialiser le monitoring de présence en temps réel
client.presenceMonitor = new PresenceMonitor(client);

// Chargement des commandes
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    try {
        const command = require(join(__dirname, 'commands', file));
        if (command.data && command.data.name) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Commande chargée: ${command.data.name}`);
        } else {
            console.warn(`⚠️ La commande ${file} n'a pas de propriété data ou name`);
        }
    } catch (error) {
        console.error(`❌ Erreur lors du chargement de ${file}:`, error);
    }
}

// Chargement des événements
const eventFiles = readdirSync(join(__dirname, 'events')).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(join(__dirname, 'events', file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Gestion des erreurs
client.on('error', console.error);
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Tâche de vérification du règlement (toutes les 30 minutes)
setInterval(async () => {
    try {
        await checkServiceCompliance(client);
    } catch (error) {
        console.error('❌ Erreur vérification règlement:', error);
    }
}, 30 * 60 * 1000); // 30 minutes

// Démarrage du bot
client.login(process.env.DISCORD_TOKEN);

/**
 * Fonction de vérification automatique du respect du règlement
 */
async function checkServiceCompliance(client) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
        const servicePath = path.join(__dirname, 'data', 'services.json');
        const data = await fs.readFile(servicePath, 'utf8');
        const serviceData = JSON.parse(data);
        
        const now = Date.now();
        const maxServiceTime = 6 * 60 * 60 * 1000; // 6 heures
        const longServices = [];
        
        // Vérifier les services trop longs
        for (const service of serviceData.activeServices) {
            const serviceDuration = now - service.startTime;
            
            if (serviceDuration > maxServiceTime) {
                longServices.push({
                    ...service,
                    duration: serviceDuration
                });
            }
        }
        
        // Traiter les services trop longs
        for (const longService of longServices) {
            console.log(`⚠️ Service trop long détecté: ${longService.userName} (${Math.round(longService.duration / (60 * 60 * 1000))}h)`);
            
            // Terminer automatiquement le service
            await terminateServiceAutomatically(longService, serviceData);
            
            // Notifier l'utilisateur et les responsables
            await notifyServiceViolation(client, longService, 'SERVICE_TOO_LONG');
            
            // Enregistrer l'infraction
            await recordInfraction(longService.userId, 'SERVICE_TOO_LONG', 'Service automatiquement terminé après 6h');
        }
        
        // Sauvegarder les données mises à jour
        if (longServices.length > 0) {
            await fs.writeFile(servicePath, JSON.stringify(serviceData, null, 2));
            console.log(`✅ ${longServices.length} service(s) trop long(s) terminé(s) automatiquement`);
        }
        
    } catch (error) {
        console.error('❌ Erreur vérification règlement services:', error);
    }
}

/**
 * Termine automatiquement un service
 */
async function terminateServiceAutomatically(service, serviceData) {
    const endTime = Date.now();
    const duration = endTime - service.startTime;
    
    // Déplacer vers l'historique
    const completedService = {
        ...service,
        endTime,
        duration,
        terminatedBy: 'SYSTEM',
        reason: 'SERVICE_TOO_LONG'
    };
    
    if (!serviceData.history) serviceData.history = [];
    serviceData.history.push(completedService);
    
    // Retirer des services actifs
    serviceData.activeServices = serviceData.activeServices.filter(s => s.userId !== service.userId);
}

/**
 * Notifie les violations du règlement
 */
async function notifyServiceViolation(client, service, violationType) {
    try {
        // Notifier l'utilisateur
        const user = await client.users.fetch(service.userId);
        if (user) {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('⚠️ Violation du Règlement Détectée')
                .setColor('#FF6B6B')
                .addFields(
                    { name: 'Type de violation', value: getViolationMessage(violationType), inline: false },
                    { name: 'Action prise', value: 'Service terminé automatiquement', inline: false },
                    { name: 'Durée du service', value: formatDuration(Date.now() - service.startTime), inline: true },
                    { name: 'Conséquences', value: 'Infraction enregistrée dans votre dossier', inline: false }
                )
                .setFooter({ text: 'Consultez /reglement pour éviter les violations' })
                .setTimestamp();
                
            await user.send({ embeds: [embed] });
        }
        
        // Notifier les responsables (canal de log si configuré)
        const logChannelId = process.env.CHANNEL_LOGS;
        if (logChannelId) {
            const channel = client.channels.cache.get(logChannelId);
            if (channel) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setTitle('🚨 Violation Règlement - Action Automatique')
                    .setColor('#FF4444')
                    .addFields(
                        { name: 'Utilisateur', value: `<@${service.userId}> (${service.userName})`, inline: true },
                        { name: 'Violation', value: getViolationMessage(violationType), inline: true },
                        { name: 'Durée service', value: formatDuration(Date.now() - service.startTime), inline: true },
                        { name: 'Action', value: 'Service terminé automatiquement', inline: false }
                    )
                    .setTimestamp();
                    
                await channel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error('❌ Erreur notification violation:', error);
    }
}

/**
 * Enregistre une infraction
 */
async function recordInfraction(userId, type, details) {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        const infractionsPath = path.join(__dirname, 'data', 'infractions.json');
        let infractions = {};
        
        try {
            const data = await fs.readFile(infractionsPath, 'utf8');
            infractions = JSON.parse(data);
        } catch (error) {
            // Fichier n'existe pas encore
        }
        
        if (!infractions[userId]) {
            infractions[userId] = {
                count: 0,
                infractions: [],
                blocked: false
            };
        }
        
        // Ajouter l'infraction
        infractions[userId].count++;
        infractions[userId].infractions.push({
            type,
            details,
            timestamp: Date.now(),
            id: Date.now().toString()
        });
        
        // Déterminer les sanctions selon le nombre d'infractions
        const count = infractions[userId].count;
        if (count >= 3) {
            // 3ème infraction = exclusion (blocage permanent)
            infractions[userId].blocked = true;
            infractions[userId].blockedUntil = null; // Permanent
            infractions[userId].sanction = 'EXCLUSION';
        } else if (count === 2) {
            // 2ème infraction = blocage 24h
            infractions[userId].blocked = true;
            infractions[userId].blockedUntil = Date.now() + (24 * 60 * 60 * 1000);
            infractions[userId].sanction = 'SUSPENSION_24H';
        } else {
            // 1ère infraction = avertissement
            infractions[userId].sanction = 'AVERTISSEMENT';
        }
        
        await fs.writeFile(infractionsPath, JSON.stringify(infractions, null, 2));
        
        console.log(`📝 Infraction enregistrée pour ${userId}: ${type} (${count}/3)`);
        
    } catch (error) {
        console.error('❌ Erreur enregistrement infraction:', error);
    }
}

/**
 * Utilitaires
 */
function getViolationMessage(type) {
    const messages = {
        'SERVICE_TOO_LONG': 'Service dépassant 6 heures consécutives'
    };
    return messages[type] || type;
}

function formatDuration(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}min`;
}
