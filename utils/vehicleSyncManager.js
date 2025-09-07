const fs = require('fs').promises;
const path = require('path');

class VehicleSyncManager {
    constructor() {
        this.luaFilePath = path.join(__dirname, '..', 'vehicles.lua'); // Fichier à la racine du projet
        this.jsonFilePath = path.join(__dirname, '..', 'data', 'vehicules.json');
    }

    /**
     * Lit et parse le fichier vehicles.lua
     */
    async readVehiclesLua() {
        try {
            const luaContent = await fs.readFile(this.luaFilePath, 'utf8');
            return this.parseLuaVehicles(luaContent);
        } catch (error) {
            console.error('❌ Erreur lecture vehicles.lua:', error);
            throw new Error(`Impossible de lire le fichier vehicles.lua: ${error.message}`);
        }
    }

    /**
     * Parse le contenu Lua et extrait les véhicules (format QBCore)
     */
    parseLuaVehicles(luaContent) {
        const vehicles = [];
        
        try {
            console.log('🔄 Parsing du fichier QBCore vehicles.lua...');
            
            // Nettoyer le contenu Lua
            let content = luaContent
                .replace(/--.*$/gm, '') // Supprimer les commentaires
                .replace(/\r\n/g, '\n') // Normaliser les retours à la ligne
                .trim();

            // Chercher la table Vehicles dans le format QBCore
            const vehiclesMatch = content.match(/local\s+Vehicles\s*=\s*\{([\s\S]*)/);
            if (!vehiclesMatch) {
                console.log('❌ Pattern de recherche failed. Contenu du fichier:', content.substring(0, 200));
                throw new Error('Table "local Vehicles" non trouvée dans le fichier QBCore');
            }

            const vehiclesContent = vehiclesMatch[1];
            console.log(`📋 Contenu de la table trouvé (${vehiclesContent.length} caractères)`);
            
            // Parser chaque ligne de véhicule
            // Format: { model = 'xxx', name = 'xxx', brand = 'xxx', price = xxx, category = 'xxx', type = 'xxx', shop = 'xxx' },
            const vehicleLines = vehiclesContent.split('\n').filter(line => {
                const trimmed = line.trim();
                return trimmed.startsWith('{') && trimmed.includes('model') && trimmed.includes('price');
            });

            console.log(`🚗 ${vehicleLines.length} lignes de véhicules détectées`);

            vehicleLines.forEach((line, index) => {
                try {
                    const vehicle = this.parseQBCoreVehicleLine(line);
                    if (vehicle) {
                        vehicle.dateAjout = new Date().toISOString();
                        vehicle.stock = 5; // Stock par défaut
                        vehicles.push(vehicle);
                    }
                } catch (error) {
                    console.warn(`⚠️ Erreur parsing ligne ${index + 1}: ${error.message}`);
                }
            });

            console.log(`✅ ${vehicles.length} véhicules extraits avec succès`);
            return vehicles;

        } catch (error) {
            console.error('❌ Erreur parsing QBCore:', error);
            throw new Error(`Erreur lors du parsing du fichier QBCore: ${error.message}`);
        }
    }

    /**
     * Parse une ligne de véhicule QBCore
     */
    parseQBCoreVehicleLine(line) {
        const vehicle = {};
        
        try {
            // Mapping des propriétés QBCore vers Discord
            const mappings = [
                { qb: 'model', discord: 'id', type: 'string' },
                { qb: 'name', discord: 'nom', type: 'string' },
                { qb: 'brand', discord: 'marque', type: 'string' },
                { qb: 'price', discord: 'prix', type: 'number' },
                { qb: 'category', discord: 'categorie', type: 'string' }
            ];

            mappings.forEach(({ qb, discord, type }) => {
                // Regex pour capturer les valeurs avec guillemets simples ou doubles, ou les nombres
                const regex = new RegExp(`${qb}\\s*=\\s*(?:'([^']*)'|"([^"]*)"|([\\d]+))`, 'i');
                const match = line.match(regex);
                
                if (match) {
                    let value = match[1] || match[2] || match[3]; // string ou nombre
                    
                    if (type === 'number') {
                        value = parseInt(value) || 0;
                    } else if (qb === 'category') {
                        value = this.cleanCategoryName(value);
                    }
                    
                    vehicle[discord] = value;
                }
            });

            // Générer une URL d'image basée sur le modèle
            if (vehicle.id) {
                vehicle.image = `https://docs.fivem.net/vehicles/${vehicle.id}.webp`;
            }

            // Validation des champs requis
            if (!vehicle.id || !vehicle.nom || !vehicle.prix) {
                throw new Error(`Véhicule invalide: model="${vehicle.id}", name="${vehicle.nom}", price="${vehicle.prix}"`);
            }

            return vehicle;

        } catch (error) {
            throw new Error(`Parsing ligne échoué: ${error.message} | Ligne: ${line.substring(0, 100)}...`);
        }
    }

    /**
     * Nettoie le nom de catégorie pour Discord
     */
    cleanCategoryName(category) {
        const categoryMap = {
            'compacts': 'Compactes',
            'sedans': 'Berlines', 
            'suvs': 'SUV',
            'coupes': 'Coupés',
            'muscle': 'Muscle',
            'sports_classics': 'Sports Classiques',
            'sports': 'Sportives',
            'super': 'Super',
            'motorcycles': 'Motos',
            'off_road': 'Tout-terrain',
            'industrial': 'Industriels',
            'utility': 'Utilitaires',
            'vans': 'Fourgonnettes',
            'cycles': 'Vélos',
            'boats': 'Bateaux',
            'helicopters': 'Hélicoptères',
            'planes': 'Avions',
            'service': 'Service',
            'emergency': 'Urgence',
            'military': 'Militaire',
            'commercial': 'Commercial',
            'trains': 'Trains'
        };
        
        return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    /**
     * Synchronise vehicles.lua vers vehicules.json
     */
    async syncLuaToJson() {
        try {
            console.log('🔄 Démarrage synchronisation vehicles.lua -> vehicules.json...');
            
            // Lire les véhicules depuis le fichier Lua
            const vehiclesFromLua = await this.readVehiclesLua();
            
            if (vehiclesFromLua.length === 0) {
                throw new Error('Aucun véhicule trouvé dans le fichier Lua');
            }

            // Lire l'ancien fichier JSON pour préserver certaines données
            let existingVehicles = [];
            try {
                const jsonContent = await fs.readFile(this.jsonFilePath, 'utf8');
                existingVehicles = JSON.parse(jsonContent);
            } catch (error) {
                console.log('ℹ️ Aucun fichier vehicules.json existant, création d\'un nouveau');
            }

            // Merger les données (préserver les données depuis JSON)
            const mergedVehicles = this.mergeVehicleData(vehiclesFromLua, existingVehicles);

            // Écrire le nouveau fichier JSON
            await fs.writeFile(this.jsonFilePath, JSON.stringify(mergedVehicles, null, 2));
            
            console.log(`✅ Synchronisation réussie: ${mergedVehicles.length} véhicules synchronisés`);
            
            return {
                success: true,
                vehiclesCount: mergedVehicles.length,
                newVehicles: mergedVehicles.filter(v => !existingVehicles.find(e => e.id === v.id)).length,
                updatedVehicles: mergedVehicles.filter(v => existingVehicles.find(e => e.id === v.id)).length
            };

        } catch (error) {
            console.error('❌ Erreur synchronisation:', error);
            throw error;
        }
    }

    /**
     * Merge les données des véhicules en préservant certaines informations
     */
    mergeVehicleData(luaVehicles, existingVehicles) {
        const merged = [];

        luaVehicles.forEach(luaVehicle => {
            const existing = existingVehicles.find(v => v.id === luaVehicle.id);
            
            if (existing) {
                // Véhicule existant: mise à jour depuis Lua mais préservation de certaines données
                merged.push({
                    ...luaVehicle,  // Nouvelles données depuis Lua
                    dateAjout: existing.dateAjout || luaVehicle.dateAjout, // Préserver date originale
                    derniereMiseAJour: new Date().toISOString()
                });
            } else {
                // Nouveau véhicule depuis Lua
                merged.push({
                    ...luaVehicle,
                    derniereMiseAJour: new Date().toISOString()
                });
            }
        });

        return merged;
    }

    /**
     * Vérifie si le fichier vehicles.lua existe
     */
    async checkLuaFileExists() {
        try {
            await fs.access(this.luaFilePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Crée un fichier vehicles.lua exemple
     */
    async createExampleLuaFile() {
        const exampleContent = `-- vehicles.lua - Configuration des véhicules du concessionnaire
-- Format pour la synchronisation avec le bot Discord

vehicles = {
    {
        id = "adder",
        nom = "Truffade Adder", 
        marque = "Truffade",
        prix = 1500000,
        categorie = "Super",
        stock = 3,
        image = "https://wiki.rage.mp/images/1/1e/Adder.jpg"
    },
    {
        id = "sultan",
        nom = "Karin Sultan",
        marque = "Karin", 
        prix = 180000,
        categorie = "Sports",
        stock = 2,
        image = "https://wiki.rage.mp/images/b/b4/Sultan.jpg"
    }
    -- Ajoutez vos véhicules ici...
}

return vehicles`;

        await fs.writeFile(this.luaFilePath, exampleContent);
        console.log('✅ Fichier vehicles.lua exemple créé');
    }
}

module.exports = VehicleSyncManager;
