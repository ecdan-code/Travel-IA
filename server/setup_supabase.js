const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function setupTables() {
    console.log('🚀 Configurando tablas en Supabase...\n');

    // Nota: La API pública de Supabase no permite ejecutar DDL (CREATE TABLE)
    // Necesitas usar el SQL Editor del dashboard o la API de administración

    console.log('⚠️  IMPORTANTE:');
    console.log('No puedo crear las tablas automáticamente con la API pública.');
    console.log('Necesitas ejecutar el script SQL manualmente.\n');

    console.log('📋 Pasos:');
    console.log('1. Ve a: https://supabase.com/dashboard/project/' + process.env.SUPABASE_URL.split('//')[1].split('.')[0]);
    console.log('2. Busca "SQL Editor" en el menú lateral (puede estar bajo "Database")');
    console.log('3. Copia el contenido de supabase_schema.sql');
    console.log('4. Pégalo y ejecuta\n');

    // Verificar conexión
    console.log('✅ Verificando conexión a Supabase...');
    const { data, error } = await supabase.from('trips').select('count');

    if (error && error.code === '42P01') {
        console.log('❌ Las tablas aún no existen. Ejecuta el script SQL primero.');
    } else if (error) {
        console.log('❌ Error de conexión:', error.message);
    } else {
        console.log('✅ ¡Conexión exitosa! Las tablas ya están creadas.');
    }
}

setupTables().catch(console.error);
