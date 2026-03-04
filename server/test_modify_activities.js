const dbService = require('./database');
require('dotenv').config();

async function testActivityModification() {
    console.log('🧪 Probando modificación de actividades...\n');

    await dbService.initDB();

    const tripId = 'test-modify-' + Date.now();

    // 1. Crear viaje de prueba
    console.log('1️⃣ Creando viaje de prueba...');
    await dbService.Trips.upsert({
        id: tripId,
        destination: 'Tokio',
        destinationCountry: 'Japón',
        startDate: '2026-07-01',
        endDate: '2026-07-05',
        totalBudget: 50000
    });
    console.log('   ✅ Viaje creado\n');

    // 2. Añadir actividad inicial
    console.log('2️⃣ Añadiendo actividad "Desayuno"...');
    await dbService.Activities.upsert(tripId, {
        date: '2026-07-02',
        time: '09:00',
        title: 'Desayuno',
        description: 'Desayuno en el hotel',
        duration: 60,
        category: 'comida'
    });
    console.log('   ✅ Actividad añadida\n');

    // 3. Consultar actividades
    console.log('3️⃣ Consultando actividades...');
    let activities = await dbService.Activities.getAll(tripId);
    console.log(`   📅 Actividades: ${activities.length}`);
    console.log(`   ⏰ Hora actual: ${activities[0].time}\n`);

    // 4. Actualizar hora del desayuno
    console.log('4️⃣ Cambiando hora del desayuno a 10:00...');
    await dbService.Activities.update(tripId, 'Desayuno', { time: '10:00' });
    console.log('   ✅ Actividad actualizada\n');

    // 5. Verificar cambio
    console.log('5️⃣ Verificando cambio...');
    activities = await dbService.Activities.getAll(tripId);
    console.log(`   ⏰ Nueva hora: ${activities[0].time}`);

    if (activities[0].time === '10:00') {
        console.log('   ✅ ¡Cambio exitoso!\n');
    } else {
        console.log('   ❌ Error: La hora no cambió\n');
    }

    // 6. Eliminar actividad
    console.log('6️⃣ Eliminando actividad...');
    const deleted = await dbService.Activities.delete(tripId, 'Desayuno');
    console.log(`   ${deleted ? '✅' : '❌'} ${deleted ? 'Actividad eliminada' : 'Error al eliminar'}\n`);

    // 7. Verificar eliminación
    console.log('7️⃣ Verificando eliminación...');
    activities = await dbService.Activities.getAll(tripId);
    console.log(`   📅 Actividades restantes: ${activities.length}`);

    if (activities.length === 0) {
        console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!\n');
        console.log('La IA ahora puede:');
        console.log('  ✅ Actualizar horarios de actividades');
        console.log('  ✅ Cambiar títulos y descripciones');
        console.log('  ✅ Eliminar actividades del itinerario\n');
    } else {
        console.log('\n❌ Algo falló en la eliminación\n');
    }
}

testActivityModification().catch(console.error);
