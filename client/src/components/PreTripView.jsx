import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronRight, Plane, ShieldCheck } from 'lucide-react';

const PreTripView = ({ tripContext, onForceStart, onAbandon }) => {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const start = new Date(tripContext.startDate);
            const diff = start - now;

            if (diff <= 0) {
                clearInterval(timer);
                setTimeLeft(null);
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diff / (1000 * 60)) % 60);
                setTimeLeft({ days, hours, minutes });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [tripContext.startDate]);

    return (
        <div className="app pre-trip-bg" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: 'white',
            height: '100vh',
            overflowY: 'auto'
        }}>
            <div className="premium-glass" style={{
                padding: '40px 30px',
                borderRadius: '32px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--primary) transparent'
            }}>
                <div style={{ marginBottom: '30px' }}>
                    <Plane size={48} className="brand-logo" style={{ color: 'var(--primary)', marginBottom: '15px' }} />
                    <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Tu viaje está cerca</h1>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.8 }}>
                        <MapPin size={18} />
                        <span style={{ fontSize: '1.2rem' }}>{tripContext.destination}</span>
                    </div>
                </div>

                {timeLeft ? (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
                        <div className="countdown-item">
                            <span className="countdown-num">{timeLeft.days}</span>
                            <span className="countdown-label">Días</span>
                        </div>
                        <div className="countdown-item">
                            <span className="countdown-num">{timeLeft.hours}</span>
                            <span className="countdown-label">Hrs</span>
                        </div>
                        <div className="countdown-item">
                            <span className="countdown-num">{timeLeft.minutes}</span>
                            <span className="countdown-label">Min</span>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '20px', background: 'var(--primary-glow)', borderRadius: '15px', marginBottom: '30px' }}>
                        <p>¡Es hoy! Tu viaje ha comenzado.</p>
                    </div>
                )}

                <div className="info-card" style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '20px',
                    borderRadius: '20px',
                    textAlign: 'left',
                    marginBottom: '30px',
                    fontSize: '0.9rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <ShieldCheck size={18} color="var(--primary)" />
                        <strong>Modo de Espera Activo</strong>
                    </div>
                    <p style={{ opacity: 0.7 }}>
                        El asistente proactivo se activará automáticamente cuando llegues a {tripContext.destination} o comience la fecha de tu viaje.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button className="next-btn" style={{ width: '100%' }} onClick={() => window.location.reload()}>
                        Verificar estado actual
                    </button>
                    <button
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'underline', cursor: 'pointer' }}
                        onClick={onForceStart}
                    >
                        Comenzar ahora (Forzar activación)
                    </button>
                    <button
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', marginTop: '10px', opacity: 0.6, cursor: 'pointer' }}
                        onClick={() => {
                            if (confirm('¿Seguro que quieres abandonar este viaje y empezar de nuevo?')) onAbandon();
                        }}
                    >
                        Abandonar viaje y empezar de nuevo
                    </button>
                </div>
            </div>

            <style>{`
                .countdown-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .countdown-num {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: var(--primary);
                }
                .countdown-label {
                    font-size: 0.8rem;
                    opacity: 0.6;
                    text-transform: uppercase;
                }
                .pre-trip-bg {
                    background-image: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
                                      radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 40%);
                }
            `}</style>
        </div>
    );
};

export default PreTripView;
