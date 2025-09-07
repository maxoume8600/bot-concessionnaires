-- ======================================
-- CONCESSIONNAIRE MONITORING API
-- Pour Discord Bot Monitoring
-- ======================================

local ESX = nil

-- Si tu utilises ESX
if GetResourceState('es_extended') == 'started' then
    ESX = exports["es_extended"]:getSharedObject()
end

-- Si tu utilises QB-Core
local QBCore = nil
if GetResourceState('qb-core') == 'started' then
    QBCore = exports['qb-core']:GetCoreObject()
end

-- ======================================
-- ENDPOINTS HTTP
-- ======================================

-- Endpoint pour récupérer tous les joueurs avec leurs jobs
SetHttpHandler(function(req, res)
    local path = req.path
    local method = req.method

    -- CORS Headers
    res.writeHead(200, {
        ["Content-Type"] = "application/json",
        ["Access-Control-Allow-Origin"] = "*",
        ["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS",
        ["Access-Control-Allow-Headers"] = "Content-Type"
    })

    if method == "OPTIONS" then
        res.send("")
        return
    end

    -- GET /monitoring/players - Liste tous les joueurs avec jobs
    if path == "/monitoring/players" and method == "GET" then
        local players = {}
        
        for _, playerId in ipairs(GetPlayers()) do
            local playerData = getPlayerData(playerId)
            if playerData then
                table.insert(players, playerData)
            end
        end
        
        res.send(json.encode({
            success = true,
            players = players,
            count = #players,
            timestamp = os.time()
        }))
        return
    end

    -- GET /monitoring/dealers - Seulement les vendeurs concessionnaire
    if path == "/monitoring/dealers" and method == "GET" then
        local dealers = {}
        
        for _, playerId in ipairs(GetPlayers()) do
            local playerData = getPlayerData(playerId)
            if playerData and playerData.job and playerData.job.name == "concessionnaire" then
                table.insert(dealers, playerData)
            end
        end
        
        res.send(json.encode({
            success = true,
            dealers = dealers,
            count = #dealers,
            timestamp = os.time()
        }))
        return
    end

    -- GET /monitoring/player/{id} - Données spécifiques d'un joueur
    local playerIdMatch = string.match(path, "^/monitoring/player/(%d+)$")
    if playerIdMatch and method == "GET" then
        local playerData = getPlayerData(playerIdMatch)
        
        if playerData then
            res.send(json.encode({
                success = true,
                player = playerData,
                timestamp = os.time()
            }))
        else
            res.send(json.encode({
                success = false,
                error = "Joueur non trouvé",
                timestamp = os.time()
            }))
        end
        return
    end

    -- GET /monitoring/stats - Statistiques générales
    if path == "/monitoring/stats" and method == "GET" then
        local stats = getServerStats()
        
        res.send(json.encode({
            success = true,
            stats = stats,
            timestamp = os.time()
        }))
        return
    end

    -- 404 - Endpoint non trouvé
    res.writeHead(404, {["Content-Type"] = "application/json"})
    res.send(json.encode({
        success = false,
        error = "Endpoint non trouvé",
        available_endpoints = {
            "/monitoring/players",
            "/monitoring/dealers", 
            "/monitoring/player/{id}",
            "/monitoring/stats"
        }
    }))
end)

-- ======================================
-- FONCTIONS UTILITAIRES
-- ======================================

function getPlayerData(playerId)
    local player = GetPlayerName(playerId)
    if not player then
        return nil
    end

    local playerData = {
        id = tonumber(playerId),
        name = player,
        steam = GetPlayerIdentifier(playerId, 0) or "unknown",
        license = GetPlayerIdentifier(playerId, 1) or "unknown",
        ping = GetPlayerPing(playerId),
        endpoint = GetPlayerEndpoint(playerId),
        job = {
            name = "unemployed",
            label = "Sans emploi", 
            grade = 0,
            grade_name = "employee",
            grade_label = "Employé",
            grade_salary = 0
        }
    }

    -- Récupérer le job selon le framework
    if ESX then
        local xPlayer = ESX.GetPlayerFromId(playerId)
        if xPlayer then
            playerData.job = {
                name = xPlayer.job.name,
                label = xPlayer.job.label,
                grade = xPlayer.job.grade,
                grade_name = xPlayer.job.grade_name,
                grade_label = xPlayer.job.grade_label,
                grade_salary = xPlayer.job.grade_salary or 0
            }
            
            -- Ajouter position si disponible
            local coords = GetEntityCoords(GetPlayerPed(playerId))
            playerData.position = {
                x = coords.x,
                y = coords.y,
                z = coords.z
            }
        end
        
    elseif QBCore then
        local Player = QBCore.Functions.GetPlayer(tonumber(playerId))
        if Player then
            playerData.job = {
                name = Player.PlayerData.job.name,
                label = Player.PlayerData.job.label,
                grade = Player.PlayerData.job.grade.level,
                grade_name = Player.PlayerData.job.grade.name,
                grade_label = Player.PlayerData.job.grade.name,
                grade_salary = Player.PlayerData.job.payment or 0
            }
            
            local coords = GetEntityCoords(GetPlayerPed(playerId))
            playerData.position = {
                x = coords.x,
                y = coords.y,  
                z = coords.z
            }
        end
    end

    return playerData
end

function getServerStats()
    local players = GetPlayers()
    local dealerCount = 0
    local totalPlayers = #players
    
    -- Compter les vendeurs
    for _, playerId in ipairs(players) do
        local playerData = getPlayerData(playerId)
        if playerData and playerData.job and playerData.job.name == "concessionnaire" then
            dealerCount = dealerCount + 1
        end
    end
    
    return {
        total_players = totalPlayers,
        dealers_online = dealerCount,
        server_name = GetConvar("sv_hostname", "Serveur FiveM"),
        max_players = GetConvarInt("sv_maxclients", 32),
        uptime = os.time() - GetGameTimer() / 1000
    }
end

-- Export des fonctions
exports('getDealerPlayers', function()
    local dealers = {}
    for _, playerId in ipairs(GetPlayers()) do
        local playerData = getPlayerData(playerId)
        if playerData and playerData.job and playerData.job.name == "concessionnaire" then
            table.insert(dealers, playerData)
        end
    end
    return dealers
end)

exports('getPlayerJob', function(playerId)
    local playerData = getPlayerData(playerId)
    return playerData and playerData.job or nil
end)

exports('getPlayerData', getPlayerData)

-- ======================================
-- ÉVÉNEMENTS
-- ======================================

-- Event quand un joueur rejoint
AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)
    local source = source
    print("[MONITORING] Joueur en connexion: " .. name .. " (ID: " .. source .. ")")
