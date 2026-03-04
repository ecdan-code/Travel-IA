const dbService = require('./database');

async function test() {
    console.log("Iniciando prueba de DB...");
    await dbService.initDB();

    const tripId = 'test-trip-123';

    console.log("Insertando viaje de prueba...");
    await dbService.Trips.upsert({
        id: tripId,
        destination: 'Tokio',
        startDate: '2026-05-01',
        endDate: '2026-05-10',
        totalBudget: 50000
    });

    console.log("Insertando gasto de prueba...");
    await dbService.Expenses.add(tripId, {
        amount: 1500,
        description: 'Cena Sushi',
        category: 'comida'
    });

    console.log("Recuperando gastos...");
    const expenses = await dbService.Expenses.getAll(tripId);
    console.log("Gastos encontrados:", expenses);

    if (expenses.length > 0) {
        console.log("PRUEBA EXITOSA ✅");
    } else {
        console.log("FALLO EN LA PRUEBA ❌");
    }

    process.exit(0);
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
