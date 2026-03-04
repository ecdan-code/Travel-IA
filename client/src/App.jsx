import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import {
    MapPin, Navigation, Compass, Star, Train, Utensils,
    Map as MapIcon, Info, Coffee, Camera, Bus, Wallet, Clock, ChevronRight, Settings, Heart, X, Check, RefreshCw, Search
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import GeofenceDetector from './utils/GeofenceDetector';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (map && center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

function App() {
    const { session } = useAuth();
    const [coords, setCoords] = useState({ lat: 35.6984, lng: 139.7731 });
    const [locationName, setLocationName] = useState("Localizando...");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isProactive, setIsProactive] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showPrefs, setShowPrefs] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastFetchCoords, setLastFetchCoords] = useState(null);
    const [lastFetchTime, setLastFetchTime] = useState(0);

    const [prefs, setPrefs] = useState({
        interests: ['cultura', 'comida'],
        budget: 'medio',
        diet: 'todo'
    });

    useEffect(() => {
        if (!navigator.geolocation) return;
        const watcher = navigator.geolocation.watchPosition(
            (pos) => {
                const nc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCoords(nc);
                setLocationName(`${nc.lat.toFixed(3)}, ${nc.lng.toFixed(3)}`);
            },
            (err) => console.warn("Geo error:", err),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watcher);
    }, []);

    useEffect(() => {
        if (isProactive) {
            const now = Date.now();
            const MIN_TIME = 5 * 60 * 1000; // 5 minutes
            const MIN_DIST = 0.5; // 500 meters

            let shouldFetch = false;

            if (!lastFetchCoords) {
                shouldFetch = true;
            } else {
                const dist = GeofenceDetector.getDistanceKm(
                    coords.lat, coords.lng,
                    lastFetchCoords.lat, lastFetchCoords.lng
                );
                const timePassed = now - lastFetchTime;

                if (dist >= MIN_DIST || timePassed >= MIN_TIME) {
                    shouldFetch = true;
                }
            }

            if (shouldFetch) {
                fetchSuggestions(coords);
            }
        }
    }, [isProactive, coords.lat, coords.lng, prefs]);

    const fetchSuggestions = async (c, query = '') => {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const r = await fetch(`${API_BASE_URL}/api/suggest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    location: c,
                    time: new Date().toLocaleTimeString(),
                    state: "Explorando",
                    preferences: `Intereses: ${prefs.interests.join(', ')}. Presupuesto: ${prefs.budget}. Dieta: ${prefs.diet}`,
                    searchQuery: query
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const d = await r.json();

            if (d.error === "QUOTA_EXCEEDED") {
                console.warn("API Quota Limit", d.message);
            }

            setSuggestions(d.suggestions || []);
            setLastFetchCoords(c);
            setLastFetchTime(Date.now());
        } catch (e) {
            clearTimeout(timeoutId);
            console.warn("API Fallback", e.message);
            setSuggestions([
                { name: "Santuario Shinto", reason: "Paz cerca del ruido.", price_range: "Gratis", transport: [{ mode: "caminando", time: "6m", cost: "0" }], eta: "6m", category: "cultura", lat: c.lat + 0.002, lng: c.lng + 0.001, details: "Lugar sagrado." },
                { name: "Takoyaki Street", reason: "Snacks calientes ahora.", price_range: "¥500", transport: [{ mode: "caminando", time: "3m", cost: "0" }], eta: "3m", category: "comida", lat: c.lat - 0.001, lng: c.lng + 0.002, details: "Prueba el original." }
            ]);
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

    // Prepare markers data
    const validSuggestions = suggestions.filter(s => s.lat && s.lng);

    return (
        <div className="app">
            <div className="map-container">
                <MapContainer
                    center={[coords.lat, coords.lng]}
                    zoom={15}
                    zoomControl={false}
                    style={{ height: '100%', width: '100%', filter: 'invert(100%) hue-rotate(180deg) brightness(95%)' }}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapUpdater center={[coords.lat, coords.lng]} />
                    <Marker position={[coords.lat, coords.lng]}>
                        <Popup>Tú</Popup>
                    </Marker>
                    {validSuggestions.map((s, i) => (
                        <Marker key={`marker-${i}`} position={[s.lat, s.lng]}>
                            <Popup>{s.name}</Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            <div className="ui-overlay">
                <header className="header premium-glass">
                    <div className="brand" onClick={() => setShowPrefs(true)}>
                        <Compass className="brand-logo" />
                        <div>
                            <h1 style={{ fontSize: '1.2rem' }}>TRAVEL IA</h1>
                            <span className="live-tag">LIVE GPS</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="icon-btn premium-glass" style={{ border: 'none', color: 'white', padding: '8px', borderRadius: '10px' }} onClick={() => setShowPrefs(true)}>
                            <Settings size={18} />
                        </button>
                        <div className={`mode-toggle ${isProactive ? 'active' : ''}`} onClick={() => setIsProactive(!isProactive)}>
                            {isProactive ? 'PROACTIVO' : 'MANUAL'}
                        </div>
                    </div>
                </header>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="search-bar premium-glass">
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

                <main className="content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="quick-stats">
                        <div className="stat-pill">
                            <MapPin size={12} /> {locationName}
                        </div>
                        <div className="stat-pill">
                            <Heart size={12} color="#f43f5e" /> {prefs.interests.length} temas
                        </div>
                    </div>

                    <div className={`main-card premium-glass ${selectedItem ? 'expanded' : ''}`}>
                        <div className="handle" onClick={() => setSelectedItem(null)}></div>

                        {!selectedItem ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h2 style={{ fontSize: '1rem' }}><Navigation size={16} /> {searchQuery ? `"${searchQuery}"` : 'Sugerencias'}</h2>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {!isProactive && (
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
                                    {suggestions.length === 0 && !loading && <p style={{ textAlign: 'center', opacity: 0.5 }}>Buscando maravillas...</p>}
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
                    <div className="modal-overlay">
                        <div className="modal premium-glass">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3>Preferencias</h3>
                                <button style={{ background: 'none', border: 'none', color: 'white' }} onClick={() => setShowPrefs(false)}><X size={20} /></button>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>INTERESES</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {['cultura', 'comida', 'naturaleza', 'compras'].map(tag => (
                                        <div key={tag} className={`tag ${prefs.interests.includes(tag) ? 'active' : ''}`} onClick={() => toggleInterest(tag)}>{tag}</div>
                                    ))}
                                </div>
                            </div>
                            <button className="go-btn" style={{ marginTop: '10px' }} onClick={() => setShowPrefs(false)}>Guardar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