end)

-- Event quand un joueur part
AddEventHandler('playerDropped', function(reason)
    local source = source
    local name = GetPlayerName(source) or "Inconnu"
    print("[MONITORING] Joueur déconnecté: " .. name .. " (Raison: " .. reason .. ")")
end)

-- ======================================
-- INITIALISATION
-- ======================================

Citizen.CreateThread(function()
    print("^2[MONITORING]^0 API de monitoring démarrée")
    print("^3[MONITORING]^0 Endpoints disponibles:")
    print("^3[MONITORING]^0   - GET /monitoring/players")
    print("^3[MONITORING]^0   - GET /monitoring/dealers") 
    print("^3[MONITORING]^0   - GET /monitoring/player/{id}")
    print("^3[MONITORING]^0   - GET /monitoring/stats")
end)

-- Commande pour tester l'API
RegisterCommand('monitoring:test', function(source, args)
    if source == 0 then -- Console seulement
        print("=== TEST API MONITORING ===")
        
        local dealers = exports[GetCurrentResourceName()]:getDealerPlayers()
        print("Vendeurs concessionnaire connectés: " .. #dealers)
        
        for _, dealer in pairs(dealers) do
            print(("  - %s (ID: %d) - Grade: %s"):format(
                dealer.name, 
                dealer.id, 
                dealer.job.grade_label
            ))
        end
    end
end, true)

-- ======================================
-- WEBHOOK DISCORD (Optionnel)
-- ======================================

local DISCORD_WEBHOOK = GetConvar("monitoring_discord_webhook", "")

function sendDiscordLog(title, description, color)
    if DISCORD_WEBHOOK == "" then return end
    
    local embed = {
        {
            ["title"] = title,
            ["description"] = description,
            ["color"] = color or 3447003,
            ["timestamp"] = os.date("!%Y-%m-%dT%H:%M:%S"),
            ["footer"] = {
                ["text"] = "Monitoring FiveM"
            }
        }
    }
    
    PerformHttpRequest(DISCORD_WEBHOOK, function(err, text, headers) end, 'POST', json.encode({
        username = "Monitoring Bot",
        embeds = embed
    }), { ['Content-Type'] = 'application/json' })
end

-- Log des connexions/déconnexions de vendeurs
AddEventHandler('playerConnecting', function()
    local source = source
    Citizen.Wait(5000) -- Attendre que le joueur soit complètement chargé
    
    local playerData = getPlayerData(source)
    if playerData and playerData.job and playerData.job.name == "concessionnaire" then
        sendDiscordLog(
            "🟢 Vendeur Connecté",
            ("**%s** vient de se connecter en tant que %s"):format(
                playerData.name,
                playerData.job.grade_label
            ),
            65280 -- Vert
        )
    end
end)

AddEventHandler('playerDropped', function()
    local source = source
    local name = GetPlayerName(source) or "Inconnu"
    
    -- On ne peut plus récupérer le job du joueur déconnecté
    -- Mais on peut logger quand même
    sendDiscordLog(
        "🔴 Joueur Déconnecté", 
        ("**%s** s'est déconnecté"):format(name),
        16711680 -- Rouge
    )
end)
