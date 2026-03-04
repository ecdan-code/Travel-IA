import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, LogIn, UserPlus, Chrome, Globe } from 'lucide-react';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const { signIn, signUp, signInWithGoogle } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const { data, error } = isSignUp
                ? await signUp(email, password)
                : await signIn(email, password);

            if (error) throw error;

            if (isSignUp) {
                setMessage('¡Cuenta creada! Revisa tu email para confirmar tu cuenta.');
            }
        } catch (err) {
            setError(err.message || 'Error al autenticar');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);

        try {
            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión con Google');
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <div className="login-content">
                <div className="login-header">
                    <div className="brand-logo-large">
                        <Globe size={48} />
                    </div>
                    <h1>Travel IA</h1>
                    <p>Tu asistente inteligente de viajes</p>
                </div>

                <div className="login-card premium-glass">
                    <div className="card-header">
                        <h2>{isSignUp ? 'Crear Cuenta' : 'Bienvenido de nuevo'}</h2>
                        <p>{isSignUp ? 'Empieza a planear tu próxima aventura' : 'Ingresa para continuar tus viajes'}</p>
                    </div>

                    {error && (
                        <div className="auth-alert error">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="auth-alert success">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="input-group">
                            <label>Email</label>
                            <div className="input-field">
                                <Mail size={18} className="input-icon" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="hola@ejemplo.com"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Contraseña</label>
                            <div className="input-field">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-auth-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="auth-spinner"></span>
                            ) : (
                                <>
                                    {isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
                                    <div className="btn-glow"></div>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-divider">
                        <span>o</span>
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        className="btn-auth-google"
                        disabled={loading}
                    >
                        <Chrome size={20} />
                        <span>Continuar con Google</span>
                    </button>
                </div>

                <div className="auth-footer">
                    <p>
                        {isSignUp ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError('');
                                setMessage('');
                            }}
                            className="btn-link"
                            disabled={loading}
                        >
                            {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
