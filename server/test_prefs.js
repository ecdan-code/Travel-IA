const dbService = require('./database');

async function testPrefs() {
    console.log("Iniciando prueba de Preferencias...");
    await dbService.initDB();

    console.log("Guardando preferencia: Comida Picante...");
    await dbService.UserPreferences.add('comida', 'Me encanta la comida muy picante y el chile habanero.');

    console.log("Recuperando todas las preferencias...");
    const prefs = await dbService.UserPreferences.getAll();
    console.log("Preferencias en DB:", prefs);

    if (prefs.find(p => p.preference.includes('picante'))) {
        console.log("MEMORIA DE PREFERENCIAS FUNCIONANDO ✅");
    } else {
        console.log("FALLO EN PREFERENCIAS ❌");
    }

    process.exit(0);
}

testPrefs().catch(err => {
    console.error(err);
    process.exit(1);
});
