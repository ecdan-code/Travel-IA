const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const dbService = require('./database');
const { createClient } = require('@supabase/supabase-js');
const apiUsageTracker = require('./apiUsageTracker');

dotenv.config();

// Initialize Database
dbService.initDB().catch(err => {
    console.error('[DB] Failed to initialize:', err);
});

// Global Error Handlers
process.on('uncaughtException', (err) => {
    if (err.code === 'EPIPE') return; // Ignore broken pipes to stdout/stderr
    const msg = `[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${err.message}\nStack: ${err.stack}\n`;
    try {
        console.error(msg);
        fs.appendFileSync('chat_errors.log', msg);
    } catch (e) {
        // Fallback if filesystem is also failing
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    const msg = `[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason}\n`;
    console.error(msg);
    fs.appendFileSync('chat_errors.log', msg);
});

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase for auth verification
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Google Places API Helper
async function searchNearbyPlaces(location, type, keyword) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const radius = 5000; // 5km radius

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&keyword=${keyword}&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Track API usage
        apiUsageTracker.trackPlacesSearch();

        if (data.status === 'OK' && data.results.length > 0) {
            // Return top 3 results
            return data.results.slice(0, 3).map(place => ({
                name: place.name,
                address: place.vicinity,
                rating: place.rating || 'N/A',
                priceLevel: place.price_level ? '$'.repeat(place.price_level) : 'N/A',
                location: place.geometry.location
            }));
        }
        return [];
    } catch (error) {
        console.error('[Places API] Error:', error);
        return [];
    }
}

// Middleware to extract auth token
async function extractAuthToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        req.authToken = authHeader.replace('Bearer ', '');
    } else {
        req.authToken = null;
    }

    next();
}

// Apply auth middleware to all routes
app.use(extractAuthToken);

// Health check endpoint
app.get('/api/ping', (req, res) => res.json({ status: 'ok', time: new Date() }));

// API usage stats endpoint
app.get('/api/usage-stats', (req, res) => {
    const stats = apiUsageTracker.getUsage();
    res.json(stats);
});

const PORT = process.env.PORT || 5000;

// Gemini Configuration
const MODEL_NAME = "gemini-flash-latest";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSy_MOCK_KEY");
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

console.log(`[INIT] Using model: ${MODEL_NAME}`);

if (process.env.GEMINI_API_KEY) {
    console.log(`[INIT] API Key loaded (starts with: ${process.env.GEMINI_API_KEY.substring(0, 7)}...)`);
} else {
    console.log(`[INIT] WARNING: No API Key found in .env`);
}

const fetch = require('node-fetch');

// Map search query to OSM tags
const getOSMTags = (query) => {
    const q = query.toLowerCase();
    if (q.includes('cafe')) return '["amenity"~"cafe"]';
    if (q.includes('comida') || q.includes('restaurante') || q.includes('cenar') || q.includes('comer')) return '["amenity"~"restaurant|fast_food|food_court"]';
    if (q.includes('museo') || q.includes('cultura')) return '["tourism"~"museum|gallery|arts_centre"]';
    if (q.includes('hotel') || q.includes('hospedaje')) return '["tourism"~"hotel|hostel|guest_house"]';
    if (q.includes('parque') || q.includes('naturaleza')) return '["leisure"~"park|garden|nature_reserve"]';
    if (q.includes('compras') || q.includes('tienda') || q.includes('mall')) return '["shop"~"mall|department_store|supermarket"]';
    if (q.includes('bar') || q.includes('fiesta') || q.includes('copas')) return '["amenity"~"bar|pub|nightclub"]';
    return '["amenity"]'; // Fallback to general amenities
};

