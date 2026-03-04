const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let globalSupabase = null;

/**
 * Inicializa el cliente global de Supabase (solo para logs o health check)
 */
async function initDB() {
    if (globalSupabase) return globalSupabase;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[DB] ERROR: Supabase credentials not found in .env');
        throw new Error('Supabase credentials missing');
    }

    globalSupabase = createClient(supabaseUrl, supabaseKey);
    console.log('[DB] Supabase client initialized successfully');
    return globalSupabase;
}

/**
 * Crea un cliente Supabase autenticado usando el token del usuario
 * @param {string} token - JWT del usuario
 */
function getAuthClient(token) {
    if (!token) return globalSupabase;

    return createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
}

/**
 * CRUD para Viajes
 */
const Trips = {
    async upsert(trip, client = globalSupabase) {
        // Nota: Con Auth Client, no necesitamos pasar user_id explícitamente si usamos RLS y auth.uid()
        // Pero lo mantenemos para consistencia si el objeto ya lo trae
        const { data, error } = await client
            .from('trips')
            .upsert({
                id: trip.id,
                user_id: trip.user_id, // Puede ser null si el cliente lo infiere
                destination: trip.destination,
                destination_country: trip.destinationCountry,
                start_date: trip.startDate,
                end_date: trip.endDate,
                budget_limit: trip.totalBudget || 0,
                status: trip.status || 'active'
            }, { onConflict: 'id' });

        if (error) console.error('[DB] Error upserting trip:', error);
        return data;
    },
    async get(id, client = globalSupabase) {
        const { data, error } = await client
            .from('trips')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') console.error('[DB] Error getting trip:', error);
        return data;
    }
};

/**
 * CRUD para Gastos
 */
const Expenses = {
    async add(tripId, expense, client = globalSupabase) {
        const id = expense.id || `expense-${Date.now()}`;

        // Get user_id from authenticated client for RLS
        const { data: { user } } = await client.auth.getUser();
        if (!user) {
            console.error('[DB] No authenticated user for expense insert');
            return null;
        }

        const { data, error } = await client
            .from('expenses')
            .insert({
                id: id,
                trip_id: tripId,
                user_id: user.id,
                amount: expense.amount,
                description: expense.description,
                category: expense.category,
                timestamp: expense.timestamp || new Date().toISOString()
            });

        if (error) console.error('[DB] Error adding expense:', error);
        return id;
    },
    async getAll(tripId, client = globalSupabase) {
        const { data, error } = await client
            .from('expenses')
            .select('*')
            .eq('trip_id', tripId)
            .order('timestamp', { ascending: false });

        if (error) console.error('[DB] Error getting expenses:', error);
        return data || [];
    }
};

/**
 * CRUD para Actividades
 */
const Activities = {
    async upsert(tripId, activity, client = globalSupabase) {
        const id = activity.id || `act-${Date.now()}`;

        // Get user_id from authenticated client for RLS
        const { data: { user } } = await client.auth.getUser();
        if (!user) {
            console.error('[DB] No authenticated user for activity upsert');
            return null;
        }

        // Check for duplicates (same date, time, and title)
        const { data: existingActivities } = await client
            .from('activities')
            .select('id')
            .eq('trip_id', tripId)
            .eq('date', activity.date)
            .eq('time', activity.time)
            .eq('title', activity.title);

        if (existingActivities && existingActivities.length > 0) {
            console.log('[DB] Duplicate activity detected, skipping:', activity.title, activity.date, activity.time);
            return existingActivities[0]; // Return existing activity instead of creating duplicate
        }

        const activityData = {
            id: id,
            trip_id: tripId,
            user_id: user.id,
            date: activity.date,
            time: activity.time,
            title: activity.title,
            description: activity.description,
            location: activity.location,
            duration: activity.duration,
            category: activity.category,
            estimated_cost: activity.estimated_cost || 0,
            completed: activity.completed ? true : false
        };

        console.log('[DB] Upserting activity:', JSON.stringify(activityData, null, 2));

        const { data, error } = await client
            .from('activities')
            .upsert(activityData, { onConflict: 'id' });

        if (error) {
            console.error('[DB] Error upserting activity:', error);
            console.error('[DB] Activity data was:', activityData);
        } else {
            console.log('[DB] Activity upserted successfully:', id);
        }
        return id;
    },
    async getAll(tripId, client = globalSupabase) {
        const { data, error } = await client
            .from('activities')
            .select('*')
            .eq('trip_id', tripId)
            .order('date', { ascending: true })
            .order('time', { ascending: true });

        if (error) console.error('[DB] Error getting activities:', error);
        return data || [];
    },
    async update(tripId, activityTitle, updates, client = globalSupabase) {
        // Buscar la actividad por título y ID de viaje
        const { data: activities } = await client
            .from('activities')
            .select('*')
            .eq('trip_id', tripId)
            .ilike('title', `%${activityTitle}%`)
            .limit(1);

        if (!activities || activities.length === 0) {
            console.error('[DB] Activity not found:', activityTitle);
            return null;
        }

        const activity = activities[0];
        const { data, error } = await client
            .from('activities')
            .update(updates)
            .eq('id', activity.id);

        if (error) console.error('[DB] Error updating activity:', error);
        return activity.id;
    },
    async delete(tripId, activityTitle, client = globalSupabase) {
        const { data: activities } = await client
            .from('activities')
            .select('*')
            .eq('trip_id', tripId)
            .ilike('title', `%${activityTitle}%`)
            .limit(1);

        if (!activities || activities.length === 0) {
            console.error('[DB] Activity not found:', activityTitle);
            return false;
        }

        const { error } = await client
            .from('activities')
            .delete()
            .eq('id', activities[0].id);

        if (error) {
            console.error('[DB] Error deleting activity:', error);
            return false;
        }
        return true;
    }
};

/**
 * CRUD para Preferencias
 */
const UserPreferences = {
    async add(category, preference, client = globalSupabase) {
        // RLS rellenará user_id automáticamente al insertar si usamos el cliente autenticado
        // Pero necesitamos pasar user_id explícitamente si la tabla lo requiere y no tiene default
        // Con RLS policy 'active', auth.uid() se usa para la validación/check.
        // Lo mejor es dejar que Supabase lo maneje o inyectarlo si tenemos decoded token.
        // Asumiendo cliente autenticado, insertamos sin user_id explícito y dejamos que default o trigger lo maneje? 
        // No, postgres no auto-rellena user_id desde auth.uid() automáticamente a menos que haya default.
        // PERO, podemos obtener el usuario del cliente.

        const { data: { user } } = await client.auth.getUser();
        if (!user) {
            console.error('[DB] No authenticated user found for preference insertion');
            return null;
        }

        const { data, error } = await client
            .from('user_preferences')
            .insert({
                user_id: user.id,
                category: category,
                preference: preference
            });

        if (error) console.error('[DB] Error adding preference:', error);
        return data;
    },
    async getAll(client = globalSupabase) {
        // RLS filtrará automáticamente por auth.uid()
        const { data, error } = await client
            .from('user_preferences')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('[DB] Error getting preferences:', error);
        return data || [];
    }
};

module.exports = {
    initDB,
    getAuthClient,
    Trips,
    Expenses,
    Activities,
    UserPreferences
};
