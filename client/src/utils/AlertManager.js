/**
 * AlertManager - Sistema de alertas automáticas para el viaje
 */

class AlertManager {
    /**
     * Verifica y genera alertas basadas en el contexto del viaje
     */
    static checkAlerts(tripContext, currentState, currentLocation) {
        if (!tripContext) return [];

        const now = new Date();
        const alerts = [];

        // 1. Recordatorio de viaje (6-8 días antes)
        const startDate = new Date(tripContext.startDate);
        const daysUntilTrip = Math.floor((startDate - now) / (1000 * 60 * 60 * 24));

        console.log('AlertManager: Checking alerts. Days until trip:', daysUntilTrip);

        if (daysUntilTrip >= 6 && daysUntilTrip <= 8) {
            alerts.push({
                id: `trip-reminder-7days-${tripContext.startDate}`,
                type: 'reminder',
                priority: 'medium',
                title: 'Tu viaje se acerca',
                message: `Tu viaje a ${tripContext.destination} es en ${daysUntilTrip} días. ¡Es hora de prepararte!`,
                icon: '📅',
                actions: [
                    { label: 'Ver itinerario', action: 'view_itinerary' },
                    { label: 'Preparar documentos', action: 'prepare_docs' }
                ],
                timestamp: now.toISOString()
            });
        }

        // 2. Recordatorio (2-4 días antes)
        if (daysUntilTrip >= 2 && daysUntilTrip <= 4) {
            alerts.push({
                id: `trip-reminder-3days-${tripContext.startDate}`,
                type: 'reminder',
                priority: 'high',
                title: `¡Tu viaje es en ${daysUntilTrip} días!`,
                message: `No olvides preparar tu equipaje para ${tripContext.destination}`,
                icon: '🧳',
                actions: [
                    { label: 'Lista de equipaje', action: 'packing_list' }
                ],
                timestamp: now.toISOString()
            });
        }

        // 3. Alerta de vuelo (hasta 25 horas antes)
        if (tripContext.hasFlightInfo && tripContext.flightDate && tripContext.flightTime) {
            const flightDateTime = new Date(`${tripContext.flightDate}T${tripContext.flightTime}`);
            const hoursUntilFlight = (flightDateTime - now) / (1000 * 60 * 60);

            if (hoursUntilFlight > 0 && hoursUntilFlight <= 25) {
                alerts.push({
                    id: `flight-24h-${tripContext.flightNumber || 'flight'}-${tripContext.flightDate}`,
                    type: 'flight',
                    priority: 'high',
                    title: '¡Tu vuelo es pronto!',
                    message: `Vuelo ${tripContext.flightNumber || ''} a ${tripContext.destination} sale en ${Math.floor(hoursUntilFlight)} horas`,
                    icon: '✈️',
                    actions: [
                        { label: 'Ver detalles', action: 'flight_details' }
                    ],
                    timestamp: now.toISOString()
                });
            }

            // 4. Hora de salir al aeropuerto (hasta 4 horas antes del vuelo)
            if (hoursUntilFlight > 0 && hoursUntilFlight <= 4) {
                alerts.push({
                    id: `departure-time-${tripContext.flightNumber || 'flight'}-${tripContext.flightDate}`,
                    type: 'departure',
                    priority: 'critical',
                    title: '¡Es hora de salir!',
                    message: `Debes salir al aeropuerto ${tripContext.departureAirport || ''} pronto`,
                    icon: '🚗',
                    actions: [
                        { label: 'Ver ruta', action: 'show_route' }
                    ],
                    timestamp: now.toISOString()
                });
            }
        }

        // 5. Llegada detectada
        if (currentState === 'arrived') {
            alerts.push({
                id: `arrival-${tripContext.destination}-${tripContext.startDate}`,
                type: 'arrival',
                priority: 'high',
                title: `¡Bienvenido a ${tripContext.destination}!`,
                message: 'Hemos detectado que llegaste a tu destino. Aquí tienes información útil.',
                icon: '🎉',
                actions: [
                    { label: 'Transporte local', action: 'local_transport' },
                    { label: 'Lugares cercanos', action: 'nearby_places' }
                ],
                timestamp: now.toISOString()
            });
        }

        // 6. Alertas de Actividades del Itinerario
        if (tripContext.itinerary?.days) {
            const todayStr = now.toISOString().split('T')[0];
            const todayData = tripContext.itinerary.days.find(d => d.date === todayStr);

            if (todayData) {
                todayData.activities.forEach(act => {
                    const [hours, mins] = act.time.split(':').map(Number);
                    const actDate = new Date();
                    actDate.setHours(hours, mins, 0, 0);

                    const deltaMinutes = (actDate - now) / (1000 * 60);

                    // Alerta 15 minutos antes
                    if (deltaMinutes > 0 && deltaMinutes <= 15) {
                        alerts.push({
                            id: `act-15min-${act.id}`,
                            type: 'activity',
                            priority: 'high',
                            title: '¡Actividad pronto!',
                            message: `Tu actividad "${act.title}" comienza en 15 minutos.`,
                            icon: '⏰',
                            timestamp: now.toISOString()
                        });
                    }
                });
            }
        }

        console.log('AlertManager: Generated alerts:', alerts.length);
        return alerts;
    }

    /**
     * Solicita permiso para notificaciones del navegador
     */
    static async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    /**
     * Envía una notificación del navegador
     */
    static async sendBrowserNotification(alert) {
        const hasPermission = await this.requestNotificationPermission();

        if (!hasPermission) {
            console.log('No hay permiso para notificaciones');
            return;
        }

        try {
            const notification = new Notification(alert.title, {
                body: alert.message,
                icon: '/vite.svg',
                tag: alert.id,
                requireInteraction: alert.priority === 'critical'
            });

            // Cerrar después de 10 segundos si no es crítico
            if (alert.priority !== 'critical') {
                setTimeout(() => notification.close(), 10000);
            }

            return notification;
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    /**
     * Verifica si una alerta ya fue enviada
     */
    static isAlertSent(alertId) {
        const sentAlerts = JSON.parse(localStorage.getItem('sentAlerts') || '[]');
        return sentAlerts.includes(alertId);
    }

    /**
     * Marca una alerta como enviada
     */
    static markAlertAsSent(alertId) {
        const sentAlerts = JSON.parse(localStorage.getItem('sentAlerts') || '[]');
        if (!sentAlerts.includes(alertId)) {
            sentAlerts.push(alertId);
            localStorage.setItem('sentAlerts', JSON.stringify(sentAlerts));
        }
    }

    /**
     * Obtiene el color según la prioridad
     */
    static getPriorityColor(priority) {
        const colors = {
            low: '#3b82f6',
            medium: '#f59e0b',
            high: '#f97316',
            critical: '#ef4444'
        };
        return colors[priority] || colors.medium;
    }

    /**
     * Limpia alertas antiguas (más de 50)
     */
    static cleanOldAlerts() {
        const sentAlerts = JSON.parse(localStorage.getItem('sentAlerts') || '[]');
        if (sentAlerts.length > 50) {
            const recent = sentAlerts.slice(-50);
            localStorage.setItem('sentAlerts', JSON.stringify(recent));
        }
    }
}

export default AlertManager;
