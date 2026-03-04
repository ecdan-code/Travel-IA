import React, { useState, useEffect } from 'react';

/**
 * APIUsageMonitor - Muestra estadísticas de uso de Google Places API
 */
const APIUsageMonitor = ({ onClose }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/usage-stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('[Usage Monitor] Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div className="loading-spinner"></div>
                        <p>Cargando estadísticas...</p>
                    </div>
                </div>
            </div>
        );
    }

    const getWarningColor = (warning) => {
        if (warning === 'high') return '#ff4444';
        if (warning === 'medium') return '#ffaa00';
        return '#44ff44';
    };

    const getWarningIcon = (warning) => {
        if (warning === 'high') return '⚠️';
        if (warning === 'medium') return '⚡';
        return '✅';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>📊 Uso de API</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {stats && (
                    <div style={{ padding: '20px' }}>
                        {/* Header con advertencia */}
                        <div style={{
                            background: getWarningColor(stats.warning) + '22',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '2rem' }}>{getWarningIcon(stats.warning)}</div>
                            <p style={{ margin: '5px 0', fontWeight: '600' }}>
                                Uso: {stats.usagePercent}%
                            </p>
                        </div>

                        {/* Estadísticas */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{
                                background: 'var(--card-bg)',
                                padding: '15px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Búsquedas Hoy</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--primary)' }}>
                                    {stats.placesSearchCount}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '5px' }}>
                                    Último reset: {stats.lastReset}
                                </div>
                            </div>

                            <div style={{
                                background: 'var(--card-bg)',
                                padding: '15px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Costo Estimado</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#ff6b6b' }}>
                                    ${stats.estimatedCost}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '5px' }}>
                                    Tarifa: $0.032 por búsqueda
                                </div>
                            </div>

                            <div style={{
                                background: 'var(--card-bg)',
                                padding: '15px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Crédito Restante</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#51cf66' }}>
                                    ${stats.remainingCredit}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '5px' }}>
                                    De $200 mensuales gratis
                                </div>
                            </div>
                        </div>

                        {/* Mensajes de advertencia */}
                        {stats.warning === 'high' && (
                            <div style={{
                                marginTop: '20px',
                                padding: '12px',
                                background: '#ff444422',
                                border: '1px solid #ff4444',
                                borderRadius: '8px',
                                fontSize: '0.9rem'
                            }}>
                                <strong>⚠️ Alto uso:</strong> Estás cerca del límite gratuito. Considera reducir las búsquedas.
                            </div>
                        )}
                        {stats.warning === 'medium' && (
                            <div style={{
                                marginTop: '20px',
                                padding: '12px',
                                background: '#ffaa0022',
                                border: '1px solid #ffaa00',
                                borderRadius: '8px',
                                fontSize: '0.9rem'
                            }}>
                                <strong>⚡ Uso moderado:</strong> Vas por buen camino, pero monitorea tu uso.
                            </div>
                        )}

                        {/* Info adicional */}
                        <div style={{
                            marginTop: '20px',
                            padding: '15px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <p style={{ margin: '0 0 8px 0' }}>
                                <strong>💡 Nota:</strong> Google Places API ofrece $200 de crédito gratis mensual.
                            </p>
                            <p style={{ margin: 0 }}>
                                Las estadísticas se resetean diariamente. El costo es aproximado.
                            </p>
                        </div>
                    </div>
                )}

                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default APIUsageMonitor;
