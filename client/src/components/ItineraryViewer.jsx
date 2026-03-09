import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, DollarSign, ChevronDown, ChevronUp, Plus, Edit, Trash2 } from 'lucide-react';
import ItineraryManager from '../utils/ItineraryManager';
import ActivityEditor from './ActivityEditor';

const ItineraryViewer = ({ tripContext, itinerary, onUpdate }) => {
    const [expandedDay, setExpandedDay] = useState(0);
    const [currentActivity, setCurrentActivity] = useState(null);
    const [editingActivity, setEditingActivity] = useState(null);
    const [editingDayIndex, setEditingDayIndex] = useState(null);

    useEffect(() => {
        if (itinerary) {
            const current = ItineraryManager.getCurrentActivity(itinerary);
            setCurrentActivity(current);

            // Auto-expand current day
            const today = new Date().toISOString().split('T')[0];
            const currentDayIndex = itinerary.days.findIndex(day => day.date === today);
            if (currentDayIndex !== -1) {
                setExpandedDay(currentDayIndex);
            } else {
                // If today is not in itinerary, expand first day
                setExpandedDay(0);
            }
        }
    }, [itinerary]);

    if (!itinerary) {
        return (
            <div className="itinerary-empty">
                <Calendar size={48} opacity={0.3} />
                <p>No hay itinerario generado</p>
            </div>
        );
    }

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
            transporte: '#6366f1'
        };
        return colors[category] || '#6b7280';
    };

    const formatDate = (dateString) => {
        // Parse date string as local timezone to avoid off-by-one errors
        // When dateString is "2026-02-07", new Date() interprets it as UTC midnight,
        // which becomes the previous day in negative timezones (like Mexico UTC-6)
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    const formatCurrency = (amount) => {
        return `$${amount.toLocaleString('es-MX')}`;
    };

    const handleEditActivity = (activity, dayIndex) => {
        setEditingActivity(activity);
        setEditingDayIndex(dayIndex);
    };

    const handleAddActivity = (dayIndex) => {
        setEditingActivity(null); // null means new activity
        setEditingDayIndex(dayIndex);
    };

    const handleSaveActivity = (activityData, dayIndex) => {
        const updatedItinerary = { ...itinerary };

        if (editingActivity) {
            // Edit existing activity
            const activityIndex = updatedItinerary.days[dayIndex].activities.findIndex(
                a => a.id === editingActivity.id
            );
            if (activityIndex !== -1) {
                updatedItinerary.days[dayIndex].activities[activityIndex] = activityData;
            }
        } else {
            // Add new activity
            updatedItinerary.days[dayIndex].activities.push(activityData);
            // Sort activities by time
            updatedItinerary.days[dayIndex].activities.sort((a, b) =>
                a.time.localeCompare(b.time)
            );
        }

        // Recalculate total cost
        updatedItinerary.totalEstimatedCost = ItineraryManager.calculateTotalCost(updatedItinerary);

        onUpdate(updatedItinerary);
        setEditingActivity(null);
        setEditingDayIndex(null);
    };

    const handleDeleteActivity = (dayIndex, activityId) => {
        if (!confirm('¿Estás seguro de eliminar esta actividad?')) return;

        const updatedItinerary = { ...itinerary };
        updatedItinerary.days[dayIndex].activities = updatedItinerary.days[dayIndex].activities.filter(
            a => a.id !== activityId
        );

        // Recalculate total cost
        updatedItinerary.totalEstimatedCost = ItineraryManager.calculateTotalCost(updatedItinerary);

        onUpdate(updatedItinerary);
    };

    return (
        <div className="itinerary-viewer">
            <div className="itinerary-header">
                <div className="itinerary-title">
                    <Calendar size={24} />
                    <h2>Itinerario de {tripContext?.destination || 'Viaje'}</h2>
                </div>
                <div className="itinerary-summary">
                    <span>{itinerary.days.length} días</span>
                    <span className="separator">•</span>
                    <span>{formatCurrency(itinerary.totalEstimatedCost || 0)} estimado</span>
                </div>
            </div>

            {currentActivity && (
                <div className="current-activity-banner">
                    <div className="banner-icon">⏰</div>
                    <div className="banner-content">
                        <h4>Actividad actual</h4>
                        <p>{currentActivity.title}</p>
                        <span className="banner-time">{currentActivity.time}</span>
                    </div>
                </div>
            )}

            <div className="itinerary-days">
                {itinerary.days.map((day, dayIndex) => (
                    <div key={day.date} className="day-card">
                        <div
                            className="day-header"
                            onClick={() => setExpandedDay(expandedDay === dayIndex ? -1 : dayIndex)}
                        >
                            <div className="day-info">
                                <div className="day-number">Día {day.dayNumber}</div>
                                <div className="day-date">{formatDate(day.date)}</div>
                            </div>
                            <div className="day-stats">
                                <span>{day.activities.length} actividades</span>
                                {expandedDay === dayIndex ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        {expandedDay === dayIndex && (
                            <div className="day-activities">
                                {day.activities.map((activity, actIndex) => (
                                    <div
                                        key={activity.id}
                                        className={`activity-card ${currentActivity?.id === activity.id ? 'current' : ''}`}
                                        style={{ borderLeftColor: getCategoryColor(activity.category) }}
                                    >
                                        <div className="activity-time">
                                            <Clock size={16} />
                                            <span>{activity.time}</span>
                                        </div>

                                        <div className="activity-content">
                                            <div className="activity-header">
                                                <span className="activity-icon">
                                                    {getCategoryIcon(activity.category)}
                                                </span>
                                                <h4>{activity.title}</h4>
                                            </div>

                                            <p className="activity-description">{activity.description}</p>

                                            <div className="activity-meta">
                                                <div className="meta-item">
                                                    <MapPin size={14} />
                                                    <span>{activity.location}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <Clock size={14} />
                                                    <span>{activity.duration} min</span>
                                                </div>
                                                {activity.estimatedCost > 0 && (
                                                    <div className="meta-item">
                                                        <DollarSign size={14} />
                                                        <span>{formatCurrency(activity.estimatedCost)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="activity-actions">
                                                <button
                                                    className="activity-action-btn edit-btn"
                                                    onClick={() => handleEditActivity(activity, dayIndex)}
                                                    title="Editar actividad"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    className="activity-action-btn delete-btn"
                                                    onClick={() => handleDeleteActivity(dayIndex, activity.id)}
                                                    title="Eliminar actividad"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    className="add-activity-btn"
                                    onClick={() => handleAddActivity(dayIndex)}
                                >
                                    <Plus size={16} />
                                    Agregar actividad
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {editingDayIndex !== null && (
                <ActivityEditor
                    activity={editingActivity}
                    dayIndex={editingDayIndex}
                    onSave={handleSaveActivity}
                    onClose={() => {
                        setEditingActivity(null);
                        setEditingDayIndex(null);
                    }}
                />
            )}
        </div>
    );
};

export default ItineraryViewer;
