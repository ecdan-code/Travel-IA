import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Plus } from 'lucide-react';

/**
 * ActivityEditor - Modal para agregar/editar actividades del itinerario
 */
const ActivityEditor = ({ activity, dayIndex, onSave, onClose }) => {
    const isNewActivity = !activity;

    const [formData, setFormData] = useState({
        time: activity?.time || '09:00',
        title: activity?.title || '',
        description: activity?.description || '',
        location: activity?.location || '',
        duration: activity?.duration || 60,
        category: activity?.category || 'cultura',
        estimatedCost: activity?.estimatedCost || 0
    });

    const [errors, setErrors] = useState({});

    const categories = [
        { value: 'cultura', label: '🏛️ Cultura', color: '#8b5cf6' },
        { value: 'comida', label: '🍽️ Comida', color: '#f59e0b' },
        { value: 'naturaleza', label: '🌿 Naturaleza', color: '#10b981' },
        { value: 'entretenimiento', label: '🎭 Entretenimiento', color: '#ec4899' },
        { value: 'logística', label: '✈️ Logística', color: '#3b82f6' },
        { value: 'transporte', label: '🚗 Transporte', color: '#6366f1' }
    ];

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'El título es obligatorio';
        }

        if (!formData.location.trim()) {
            newErrors.location = 'La ubicación es obligatoria';
        }

        if (formData.duration < 1) {
            newErrors.duration = 'La duración debe ser mayor a 0';
        }

        if (formData.estimatedCost < 0) {
            newErrors.estimatedCost = 'El costo no puede ser negativo';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        const activityData = {
            ...formData,
            id: activity?.id || `activity-${Date.now()}`,
            duration: parseInt(formData.duration),
            estimatedCost: parseFloat(formData.estimatedCost)
        };

        onSave(activityData, dayIndex);
    };

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content activity-editor-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isNewActivity ? '➕ Nueva Actividad' : '✏️ Editar Actividad'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="activity-form">
                    <div className="form-group">
                        <label>Título *</label>
                        <input
                            type="text"
                            className={`trip-input ${errors.title ? 'error' : ''}`}
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="Ej: Visita al Museo Nacional"
                        />
                        {errors.title && <span className="error-text">{errors.title}</span>}
                    </div>

                    <div className="form-group">
                        <label>Descripción</label>
                        <textarea
                            className="trip-input"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Descripción de la actividad..."
                            rows={3}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Hora *</label>
                            <input
                                type="time"
                                className="trip-input"
                                value={formData.time}
                                onChange={(e) => handleChange('time', e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Duración (min) *</label>
                            <input
                                type="number"
                                className={`trip-input ${errors.duration ? 'error' : ''}`}
                                value={formData.duration}
                                onChange={(e) => handleChange('duration', e.target.value)}
                                min="1"
                            />
                            {errors.duration && <span className="error-text">{errors.duration}</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Ubicación *</label>
                        <input
                            type="text"
                            className={`trip-input ${errors.location ? 'error' : ''}`}
                            value={formData.location}
                            onChange={(e) => handleChange('location', e.target.value)}
                            placeholder="Ej: Museo Nacional, Ciudad de México"
                        />
                        {errors.location && <span className="error-text">{errors.location}</span>}
                    </div>

                    <div className="form-group">
                        <label>Categoría</label>
                        <div className="category-selector">
                            {categories.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    className={`category-btn ${formData.category === cat.value ? 'active' : ''}`}
                                    onClick={() => handleChange('category', cat.value)}
                                    style={{
                                        borderColor: formData.category === cat.value ? cat.color : 'transparent'
                                    }}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Costo Estimado (MXN)</label>
                        <input
                            type="number"
                            className={`trip-input ${errors.estimatedCost ? 'error' : ''}`}
                            value={formData.estimatedCost}
                            onChange={(e) => handleChange('estimatedCost', e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                        />
                        {errors.estimatedCost && <span className="error-text">{errors.estimatedCost}</span>}
                    </div>

                    <div className="form-actions">
                        <button type="button" className="back-btn" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="next-btn">
                            <Save size={18} />
                            {isNewActivity ? 'Agregar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ActivityEditor;
