import { TRIP_STATES } from '../contexts/TripContextProvider';

class TripStateManager {
    /**
     * Detecta automáticamente el estado del viaje basándose en:
     * - Fechas del viaje
     * - Ubicación actual del usuario
     * - Información de vuelo
     */
    static detectState(tripContext, currentLocation) {
        if (!tripContext) return TRIP_STATES.NO_TRIP;

        const now = new Date();
        const startDate = new Date(tripContext.startDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(tripContext.endDate);
        endDate.setHours(23, 59, 59, 999);

        // POST_TRIP: Después del viaje
        if (now > endDate) {
            return TRIP_STATES.POST_TRIP;
        }

        // PRE_TRIP: Antes del día de inicio
        if (now < startDate) {
            return TRIP_STATES.PRE_TRIP;
        }

        // Si tiene información de vuelo, usar lógica más detallada
        if (tripContext.hasFlightInfo && tripContext.flightDate && tripContext.flightTime) {
            const flightDateTime = new Date(`${tripContext.flightDate}T${tripContext.flightTime}`);
            const hoursBeforeFlight = Math.abs(now - flightDateTime) / 36e5; // horas

            // DEPARTURE_TRANSIT: Cerca de la hora del vuelo (dentro de 6 horas antes)
            if (now < flightDateTime && hoursBeforeFlight <= 6) {
                return TRIP_STATES.DEPARTURE_TRANSIT;
            }

            // IN_TRANSIT: Después de hora de vuelo, antes de llegada estimada (4-12 horas típicamente)
            const estimatedFlightDuration = 8; // horas (esto se puede mejorar con API de vuelos)
            const estimatedArrival = new Date(flightDateTime);
            estimatedArrival.setHours(estimatedArrival.getHours() + estimatedFlightDuration);

            if (now >= flightDateTime && now < estimatedArrival) {
                return TRIP_STATES.IN_TRANSIT;
            }

            // ARRIVED: Justo después de hora estimada de llegada (primeras 2 horas)
            const twoHoursAfterArrival = new Date(estimatedArrival);
            twoHoursAfterArrival.setHours(twoHoursAfterArrival.getHours() + 2);

            if (now >= estimatedArrival && now < twoHoursAfterArrival) {
                // Si además está en la ciudad destino, definitivamente es ARRIVED
                if (currentLocation && this.isNearDestination(tripContext, currentLocation)) {
                    return TRIP_STATES.ARRIVED;
                }
            }
        }

        // IN_DESTINATION: Durante el viaje, en la ciudad destino
        if (now >= startDate && now <= endDate) {
            // Si el usuario ya lo inició manualmente, estamos en destino
            if (tripContext.isStarted) {
                return TRIP_STATES.IN_DESTINATION;
            }

            // Si detectamos que ya está físicamente ahí, activamos automáticamente
            if (currentLocation && this.isNearDestination(tripContext, currentLocation)) {
                return TRIP_STATES.IN_DESTINATION;
            }

            // Si está dentro de las fechas pero no ha "empezado", mantenemos como PRE_TRIP
            // para que vea la pantalla de cuenta regresiva/bienvenida
            return TRIP_STATES.PRE_TRIP;
        }

        // RETURNING: Último día del viaje
        const lastDayStart = new Date(endDate);
        lastDayStart.setHours(0, 0, 0, 0);

        if (now >= lastDayStart && now <= endDate) {
            return TRIP_STATES.RETURNING;
        }

        // Default: PRE_TRIP
        return TRIP_STATES.PRE_TRIP;
    }

    /**
     * Verifica si la ubicación actual está cerca del destino
     */
    static isNearDestination(tripContext, currentLocation) {
        // Esto requeriría geocoding del destino
        // Por ahora, retornamos false ya que necesitaríamos llamar a la API
        // Se implementará cuando se agregue el backend
        return false;
    }

    /**
     * Obtiene descripción amigable del estado
     */
    static getStateDescription(state) {
        const descriptions = {
            [TRIP_STATES.NO_TRIP]: 'Sin viaje programado',
            [TRIP_STATES.PRE_TRIP]: 'Preparandote para el viaje',
            [TRIP_STATES.DEPARTURE_TRANSIT]: 'En camino al aeropuerto',
            [TRIP_STATES.IN_TRANSIT]: 'En tránsito',
            [TRIP_STATES.ARRIVED]: '¡Acabas de llegar!',
            [TRIP_STATES.IN_DESTINATION]: 'Disfrutando tu destino',
            [TRIP_STATES.RETURNING]: 'Preparando regreso',
            [TRIP_STATES.POST_TRIP]: 'Viaje completado'
        };
        return descriptions[state] || 'Estado desconocido';
    }

    /**
     * Obtiene título del estado
     */
    static getStateTitle(state) {
        const titles = {
            [TRIP_STATES.NO_TRIP]: 'Sin Viaje',
            [TRIP_STATES.PRE_TRIP]: 'Pre-Viaje',
            [TRIP_STATES.DEPARTURE_TRANSIT]: 'En Camino',
            [TRIP_STATES.IN_TRANSIT]: 'En Vuelo',
            [TRIP_STATES.ARRIVED]: 'Llegada',
            [TRIP_STATES.IN_DESTINATION]: 'En Destino',
            [TRIP_STATES.RETURNING]: 'Regresando',
            [TRIP_STATES.POST_TRIP]: 'Finalizado'
        };
        return titles[state] || 'Desconocido';
    }

    /**
     * Obtiene icono/emoji del estado
     */
    static getStateIcon(state) {
        const icons = {
            [TRIP_STATES.NO_TRIP]: '🏠',
            [TRIP_STATES.PRE_TRIP]: '📅',
            [TRIP_STATES.DEPARTURE_TRANSIT]: '🚗',
            [TRIP_STATES.IN_TRANSIT]: '✈️',
            [TRIP_STATES.ARRIVED]: '🎉',
            [TRIP_STATES.IN_DESTINATION]: '🗺️',
            [TRIP_STATES.RETURNING]: '🔙',
            [TRIP_STATES.POST_TRIP]: '✓'
        };
        return icons[state] || '❓';
    }

    /**
     * Obtiene acciones recomendadas por estado
     */
    static getStateActions(state, tripContext) {
        switch (state) {
            case TRIP_STATES.PRE_TRIP:
                const daysUntilTrip = Math.ceil((new Date(tripContext.startDate) - new Date()) / (1000 * 60 * 60 * 24));
                return [
                    `Tu viaje es en ${daysUntilTrip} día${daysUntilTrip !== 1 ? 's' : ''}`,
                    'Revisa documentos de viaje',
                    'Prepara tu itinerario'
                ];

            case TRIP_STATES.DEPARTURE_TRANSIT:
                return [
                    '¡Es hora de ir al aeropuerto!',
                    'Verifica tu vuelo',
                    'Lleva documentos listos'
                ];

            case TRIP_STATES.IN_TRANSIT:
                return [
                    'Disfruta tu vuelo',
                    'Relájate y descansa'
                ];

            case TRIP_STATES.ARRIVED:
                return [
                    `¡Bienvenido a ${tripContext.destination}!`,
                    'Busca transporte local',
                    'Dirígete a tu alojamiento'
                ];

            case TRIP_STATES.IN_DESTINATION:
                return [
                    `Disfruta ${tripContext.destination}`,
                    'Explora lugares cercanos',
                    'Prueba la comida local'
                ];

            case TRIP_STATES.RETURNING:
                return [
                    'Último día de viaje',
                    'Prepara tu equipaje',
                    'Verifica hora de salida'
                ];

            case TRIP_STATES.POST_TRIP:
                return [
                    '¡Viaje completado!',
                    'Comparte tus experiencias',
                    'Planifica el próximo viaje'
                ];

            default:
                return [];
        }
    }
}

export default TripStateManager;
