import React, { useState, useEffect } from 'react';
import {
    MapPin, Navigation, Compass, Star, Train, Utensils,
    Info, Camera, Bus, Clock, ChevronRight, Settings, Heart, X
} from 'lucide-react';

function AppSimple() {
    const [coords, setCoords] = useState({ lat: 35.6984, lng: 139.7731 });
    const [locationName, setLocationName] = useState("Tokio, Japón");
    const [suggestions, setSuggestions] = useState([
        {
            name: "Santuario Meiji",
            reason: "Paz espiritual cerca de Harajuku",
            price_range: "Gratis",
            transport: [{ mode: "caminando", time: "6m", cost: "0" }],
            eta: "6m",
            category: "cultura",
            lat: 35.6762,
            lng: 139.6993,
            details: "Lugar sagrado tranquilo."
        },
        {
            name: "Ichiran Ramen",
            reason: "Ramen caliente perfecto para ahora",
            price_range: "¥1000",
            transport: [{ mode: "caminando", time: "3m", cost: "0" }],
            eta: "3m",
            category: "comida",
            lat: 35.6950,
            lng: 139.7003,
            details: "Ramen auténtico 24/7."
        }
    ]);
    const [loading, setLoading] = useState(false);
    const [isProactive, setIsProactive] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showPrefs, setShowPrefs] = useState(false);
    const [prefs, setPrefs] = useState({
        interests: ['cultura', 'comida'],
        budget: 'medio',
        diet: 'todo'
    });

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

    return (
        <div className="app">
            <div className="map-container" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    <Compass size={60} />
                    <h3 style={{ marginTop: '10px' }}>Mapa Interactivo</h3>
                    <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Coming soon...</p>
                </div>
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                    <h2 style={{ fontSize: '1rem' }}><Navigation size={16} /> Sugerencias</h2>
                                    {loading && <div className="loader"></div>}
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

export default AppSimple;
