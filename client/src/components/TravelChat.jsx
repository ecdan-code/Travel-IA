import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Send, MessageCircle, Loader, CheckCircle2, Trash2 } from 'lucide-react';
import expenseStorage from '../utils/expenseStorage';
import ItineraryManager from '../utils/ItineraryManager';
import API_BASE_URL from '../utils/apiConfig';

/**
 * TravelChat - Chat conversacional con IA limitado al contexto del viaje
 */
const TravelChat = ({ tripContext, coords, expenseContext, categories, itinerary, onItineraryUpdate, onExpenseUpdate, onPlacesFound, onClose }) => {
    const { session } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastTokenUsage, setLastTokenUsage] = useState(null);
    const [totalUsage, setTotalUsage] = useState(null);
    const messagesEndRef = useRef(null);

    // Get a stable key for storage
    const storageKey = tripContext?.id ? `chat_${tripContext.id}` :
        tripContext?.destination ? `chat_${tripContext.destination}` : null;

    // Persistence: Load messages from localStorage on mount
    useEffect(() => {
        if (!storageKey) return;

        const savedMessages = localStorage.getItem(storageKey);
        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                }
            } catch (e) {
                console.error("Error loading chat history:", e);
            }
        }

        // If no history was loaded, show welcome
        setMessages(prev => {
            if (prev.length === 0) {
                return [{
                    role: 'assistant',
                    content: `¡Hola! 👋 Soy tu asistente de viaje para ${tripContext?.destination || 'tu viaje'}. ¿En qué puedo ayudarte?`
                }];
            }
            return prev;
        });
    }, [storageKey, tripContext?.destination]);

    // Persistence: Save messages to localStorage whenever they change
    useEffect(() => {
        if (storageKey && messages.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(messages));
        }
    }, [messages, storageKey]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || isLoading) return;

        // Ensure we have a valid session before sending
        if (!session?.access_token) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Error de sesión: No estás autenticado. Por favor, recarga la página e inicia sesión nuevamente.'
            }]);
            return;
        }

        const userMsg = { role: 'user', content: inputMessage };
        setMessages(prev => [...prev, userMsg]);
        setInputMessage('');
        setIsLoading(true);

        try {
            // Prepare context for the AI
            // OPTIMIZED for token usage - minimal context, AI uses tools to query details
            const contextData = {
                message: userMsg.content,
                conversationHistory: messages.slice(-3), // Last 3 messages only (token optimization)
                tripContext: tripContext,
                // Don't send full itinerary - AI will query via consultar_itinerario tool if needed
                currentLocation: coords,
                clientDate: new Date().toISOString(),
                expenseContext: {
                    expenses: expenseContext,
                    categories: categories
                }
            };

            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(contextData)
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error("El sistema está ocupado. Por favor espera un momento.");
                }
                throw new Error('Error en la comunicación con el servidor');
            }

            const data = await response.json();

            // Check for itinerary updates from Server
            if (data.updatedItinerary && onItineraryUpdate) {
                console.log("[Chat] Received updated itinerary from AI:", data.updatedItinerary);
                onItineraryUpdate(data.updatedItinerary);
            }

            // Check for places found by AI and send to map
            if (data.places && data.places.length > 0 && onPlacesFound) {
                console.log("[Chat] Found places, sending to map:", data.places);
                onPlacesFound(data.places);
            }

            // Track token usage
            if (data.tokenUsage) {
                setLastTokenUsage(data.tokenUsage);
            }
            if (data.totalUsage) {
                setTotalUsage(data.totalUsage);
                console.log("[Chat] Total usage:", data.totalUsage.costs.total, "/ $200");
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response
            }]);

        } catch (error) {
            console.error('Chat Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Lo siento, hubo un error: ${error.message}. Inténtalo de nuevo.`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = () => {
        if (window.confirm('¿Estás seguro de que quieres limpiar el historial del chat? Tus datos de viaje, gastos e itinerario se mantendrán intactos.')) {
            if (storageKey) {
                localStorage.removeItem(storageKey);
            }
            setMessages([{
                role: 'assistant',
                content: `¡Hola de nuevo! 👋 Soy tu asistente de viaje para ${tripContext?.destination || 'tu viaje'}. ¿En qué puedo ayudarte?`
            }]);
        }
    };

    return (
        <div className="travel-chat">
            <div className="chat-header">
                <div className="chat-header-content">
                    <MessageCircle size={24} />
                    <div>
                        <h3>Asistente de Viaje</h3>
                        <p className="chat-subtitle">{tripContext?.destination}</p>
                    </div>
                </div>
                {totalUsage && (
                    <div style={{
                        fontSize: '10px',
                        color: totalUsage.warning === 'high' ? '#ef4444' :
                            totalUsage.warning === 'medium' ? '#f59e0b' : '#10b981',
                        padding: '4px 8px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '4px',
                        marginRight: '8px'
                    }}>
                        💰 ${totalUsage.costs?.total || '0.00'} / $200 ({totalUsage.usagePercent}%)
                    </div>
                )}
                {!totalUsage && (
                    <div style={{
                        fontSize: '10px',
                        color: '#9ca3af',
                        padding: '4px 8px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px',
                        marginRight: '8px'
                    }}>
                        📨 {messages.length} msgs | Envía mensaje para ver uso
                    </div>
                )}
                <div className="chat-header-actions">
                    <button
                        className="chat-clear-btn"
                        onClick={handleClearChat}
                        title="Limpiar chat"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button className="chat-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.role}`}>
                        <div className="message-avatar">
                            {msg.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div className="message-bubble">
                            <p>{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="chat-message assistant">
                        <div className="message-avatar">🤖</div>
                        <div className="message-bubble loading">
                            <Loader className="spinning" size={16} />
                            <span>Pensando...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="chat-input"
                    placeholder="Escribe tu mensaje..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={!inputMessage.trim() || isLoading}
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default TravelChat;
