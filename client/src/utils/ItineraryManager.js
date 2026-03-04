import API_BASE_URL from './apiConfig';

/**
 * ItineraryManager - Gestor de itinerarios del viaje
 */

class ItineraryManager {
    /**
     * Genera un itinerario usando IA basado en el contexto del viaje
     */
    static async generateItinerary(tripContext) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(`${API_BASE_URL}/api/itinerary/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: tripContext.destination,
                    destinationCountry: tripContext.destinationCountry,
                    startDate: tripContext.startDate,
                    endDate: tripContext.endDate,
                    interests: tripContext.interests,
                    budget: tripContext.budget,
                    isInternational: tripContext.isInternational
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();
            return data.itinerary;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Error generating itinerary:', error);
            // No auto-generar fallback - dejar que el usuario decida
            return null;
        }
    }

    /**
     * Itinerario de respaldo en caso de error de API
     */
    static getFallbackItinerary(tripContext) {
        const days = this.getDaysBetween(tripContext.startDate, tripContext.endDate);

        return {
            id: `itinerary-${Date.now()}`,
            tripId: tripContext.id,
            days: days.map((date, index) => ({
                date: date,
                dayNumber: index + 1,
                activities: [
                    {
                        id: `activity-${index}-1`,
                        time: '09:00',
                        title: index === 0 ? 'Llegada y check-in' : 'Exploración matutina',
                        description: index === 0
                            ? 'Llega al hotel y realiza el check-in'
                            : `Explora ${tripContext.destination}`,
                        location: tripContext.destination,
                        duration: 120,
                        category: index === 0 ? 'logística' : 'cultura',
                        estimatedCost: 0
                    },
                    {
                        id: `activity-${index}-2`,
                        time: '13:00',
                        title: 'Almuerzo local',
                        description: 'Prueba la comida típica de la región',
                        location: tripContext.destination,
                        duration: 90,
                        category: 'comida',
                        estimatedCost: tripContext.budget === 'bajo' ? 150 : tripContext.budget === 'medio' ? 300 : 500
                    },
                    {
                        id: `activity-${index}-3`,
                        time: '16:00',
                        title: 'Actividad  principal',
                        description: 'Visita lugares de interés',
                        location: tripContext.destination,
                        duration: 180,
                        category: tripContext.interests[0] || 'cultura',
                        estimatedCost: tripContext.budget === 'bajo' ? 200 : tripContext.budget === 'medio' ? 400 : 600
                    }
                ]
            })),
            generatedAt: new Date().toISOString(),
            totalEstimatedCost: 0
        };
    }

    /**
     * Obtiene los días entre dos fechas
     */
    static getDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d).toISOString().split('T')[0]);
        }

        return days;
    }

    /**
     * Guarda el itinerario en localStorage
     */
    static saveItinerary(tripId, itinerary) {
        const key = `itinerary_${tripId}`;
        localStorage.setItem(key, JSON.stringify(itinerary));
    }


    /**
     * Carga el itinerario desde localStorage
     */
    static loadItinerary(tripId) {
        const key = `itinerary_${tripId}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }

