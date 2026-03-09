import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    MapPin, Navigation, Compass, Star, Train, Utensils,
    Info, Camera, Bus, Clock, ChevronRight, Settings, Heart, X, RefreshCw, Search, History, Archive, LogOut, User
} from 'lucide-react';
import GoogleMap from './components/GoogleMap';
import { useTripContext } from './contexts/TripContextProvider';
import { useAuth } from './contexts/AuthContext';
import WelcomeScreen from './screens/WelcomeScreen';
import TripStateManager from './utils/TripStateManager';
import AlertManager from './utils/AlertManager';
import AlertsPanel from './components/AlertsPanel';
import ItineraryManager from './utils/ItineraryManager';
import ItineraryViewer from './components/ItineraryViewer';
import ActivityGuidance from './components/ActivityGuidance';
import ExpenseTracker from './screens/ExpenseTracker';
import TravelChat from './components/TravelChat';
import PreTripView from './components/PreTripView';
import TripHistory from './components/TripHistory';
import APIUsageMonitor from './components/APIUsageMonitor';
import expenseStorage from './utils/expenseStorage';
import { TRIP_STATES } from './contexts/TripContextProvider';
import API_BASE_URL from './utils/apiConfig';

function AppWithMap() {
    const { user, signOut } = useAuth();
    const {
        hasActiveTrip, tripContext, tripState, updateTripState,
        startTrip, archiveCurrentTrip, clearAllData, pastTrips, loadPastTrip,
        loading: tripLoading
    } = useTripContext();
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const markersRef = useRef([]);
    const lastFetchRef = useRef({ coords: null, time: 0 });

    const [coords, setCoords] = useState({ lat: 20.6765, lng: -103.3378 });
    const [locationName, setLocationName] = useState("Localizando...");
    const [showWelcome, setShowWelcome] = useState(false);
    const [showItinerary, setShowItinerary] = useState(false);
    const [showExpenses, setShowExpenses] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showPrefs, setShowPrefs] = useState(false);
    const [showAPIUsage, setShowAPIUsage] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [apiError, setApiError] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isProactive, setIsProactive] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isManualLocation, setIsManualLocation] = useState(false);
    const [foundPlaces, setFoundPlaces] = useState([]);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [showRoute, setShowRoute] = useState(false);

    const [prefs, setPrefs] = useState(() => {
        const saved = localStorage.getItem('travel_ia_prefs');
        return saved ? JSON.parse(saved) : {
            interests: ['cultura', 'comida'],
            budget: 'medio',
            diet: 'todo'
        };
    });

    // Persistir preferencias cuando cambien
    useEffect(() => {
        localStorage.setItem('travel_ia_prefs', JSON.stringify(prefs));
    }, [prefs]);

    const [alerts, setAlerts] = useState([]);
    const [itinerary, setItinerary] = useState(null);
    const [generatingItinerary, setGeneratingItinerary] = useState(false);
    const [currentActivity, setCurrentActivity] = useState(null);
    const [isFollowingUser, setIsFollowingUser] = useState(true);
    const [isPanelMinimized, setIsPanelMinimized] = useState(true);
    const [expenseContext, setExpenseContext] = useState(() => {
        if (!tripContext?.id) return null;
        const totalSpent = expenseStorage.getTotalSpent(tripContext.id);
        const savedBudget = expenseStorage.getBudget(tripContext.id);
        const limit = savedBudget !== null ? savedBudget : (tripContext.totalBudget || 0);
        return {
            totalSpent,
            budgetLimit: limit,
            remaining: limit - totalSpent,
            percentageUsed: limit > 0 ? (totalSpent / limit) * 100 : 0
        };
    });
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [mapClickCoords, setMapClickCoords] = useState(null);

    // Map initialization is now handled by GoogleMap component
    // Leaflet code removed - using Google Maps instead
    // GoogleMap component handles all map functionality now

    // Update location from map click if in manual mode
    useEffect(() => {
        if (isManualLocation && mapClickCoords) {
            setCoords(mapClickCoords);
            setLocationName(`${mapClickCoords.lat.toFixed(5)}, ${mapClickCoords.lng.toFixed(5)}`);
        }
    }, [mapClickCoords, isManualLocation]);

    useEffect(() => {
        if (!navigator.geolocation || isManualLocation) return;

        const watcher = navigator.geolocation.watchPosition(
            (pos) => {
                const nc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCoords(nc);
                // Mostrar 5 decimales para mayor precisión visual (aprox 1 metro)
                setLocationName(`${nc.lat.toFixed(5)}, ${nc.lng.toFixed(5)}`);
            },
            (err) => {
                console.warn("Geo error:", err);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
        return () => navigator.geolocation.clearWatch(watcher);
    }, [isManualLocation]);

    // Auto-detect trip state every minute
    useEffect(() => {
        if (!tripContext || !hasActiveTrip) return;

        // Initial state detection
        const detectCurrentState = () => {
            const newState = TripStateManager.detectState(tripContext, coords);
            if (newState !== tripState) {
                console.log(`Trip state changed: ${tripState} -> ${newState}`);
                updateTripState(newState);
            }
        };

        // Detect immediately
        detectCurrentState();

        // Then check every minute
        const stateInterval = setInterval(detectCurrentState, 60000);

        return () => clearInterval(stateInterval);
    }, [tripContext, coords, tripState, hasActiveTrip, updateTripState]);

    // Check alerts periodically
    useEffect(() => {
        if (!tripContext || !hasActiveTrip) return;

        const checkForAlerts = () => {
            const newAlerts = AlertManager.checkAlerts(tripContext, tripState, coords);

            // Filter out already sent alerts
            const unseenAlerts = newAlerts.filter(alert =>
                !AlertManager.isAlertSent(alert.id)
            );

            if (unseenAlerts.length > 0) {
                // Add to UI
                setAlerts(prev => [...unseenAlerts, ...prev]);

                // Send browser notifications for high/critical priority
                unseenAlerts.forEach(alert => {
                    if (alert.priority === 'high' || alert.priority === 'critical') {
                        AlertManager.sendBrowserNotification(alert);
                    }
                    AlertManager.markAlertAsSent(alert.id);
                });
            }
        };

        // Check immediately
        checkForAlerts();

        // Then check every minute
        const alertInterval = setInterval(checkForAlerts, 60000);

        return () => clearInterval(alertInterval);
    }, [tripContext, tripState, coords, hasActiveTrip]);

    // Load itinerary on mount
    useEffect(() => {
        if (tripContext?.id) {
            const loadedItinerary = ItineraryManager.loadItinerary(tripContext.id);
            if (loadedItinerary) {
                setItinerary(loadedItinerary);
            } else {
                // Si no hay en localStorage, intentar cargar desde Supabase
                ItineraryManager.loadFromSupabase(tripContext.id).then(supabaseItinerary => {
                    if (supabaseItinerary) {
                        setItinerary(supabaseItinerary);
                    }
                });
            }
        }
    }, [tripContext]);

    // Reload itinerary when modal opens (to get latest from DB)
    useEffect(() => {
        if (showItinerary && tripContext?.id) {
            ItineraryManager.loadFromSupabase(tripContext.id).then(supabaseItinerary => {
                if (supabaseItinerary) {
                    setItinerary(supabaseItinerary);
                }
            });
        }
    }, [showItinerary, tripContext]);

    // Update current activity every minute
    useEffect(() => {
        if (!itinerary) {
            setCurrentActivity(null);
            return;
        }

        const updateCurrentActivity = () => {
            const current = ItineraryManager.getCurrentActivity(itinerary);
            const next = ItineraryManager.getNextActivity(itinerary);

            // Show current activity if exists, otherwise show next
            if (current) {
                setCurrentActivity({ ...current, isCurrent: true });
            } else if (next) {
                setCurrentActivity({ ...next, isCurrent: false });
            } else {
                setCurrentActivity(null);
            }
        };

        // Update immediately
        updateCurrentActivity();

        // Update every minute
        const interval = setInterval(updateCurrentActivity, 60000);
        return () => clearInterval(interval);
    }, [itinerary]);

    // Update expense context for AI and keep expenses in sync
    const refreshExpenses = () => {
        if (!tripContext?.id) return;

        const totalSpent = expenseStorage.getTotalSpent(tripContext.id);
        const savedBudget = expenseStorage.getBudget(tripContext.id);
        const limit = savedBudget !== null ? savedBudget : (tripContext.totalBudget || itinerary?.totalEstimatedCost || 0);

        setExpenses(expenseStorage.getExpenses(tripContext.id));
        setCategories(expenseStorage.getCategories(tripContext.id));
        setExpenseContext({
            totalSpent,
            budgetLimit: limit,
            remaining: limit - totalSpent,
            percentageUsed: limit > 0 ? (totalSpent / limit) * 100 : 0
        });
    };

    useEffect(() => {
        if (!tripContext?.id) return;

        refreshExpenses();
        // Refresh periodically 
        const interval = setInterval(refreshExpenses, 30000);
        return () => clearInterval(interval);
    }, [tripContext?.id, itinerary?.id, showChat]);

    // Generate itinerary
    const handleGenerateItinerary = async () => {
        if (!tripContext) return;

        setGeneratingItinerary(true);
        try {
            const generated = await ItineraryManager.generateItinerary(tripContext);
            if (generated) {
                generated.id = `itinerary-${tripContext.id}`;
                setItinerary(generated);
                ItineraryManager.saveItinerary(tripContext.id, generated);
                setShowItinerary(true);
            } else {
                alert('No se pudo generar el itinerario. Por favor, intenta de nuevo.');
            }
        } catch (error) {
            console.error('Error generating itinerary:', error);
            alert('Hubo un error al generar el itinerario. Verifica tu conexión.');
        } finally {
            setGeneratingItinerary(false);
        }
    };

    useEffect(() => {
        if (!isProactive) return;

        const MIN_DISTANCE_KM = 0.5; // 500 meters
        const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();

        const shouldFetch = () => {
            if (!lastFetchRef.current.coords) return true;

            const distance = L.latLng(coords.lat, coords.lng).distanceTo(
                L.latLng(lastFetchRef.current.coords.lat, lastFetchRef.current.coords.lng)
            ) / 1000;

            const timePassed = now - lastFetchRef.current.time;

            return distance > MIN_DISTANCE_KM || timePassed > COOLDOWN_MS;
        };

        if (shouldFetch() && !searchQuery) {
            fetchSuggestions(coords);
            lastFetchRef.current = { coords: { ...coords }, time: now };
        }
    }, [isProactive, coords.lat, coords.lng, prefs, currentActivity, searchQuery]);

    const fetchSuggestions = async (c, query = '') => {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s for OSM + AI

        try {
            // Build context from itinerary if available
            let itineraryContext = '';
            if (itinerary && currentActivity) {
                const activityType = currentActivity.isCurrent ? 'está realizando' : 'tiene próximamente';
                itineraryContext = `
                
                CONTEXTO DEL ITINERARIO:
                El usuario ${activityType} la siguiente actividad:
                - Actividad: ${currentActivity.title}
                - Categoría: ${currentActivity.category}
                - Hora: ${currentActivity.time}
                - Ubicación: ${currentActivity.location}
                
                Por favor, genera sugerencias que COMPLEMENTEN esta actividad.
                `;
            }

            const r = await fetch(`${API_BASE_URL}/api/suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    location: c,
                    time: new Date().toLocaleTimeString(),
                    state: "Explorando",
                    preferences: `Intereses: ${prefs.interests.join(', ')}. Presupuesto: ${prefs.budget}. Dieta: ${prefs.diet}${itineraryContext}`,
                    searchQuery: query
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const d = await r.json();

            if (d.error === "QUOTA_EXCEEDED") {
                setApiError(d.message);
                setSuggestions([]);
            } else {
                setSuggestions(d.suggestions || []);
                setApiError(null);
            }
        } catch (e) {
            clearTimeout(timeoutId);
            console.warn("API Fallback", e.message);
            setApiError(`Error de conexión: ${e.message}`);
            setSuggestions([]); // No mostrar sugerencias falsas cuando hay error
        } finally { setLoading(false); }
    };

    const getIcon = (cat) => {
        switch (cat) {
            case 'comida': return <Utensils size={16} />;
            case 'transporte': return <Bus size={16} />;
            case 'cultura': return <Camera size={16} />;
            default: return <Star size={16} />;
        }
    };

    const toggleInterest = (tag) => {
        setPrefs(p => ({
            ...p,
            interests: p.interests.includes(tag) ? p.interests.filter(i => i !== tag) : [...p.interests, tag]
        }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            fetchSuggestions(coords, searchQuery);
        }
    };

    const handleRefresh = () => {
        fetchSuggestions(coords, searchQuery);
    };

    // Show loading state while checking for trip
    if (tripLoading) {
        return (
            <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loader"></div>
            </div>
        );
    }

    // Show welcome screen if no active trip
    if (!hasActiveTrip) {
        return <WelcomeScreen onComplete={() => window.location.reload()} />;
    }

    // Show pre-trip waiting screen
    if (tripState === TRIP_STATES.PRE_TRIP) {
        return (
            <PreTripView
                tripContext={tripContext}
                onForceStart={startTrip}
                onAbandon={clearAllData}
            />
        );
    }

    return (
        <div className="app">
            <div className="map-container">
                <GoogleMap
                    userLocation={coords}
                    places={foundPlaces}
                    selectedPlace={selectedPlace}
                    showRoute={showRoute}
                    onPlaceSelect={(place) => {
                        setSelectedPlace(place);
                        setShowRoute(true);
                    }}
                />

            </div>

            {/* Recenter Button */}
            <button
                className={`recenter-btn premium-glass ${isFollowingUser ? 'active' : ''}`}
                onClick={() => {
                    setIsFollowingUser(true);
                    if (map) {
                        map.setView([coords.lat, coords.lng], map.getZoom(), { animate: true });
                    }
                }}
                title="Centrar en mi ubicación"
            >
                🎯
            </button>

            {/* Alerts Panel */}
            {alerts.length > 0 && (
                <AlertsPanel
                    alerts={alerts}
                    onDismiss={(alertId) => {
                        setAlerts(prev => prev.filter(a => a.id !== alertId));
                    }}
                    onAction={(alertId, action) => {
                        console.log('Alert action:', action, alertId);
                        // Handle actions here (future implementation)
                        setAlerts(prev => prev.filter(a => a.id !== alertId));
                    }}
                />
            )}

            <div className="ui-overlay">
                <header className="header" style={{ position: 'absolute', top: '15px', left: '15px', right: '15px', zIndex: 30 }}>
                    <div className="brand" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }} onClick={() => setShowPrefs(true)}>
                        <Compass className="brand-logo" style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.5px' }}>TRAVEL IA</h1>
                    </div>

                    {/* User Indicator */}
                    <div className="user-indicator premium-glass" style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--glass-border)',
                        padding: '8px 12px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        pointerEvents: 'auto',
                        marginLeft: 'auto',
                        marginRight: '8px'
                    }}>
                        <User size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.email || 'Usuario'}
                        </span>
                        <button
                            onClick={async () => {
                                if (window.confirm('¿Cerrar sesión?')) {
                                    await signOut();
                                }
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px'
                            }}
                            title="Cerrar sesión"
                        >
                            <LogOut size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="icon-btn premium-glass" style={{ border: 'none', color: 'var(--text)', width: '42px', height: '42px', borderRadius: '50%', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', fontSize: '1.1rem' }} onClick={() => setShowExpenses(true)} title="Control de Gastos">
                            💰
                        </button>
                        <button
                            className={`icon-btn premium-glass`}
                            style={{ border: 'none', color: 'var(--text)', width: '42px', height: '42px', borderRadius: '50%', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', fontSize: '1.2rem' }}
                            onClick={() => setShowItinerary(true)}
                            title="Ver Itinerario"
                        >
                            📅
                        </button>
                        <button
                            className="icon-btn premium-glass"
                            style={{ border: 'none', color: 'var(--text)', width: '42px', height: '42px', borderRadius: '50%', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', fontSize: '1.1rem' }}
                            onClick={() => setShowAPIUsage(true)}
                            title="Uso de API"
                        >
                            📊
                        </button>
                        <button
                            className={`icon-btn premium-glass ${isManualLocation ? 'active-simulation' : ''}`}
                            style={{ border: 'none', color: isManualLocation ? '#00ebff' : 'var(--text)', width: '42px', height: '42px', borderRadius: '50%', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', pointerEvents: 'auto' }}
                            onClick={() => setIsManualLocation(!isManualLocation)}
                        >
                            🌍
                        </button>
                        <div className={`mode-toggle ${isProactive ? 'active' : ''}`} style={{ pointerEvents: 'auto' }} onClick={() => setIsProactive(!isProactive)}>
                            {isProactive ? 'PRO' : 'MAN'}
                        </div>
                    </div>
                </header>

                {/* Manual Coordinate Override (only visible when manual location is on) */}
                {isManualLocation && (
                    <div className="manual-coords-panel premium-glass">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="number"
                                placeholder="Lat"
                                step="0.0001"
                                value={coords.lat}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) setCoords(prev => ({ ...prev, lat: val }));
                                }}
                            />
                            <input
                                type="number"
                                placeholder="Lng"
                                step="0.0001"
                                value={coords.lng}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) setCoords(prev => ({ ...prev, lng: val }));
                                }}
                            />
                            <button
                                className="icon-btn"
                                style={{
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontSize: '1.2rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    zIndex: 2000,
                                    position: 'relative',
                                    pointerEvents: 'auto',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 15px var(--primary-glow)',
                                    transition: 'all 0.2s'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setIsManualLocation(false);
                                    // Feedback visual
                                    const btn = e.currentTarget;
                                    btn.style.backgroundColor = '#4f46e5';
                                    setTimeout(() => btn.style.backgroundColor = '#6366f1', 200);
                                }}
                            >
                                ✓
                            </button>
                        </div>
                        <p style={{ fontSize: '10px', marginTop: '5px', opacity: 0.7 }}>* Toca cualquier punto del mapa para moverte ahí o edita las coordenadas.</p>
                    </div>
                )}

                {/* Activity Guidance */}
                {currentActivity && (
                    <ActivityGuidance
                        activity={currentActivity}
                        coords={coords}
                        isCurrent={currentActivity.isCurrent}
                    />
                )}

                {/* Chat Toggle Button (Only visible if panel is minimized) */}
                {hasActiveTrip && !showChat && isPanelMinimized && (
                    <button
                        className="chat-toggle-btn"
                        onClick={() => setShowChat(true)}
                        title="Chat con IA"
                    >
                        💬
                    </button>
                )}


                {/* Search Bar */}
                <form onSubmit={handleSearch} className="search-bar">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar restaurantes, museos, cafés..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => { setSearchQuery(''); fetchSuggestions(coords); }}
                            className="clear-search"
                        >
                            <X size={16} />
                        </button>
                    )}
                </form>

                <main className="content" style={{ flex: 1, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
                    <div className={`main-card premium-glass ${selectedItem ? 'expanded' : ''} ${isPanelMinimized ? 'minimized' : ''}`}>
                        <div className="handle" onClick={() => setIsPanelMinimized(!isPanelMinimized)}>
                            <div className="handle-bar"></div>
                            {isPanelMinimized && <span className="minimized-label">Sugerencias</span>}
                        </div>

                        {!selectedItem ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h2 style={{ fontSize: '1rem' }}><Navigation size={16} /> {searchQuery ? `"${searchQuery}"` : 'Sugerencias'}</h2>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {!isProactive && !isPanelMinimized && (
                                            <button
                                                onClick={handleRefresh}
                                                className="refresh-btn"
                                                disabled={loading}
                                                title="Actualizar sugerencias"
                                            >
                                                <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                                            </button>
                                        )}
                                        {loading && <div className="loader"></div>}
                                    </div>
                                </div>
                                <div className="list-container">
                                    {loading && <p style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>Consultando a la IA...</p>}

                                    {!loading && apiError && (
                                        <div className="error-card" style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '15px', color: '#ef4444', textAlign: 'center' }}>
                                            <p style={{ fontSize: '0.8rem', marginBottom: '10px' }}>⚠️ {apiError}</p>
                                            <button
                                                onClick={handleRefresh}
                                                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '10px', fontSize: '0.7rem', cursor: 'pointer' }}
                                            >
                                                Reintentar
                                            </button>
                                        </div>
                                    )}

                                    {!loading && !apiError && suggestions.length === 0 && (
                                        <p style={{ textAlign: 'center', opacity: 0.5 }}>Buscando maravillas...</p>
                                    )}

                                    {suggestions.map((s, i) => (
                                        <div key={i} className="list-item" onClick={() => setSelectedItem(s)}>
                                            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>{getIcon(s.category)}</div>
                                            <div className="item-info">
                                                <h3>{s.name}</h3>
                                                <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{s.reason}</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'var(--primary)', borderRadius: '5px' }}>{s.eta}</span>
                                                <ChevronRight size={14} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="detail-view">
                                <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '15px' }} onClick={() => setSelectedItem(null)}>← Volver</button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <div style={{ padding: '10px', background: 'var(--primary)', borderRadius: '10px' }}>{getIcon(selectedItem.category)}</div>
                                    <h2>{selectedItem.name}</h2>
                                </div>
                                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '20px' }}>{selectedItem.reason}</p>

                                <div style={{ marginBottom: '15px' }}>
                                    <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>TRANSPORTE</h4>
                                    {(selectedItem.transport || []).map((t, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '10px', marginBottom: '5px', fontSize: '0.8rem' }}>
                                            <span>{t.mode}</span>
                                            <span>{t.time} • {t.cost}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', fontSize: '0.8rem' }}>
                                    <Info size={14} style={{ marginBottom: '5px', color: 'var(--primary)' }} />
                                    <p>{selectedItem.details}</p>
                                </div>

                                <button className="go-btn" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedItem.lat},${selectedItem.lng}`, '_blank')}>
                                    IR AHORA CON GOOGLE MAPS
                                </button>
                            </div>
                        )}
                    </div>
                </main>

                {showPrefs && (
                    <div className="modal-overlay" onClick={() => setShowPrefs(false)}>
                        <div className="modal-content premium-glass" onClick={(e) => e.stopPropagation()} style={{ width: '400px', padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Preferencias</h3>
                                <button style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', opacity: 0.6 }} onClick={() => setShowPrefs(false)}><X size={24} /></button>
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '1px', fontWeight: '800' }}>INTERESES</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {['cultura', 'comida', 'naturaleza', 'compras'].map(tag => (
                                        <div key={tag} className={`tag ${prefs.interests.includes(tag) ? 'active' : ''}`} onClick={() => toggleInterest(tag)}>{tag}</div>
                                    ))}
                                </div>
                            </div>
                            <button className="go-btn" onClick={() => setShowPrefs(false)}>Guardar</button>

                            <div className="settings-divider"></div>

                            <button
                                className="settings-item"
                                onClick={() => {
                                    setShowHistory(true);
                                    setShowPrefs(false);
                                }}
                            >
                                <History size={20} />
                                Historial de viajes
                            </button>
                            <button
                                className="settings-item danger"
                                onClick={() => {
                                    if (window.confirm('¿Archivar este viaje? Podrás verlo después en tu historial.')) {
                                        archiveCurrentTrip();
                                        setShowPrefs(false);
                                    }
                                }}
                            >
                                <Archive size={20} />
                                Terminar y archivar viaje
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Itinerary Modal */}
            {
                showItinerary && itinerary && createPortal(
                    <div className="modal-overlay" onClick={() => setShowItinerary(false)}>
                        <div className="modal-content itinerary-modal" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setShowItinerary(false)}>
                                <X size={24} />
                            </button>
                            <ItineraryViewer
                                tripContext={tripContext}
                                itinerary={itinerary}
                                onUpdate={(updated) => {
                                    setItinerary(updated);
                                    ItineraryManager.saveItinerary(tripContext.id, updated);
                                }}
                            />
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Expense Tracker Modal */}
            {
                showExpenses && tripContext && createPortal(
                    <div className="modal-overlay" onClick={() => setShowExpenses(false)}>
                        <div className="modal-content itinerary-modal" onClick={(e) => e.stopPropagation()}>
                            <ExpenseTracker
                                tripContext={tripContext}
                                itinerary={itinerary}
                                expenses={expenses}
                                categories={categories}
                                onUpdate={refreshExpenses}
                                onClose={() => setShowExpenses(false)}
                            />
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Travel Chat */}
            {
                showChat && tripContext && (
                    <TravelChat
                        tripContext={tripContext}
                        coords={coords}
                        expenseContext={expenseContext}
                        categories={categories}
                        itinerary={itinerary}
                        onItineraryUpdate={setItinerary}
                        onExpenseUpdate={refreshExpenses}
                        onPlacesFound={(places) => {
                            setFoundPlaces(places);
                            setSelectedPlace(null);
                            setShowRoute(false);
                        }}
                        onClose={() => setShowChat(false)}
                    />
                )
            }

            {
                showHistory && createPortal(
                    <div className="modal-overlay" onClick={() => setShowHistory(false)}>
                        <div className="modal-content itinerary-modal" onClick={(e) => e.stopPropagation()}>
                            <TripHistory
                                pastTrips={pastTrips}
                                onSelect={(trip) => {
                                    loadPastTrip(trip);
                                    setShowHistory(false);
                                }}
                                onClearAll={clearAllData}
                                onClose={() => setShowHistory(false)}
                            />
                        </div>
                    </div>,
                    document.body
                )
            }


            {/* API Usage Monitor Modal */}
            {showAPIUsage && (
                <APIUsageMonitor onClose={() => setShowAPIUsage(false)} />
            )}

        </div >
    );
}

export default AppWithMap;
