const dbService = require('./database');
require('dotenv').config();

async function testSupabase() {
    console.log('🧪 Probando Supabase con datos reales...\n');

    await dbService.initDB();

    const tripId = 'test-supabase-' + Date.now();

    // 1. Crear un viaje de prueba
    console.log('1️⃣ Insertando viaje de prueba...');
    await dbService.Trips.upsert({
        id: tripId,
        destination: 'París',
        destinationCountry: 'Francia',
        startDate: '2026-06-01',
        endDate: '2026-06-10',
        totalBudget: 30000,
        status: 'active'
    });
    console.log('   ✅ Viaje creado\n');

    // 2. Añadir un gasto
    console.log('2️⃣ Insertando gasto...');
    await dbService.Expenses.add(tripId, {
        amount: 850,
        description: 'Cena en restaurante francés',
        category: 'comida'
    });
    console.log('   ✅ Gasto registrado\n');

    // 3. Añadir una actividad
    console.log('3️⃣ Insertando actividad...');
    await dbService.Activities.upsert(tripId, {
        date: '2026-06-02',
        time: '10:00',
        title: 'Visita a la Torre Eiffel',
        description: 'Tour guiado',
        duration: 180,
        category: 'cultura',
        estimated_cost: 500
    });
    console.log('   ✅ Actividad añadida\n');

    // 4. Guardar una preferencia
    console.log('4️⃣ Guardando preferencia...');
    await dbService.UserPreferences.add('comida', 'Me encanta la comida francesa');
    console.log('   ✅ Preferencia guardada\n');

    // 5. Recuperar todo
    console.log('5️⃣ Recuperando datos...');
    const trip = await dbService.Trips.get(tripId);
    const expenses = await dbService.Expenses.getAll(tripId);
    const activities = await dbService.Activities.getAll(tripId);
    const preferences = await dbService.UserPreferences.getAll();

    console.log('   📊 Viaje:', trip?.destination);
    console.log('   💰 Gastos:', expenses?.length || 0);
    console.log('   📅 Actividades:', activities?.length || 0);
    console.log('   ❤️  Preferencias:', preferences?.length || 0);

    if (trip && expenses.length > 0 && activities.length > 0 && preferences.length > 0) {
        console.log('\n🎉 ¡SUPABASE FUNCIONA PERFECTAMENTE!\n');
    } else {
        console.log('\n❌ Algo falló en la prueba\n');
    }
}

testSupabase().catch(console.error);
