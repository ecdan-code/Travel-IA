import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * GoogleMap - Mapa de Google Maps con marcadores y navegación
 */
const GoogleMap = ({
    userLocation,
    places = [],
    selectedPlace = null,
    onPlaceSelect = null,
    showRoute = false,
    style = {}
}) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const userMarkerRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current) return;

        const initMap = () => {
            if (!window.google || !window.google.maps) return false;

            const defaultCenter = userLocation || { lat: 20.6765, lng: -103.3378 };

            mapInstanceRef.current = new google.maps.Map(mapRef.current, {
                center: defaultCenter,
                zoom: 15,
                styles: [
                    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
                    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d6a" }] },
                    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#023e58" }] },
                ],
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
            });

            // Initialize directions renderer
            directionsRendererRef.current = new google.maps.DirectionsRenderer({
                suppressMarkers: false,
                polylineOptions: {
                    strokeColor: '#ec4899',
                    strokeWeight: 5,
                    strokeOpacity: 0.8
                }
            });
            directionsRendererRef.current.setMap(mapInstanceRef.current);

            setMapLoaded(true);
            return true;
        };

        // Try immediately, then set interval
        if (!initMap()) {
            const checkGoogle = setInterval(() => {
                if (initMap()) {
                    clearInterval(checkGoogle);
                }
            }, 200);
            return () => clearInterval(checkGoogle);
        }
    }, []);

    // Update user location marker
    useEffect(() => {
        if (!mapLoaded || !mapInstanceRef.current || !userLocation) return;

        if (userMarkerRef.current) {
            userMarkerRef.current.setPosition(userLocation);
        } else {
            userMarkerRef.current = new google.maps.Marker({
                position: userLocation,
                map: mapInstanceRef.current,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: '#4f46e5',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                },
                title: 'Tu ubicación'
            });
        }

        mapInstanceRef.current.panTo(userLocation);
    }, [userLocation, mapLoaded]);

    // Update place markers
    useEffect(() => {
        if (!mapLoaded || !mapInstanceRef.current) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Add new markers for places
        places.forEach((place, index) => {
            if (!place.location) return;

            const marker = new google.maps.Marker({
                position: { lat: place.location.lat, lng: place.location.lng },
                map: mapInstanceRef.current,
                icon: {
                    url: `https://maps.google.com/mapfiles/ms/icons/${index === 0 ? 'red' : index === 1 ? 'blue' : 'green'}-dot.png`,
                },
                title: place.name,
                animation: google.maps.Animation.DROP
            });

            // Info window for place details
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 8px; max-width: 200px;">
                        <h3 style="margin: 0 0 8px; font-size: 14px; color: #1f2937;">${place.name}</h3>
                        <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">${place.address || ''}</p>
                        ${place.rating ? `<p style="margin: 0; font-size: 12px;">⭐ ${place.rating}</p>` : ''}
                        <button onclick="window.navigateToPlace(${index})" 
                            style="margin-top: 8px; padding: 6px 12px; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            🧭 Cómo llegar
                        </button>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(mapInstanceRef.current, marker);
                if (onPlaceSelect) onPlaceSelect(place);
            });

            markersRef.current.push(marker);
        });

        // Fit bounds to show all markers
        if (places.length > 0 && userLocation) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(userLocation);
            places.forEach(place => {
                if (place.location) bounds.extend(place.location);
            });
            mapInstanceRef.current.fitBounds(bounds);
        }
    }, [places, mapLoaded]);

    // Show route when selectedPlace changes
    useEffect(() => {
        if (!mapLoaded || !selectedPlace || !userLocation || !showRoute) return;

        const directionsService = new google.maps.DirectionsService();

        directionsService.route({
            origin: userLocation,
            destination: selectedPlace.location,
            travelMode: google.maps.TravelMode.WALKING
        }, (result, status) => {
            if (status === 'OK') {
                directionsRendererRef.current.setDirections(result);
            } else {
                console.error('Directions request failed:', status);
            }
        });
    }, [selectedPlace, showRoute, userLocation, mapLoaded]);

    // Global function for navigate button in info window
    useEffect(() => {
        window.navigateToPlace = (index) => {
            if (places[index] && onPlaceSelect) {
                onPlaceSelect(places[index]);
            }
        };
        return () => { delete window.navigateToPlace; };
    }, [places, onPlaceSelect]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div
                ref={mapRef}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '12px',
                    ...style
                }}
            />
            {!mapLoaded && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#1d2c4d',
                    color: 'white',
                    borderRadius: '12px'
                }}>
                    Cargando mapa...
                </div>
            )}
        </div>
    );
};

export default GoogleMap;
