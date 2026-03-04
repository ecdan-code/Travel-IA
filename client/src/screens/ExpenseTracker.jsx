import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, X, TrendingUp, Calendar, Tag } from 'lucide-react';
import expenseStorage from '../utils/expenseStorage';

/**
 * ExpenseTracker - Pantalla de tracking de gastos del viaje
 */
const ExpenseTracker = ({ tripContext, itinerary, expenses: expensesProp, categories, onUpdate, onClose }) => {
    const [expenses, setExpenses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [totalByCategory, setTotalByCategory] = useState({});
    const [budget, setBudget] = useState(0);
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [editValue, setEditValue] = useState('');

    // Categorías por defecto si no se pasan
    const displayCategories = categories && categories.length > 0 ? categories : [
        { id: 'comida', label: '🍔 Comida', value: 'comida', color: '#f59e0b' },
        { id: 'transporte', label: '🚗 Transporte', value: 'transporte', color: '#3b82f6' },
        { id: 'actividades', label: '🎟️ Actividades', value: 'actividades', color: '#8b5cf6' },
        { id: 'hospedaje', label: '🏨 Hospedaje', value: 'hospedaje', color: '#ec4899' },
        { id: 'compras', label: '🛍️ Compras', value: 'compras', color: '#10b981' },
        { id: 'otros', label: '✨ Otros', value: 'otros', color: '#6b7280' }
    ];

    useEffect(() => {
        if (expensesProp) {
            setExpenses(expensesProp);
            setTotalByCategory(expenseStorage.getTotalByCategory(tripContext.id));
            const savedBudget = expenseStorage.getBudget(tripContext.id);

            // Si no hay presupuesto guardado pero hay en tripContext, guardarlo automáticamente
            if (savedBudget === null && tripContext.totalBudget) {
                const budgetValue = parseFloat(tripContext.totalBudget);
                expenseStorage.saveBudget(tripContext.id, budgetValue);
                setBudget(budgetValue);
                console.log('[ExpenseTracker] Auto-saved budget from tripContext:', budgetValue);
            } else {
                // Usar el guardado, o el del itinerario, o el de tripContext, o 0
                setBudget(savedBudget !== null ? savedBudget : (tripContext.totalBudget || itinerary?.totalEstimatedCost || 0));
            }
        }
    }, [expensesProp, tripContext, itinerary]);

    const loadExpenses = () => {
        // Now just a wrapper for onUpdate if we want to force refresh, 
        // but typically the prop change will handle it.
        onUpdate?.();
    };

    const handleSaveBudget = () => {
        const numValue = parseFloat(editValue);
        if (!isNaN(numValue) && numValue >= 0) {
            expenseStorage.saveBudget(tripContext.id, numValue);
            setBudget(numValue);
            setIsEditingBudget(false);
            onUpdate?.(); // Notify parent of budget change
        }
    };

    const handleAddExpense = (expenseData) => {
        expenseStorage.addExpense(tripContext.id, expenseData);
        onUpdate?.();
        setShowForm(false);
    };

    const handleDeleteExpense = (expenseId) => {
        if (!confirm('¿Eliminar este gasto?')) return;
        expenseStorage.removeExpense(tripContext.id, expenseId);
        onUpdate?.();
    };

    const totalSpent = expenseStorage.getTotalSpent(tripContext.id);
    const budgetEstimate = budget;
    const remainingAmount = budgetEstimate - totalSpent;
    const budgetProgress = budgetEstimate > 0 ? (totalSpent / budgetEstimate) * 100 : 0;

    const getCategoryColor = (category) => {
        const cat = displayCategories.find(c => c.value === category);
        return cat ? cat.color : '#6b7280';
    };

    const getCategoryLabel = (category) => {
        const cat = displayCategories.find(c => c.value === category);
        return cat ? cat.label : '✨ Otros';
    };

    const formatCurrency = (amount) => {
        return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <div className="expense-tracker">
                <div className="tracker-header">
                    <div>
                        <h2>💰 Control de Gastos</h2>
                        <p className="tracker-subtitle">{tripContext.destination}</p>
                    </div>
                    <button className="icon-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Budget Summary */}
                <div className="budget-summary">
                    <div className="budget-stat">
                        <span className="stat-label">Total Gastado</span>
                        <span className="stat-value spent">{formatCurrency(totalSpent)}</span>
                    </div>
                    <div className="budget-stat" onClick={() => { setIsEditingBudget(true); setEditValue(budgetEstimate.toString()); }}>
                        <span className="stat-label">Presupuesto Estimado ✏️</span>
                        {isEditingBudget ? (
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <input
                                    autoFocus
                                    className="trip-input"
                                    style={{ width: '100px', height: '30px', margin: 0, padding: '2px 8px', fontSize: '1rem' }}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleSaveBudget}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveBudget();
                                        if (e.key === 'Escape') setIsEditingBudget(false);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        ) : (
                            <span className="stat-value" style={{ cursor: 'pointer' }}>{formatCurrency(budgetEstimate)}</span>
                        )}
                    </div>
                    <div className="budget-stat">
                        <span className="stat-label">Dinero Restante</span>
                        <span className={`stat-value remaining ${remainingAmount < 0 ? 'negative' : 'positive'}`}>
                            {formatCurrency(remainingAmount)}
                        </span>
                    </div>
                    <div className="budget-progress-container">
                        <div className="progress-bar">
                            <div
                                className={`progress-fill ${budgetProgress > 100 ? 'over-budget' : ''}`}
                                style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                            />
                        </div>
                        <span className="progress-label">
                            {budgetProgress.toFixed(0)}% del presupuesto
                        </span>
                    </div>
                </div>

                {/* Category Breakdown */}
                {Object.keys(totalByCategory).length > 0 && (
                    <div className="category-breakdown">
                        <h3>Por Categoría</h3>
                        <div className="category-bars">
                            {displayCategories.map(cat => {
                                const amount = totalByCategory[cat.value] || 0;
                                if (amount === 0) return null;
                                const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                                return (
                                    <div key={cat.id} className="category-bar-item">
                                        <div className="category-bar-header">
                                            <span>{cat.label}</span>
                                            <span className="category-amount">{formatCurrency(amount)} ({percentage.toFixed(0)}%)</span>
                                        </div>
                                        <div className="category-bar">
                                            <div
                                                className="category-bar-fill"
                                                style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Expenses List */}
                <div className="expenses-section">
                    <div className="section-header">
                        <h3>Gastos Registrados ({expenses.length})</h3>
                        <button className="add-expense-btn" onClick={() => setShowForm(true)}>
                            <Plus size={18} />
                            Agregar Gasto
                        </button>
                    </div>

                    {expenses.length === 0 ? (
                        <div className="empty-state">
                            <DollarSign size={48} opacity={0.3} />
                            <p>No hay gastos registrados</p>
                            <button className="next-btn" onClick={() => setShowForm(true)}>
                                Agregar primer gasto
                            </button>
                        </div>
                    ) : (
                        <div className="expenses-list">
                            {expenses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(expense => (
                                <div key={expense.id} className="expense-item">
                                    <div className="expense-category-badge" style={{ backgroundColor: `${getCategoryColor(expense.category)}20`, color: getCategoryColor(expense.category) }}>
                                        {getCategoryLabel(expense.category).split(' ')[0]}
                                    </div>
                                    <div className="expense-details">
                                        <div className="expense-main">
                                            <span className="expense-description">{expense.description}</span>
                                            <span className="expense-amount">{formatCurrency(expense.amount)}</span>
                                        </div>
                                        <div className="expense-meta">
                                            <span>{formatDate(expense.timestamp)}</span>
                                            {expense.location && <span>• {expense.location}</span>}
                                        </div>
                                    </div>
                                    <button
                                        className="delete-expense-btn"
                                        onClick={() => handleDeleteExpense(expense.id)}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showForm && (
                <ExpenseForm
                    onSave={handleAddExpense}
                    onClose={() => setShowForm(false)}
                    categories={displayCategories}
                />
            )}
        </>
    );
};

/**
 * ExpenseForm - Formulario para registrar gastos
 */
const ExpenseForm = ({ onSave, onClose, categories }) => {
    const [formData, setFormData] = useState({
        amount: '',
        category: categories[0]?.value || 'comida', // Set default category based on provided categories
        description: '',
        location: ''
    });

    const [errors, setErrors] = useState({});

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = 'El monto debe ser mayor a 0';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'La descripción es obligatoria';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validate()) return;

        onSave({
            ...formData,
            amount: parseFloat(formData.amount)
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content activity-editor-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>➕ Nuevo Gasto</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="activity-form">
                    <div className="form-group">
                        <label>Monto (MXN) *</label>
                        <input
                            type="number"
                            className={`trip-input ${errors.amount ? 'error' : ''}`}
                            value={formData.amount}
                            onChange={(e) => handleChange('amount', e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                        />
                        {errors.amount && <span className="error-text">{errors.amount}</span>}
                    </div>

                    <div className="form-group">
                        <label>Descripción *</label>
                        <input
                            type="text"
                            className={`trip-input ${errors.description ? 'error' : ''}`}
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Ej: Comida en restaurante"
                        />
                        {errors.description && <span className="error-text">{errors.description}</span>}
                    </div>

                    <div className="form-group">
                        <label>Categoría</label>
                        <div className="category-selector">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`category-btn ${formData.category === cat.value ? 'active' : ''}`}
                                    style={{ borderColor: formData.category === cat.value ? cat.color : 'transparent', background: formData.category === cat.value ? `${cat.color}20` : '' }}
                                    onClick={() => handleChange('category', cat.value)}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Ubicación (opcional)</label>
                        <input
                            type="text"
                            className="trip-input"
                            value={formData.location}
                            onChange={(e) => handleChange('location', e.target.value)}
                            placeholder="Ej: Centro histórico"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="back-btn" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="next-btn">
                            <Plus size={18} />
                            Agregar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExpenseTracker;
