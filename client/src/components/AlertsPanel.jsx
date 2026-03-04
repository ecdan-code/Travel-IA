import React from 'react';
import { Bell, X, ExternalLink, MapPin, Plane, Calendar, Info } from 'lucide-react';
import AlertManager from '../utils/AlertManager';

const AlertsPanel = ({ alerts = [], onDismiss, onAction }) => {
    if (alerts.length === 0) return null;

    const getAlertIcon = (type) => {
        switch (type) {
            case 'flight':
                return <Plane size={20} />;
            case 'reminder':
                return <Calendar size={20} />;
            case 'departure':
                return <MapPin size={20} />;
            case 'arrival':
                return <Bell size={20} />;
            default:
                return <Info size={20} />;
        }
    };

    return (
        <div className="alerts-container">
            <div className="alerts-header">
                <Bell size={18} />
                <h3>Alertas ({alerts.length})</h3>
            </div>

            <div className="alerts-list">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`alert-card alert-${alert.priority}`}
                        style={{
                            borderLeftColor: AlertManager.getPriorityColor(alert.priority)
                        }}
                    >
                        <div className="alert-icon">
                            <span className="alert-emoji">{alert.icon}</span>
                            {getAlertIcon(alert.type)}
                        </div>

                        <div className="alert-content">
                            <div className="alert-header-row">
                                <h4>{alert.title}</h4>
                                <button
                                    className="alert-dismiss"
                                    onClick={() => onDismiss(alert.id)}
                                    title="Descartar"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <p>{alert.message}</p>

                            {alert.actions && alert.actions.length > 0 && (
                                <div className="alert-actions">
                                    {alert.actions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            className="alert-action-btn"
                                            onClick={() => onAction(alert.id, action.action)}
                                        >
                                            {action.label}
                                            <ExternalLink size={12} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            <span className="alert-time">
                                {new Date(alert.timestamp).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlertsPanel;
