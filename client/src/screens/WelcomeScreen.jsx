import React, { useState } from 'react';
import { Plane, MapPin, Calendar, Globe, ArrowRight, X, User, LogOut } from 'lucide-react';
import { useTripContext } from '../contexts/TripContextProvider';
import { useAuth } from '../contexts/AuthContext';

const WelcomeScreen = ({ onComplete }) => {
    const { user, signOut } = useAuth();
    const { createTrip } = useTripContext();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        destination: '',
        destinationCountry: '',
        isInternational: null,
        startDate: '',
        endDate: '',
        hasFlightInfo: false,
        flightNumber: '',
        flightDate: '',
        flightTime: '',
        departureAirport: '',
        interests: [],
        budget: 'medio'
    });

    const interests = [
        { id: 'cultura', label: 'Cultura', icon: '🏛️' },
        { id: 'comida', label: 'Comida', icon: '🍽️' },
        { id: 'naturaleza', label: 'Naturaleza', icon: '🌳' },
        { id: 'compras', label: 'Compras', icon: '🛍️' },
        { id: 'aventura', label: 'Aventura', icon: '🏔️' },
        { id: 'playa', label: 'Playa', icon: '🏖️' }
    ];

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleInterest = (interestId) => {
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(interestId)
                ? prev.interests.filter(i => i !== interestId)
                : [...prev.interests, interestId]
        }));
    };

    const handleSubmit = () => {
        createTrip(formData);
        onComplete();
    };

    const canProceedStep1 = formData.destination && formData.destinationCountry && formData.isInternational !== null;
    const canProceedStep2 = formData.startDate && formData.endDate;
    const canProceedStep3 = !formData.hasFlightInfo || (formData.flightNumber && formData.flightDate && formData.flightTime && formData.departureAirport);
    const canProceedStep4 = formData.interests.length > 0;

    return (
        <div className="welcome-overlay">
            <div className="welcome-container premium-glass">
                {/* User Indicator - Fixed at top right */}
                <div className="user-indicator premium-glass" style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--glass-border)',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 10
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

                {/* Header */}
                <div className="welcome-header">
                    <Plane size={40} color="#ec4899" />
                    <h1>¡Bienvenido a Travel IA!</h1>
                    <p>Configura tu viaje para recibir asistencia personalizada</p>
                </div>

                {/* Progress */}
                <div className="welcome-progress">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`progress-dot ${step >= s ? 'active' : ''}`} />
                    ))}
                </div>

                {/* Step 1: Destino */}
                {step === 1 && (
                    <div className="welcome-step">
                        <div className="step-icon">
                            <MapPin size={24} />
                        </div>
                        <h2>¿A dónde viajas?</h2>

                        <div className="form-group">
                            <label>Ciudad/Destino</label>
                            <input
                                type="text"
                                placeholder="ej: París, Tokyo, Cancún..."
                                value={formData.destination}
                                onChange={(e) => updateFormData('destination', e.target.value)}
                                className="trip-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>País</label>
                            <input
                                type="text"
                                placeholder="ej: Francia, Japón, México..."
                                value={formData.destinationCountry}
                                onChange={(e) => updateFormData('destinationCountry', e.target.value)}
                                className="trip-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Tipo de viaje</label>
                            <div className="trip-type-buttons">
                                <button
                                    className={`type-btn ${formData.isInternational === true ? 'active' : ''}`}
                                    onClick={() => updateFormData('isInternational', true)}
                                >
                                    <Globe size={20} />
                                    Internacional
                                </button>
                                <button
                                    className={`type-btn ${formData.isInternational === false ? 'active' : ''}`}
                                    onClick={() => updateFormData('isInternational', false)}
                                >
                                    <MapPin size={20} />
                                    Nacional
                                </button>
                            </div>
                        </div>

                        <button
                            className="next-btn"
                            disabled={!canProceedStep1}
                            onClick={() => setStep(2)}
                        >
                            Continuar <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {/* Step 2: Fechas */}
                {step === 2 && (
                    <div className="welcome-step">
                        <div className="step-icon">
                            <Calendar size={24} />
                        </div>
                        <h2>¿Cuándo es tu viaje?</h2>

                        <div className="form-group">
                            <label>Fecha de inicio</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => updateFormData('startDate', e.target.value)}
                                className="trip-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Fecha de fin</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => updateFormData('endDate', e.target.value)}
                                className="trip-input"
                                min={formData.startDate}
                            />
                        </div>

                        <div className="form-actions">
                            <button className="back-btn" onClick={() => setStep(1)}>
                                Atrás
                            </button>
                            <button
                                className="next-btn"
                                disabled={!canProceedStep2}
                                onClick={() => setStep(3)}
                            >
                                Continuar <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Vuelo */}
                {step === 3 && (
                    <div className="welcome-step">
                        <div className="step-icon">
                            <Plane size={24} />
                        </div>
                        <h2>Información de vuelo</h2>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.hasFlightInfo}
                                    onChange={(e) => updateFormData('hasFlightInfo', e.target.checked)}
                                />
                                <span>Tengo información de vuelo</span>
                            </label>
                        </div>

                        {formData.hasFlightInfo && (
                            <>
                                <div className="form-group">
                                    <label>Número de vuelo</label>
                                    <input
                                        type="text"
                                        placeholder="ej: AA1234"
                                        value={formData.flightNumber}
                                        onChange={(e) => updateFormData('flightNumber', e.target.value)}
                                        className="trip-input"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Fecha del vuelo</label>
                                        <input
                                            type="date"
                                            value={formData.flightDate}
                                            onChange={(e) => updateFormData('flightDate', e.target.value)}
                                            className="trip-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Hora</label>
                                        <input
                                            type="time"
                                            value={formData.flightTime}
                                            onChange={(e) => updateFormData('flightTime', e.target.value)}
                                            className="trip-input"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Aeropuerto de salida</label>
                                    <input
                                        type="text"
                                        placeholder="ej: Aeropuerto Internacional CDMX"
                                        value={formData.departureAirport}
                                        onChange={(e) => updateFormData('departureAirport', e.target.value)}
                                        className="trip-input"
                                    />
                                </div>
                            </>
                        )}

                        <div className="form-actions">
                            <button className="back-btn" onClick={() => setStep(2)}>
                                Atrás
                            </button>
                            <button
                                className="next-btn"
                                disabled={!canProceedStep3}
                                onClick={() => setStep(4)}
                            >
                                Continuar <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Preferencias */}
                {step === 4 && (
                    <div className="welcome-step">
                        <div className="step-icon">
                            ❤️
                        </div>
                        <h2>¿Qué te interesa?</h2>
                        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '20px' }}>
                            Selecciona tus intereses para recomendaciones personalizadas
                        </p>

                        <div className="interests-grid">
                            {interests.map(interest => (
                                <button
                                    key={interest.id}
                                    className={`interest-btn ${formData.interests.includes(interest.id) ? 'active' : ''}`}
                                    onClick={() => toggleInterest(interest.id)}
                                >
                                    <span className="interest-icon">{interest.icon}</span>
                                    <span>{interest.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>Nivel de Gasto</label>
                            <div className="budget-selector">
                                {['bajo', 'medio', 'alto'].map(b => (
                                    <button
                                        key={b}
                                        className={`budget-opt ${formData.budget === b ? 'active' : ''}`}
                                        onClick={() => updateFormData('budget', b)}
                                    >
                                        {b.charAt(0).toUpperCase() + b.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>Presupuesto Total Estimado (MXN)</label>
                            <input
                                type="number"
                                placeholder="ej: 10000"
                                value={formData.totalBudget || ''}
                                onChange={(e) => updateFormData('totalBudget', e.target.value)}
                                className="trip-input"
                                min="0"
                            />
                            <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '5px' }}>
                                Esto ayudará al asistente a darte mejores recomendaciones financieras.
                            </p>
                        </div>

                        <div className="form-actions">
                            <button className="back-btn" onClick={() => setStep(3)}>
                                Atrás
                            </button>
                            <button
                                className="next-btn"
                                disabled={!canProceedStep4}
                                onClick={handleSubmit}
                            >
                                ¡Comenzar viaje! 🚀
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WelcomeScreen;
