import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificar sesión actual
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            // Limpiar localStorage si es un usuario diferente
            if (session?.user) {
                const savedUserId = localStorage.getItem('travelIA_currentUser');
                if (savedUserId && savedUserId !== session.user.id) {
                    // Usuario diferente, limpiar datos de viajes del anterior
                    console.log('[Auth] Usuario diferente detectado, limpiando datos...');
                    localStorage.removeItem('travelIA_trip');
                    localStorage.removeItem('travelIA_history');
                    // Limpiar también itinerarios, gastos y chat de viajes anteriores
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('itinerary_') ||
                            key.startsWith('expenses_') ||
                            key.startsWith('budget_') ||
                            key.startsWith('chat_')) {
                            localStorage.removeItem(key);
                        }
                    });
                }
                // Guardar el ID del usuario actual
                localStorage.setItem('travelIA_currentUser', session.user.id);
            }

            setLoading(false);
        });

        // Escuchar cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            // Limpiar localStorage si es un usuario diferente o se cerró sesión
            if (session?.user) {
                const savedUserId = localStorage.getItem('travelIA_currentUser');
                if (!savedUserId || savedUserId !== session.user.id) {
                    console.log('[Auth] Nuevo usuario detectado, limpiando datos...');
                    localStorage.removeItem('travelIA_trip');
                    localStorage.removeItem('travelIA_history');
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('itinerary_') ||
                            key.startsWith('expenses_') ||
                            key.startsWith('budget_') ||
                            key.startsWith('chat_')) {
                            localStorage.removeItem(key);
                        }
                    });
                }
                localStorage.setItem('travelIA_currentUser', session.user.id);
            } else {
                // Se cerró sesión
                localStorage.removeItem('travelIA_currentUser');
            }

            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        return { data, error };
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    };

    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        return { data, error };
    };

    const signOut = async () => {
        // Limpiar localStorage antes de cerrar sesión
        localStorage.removeItem('travelIA_trip');
        localStorage.removeItem('travelIA_history');
        localStorage.removeItem('travelIA_currentUser');
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('itinerary_') ||
                key.startsWith('expenses_') ||
                key.startsWith('budget_') ||
                key.startsWith('chat_')) {
                localStorage.removeItem(key);
            }
        });

        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
