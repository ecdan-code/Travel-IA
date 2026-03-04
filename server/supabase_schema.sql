-- =====================================================
-- Travel IA - Supabase Database Schema
-- =====================================================
-- Ejecuta este script en el SQL Editor de Supabase
-- (Dashboard → SQL Editor → New Query → Pega esto → Run)
-- =====================================================

-- Tabla de Viajes
CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    destination TEXT NOT NULL,
    destination_country TEXT,
    start_date TEXT,
    end_date TEXT,
    budget_limit REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Gastos
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    description TEXT,
    category TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Actividades del Itinerario
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    duration INTEGER,
    category TEXT,
    estimated_cost REAL DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE
);

-- Tabla de Preferencias del Usuario
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    preference TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_activities_trip_id ON activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);

-- Habilitar Row Level Security (RLS) - Por ahora deshabilitado para pruebas
-- ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (se habilitarán cuando implementemos autenticación)
-- CREATE POLICY "Enable all access for now" ON trips FOR ALL USING (true);
-- CREATE POLICY "Enable all access for now" ON expenses FOR ALL USING (true);
-- CREATE POLICY "Enable all access for now" ON activities FOR ALL USING (true);
-- CREATE POLICY "Enable all access for now" ON user_preferences FOR ALL USING (true);

-- =====================================================
-- ¡Listo! Ahora tu base de datos está configurada
-- =====================================================