async function fetchRealPlaces(lat, lng, query, radius = 3000) {
    const tags = query ? getOSMTags(query) : '["amenity"~"restaurant|cafe|bar|museum|tourist_attraction"]';

    // Overpass QL query
    const overpassQuery = `
        [out:json][timeout:25];
        (
          node${tags}(around:${radius},${lat},${lng});
          way${tags}(around:${radius},${lat},${lng});
          relation${tags}(around:${radius},${lat},${lng});
        );
        out center;
    `;

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(overpassQuery)}`
        });
        const data = await response.json();

        return (data.elements || []).map(el => ({
            name: el.tags.name || "Lugar sin nombre",
            lat: el.lat || (el.center && el.center.lat),
            lng: el.lon || (el.center && el.center.lon),
            category: el.tags.amenity || el.tags.tourism || el.tags.leisure || "Punto de interés",
            address: el.tags["addr:street"] ? `${el.tags["addr:street"]} ${el.tags["addr:housenumber"] || ""}` : null
        })).filter(p => p.name !== "Lugar sin nombre").slice(0, 10);
    } catch (e) {
        console.error("OSM Fetch Error:", e);
        return [];
    }
}

// Endpoint to get AI suggestions based on location
app.post('/api/suggest', async (req, res) => {
    const { location, time, state, preferences, searchQuery } = req.body;

    // 1. Fetch Real Places from OSM
    const realPlaces = await fetchRealPlaces(location.lat, location.lng, searchQuery);
    console.log(`[OSM] Found ${realPlaces.length} real places for query: "${searchQuery}"`);

    // 1. Check Cache
    let cacheKey = null;
    if (location) {
        const roundedLat = location.lat.toFixed(2);
        const roundedLng = location.lng.toFixed(2);
        // Include search query in cache key
        const queryPart = searchQuery ? `_q:${searchQuery.toLowerCase()}` : '';
        cacheKey = `${roundedLat},${roundedLng}${queryPart}`;

        const cached = suggestionCache.get(cacheKey);
        // Extended cache for search results (30 mins)
        if (cached && (Date.now() - cached.timestamp < (searchQuery ? 1800000 : CACHE_TTL))) {
            console.log(`[CACHE HIT] ${searchQuery ? 'Search' : 'Proactive'} results for ${cacheKey}`);
            return res.json(cached.data);
        }
    }

    const jsonStructure = `
        {
          "suggestions": [
            { 
              "name": "Nombre exacto del lugar", 
              "reason": "Por qué ir ahora (proactivo)", 
              "price_range": "Rango en $ MXN",
              "transport": [
                { "mode": "caminando", "time": "X min", "cost": "Gratis" }
              ],
              "eta": "X min",
              "category": "comida, cultura, etc.",
              "lat": latitud_precisa,
              "lng": longitud_precisa,
              "details": "Dato extra útil"
            }
          ]
        }
    `;

    const prompt = searchQuery
        ? `
        Eres un asistente de viajes experto. 
        El usuario está en coordenadas: ${location.lat}, ${location.lng}.
        Hora actual: ${time}.
        El usuario está buscando específicamente: "${searchQuery}"
        
        AQUÍ TIENES UNA LISTA DE LUGARES REALES ENCONTRADOS CERCA (OpenStreetMap):
        ${JSON.stringify(realPlaces)}
        
        INSTRUCCIONES:
        1. Elige los 3-5 mejores lugares de esa lista que coincidan con la búsqueda.
        2. Si la lista está VACÍA o no hay suficientes, busca en tu conocimiento interno otros 3 lugares REALES que sepas que existen en esa zona específica (${location.lat}, ${location.lng}).
        3. Para cada uno, mantén sus COORDENADAS ORIGINALES (si vienen de la lista) o COORDENADAS PRECISAS (si son de tu conocimiento).
        4. Explica brevemente por qué es una buena opción basado en la ubicación.
        5. Calcula el transporte aproximado (caminando/auto) desde ${location.lat}, ${location.lng}.
        
        IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido con esta estructura: ${jsonStructure}
        `
        : `
        Eres un asistente de viajes proactivo de clase mundial. 
        El usuario está actualmente en coordenadas: ${location.lat}, ${location.lng}. 
        Hora actual: ${time}.
        Estado: ${state}.
        Preferencias del usuario: ${preferences}.
 
        AQUÍ TIENES UNA LISTA DE LUGARES REALES ENCONTRADOS CERCA (OpenStreetMap):
        ${JSON.stringify(realPlaces)}

        INSTRUCCIONES:
        1. Basado en su ubicación y sus intereses (${preferences}), elige los 5 mejores lugares de la lista real.
        2. Si no hay suficientes lugares en la lista, busca en tu conocimiento interno otros 2 lugares REALES que sepas que existen en esa zona específica (${location.lat}, ${location.lng}).
        3. Para cada uno, mantén las COORDENADAS PRECISAS.
        4. IMPORTANTE: Todos los precios deben estar en PESOS MEXICANOS (MXN) usando el símbolo $.

        IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido con esta estructura: ${jsonStructure}
    `;

    try {
        console.time('[API] Overall Suggestion Time');
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "AIzaSy_REPLACE_ME") {
            throw new Error("API Key no configurada");
        }

        console.log(`[AI] Sending request to Gemini... Query: "${searchQuery || 'Proactive'}"`);
        console.time('[AI] Gemini Request');

        // Add timeout wrapper (25 seconds)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI request timeout')), 25000)
        );

        const aiPromise = model.generateContent(prompt);
        const result = await Promise.race([aiPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();

        console.timeEnd('[AI] Gemini Request');
        console.log(`[AI] Response received. First 100 chars: ${text.substring(0, 100)}...`);

        // Better JSON extraction - handles markdown code blocks
        let jsonData;
        try {
            const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                jsonData = JSON.parse(codeBlockMatch[1].trim());
            } else {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                jsonData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
            }
        } catch (jsonErr) {
            console.error("[AI] JSON Parsing failed. Raw Text:", text);
            throw new Error("Error procesando la respuesta de la IA");
        }

        console.log(`[AI] Successfully parsed ${jsonData.suggestions ? jsonData.suggestions.length : 0} suggestions.`);
        console.timeEnd('[API] Overall Suggestion Time');

        if (cacheKey && jsonData.suggestions && jsonData.suggestions.length > 0) {
            console.log(`[CACHE MISS] Saving new results for ${cacheKey}`);
            suggestionCache.set(cacheKey, {
                data: jsonData,
                timestamp: Date.now()
            });
        }

        res.json(jsonData);
    } catch (error) {
        console.error("AI Error:", error.message);

        // Detect Quota/Rate Limit Errors
        if (error.message?.includes('429') || error.message?.includes('Quota') || error.message?.includes('Rate limit')) {
            return res.json({
                suggestions: [],
                error: "QUOTA_EXCEEDED",
                message: "Se ha alcanzado el límite de uso de la IA (Quota). Intenta de nuevo en unos minutos o mañana."
            });
        }

        // Fallback robusto con coordenadas relativas al usuario
        res.json({
            suggestions: [
                {
                    name: "Templo Histórico Local",
                    reason: "Punto cultural icónico cerca de ti.",
                    price_range: "Gratis - $50",
                    transport: [{ mode: "caminando", time: "8 min", cost: "Gratis" }],
                    eta: "8 min", category: "cultura",
                    lat: location.lat + 0.003, lng: location.lng + 0.002,
                    details: "Cierra a las 17:00. Ideal para fotos al atardecer."
                },
                {
                    name: "Restaurante Local",
                    reason: "Plato local recomendado por viajeros.",
                    price_range: "$80 - $150",
                    transport: [{ mode: "caminando", time: "4 min", cost: "Gratis" }],
                    eta: "4 min", category: "comida",
                    lat: location.lat - 0.001, lng: location.lng + 0.001,
                    details: "Suele tener poca fila a esta hora."
                },
                {
                    name: "Estación de Transporte",
                    reason: "Mejor punto para moverte a otras zonas.",
                    price_range: "Varía",
                    transport: [{ mode: "taxi", time: "3 min", cost: "$60" }],
                    eta: "3 min", category: "transporte",
                    lat: location.lat + 0.001, lng: location.lng - 0.002,
                    details: "Conexión directa con transporte público."
                }
            ]
        });
    }
});


// Endpoint to generate itinerary with AI
app.post('/api/itinerary/generate', async (req, res) => {
    const { destination, destinationCountry, startDate, endDate, interests, budget, isInternational } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const prompt = `Eres un experto planificador de viajes. Crea un itinerario detallado día por día para ${destination}, ${destinationCountry}. Duración: ${days} días. Intereses: ${interests.join(', ')}. Presupuesto: ${budget}. Responde en JSON con estructura: { "days": [{"date": "YYYY-MM-DD", "dayNumber": 1, "activities": [{"time": "09:00", "title": "...", "description": "...", "location": "...", "duration": 120, "category": "cultura", "estimatedCost": 500}]}]}`;
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "AIzaSy_REPLACE_ME") throw new Error("No API Key");

        // Add timeout wrapper (15 seconds)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI request timeout')), 15000)
        );

        const aiPromise = model.generateContent(prompt);
        const result = await Promise.race([aiPromise, timeoutPromise]);
        const text = result.response.text();

        // Better JSON extraction
        let jsonData;
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonData = JSON.parse(codeBlockMatch[1].trim());
        } else {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            jsonData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
        }

        let totalCost = 0;
        jsonData.days.forEach(day => { day.activities.forEach(activity => { totalCost += activity.estimatedCost || 0; }); });
        res.json({ itinerary: { ...jsonData, id: `itinerary-${Date.now()}`, generatedAt: new Date().toISOString(), totalEstimatedCost: totalCost } });
    } catch (error) {
        console.error("Itinerary Error:", error.message);
        const fallback = { id: `itinerary-${Date.now()}`, generatedAt: new Date().toISOString(), totalEstimatedCost: 0, days: [] };
        for (let i = 0; i < days; i++) {
            const date = new Date(start); date.setDate(start.getDate() + i);
            fallback.days.push({ date: date.toISOString().split('T')[0], dayNumber: i + 1, activities: [{ time: '09:00', title: i === 0 ? 'Llegada' : 'Exploración', description: `Explora ${destination}`, location: destination, duration: 120, category: 'cultura', estimatedCost: budget === 'bajo' ? 200 : budget === 'medio' ? 400 : 600 }] });
            fallback.totalEstimatedCost += fallback.days[i].activities[0].estimatedCost;
        }
        res.json({ itinerary: fallback });
    }
});

// Endpoint for AI chat conversation
app.post('/api/chat', async (req, res) => {
    const logData = {
        msg: req.body.message?.substring(0, 20),
        historyLength: req.body.conversationHistory?.length,
        hasContext: !!req.body.tripContext
    };

    try {
        console.log(`[CHAT] Request received: "${logData.msg}..."`);
    } catch (e) { /* ignore EPIPE */ }

    fs.appendFileSync('chat_errors.log', `[${new Date().toISOString()}] Incoming Request: ${JSON.stringify(logData)}\n`);

    const { message, conversationHistory, tripContext, currentLocation, clientDate, expenseContext } = req.body;

    // Create authenticated DB client for this request
    const authClient = dbService.getAuthClient(req.authToken);

    // Get user info to ensure authentication
    const { data: { user } } = await authClient.auth.getUser();

    // Sync current trip data to database (Ensures DB is up to date with Client's localStorage)
    if (tripContext?.id && user) {
        // Debemos pasar user_id explícitamente si el objeto tripContext no lo tiene, o dejar que upsert lo maneje
        const tripToSync = { ...tripContext, user_id: user.id };
        dbService.Trips.upsert(tripToSync, authClient).catch(e => console.error("[DB] Sync Trip Error:", e));

        // Sync activities if they exist in request
        if (req.body.itinerary?.days) {
            req.body.itinerary.days.forEach(day => {
                day.activities.forEach(act => {
                    dbService.Activities.upsert(tripContext.id, act, authClient).catch(e => { });
                });
            });
        }
    }

    // Build system instruction
    // Get current date/time - use clientDate if provided, otherwise server date
    const currentDateTime = clientDate ? new Date(clientDate) : new Date();
    const dateString = currentDateTime.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const timeString = currentDateTime.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Simplified system instruction to save tokens
    // IMPORTANT: Calculate dates in local timezone to avoid off-by-one errors
    const today = new Date(currentDateTime.getFullYear(), currentDateTime.getMonth(), currentDateTime.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDateLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const systemInstruction = `Asistente de viaje. SOLO ayuda con el viaje actual.

