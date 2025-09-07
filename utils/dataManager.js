const fs = require('fs');
const path = require('path');

class DataManager {
    static saveVehicules(client) {
        const vehiculesArray = Array.from(client.vehicules.values());
        fs.writeFileSync(
            path.join(__dirname, '../data/vehicules.json'), 
            JSON.stringify(vehiculesArray, null, 2)
        );
    }

    static saveClients(client) {
        const clientsArray = Array.from(client.clients.values());
        fs.writeFileSync(
            path.join(__dirname, '../data/clients.json'), 
            JSON.stringify(clientsArray, null, 2)
        );
    }

    static loadData(client) {
        // Charger les véhicules
        try {
            const vehiculesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/vehicules.json'), 'utf8'));
            vehiculesData.forEach(vehicule => {
                client.vehicules.set(vehicule.id, vehicule);
            });
        } catch (error) {
            console.log('Aucun fichier de véhicules trouvé');
        }

        // Charger les clients
        try {
            const clientsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/clients.json'), 'utf8'));
            clientsData.forEach(client => {
                client.clients.set(client.id, client);
            });
        } catch (error) {
            console.log('Aucun fichier de clients trouvé');
        }
    }

    static generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
}

module.exports = DataManager;
