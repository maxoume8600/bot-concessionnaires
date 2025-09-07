const { getDiscordId } = require('./envHelper');

// Configuration des canaux
function getChannels() {
    return {
        logs: getDiscordId(process.env.CHANNEL_LOGS),
        catalogue: getDiscordId(process.env.CHANNEL_CATALOGUE),
        stock: getDiscordId(process.env.CHANNEL_STOCK),
        statsPresence: getDiscordId(process.env.CHANNEL_STATS_PRESENCE),
        monitoringService: getDiscordId(process.env.CHANNEL_MONITORING_SERVICE),
        logsPriseService: getDiscordId(process.env.CHANNEL_LOGS_PRISE_SERVICE),
        logsFinService: getDiscordId(process.env.CHANNEL_LOGS_FIN_SERVICE),
        logsAbsences: getDiscordId(process.env.CHANNEL_LOGS_ABSENCES)
    };
}

// Configuration des rôles
function getRoles() {
    return {
        vendeur: getDiscordId(process.env.ROLE_VENDEUR),
        patron: getDiscordId(process.env.ROLE_PATRON),
        client: getDiscordId(process.env.ROLE_CLIENT)
    };
}

module.exports = {
    getChannels,
    getRoles
};
