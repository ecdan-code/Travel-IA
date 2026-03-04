import React from 'react'
import ReactDOM from 'react-dom/client'
import AppWithMap from './AppWithMap.jsx'
import Login from './components/Login.jsx'
import TripContextProvider from './contexts/TripContextProvider.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import './index.css'

function AppWrapper() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Cargando...</p>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    return (
        <TripContextProvider>
            <AppWithMap />
        </TripContextProvider>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <AppWrapper />
        </AuthProvider>
    </React.StrictMode>,
)
