/**
 * GeofenceDetector - Utilidad para detectar cuando el usuario
 * entra o sale de zonas geográficas específicas
 */

class GeofenceDetector {
    /**
     * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
     * @param {number} lat1 - Latitud del punto 1
     * @param {number} lon1 - Longitud del punto 1
     * @param {number} lat2 - Latitud del punto 2
     * @param {number} lon2 - Longitud del punto 2
     * @returns {number} Distancia en kilómetros
     */
    static getDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance;
    }

    /**
     * Convierte grados a radianes
     */
    static toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Verifica si una coordenada está dentro de un geofence circular
     * @param {object} userLocation - {lat, lng}
     * @param {object} targetLocation - {lat, lng}
     * @param {number} radiusKm - Radio del geofence en kilómetros
     * @returns {boolean}
     */
    static isInsideGeofence(userLocation, targetLocation, radiusKm) {
        if (!userLocation || !targetLocation) return false;

        const distance = this.getDistanceKm(
            userLocation.lat,
            userLocation.lng,
            targetLocation.lat,
            targetLocation.lng
        );

        return distance <= radiusKm;
    }

    /**
     * Verifica si el usuario está cerca del aeropuerto
     * @param {object} userLocation - {lat, lng}
     * @param {object} airportLocation - {lat, lng}
     * @returns {boolean}
     */
    static isNearAirport(userLocation, airportLocation) {
        const AIRPORT_RADIUS_KM = 5; // 5 km
        return this.isInsideGeofence(userLocation, airportLocation, AIRPORT_RADIUS_KM);
    }

    /**
     * Verifica si el usuario está en la ciudad destino
     * @param {object} userLocation - {lat, lng}
     * @param {object} destinationLocation - {lat, lng} (centro de la ciudad)
     * @returns {boolean}
     */
    static isInDestinationCity(userLocation, destinationLocation) {
        const CITY_RADIUS_KM = 30; // 30 km para considerar "en la ciudad"
        return this.isInsideGeofence(userLocation, destinationLocation, CITY_RADIUS_KM);
    }

    /**
     * Verifica si el usuario está cerca de un punto de interés específico
     * @param {object} userLocation - {lat, lng}
     * @param {object} poiLocation - {lat, lng}
     * @returns {boolean}
     */
    static isNearPointOfInterest(userLocation, poiLocation) {
        const POI_RADIUS_KM = 0.5; // 500 metros
        return this.isInsideGeofence(userLocation, poiLocation, POI_RADIUS_KM);
    }

    /**
     * Obtiene la dirección de movimiento basada en dos ubicaciones
     * @param {object} oldLocation - {lat, lng}
     * @param {object} newLocation - {lat, lng}
     * @returns {string} 'approaching' | 'leaving' | 'stationary'
     */
    static getMovementDirection(oldLocation, newLocation, targetLocation) {
        if (!oldLocation || !newLocation || !targetLocation) return 'unknown';

        const oldDistance = this.getDistanceKm(
            oldLocation.lat,
            oldLocation.lng,
            targetLocation.lat,
            targetLocation.lng
        );

        const newDistance = this.getDistanceKm(
            newLocation.lat,
            newLocation.lng,
            targetLocation.lat,
            targetLocation.lng
        );

        const difference = Math.abs(oldDistance - newDistance);

        // Si la diferencia es muy pequeña, considerar estacionario
        if (difference < 0.1) return 'stationary';

        // Si la nueva distancia es menor, se está acercando
        if (newDistance < oldDistance) return 'approaching';

        // Si la nueva distancia es mayor, se está alejando
        return 'leaving';
    }

    /**
     * Detecta cruces de fronteras/zonas importantes
     * @param {object} previousLocation - {lat, lng}
     * @param {object} currentLocation - {lat, lng}
     * @param {object} geofence - {center: {lat, lng}, radiusKm: number, name: string}
     * @returns {object|null} {event: 'enter'|'exit', geofence: {...}}
     */
    static detectGeofenceCross(previousLocation, currentLocation, geofence) {
        if (!previousLocation || !currentLocation || !geofence) return null;

        const wasInside = this.isInsideGeofence(
            previousLocation,
            geofence.center,
            geofence.radiusKm
        );

        const isInside = this.isInsideGeofence(
            currentLocation,
            geofence.center,
            geofence.radiusKm
        );

        // Detectar entrada
        if (!wasInside && isInside) {
            return {
                event: 'enter',
                geofence: geofence,
                timestamp: new Date()
            };
        }

        // Detectar salida
        if (wasInside && !isInside) {
            return {
                event: 'exit',
                geofence: geofence,
                timestamp: new Date()
            };
        }

        return null;
    }

    /**
     * Monitorea múltiples geofences y detecta cruces
     * @param {object} previousLocation - {lat, lng}
     * @param {object} currentLocation - {lat, lng}
     * @param {array} geofences - Array de geofences
     * @returns {array} Array de eventos de cruce detectados
     */
    static monitorGeofences(previousLocation, currentLocation, geofences) {
        const events = [];

        geofences.forEach(geofence => {
            const crossEvent = this.detectGeofenceCross(
                previousLocation,
                currentLocation,
                geofence
            );

            if (crossEvent) {
                events.push(crossEvent);
            }
        });

        return events;
    }
}

export default GeofenceDetector;
