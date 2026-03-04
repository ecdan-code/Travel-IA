/**
 * API Usage Tracker - Tracks ALL API usage and calculates costs
 * Persists data to file for monthly tracking
 */
const fs = require('fs');
const path = require('path');

const USAGE_FILE = path.join(__dirname, 'api_usage.json');

// API Costs (as of 2024)
const COSTS = {
    geminiInput: 0.00025 / 1000,    // $0.00025 per 1K input tokens (Gemini 1.5 Flash)
    geminiOutput: 0.0005 / 1000,    // $0.0005 per 1K output tokens
    placesSearch: 0.032,            // $32 per 1000 = $0.032 per request
    mapsLoad: 0.007,                // $7 per 1000 = $0.007 per load
    directions: 0.005               // $5 per 1000 = $0.005 per request
};

const MONTHLY_CREDIT = 200; // $200 free credit

class APIUsageTracker {
    constructor() {
        this.usage = this.loadFromFile();
    }

    // Load from file or create new
    loadFromFile() {
        try {
            if (fs.existsSync(USAGE_FILE)) {
                const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
                // Check if it's a new month
                const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
                if (data.month !== currentMonth) {
                    console.log('[Usage] New month detected, resetting counters');
                    return this.createNew();
                }
                return data;
            }
        } catch (e) {
            console.warn('[Usage] Error loading file:', e.message);
        }
        return this.createNew();
    }

    createNew() {
        return {
            month: new Date().toISOString().slice(0, 7),
            geminiInputTokens: 0,
            geminiOutputTokens: 0,
            geminiRequests: 0,
            placesSearches: 0,
            mapsLoads: 0,
            directionsRequests: 0,
            lastUpdated: new Date().toISOString()
        };
    }

    save() {
        this.usage.lastUpdated = new Date().toISOString();
        try {
            fs.writeFileSync(USAGE_FILE, JSON.stringify(this.usage, null, 2));
        } catch (e) {
            console.warn('[Usage] Error saving:', e.message);
        }
    }

    // Track Gemini API
    trackGemini(inputTokens, outputTokens) {
        this.usage.geminiInputTokens += inputTokens;
        this.usage.geminiOutputTokens += outputTokens;
        this.usage.geminiRequests++;
        this.save();
    }

    // Track Places API
    trackPlacesSearch() {
        this.usage.placesSearches++;
        this.save();
    }

    // Track Maps JavaScript API
    trackMapsLoad() {
        this.usage.mapsLoads++;
        this.save();
    }

    // Track Directions API
    trackDirections() {
        this.usage.directionsRequests++;
        this.save();
    }

    // Get full usage report with costs
    getUsage() {
        const costs = {
            gemini: (this.usage.geminiInputTokens * COSTS.geminiInput) +
                (this.usage.geminiOutputTokens * COSTS.geminiOutput),
            places: this.usage.placesSearches * COSTS.placesSearch,
            maps: this.usage.mapsLoads * COSTS.mapsLoad,
            directions: this.usage.directionsRequests * COSTS.directions
        };

        const totalCost = costs.gemini + costs.places + costs.maps + costs.directions;
        const remainingCredit = MONTHLY_CREDIT - totalCost;
        const usagePercent = (totalCost / MONTHLY_CREDIT) * 100;

        return {
            month: this.usage.month,
            requests: {
                gemini: this.usage.geminiRequests,
                places: this.usage.placesSearches,
                maps: this.usage.mapsLoads,
                directions: this.usage.directionsRequests
            },
            tokens: {
                input: this.usage.geminiInputTokens,
                output: this.usage.geminiOutputTokens
            },
            costs: {
                gemini: costs.gemini.toFixed(4),
                places: costs.places.toFixed(4),
                maps: costs.maps.toFixed(4),
                directions: costs.directions.toFixed(4),
                total: totalCost.toFixed(2)
            },
            remainingCredit: remainingCredit.toFixed(2),
            usagePercent: usagePercent.toFixed(1),
            warning: usagePercent > 80 ? 'high' : usagePercent > 50 ? 'medium' : 'low',
            lastUpdated: this.usage.lastUpdated
        };
    }

    // Reset for new month (manual)
    reset() {
        this.usage = this.createNew();
        this.save();
    }
}

// Singleton
const tracker = new APIUsageTracker();
module.exports = tracker;
