-- Configuration des véhicules du concessionnaire
local vehiclesData = {
    ["adder"] = {
        id = "adder",
        name = "Truffade Adder", 
        brand = "Truffade",
        price = 1500000,
        category = "Super",
        stock = 3
    },
    ["sultan"] = {
        id = "sultan",
        name = "Karin Sultan",
        brand = "Karin", 
        price = 180000,
        category = "Sports",
        stock = 8
    },
    ["elegy"] = {
        id = "elegy",
        name = "Annis Elegy RH8",
        brand = "Annis",
        price = 240000, 
        category = "Sports",
        stock = 5
    },
    ["zentorno"] = {
        id = "zentorno",
        name = "Pegassi Zentorno",
        brand = "Pegassi",
        price = 1200000,
        category = "Super", 
        stock = 2
    }
}

-- Endpoint pour récupérer tous les véhicules
RegisterCommand("startvehicleapi", function(source, args, rawCommand)
    if source ~= 0 then return end -- Seulement depuis la console serveur
    
    -- Démarrer le serveur HTTP pour l'API
    SetHttpHandler(function(request, response)
        local path = request.path
        
        if path == "/vehicles" then
            -- Retourner la liste des véhicules
            local vehicles = {}
            for k, v in pairs(vehiclesData) do
                table.insert(vehicles, v)
            end
            
            response.writeHead(200, {
                ["Content-Type"] = "application/json",
                ["Access-Control-Allow-Origin"] = "*"
            })
            response.send(json.encode(vehicles))
            
        elseif path == "/vehicles/stock" then
            -- Retourner seulement les véhicules en stock
            local vehiclesInStock = {}
            for k, v in pairs(vehiclesData) do
                if v.stock > 0 then
                    table.insert(vehiclesInStock, v)
                end
            end
            
            response.writeHead(200, {
                ["Content-Type"] = "application/json",
                ["Access-Control-Allow-Origin"] = "*"
            })
            response.send(json.encode(vehiclesInStock))
            
        elseif string.match(path, "^/vehicles/(.+)$") then
            -- Retourner un véhicule spécifique
            local vehicleId = string.match(path, "^/vehicles/(.+)$")
            local vehicle = vehiclesData[vehicleId]
            
            if vehicle then
                response.writeHead(200, {
                    ["Content-Type"] = "application/json",
                    ["Access-Control-Allow-Origin"] = "*"
                })
                response.send(json.encode(vehicle))
            else
                response.writeHead(404, {
                    ["Content-Type"] = "application/json"
                })
                response.send(json.encode({error = "Vehicle not found"}))
            end
            
        else
            response.writeHead(404, {
                ["Content-Type"] = "application/json"
            })
            response.send(json.encode({error = "Endpoint not found"}))
        end
    end)
    
    print("^2[Concessionnaire API] Serveur HTTP démarré sur le port " .. GetConvar("web_port", "30120"))
    print("^2[Concessionnaire API] Endpoints disponibles:")
    print("^3  GET /vehicles - Tous les véhicules")
    print("^3  GET /vehicles/stock - Véhicules en stock")
    print("^3  GET /vehicles/{id} - Véhicule spécifique")
end, true)

-- Fonction pour mettre à jour le stock d'un véhicule
RegisterNetEvent("concessionnaire:updateStock")
AddEventHandler("concessionnaire:updateStock", function(vehicleId, newStock)
    if vehiclesData[vehicleId] then
        vehiclesData[vehicleId].stock = newStock
        print(string.format("^2[Concessionnaire] Stock mis à jour: %s = %d", vehicleId, newStock))
    end
end)

-- Fonction pour ajouter un véhicule
RegisterNetEvent("concessionnaire:addVehicle")
AddEventHandler("concessionnaire:addVehicle", function(vehicleData)
    vehiclesData[vehicleData.id] = vehicleData
    print(string.format("^2[Concessionnaire] Véhicule ajouté: %s", vehicleData.name))
end)

-- Fonction pour supprimer un véhicule
RegisterNetEvent("concessionnaire:removeVehicle") 
AddEventHandler("concessionnaire:removeVehicle", function(vehicleId)
    if vehiclesData[vehicleId] then
        vehiclesData[vehicleId] = nil
        print(string.format("^2[Concessionnaire] Véhicule supprimé: %s", vehicleId))
    end
end)

-- Commande pour voir les véhicules en console
RegisterCommand("listvehicles", function(source, args, rawCommand)
    if source ~= 0 then return end
    
    print("^3=== Véhicules du concessionnaire ===")
    for k, v in pairs(vehiclesData) do
        print(string.format("^2%s: %s - %d€ (Stock: %d)", k, v.name, v.price, v.stock))
    end
end, true)

-- Auto-start de l'API au démarrage de la resource
Citizen.CreateThread(function()
    Citizen.Wait(1000)
    ExecuteCommand("startvehicleapi")
end)
