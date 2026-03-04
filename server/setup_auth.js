const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupAuth() {
    console.log('🔐 Configurando autenticación en Supabase...\n');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Error: Credenciales de Supabase no encontradas en .env');
        return;
    }

    console.log('📋 PASOS PARA CONFIGURAR AUTENTICACIÓN:\n');

    console.log('1️⃣ Habilitar proveedores de autenticación:');
    console.log('   - Ve a: https://supabase.com/dashboard/project/qpguvnudjjifdshytasx/auth/providers');
    console.log('   - Habilita "Email" (ya debería estar activo)');
    console.log('   - Habilita "Google" (opcional pero recomendado)\n');

    console.log('2️⃣ Configurar Google OAuth (opcional):');
    console.log('   - Ve a: https://console.cloud.google.com/apis/credentials');
    console.log('   - Crea un "OAuth 2.0 Client ID"');
    console.log('   - Authorized redirect URIs: https://qpguvnudjjifdshytasx.supabase.co/auth/v1/callback');
    console.log('   - Copia Client ID y Client Secret a Supabase\n');

    console.log('3️⃣ Ejecutar migración de base de datos:');
    console.log('   - Ve a: https://supabase.com/dashboard/project/qpguvnudjjifdshytasx/sql/new');
    console.log('   - Copia el contenido de: supabase_migration_auth.sql');
    console.log('   - Pégalo y ejecuta (Run)\n');

    console.log('4️⃣ Verificar configuración:');
    console.log('   - Ve a: https://supabase.com/dashboard/project/qpguvnudjjifdshytasx/auth/users');
    console.log('   - Deberías ver la lista de usuarios (vacía por ahora)\n');

    console.log('✅ Una vez completados estos pasos, estarás listo para continuar con el código.\n');
}

setupAuth().catch(console.error);