FECHA ACTUAL: ${dateString}, ${timeString}
- Hoy: ${formatDateLocal(today)}
- Mañana: ${formatDateLocal(tomorrow)}
${currentLocation ? `\nUBICACIÓN: Lat ${currentLocation.lat}, Lng ${currentLocation.lng}` : ''}

Usa formato YYYY-MM-DD para fechas en agregar_actividad.
Consulta itinerario/gastos/preferencias con herramientas cuando sea necesario.
`;

    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "AIzaSy_REPLACE_ME") {
            throw new Error("API Key no configurada");
        }

        // 1. Process history to ensure it's valid for Gemini
        let filteredHistory = [];
        const rawHistory = conversationHistory || [];

        rawHistory.forEach(msg => {
            const currentRole = msg.role === 'user' ? 'user' : 'model';
            if (filteredHistory.length === 0 || currentRole !== filteredHistory[filteredHistory.length - 1].role) {
                filteredHistory.push({
                    role: currentRole,
                    parts: [{ text: msg.content || "" }]
                });
            }
        });

        // Limit history to last 5 items (saves tokens)
        if (filteredHistory.length > 5) {
            filteredHistory = filteredHistory.slice(-5);
            if (filteredHistory[0].role !== 'user') filteredHistory.shift();
        }

        // Ensure history starts with 'user' and ends with 'model'
        if (filteredHistory.length > 0 && filteredHistory[0].role !== 'user') filteredHistory.shift();
        if (filteredHistory.length > 0 && filteredHistory[filteredHistory.length - 1].role !== 'model') filteredHistory.pop();


        // 2. Initialize model with Tools
        const chatModel = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: systemInstruction,
            tools: [
                {
                    functionDeclarations: [
                        {
                            name: "consultar_gastos",
                            description: "Obtiene la lista de todos los gastos registrados en el viaje actual.",
                        },
                        {
                            name: "consultar_itinerario",
                            description: "Obtiene todas las actividades programadas en el itinerario.",
                        },
                        {
                            name: "obtener_resumen_viaje",
                            description: "Obtiene información básica del viaje, fechas y presupuesto total.",
                        },
                        {
                            name: "guardar_preferencia",
                            description: "Guarda un gusto o preferencia del usuario (ej: 'le gusta lo picante', 'prefiere caminar').",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    categoria: { type: "STRING", description: "Categoría del gusto (comida, transporte, ritmo, etc.)" },
                                    preferencia: { type: "STRING", description: "Descripción detallada del gusto o preferencia." }
                                },
                                required: ["categoria", "preferencia"]
                            }
                        },
                        {
                            name: "consultar_preferencias",
                            description: "Recupera todos los gustos y preferencias guardados del usuario.",
                        },
                        {
                            name: "actualizar_actividad",
                            description: "Modifica una actividad existente en el itinerario (cambiar hora, título, descripción, etc.).",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    titulo_actividad: { type: "STRING", description: "Título de la actividad a modificar (ej: 'Desayuno', 'Visita al museo')" },
                                    nueva_hora: { type: "STRING", description: "Nueva hora en formato HH:mm (opcional)" },
                                    nuevo_titulo: { type: "STRING", description: "Nuevo título (opcional)" },
                                    nueva_descripcion: { type: "STRING", description: "Nueva descripción (opcional)" }
                                },
                                required: ["titulo_actividad"]
                            }
                        },
                        {
                            name: "agregar_actividad",
                            description: "Agrega una nueva actividad al itinerario en una fecha y hora específica.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    fecha: { type: "STRING", description: "Fecha de la actividad en formato YYYY-MM-DD (ej: 2026-01-30)" },
                                    hora: { type: "STRING", description: "Hora de la actividad en formato HH:mm (ej: 08:00, 14:30)" },
                                    titulo: { type: "STRING", description: "Título de la actividad (ej: 'Ida a Disney', 'Desayuno')" },
                                    descripcion: { type: "STRING", description: "Descripción detallada de la actividad (opcional)" },
                                    ubicacion: { type: "STRING", description: "Ubicación o lugar de la actividad (opcional)" },
                                    categoria: { type: "STRING", description: "Categoría: cultura, comida, transporte, entretenimiento, etc. (opcional)" }
                                },
                                required: ["fecha", "hora", "titulo"]
                            }
                        },
                        {
                            name: "eliminar_actividad",
                            description: "Elimina una actividad del itinerario.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    titulo_actividad: { type: "STRING", description: "Título de la actividad a eliminar" }
                                },
                                required: ["titulo_actividad"]
                            }
                        },
                        {
                            name: "agregar_gasto",
                            description: "Registra un nuevo gasto del viaje.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    monto: { type: "NUMBER", description: "Monto del gasto en pesos (ej: 500, 150.50)" },
                                    descripcion: { type: "STRING", description: "Descripción del gasto (ej: 'Aguachile', 'Taxi al aeropuerto')" },
                                    categoria: { type: "STRING", description: "Categoría: comida, transporte, actividades, hospedaje, compras, otros" }
                                },
                                required: ["monto", "descripcion"]
                            }
                        },
                        {
                            name: "buscar_lugares",
                            description: "Busca lugares cercanos usando Google Places (restaurantes, cafés, atracciones, etc.)",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    tipo_lugar: { type: "STRING", description: "Tipo de lugar: restaurant, cafe, tourist_attraction, bar, park, museum, etc." },
                                    busqueda: { type: "STRING", description: "Palabra clave para the búsqueda (ej: 'sushi', 'pizza', 'museo arte')" },
                                    latitud: { type: "NUMBER", description: "Latitud (usa UBICACIÓN ACTUAL si no se especifica)" },
                                    longitud: { type: "NUMBER", description: "Longitud (usa UBICACIÓN ACTUAL si no se especifica)" }
                                },
                                required: ["tipo_lugar", "busqueda"]
                            }
                        }
                    ],
                },
            ],
        });

        console.log(`[CHAT] Initializing with ${filteredHistory.length} history items and tools.`);

        const chat = chatModel.startChat({
            history: filteredHistory,
            generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
        });

        console.log(`[CHAT] Sending message: "${message}"`);
        let result = await chat.sendMessage(message);
        let response = await result.response;

        // Handle function calls
        let foundPlaces = []; // Collect places for map display (declared outside if for scope)
        const functionCalls = response.functionCalls();
        if (functionCalls) {
            const toolResponses = [];
            for (const call of functionCalls) {
                console.log(`[TOOL] AI requested: ${call.name}`);
                let data = null;
                if (call.name === "consultar_gastos") data = await dbService.Expenses.getAll(tripContext?.id, authClient);
                else if (call.name === "consultar_itinerario") data = await dbService.Activities.getAll(tripContext?.id, authClient);
                else if (call.name === "obtener_resumen_viaje") data = await dbService.Trips.get(tripContext?.id, authClient);
                else if (call.name === "consultar_preferencias") data = await dbService.UserPreferences.getAll(authClient);
                else if (call.name === "guardar_preferencia") {
                    await dbService.UserPreferences.add(call.args.categoria, call.args.preferencia, authClient);
                    data = { status: "success", message: "Preferencia guardada correctamente" };
                }
                else if (call.name === "actualizar_actividad") {
                    const updates = {};
                    if (call.args.nueva_hora) updates.time = call.args.nueva_hora;
                    if (call.args.nuevo_titulo) updates.title = call.args.nuevo_titulo;
                    if (call.args.nueva_descripcion) updates.description = call.args.nueva_descripcion;

                    const updated = await dbService.Activities.update(tripContext?.id, call.args.titulo_actividad, updates, authClient);
                    data = updated ? { status: "success", message: "Actividad actualizada" } : { status: "error", message: "Actividad no encontrada" };
                }
                else if (call.name === "agregar_actividad") {
                    const newActivity = {
                        id: `activity-${Date.now()}`,
                        date: call.args.fecha,
                        time: call.args.hora,
                        title: call.args.titulo,
                        description: call.args.descripcion || '',
                        location: call.args.ubicacion || '',
                        category: call.args.categoria || 'general',
                        duration: 60 // Default 1 hour
                    };
                    await dbService.Activities.upsert(tripContext?.id, newActivity, authClient);
                    data = { status: "success", message: "Actividad agregada correctamente", activity: newActivity };
                }
                else if (call.name === "eliminar_actividad") {
                    const deleted = await dbService.Activities.delete(tripContext?.id, call.args.titulo_actividad, authClient);
                    data = deleted ? { status: "success", message: "Actividad eliminada" } : { status: "error", message: "Actividad no encontrada" };
                }
                else if (call.name === "agregar_gasto") {
                    const newExpense = {
                        id: `expense-${Date.now()}`,
                        amount: call.args.monto,
                        description: call.args.descripcion,
                        category: call.args.categoria || 'otros',
                        timestamp: new Date().toISOString()
                    };
                    await dbService.Expenses.add(tripContext?.id, newExpense, authClient);
                    data = { status: "success", message: "Gasto registrado correctamente", expense: newExpense };
                }
                else if (call.name === "buscar_lugares") {
                    // Use provided coordinates or fall back to current location
                    const lat = call.args.latitud || currentLocation?.lat;
                    const lng = call.args.longitud || currentLocation?.lng;

                    if (!lat || !lng) {
                        data = {
                            status: "error",
                            message: "No se pudo determinar la ubicación para la búsqueda"
                        };
                    } else {
                        const location = `${lat},${lng}`;
                        const places = await searchNearbyPlaces(location, call.args.tipo_lugar, call.args.busqueda);

                        if (places.length > 0) {
                            data = {
                                status: "success",
                                message: `Encontré ${places.length} lugares:`,
                                places: places
                            };
                        } else {
                            data = {
                                status: "no_results",
                                message: "No encontré lugares cercanos con esos criterios"
                            };
                        }
                    }

                    // Store places for map display
                    if (data.places) {
                        foundPlaces = data.places;
                    }
                }

                console.log(`[TOOL] Executed ${call.name}, result:`, data ? 'success' : 'null');
                toolResponses.push({
                    functionResponse: { name: call.name, response: { content: data } }
                });
            }
            console.log(`[TOOL] Sending ${toolResponses.length} tool responses back to AI...`);
            result = await chat.sendMessage(toolResponses);
            console.log('[TOOL] AI processing response...');
            response = await result.response;
            console.log('[TOOL] AI responded after tools');
        }

        console.log('[CHAT] Extracting text from response...');
        let text;
        try {
            text = response.text();
            console.log('[CHAT] Text extracted, length:', text ? text.length : 0);
            if (!text || text.trim().length === 0) {
                console.error('[CHAT] WARNING: AI returned empty response!');
                text = 'Lo siento, no pude procesar tu solicitud correctamente.';
            }
        } catch (err) {
            console.error('[CHAT] Error extracting text:', err);
            text = 'Error al procesar la respuesta.';
        }

        // Si hubo modified al itinerario, devolver el itinerario actualizado
        let updatedItinerary = null;
        if (functionCalls && tripContext?.id) {
            const modificationTools = ['actualizar_actividad', 'eliminar_actividad', 'agregar_actividad', 'agregar_gasto'];
            const hasModifications = functionCalls.some(call => modificationTools.includes(call.name));

            if (hasModifications) {
                const activities = await dbService.Activities.getAll(tripContext.id, authClient);

                // Convertir actividades a formato de itinerario agrupado por días
                const dayMap = {};
                activities.forEach(act => {
                    if (!dayMap[act.date]) {
                        dayMap[act.date] = [];
                    }
                    dayMap[act.date].push(act);
                });

                // Get sorted dates
                const sortedDates = Object.keys(dayMap).sort();

                // Calculate day number based on trip start date
                const tripStartDate = new Date(tripContext.startDate);

                // Crear estructura de itinerario completa
                updatedItinerary = {
                    id: `itinerary-${tripContext.id}`,
                    tripId: tripContext.id,
                    days: sortedDates.map((date) => {
                        const currentDate = new Date(date);
                        const daysDiff = Math.floor((currentDate - tripStartDate) / (1000 * 60 * 60 * 24));

                        return {
                            date,
                            dayNumber: daysDiff + 1, // +1 because first day is Day 1, not Day 0
                            activities: dayMap[date].sort((a, b) => a.time.localeCompare(b.time))
                        };
                    }),
                    generatedAt: new Date().toISOString(),
                    totalEstimatedCost: activities.reduce((sum, act) => sum + (act.estimated_cost || 0), 0)
                };
            }
        }
        // Estimate token usage (rough: 1 token ≈ 4 chars)
        const estimatedTokens = {
            input: Math.ceil((message.length + JSON.stringify(filteredHistory).length) / 4),
            output: Math.ceil(text.length / 4),
            historyMessages: filteredHistory.length
        };

        // Track Gemini usage persistently
        apiUsageTracker.trackGemini(estimatedTokens.input, estimatedTokens.output);
        const totalUsage = apiUsageTracker.getUsage();
        console.log(`[USAGE] Total: $${totalUsage.costs.total} (${totalUsage.usagePercent}% of $200)`);

        console.log('[CHAT] Sending response to client, text length:', text.length);
        res.json({
            response: text.trim(),
            updatedItinerary: updatedItinerary,
            places: foundPlaces || [],
            tokenUsage: estimatedTokens,
            totalUsage: totalUsage
        });
        console.log('[CHAT] Response sent successfully');
    } catch (error) {
        console.error("Chat Error Details:", error);
        fs.appendFileSync('chat_errors.log', `[${new Date().toISOString()}] Error: ${error.message}\nStack: ${error.stack}\n`);

        let errorMessage = "Lo siento, tuve un problema al procesar tu mensaje.";
        if (error.message?.includes('404')) {
            errorMessage = "Error de configuración de IA (404). El modelo no fue encontrado.";
        } else if (error.message?.includes('Quota') || error.message?.includes('429')) {
            errorMessage = "Límite de mensajes alcanzado. Intenta de nuevo en un momento.";
        } else if (error.message?.includes('role')) {
            errorMessage = "Error de sincronización de roles. Limpiando historial...";
        }

        res.json({ response: errorMessage, error: true });
    }
});

// API Usage Stats Endpoint
app.get('/api/usage', (req, res) => {
    try {
        const usage = apiUsageTracker.getUsage();
        res.json(usage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve client build files (for cloud deployment)
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    // SPA catch-all: any non-API route serves index.html
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
            res.sendFile(path.join(clientBuildPath, 'index.html'));
        }
    });
    console.log(`[INIT] Serving client build from ${clientBuildPath}`);
} else {
    console.log('[INIT] No client build found, running API-only mode');
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
