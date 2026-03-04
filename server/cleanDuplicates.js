const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Use service key for admin access
);

async function cleanDuplicates() {
    console.log('[CLEAN] Starting duplicate cleanup...');

    try {
        // Get all activities
        const { data: activities, error } = await supabase
            .from('activities')
            .select('*')
            .order('created_at', { ascending: true }); // Keep oldest ones

        if (error) {
            console.error('[CLEAN] Error fetching activities:', error);
            return;
        }

        console.log(`[CLEAN] Found ${activities.length} total activities`);

        // Group activities by trip_id, date, time, and title
        const groups = {};
        activities.forEach(act => {
            const key = `${act.trip_id}|${act.date}|${act.time}|${act.title}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(act);
        });

        // Find duplicates
        let duplicatesRemoved = 0;
        for (const key in groups) {
            const group = groups[key];
            if (group.length > 1) {
                // Keep the first one (oldest), delete the rest
                const toKeep = group[0];
                const toDelete = group.slice(1);

                console.log(`[CLEAN] Found ${group.length} duplicates of "${toKeep.title}" on ${toKeep.date} at ${toKeep.time}`);
                console.log(`[CLEAN]   Keeping: ${toKeep.id}`);
                console.log(`[CLEAN]   Deleting: ${toDelete.map(a => a.id).join(', ')}`);

                // Delete duplicates
                for (const dup of toDelete) {
                    const { error: deleteError } = await supabase
                        .from('activities')
                        .delete()
                        .eq('id', dup.id);

                    if (deleteError) {
                        console.error(`[CLEAN] Error deleting ${dup.id}:`, deleteError);
                    } else {
                        duplicatesRemoved++;
                    }
                }
            }
        }

        console.log(`\n[CLEAN] ✓ Cleanup complete!`);
        console.log(`[CLEAN] Total duplicates removed: ${duplicatesRemoved}`);
        console.log(`[CLEAN] Remaining activities: ${activities.length - duplicatesRemoved}`);

    } catch (error) {
        console.error('[CLEAN] Unexpected error:', error);
    }
}

// Run the cleanup
cleanDuplicates().then(() => {
    console.log('[CLEAN] Done!');
    process.exit(0);
}).catch(err => {
    console.error('[CLEAN] Fatal error:', err);
    process.exit(1);
});
