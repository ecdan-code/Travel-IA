import React, { useState } from 'react';
import { MapPin, Clock, Navigation, DollarSign, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ActivityGuidance - Muestra la actividad actual/próxima del itinerario
 * con información de navegación y transporte
 */
const ActivityGuidance = ({ activity, coords, isCurrent = false }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    if (!activity) return null;

    const getCategoryIcon = (category) => {
        const icons = {
            cultura: '🏛️',
            comida: '🍽️',
            naturaleza: '🌿',
            entretenimiento: '🎭',
            logística: '✈️',
            transporte: '🚗'
        };
        return icons[category] || '📍';
    };

    const getCategoryColor = (category) => {
        const colors = {
            cultura: '#8b5cf6',
            comida: '#f59e0b',
            naturaleza: '#10b981',
            entretenimiento: '#ec4899',
            logística: '#3b82f6',
            transporte: '#ec4899'
        };
        return colors[category] || '#6b7280';
    };

    const openInGoogleMaps = () => {
        if (activity.lat && activity.lng) {
            window.open(
                `https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${activity.lat},${activity.lng}`,
                '_blank'
            );
        } else {
            const query = encodeURIComponent(activity.location);
            window.open(
                `https://www.google.com/maps/search/?api=1&query=${query}`,
                '_blank'
            );
        }
    };

    return (
        <div
            className={`activity-guidance ${isCollapsed ? 'collapsed' : 'expanded'}`}
            style={{
                borderLeftColor: getCategoryColor(activity.category)
            }}
        >
            {isCollapsed ? (
                // Vista minimizada
                <>
                    <div className="guidance-icon">
                        <span style={{ fontSize: '1.5rem' }}>
                            {getCategoryIcon(activity.category)}
                        </span>
                    </div>
                    <div className="guidance-content-mini">
                        <span className="guidance-badge-mini">
                            {isCurrent ? '🔴' : '⏭️'}
                        </span>
                        <span className="guidance-title-mini">{activity.title}</span>
                        <span className="guidance-time-mini">{activity.time}</span>
                    </div>
                    <button
                        className="toggle-guidance-btn"
                        onClick={() => setIsCollapsed(false)}
                        title="Expandir"
                    >
                        <ChevronUp size={20} />
                    </button>
                </>
            ) : (
                // Vista expandida
                <>
                    <div className="guidance-icon">
                        <span style={{ fontSize: '2rem' }}>
                            {getCategoryIcon(activity.category)}
                        </span>
                    </div>

                    <div className="guidance-content">
                        <div className="guidance-header">
                            <span className="guidance-badge">
                                {isCurrent ? '🔴 AHORA' : '⏭️ PRÓXIMO'}
                            </span>
                            <h3>{activity.title}</h3>
                        </div>

                        <p className="guidance-description">{activity.description}</p>

                        <div className="guidance-meta">
                            <div className="meta-row">
                                <Clock size={16} />
                                <span>{activity.time} • {activity.duration} min</span>
                            </div>
                            <div className="meta-row">
                                <MapPin size={16} />
                                <span>{activity.location}</span>
                            </div>
                            {activity.estimatedCost > 0 && (
                                <div className="meta-row">
                                    <DollarSign size={16} />
                                    <span>${activity.estimatedCost.toLocaleString('es-MX')}</span>
                                </div>
                            )}
                        </div>

                        <button
                            className="navigate-btn"
                            onClick={openInGoogleMaps}
                        >
                            <Navigation size={18} />
                            Navegar en Google Maps
                            <ExternalLink size={14} />
                        </button>
                    </div>

                    <button
                        className="toggle-guidance-btn"
                        onClick={() => setIsCollapsed(true)}
                        title="Minimizar"
                    >
                        <ChevronDown size={20} />
                    </button>
                </>
            )}
        </div>
    );
};

export default ActivityGuidance;
