import React from 'react';
import { Clock, MapPin, Calendar, ChevronRight, Trash2, History } from 'lucide-react';

const TripHistory = ({ pastTrips, onSelect, onClearAll, onClose }) => {
    return (
        <div className="trip-history-panel">
            <div className="history-header">
                <div className="header-title">
                    <History size={24} />
                    <h2>Historial de Viajes</h2>
                </div>
                <button className="close-btn" onClick={onClose}>&times;</button>
            </div>

            <div className="history-list">
                {pastTrips.length === 0 ? (
                    <div className="empty-history">
                        <Clock size={48} />
                        <p>No tienes viajes archivados aún.</p>
                        <span>Tus viajes aparecerán aquí cuando los termines.</span>
                    </div>
                ) : (
                    pastTrips.map((trip) => (
                        <div key={trip.id} className="history-item" onClick={() => onSelect(trip)}>
                            <div className="item-info">
                                <div className="item-destination">
                                    <MapPin size={16} />
                                    <span>{trip.destination}</span>
                                </div>
                                <div className="item-dates">
                                    <Calendar size={14} />
                                    <span>{new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <ChevronRight size={20} className="item-arrow" />
                        </div>
                    ))
                )}
            </div>

            {pastTrips.length > 0 && (
                <div className="history-footer">
                    <button className="clear-all-btn" onClick={() => {
                        if (window.confirm('¿Estás seguro de que quieres borrar todo tu historial? Esta acción no se puede deshacer.')) {
                            onClearAll();
                        }
                    }}>
                        <Trash2 size={16} />
                        Borrar todo el historial
                    </button>
                </div>
            )}
        </div>
    );
};

export default TripHistory;