    /**
     * Carga el itinerario desde Supabase
     */
    static async loadFromSupabase(tripId) {
        try {
            const { supabase } = await import('../utils/supabaseClient');

            const { data: activities, error } = await supabase
                .from('activities')
                .select('*')
                .eq('trip_id', tripId)
                .order('date', { ascending: true })
                .order('time', { ascending: true });

            if (error) {
                console.error('[ItineraryManager] Error loading from Supabase:', error);
                return null;
            }

            if (!activities || activities.length === 0) {
                console.log('[ItineraryManager] No activities found in Supabase');
                return null;
            }

            // Convertir actividades de Supabase a formato de itinerario
            const dayMap = {};
            activities.forEach(act => {
                if (!dayMap[act.date]) {
                    dayMap[act.date] = [];
                }
                dayMap[act.date].push({
                    id: act.id,
                    time: act.time,
                    title: act.title,
                    description: act.description,
                    location: act.location,
                    duration: act.duration,
                    category: act.category,
                    estimatedCost: act.estimated_cost || 0,
                    completed: act.completed || false
                });
            });

            // Get trip to calculate day numbers
            const { data: trip } = await supabase
                .from('trips')
                .select('start_date')
                .eq('id', tripId)
                .single();

            const tripStartDate = trip ? new Date(trip.start_date) : new Date();
            const sortedDates = Object.keys(dayMap).sort();

            // Crear estructura de itinerario
            const itinerary = {
                id: `itinerary-${tripId}`,
                tripId: tripId,
                days: sortedDates.map((date) => {
                    const currentDate = new Date(date);
                    const daysDiff = Math.floor((currentDate - tripStartDate) / (1000 * 60 * 60 * 24));

                    return {
                        date,
                        dayNumber: daysDiff + 1, // +1 because first day is Day 1, not Day 0
                        activities: dayMap[date]
                    };
                }),
                generatedAt: new Date().toISOString(),
                totalEstimatedCost: activities.reduce((sum, act) => sum + (act.estimated_cost || 0), 0)
            };

            // Guardar en localStorage
            this.saveItinerary(tripId, itinerary);
            console.log('[ItineraryManager] Itinerary loaded from Supabase and saved locally');

            return itinerary;
        } catch (error) {
            console.error('[ItineraryManager] Error in loadFromSupabase:', error);
            return null;
        }
    }


    static getCurrentActivity(itinerary) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const todaySchedule = itinerary.days.find(day => day.date === today);
        if (!todaySchedule) return null;

        for (let activity of todaySchedule.activities) {
            const [hours, minutes] = activity.time.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + (activity.duration || 0);

            // Activity is current if now is between start and end
            if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                return {
                    ...activity,
                    isCurrent: true,
                    isNext: false
                };
            }
        }

        return null;
    }

    /**
     * Obtiene la próxima actividad (la primera que aún no ha empezado)
     */
    static getNextActivity(itinerary) {
        const now = new Date();
        const nowDateTime = now.getTime();

        // Iterate through all days and all activities to find the next one
        for (const day of itinerary.days) {
            for (const activity of day.activities) {
                // Parse activity date and time
                const [hours, minutes] = activity.time.split(':').map(Number);
                const activityDate = new Date(day.date);
                activityDate.setHours(hours, minutes, 0, 0);
                const activityDateTime = activityDate.getTime();

                // If this activity is in the future, it's the next one
                if (activityDateTime > nowDateTime) {
                    return { ...activity, date: day.date, isCurrent: false, isNext: true };
                }
            }
        }

        return null; // No future activities
    }

    /**
     * Calcula el costo total del itinerario
     */
    static calculateTotalCost(itinerary) {
        let total = 0;
        itinerary.days.forEach(day => {
            day.activities.forEach(activity => {
                total += activity.estimatedCost || 0;
            });
        });
        return total;
    }

    /**
     * Agrega una actividad al itinerario
     */
    static addActivity(itinerary, dayIndex, activity) {
        if (dayIndex >= 0 && dayIndex < itinerary.days.length) {
            itinerary.days[dayIndex].activities.push({
                ...activity,
                id: `activity-${Date.now()}`
            });
            // Reordenar por hora
            itinerary.days[dayIndex].activities.sort((a, b) =>
                a.time.localeCompare(b.time)
            );
        }
        return itinerary;
    }

    /**
     * Elimina una actividad del itinerario
     */
    static removeActivity(itinerary, dayIndex, activityId) {
        if (dayIndex >= 0 && dayIndex < itinerary.days.length) {
            itinerary.days[dayIndex].activities = itinerary.days[dayIndex].activities.filter(
                a => a.id !== activityId
            );
        }
        return itinerary;
    }

    /**
     * Actualiza una actividad en el itinerario
     */
    static updateActivity(itinerary, dayIndex, activityId, updates) {
        if (dayIndex >= 0 && dayIndex < itinerary.days.length) {
            const activityIndex = itinerary.days[dayIndex].activities.findIndex(
                a => a.id === activityId
            );
            if (activityIndex >= 0) {
                itinerary.days[dayIndex].activities[activityIndex] = {
                    ...itinerary.days[dayIndex].activities[activityIndex],
                    ...updates
                };
            }
        }
        return itinerary;
    }
}

export default ItineraryManager;
