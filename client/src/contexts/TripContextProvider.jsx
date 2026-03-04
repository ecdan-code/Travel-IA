import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabaseClient';
import expenseStorage from '../utils/expenseStorage';

const TripContext = createContext();

export const useTripContext = () => {
    const context = useContext(TripContext);
    if (!context) {
        throw new Error('useTripContext must be used within TripContextProvider');
    }
    return context;
};

export const TRIP_STATES = {
    NO_TRIP: 'no_trip',
    PRE_TRIP: 'pre_trip',
    DEPARTURE_TRANSIT: 'departure_transit',
    IN_TRANSIT: 'in_transit',
    ARRIVED: 'arrived',
    IN_DESTINATION: 'in_destination',
    RETURNING: 'returning',
    POST_TRIP: 'post_trip'
};

export const TripContextProvider = ({ children }) => {
    const { user, session } = useAuth();
    const [tripContext, setTripContext] = useState(null);
    const [tripState, setTripState] = useState(TRIP_STATES.NO_TRIP);
    const [pastTrips, setPastTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncedFromSupabase, setSyncedFromSupabase] = useState(false);

    // Load trip context from localStorage or Supabase
    useEffect(() => {
        const loadTripData = async () => {
            // Primero intentar cargar desde localStorage
            const savedTrip = localStorage.getItem('travelIA_trip');
            const savedHistory = localStorage.getItem('travelIA_history');

            if (savedTrip) {
                try {
                    const parsed = JSON.parse(savedTrip);
                    setTripContext(parsed);
                    setTripState(parsed.currentState || TRIP_STATES.PRE_TRIP);
                } catch (e) {
                    console.error('Error loading trip context:', e);
                }
            }

            if (savedHistory) {
                try {
                    setPastTrips(JSON.parse(savedHistory));
                } catch (e) {
                    console.error('Error loading trip history:', e);
                }
            }

            // Si no hay localStorage pero tenemos usuario, intentar cargar desde Supabase
            if (!savedTrip && user && session?.access_token && !syncedFromSupabase) {
                console.log('[TripContext] No hay trip local, cargando desde Supabase...');
                try {
                    const authClient = supabase;

                    // Buscar viaje activo del usuario
                    const { data: trips, error } = await authClient
                        .from('trips')
                        .select('*')
                        .eq('status', 'active')
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (error) {
                        console.error('[TripContext] Error loading from Supabase:', error);
                    } else if (trips && trips.length > 0) {
                        const trip = trips[0];
                        console.log('[TripContext] Viaje encontrado en Supabase:', trip.destination);

                        // Convertir formato de Supabase a formato de la app
                        const tripData = {
                            id: trip.id,
                            destination: trip.destination,
                            destinationCountry: trip.destination_country,
                            startDate: trip.start_date,
                            endDate: trip.end_date,
                            totalBudget: trip.budget_limit,
                            status: trip.status,
                            createdAt: trip.created_at,
                            currentState: TRIP_STATES.IN_DESTINATION
                        };

                        setTripContext(tripData);
                        setTripState(TRIP_STATES.IN_DESTINATION);

                        // Guardar en localStorage también
                        localStorage.setItem('travelIA_trip', JSON.stringify({
                            ...tripData,
                            currentState: TRIP_STATES.IN_DESTINATION
                        }));
                    } else {
                        console.log('[TripContext] No hay viajes activos en Supabase');
                    }

                    setSyncedFromSupabase(true);
                } catch (err) {
                    console.error('[TripContext] Error syncing from Supabase:', err);
                }
            }

            setLoading(false);
        };

        loadTripData();
    }, [user, session, syncedFromSupabase]);

    // Save trip context to localStorage whenever it changes
    useEffect(() => {
        if (tripContext) {
            localStorage.setItem('travelIA_trip', JSON.stringify({
                ...tripContext,
                currentState: tripState
            }));
        }
    }, [tripContext, tripState]);

    // Save history whenever it changes
    useEffect(() => {
        localStorage.setItem('travelIA_history', JSON.stringify(pastTrips));
    }, [pastTrips]);

    const createTrip = (tripData) => {
        const newTrip = {
            ...tripData,
            id: `trip-${Date.now()}`,
            createdAt: new Date().toISOString(),
            currentState: TRIP_STATES.PRE_TRIP
        };
        setTripContext(newTrip);
        setTripState(TRIP_STATES.PRE_TRIP);

        // Auto-guardar presupuesto en expenseStorage si se proporcionó
        if (tripData.totalBudget) {
            expenseStorage.saveBudget(newTrip.id, parseFloat(tripData.totalBudget));
            console.log('[TripContext] Budget saved to expense tracker:', tripData.totalBudget);
        }
    };

    const archiveCurrentTrip = () => {
        if (tripContext) {
            const archived = {
                ...tripContext,
                archivedAt: new Date().toISOString(),
                finalState: tripState
            };
            setPastTrips(prev => [archived, ...prev]);

            // Note: We don't remove other localStorage items (itineraries/expenses) 
            // because they are keyed by tripId. Only clear the active trip.
            localStorage.removeItem('travelIA_trip');
            setTripContext(null);
            setTripState(TRIP_STATES.NO_TRIP);
        }
    };

    const loadPastTrip = (trip) => {
        setTripContext(trip);
        setTripState(trip.finalState || TRIP_STATES.IN_DESTINATION);
    };

    const updateTrip = (updates) => {
        setTripContext(prev => ({
            ...prev,
            ...updates
        }));
    };

    const updateTripState = (newState) => {
        setTripState(newState);
    };

    const clearAllData = () => {
        localStorage.clear();
        setTripContext(null);
        setPastTrips([]);
        setTripState(TRIP_STATES.NO_TRIP);
        window.location.reload();
    };

    const value = {
        tripContext,
        tripState,
        pastTrips,
        loading,
        createTrip,
        updateTrip,
        updateTripState,
        archiveCurrentTrip,
        loadPastTrip,
        clearAllData,
        startTrip: () => {
            setTripState(TRIP_STATES.IN_DESTINATION);
            setTripContext(prev => ({ ...prev, isStarted: true }));
        },
        hasActiveTrip: !!tripContext
    };

    return (
        <TripContext.Provider value={value}>
            {children}
        </TripContext.Provider>
    );
};

export default TripContextProvider;
