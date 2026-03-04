/**
 * expenseStorage.js - Utilidad para persistir gastos en localStorage
 */

const expenseStorage = {
    /**
     * Agrega un nuevo gasto
     */
    addExpense(tripId, expense) {
        const expenses = this.getExpenses(tripId);
        const newExpense = {
            ...expense,
            id: `expense-${Date.now()}`,
            timestamp: new Date().toISOString()
        };
        expenses.push(newExpense);
        localStorage.setItem(`expenses_${tripId}`, JSON.stringify(expenses));
        return newExpense;
    },

    /**
     * Obtiene todos los gastos del viaje
     */
    getExpenses(tripId) {
        const data = localStorage.getItem(`expenses_${tripId}`);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Elimina un gasto
     */
    removeExpense(tripId, expenseId) {
        const expenses = this.getExpenses(tripId);
        const filtered = expenses.filter(e => e.id !== expenseId);
        localStorage.setItem(`expenses_${tripId}`, JSON.stringify(filtered));
        return filtered;
    },

    /**
     * Actualiza un gasto
     */
    updateExpense(tripId, expenseId, updates) {
        const expenses = this.getExpenses(tripId);
        const index = expenses.findIndex(e => e.id === expenseId);
        if (index !== -1) {
            expenses[index] = { ...expenses[index], ...updates };
            localStorage.setItem(`expenses_${tripId}`, JSON.stringify(expenses));
            return expenses[index];
        }
        return null;
    },

    /**
     * Obtiene todas las categorías (default + personalizadas)
     */
    getCategories(tripId) {
        const defaults = [
            { id: 'comida', label: '🍔 Comida', value: 'comida', color: '#f59e0b' },
            { id: 'transporte', label: '🚗 Transporte', value: 'transporte', color: '#3b82f6' },
            { id: 'actividades', label: '🎟️ Actividades', value: 'actividades', color: '#8b5cf6' },
            { id: 'hospedaje', label: '🏨 Hospedaje', value: 'hospedaje', color: '#ec4899' },
            { id: 'compras', label: '🛍️ Compras', value: 'compras', color: '#10b981' },
            { id: 'otros', label: '✨ Otros', value: 'otros', color: '#6b7280' }
        ];
        const data = localStorage.getItem(`categories_${tripId}`);
        const custom = data ? JSON.parse(data) : [];
        return [...defaults, ...custom];
    },

    /**
     * Agrega una nueva categoría personalizada
     */
    addCategory(tripId, category) {
        const categories = JSON.parse(localStorage.getItem(`categories_${tripId}`) || '[]');
        // Evitar duplicados por value/id
        if (!categories.find(c => c.value === category.value)) {
            categories.push(category);
            localStorage.setItem(`categories_${tripId}`, JSON.stringify(categories));
        }
        return this.getCategories(tripId);
    },

    /**
     * Obtiene el total de gastos por categoría
     */
    getTotalByCategory(tripId) {
        const expenses = this.getExpenses(tripId);
        const totals = {};

        expenses.forEach(expense => {
            const cat = expense.category || 'otros';
            totals[cat] = (totals[cat] || 0) + expense.amount;
        });

        return totals;
    },

    /**
     * Obtiene el total gastado
     */
    getTotalSpent(tripId) {
        const expenses = this.getExpenses(tripId);
        return expenses.reduce((sum, expense) => sum + expense.amount, 0);
    },

    /**
     * Guarda el presupuesto personalizado
     */
    saveBudget(tripId, amount) {
        localStorage.setItem(`budget_${tripId}`, amount.toString());
    },

    /**
     * Obtiene el presupuesto personalizado
     */
    getBudget(tripId) {
        const data = localStorage.getItem(`budget_${tripId}`);
        return data ? parseFloat(data) : null;
    }
};

export default expenseStorage;
