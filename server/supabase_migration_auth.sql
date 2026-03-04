-- ============================================
-- MIGRACIÓN: Añadir Autenticación de Usuarios
-- ============================================

-- Paso 1: Añadir columna user_id a todas las tablas
ALTER TABLE trips ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_preferences ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Paso 2: Crear índices para mejorar rendimiento de consultas por usuario
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Paso 3: Habilitar Row Level Security (RLS)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Paso 4: Crear políticas de seguridad para TRIPS
CREATE POLICY "Users can view own trips" 
    ON trips FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips" 
    ON trips FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" 
    ON trips FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" 
    ON trips FOR DELETE 
    USING (auth.uid() = user_id);

-- Paso 5: Crear políticas de seguridad para EXPENSES
CREATE POLICY "Users can view own expenses" 
    ON expenses FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" 
    ON expenses FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" 
    ON expenses FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" 
    ON expenses FOR DELETE 
    USING (auth.uid() = user_id);

-- Paso 6: Crear políticas de seguridad para ACTIVITIES
CREATE POLICY "Users can view own activities" 
    ON activities FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" 
    ON activities FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" 
    ON activities FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities" 
    ON activities FOR DELETE 
    USING (auth.uid() = user_id);

-- Paso 7: Crear políticas de seguridad para USER_PREFERENCES
CREATE POLICY "Users can view own preferences" 
    ON user_preferences FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
    ON user_preferences FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
    ON user_preferences FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" 
    ON user_preferences FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================
-- LIMPIEZA: Borrar datos de prueba existentes
-- ============================================
DELETE FROM activities;
DELETE FROM expenses;
DELETE FROM user_preferences;
DELETE FROM trips;
