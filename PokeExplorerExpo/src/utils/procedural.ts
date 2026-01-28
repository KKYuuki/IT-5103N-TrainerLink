/**
 * Procedural Generation Utilities
 * Uses deterministic hashing to create a shared world feel without a server.
 */

// Simple pseudo-random number generator based on a seed
// Returns number between 0 and 1
export const mulberry32 = (a: number) => {
    return () => {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/**
 * Generates a unique hash algorithm for a grid cell coordinate
 * This ensures that a specific meter on Earth always produces the same "Random" numbers
 */
export const getGridHash = (lat: number, lng: number, timeShift: number = 0): number => {
    // Round to approximately 10m precision (roughly 4th decimal place)
    // 0.0001 degrees is ~11 meters at the equator
    const gridX = Math.floor(lat * 10000);
    const gridY = Math.floor(lng * 10000);

    // Combine with timeShift (e.g. current hour) to make spawns rotate
    // Use a large prime number multiplier to scatter bits
    const seed = gridX * 73856093 ^ gridY * 19349663 ^ timeShift * 83492791;

    // Return a seeded random value [0, 1]
    return mulberry32(seed)();
};

// ... imports if needed

export type BiomeType = 'URBAN' | 'RURAL' | 'FOREST' | 'WATER' | 'GRASS';

/**
 * Determines the "Biome" of a location based on coordinate noise.
 * Uses Multi-Layer Noise to simulate realistic geography (Cities vs Nature).
 */
import { LEGENDARY_ZONES, BIOME_REGIONS, Zone } from './zones';

// Helper to check distance (Haversine simplified for speed)
const getDistMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Determines the "Biome" of a location based on coordinate noise AND Zones.
 */
export const getBiomeAtLocation = (lat: number, lng: number): BiomeType => {

    // 1. Check LEGENDARY ZONES (Highest Priority)
    for (const zone of LEGENDARY_ZONES) {
        if (getDistMeters(lat, lng, zone.lat, zone.lng) <= zone.radius) {
            if (zone.forcedBiome) return zone.forcedBiome as BiomeType;
        }
    }

    // 2. Check BIOME REGIONS (City overrides)
    for (const zone of BIOME_REGIONS) {
        if (getDistMeters(lat, lng, zone.lat, zone.lng) <= zone.radius) {
            // Add a little noise so parks still exist in cities?
            // For now, hard override to fix the "Water in Subdivision" bug
            return zone.forcedBiome as BiomeType;
        }
    }

    // 3. Fallback to Noise (Original Logic)
    // Layer 1: Macro Scale (~1km blocks) - Determines City vs Nature
    const macroNoise = getGridHash(lat * 0.01, lng * 0.01, 8888);

    // Layer 2: Micro Scale (~100m blocks) - Local features (Ponds, Parks)
    const microNoise = getGridHash(lat * 0.1, lng * 0.1, 9999);

    // 40% of world is "Nature" dominated
    if (macroNoise < 0.4) {
        if (microNoise < 0.2) return 'WATER'; // Lakes/Rivers
        if (microNoise < 0.6) return 'FOREST'; // Dense Woods
        return 'RURAL'; // Plains/Fields
    } else {
        // 60% is "developed" (or effectively normal zones)
        if (microNoise < 0.15) return 'WATER'; // Canals/Fountains
        if (microNoise < 0.35) return 'GRASS'; // City Parks
        return 'URBAN'; // Concrete Jungle
    }
};

/**
 * Pick a Pokemon ID based on Biome and Rarity
 */
export const getPokemonForBiome = (biome: BiomeType, randomVal: number): number => {
    // HYBRID SPAWN LOGIC:
    // To solve repetition, we allow a 30% chance for a "Wildcard" spawn from the entire National Dex (1-1025).
    // The other 70% respects the strict Biome lists to ensure "Flavor" (e.g. Water types near water).

    if (randomVal < 0.3) {
        // Map 0.0-0.3 to range 1-1025
        // (randomVal / 0.3) normalizes it to 0-1
        return Math.floor((randomVal / 0.3) * 1025) + 1;
    }

    // Renormalize the remaining 0.3-1.0 to 0-1 for the list selection
    const listRandom = (randomVal - 0.3) / 0.7;

    // Gen 1 Ranges (Legacy Biome Flavor)
    const waterList = [7, 54, 60, 72, 79, 86, 90, 98, 116, 118, 120, 129, 131]; // Squirtle, Psyduck, Poliwag...
    const forestList = [1, 10, 11, 13, 14, 43, 46, 48, 69, 123, 127]; // Bulbasaur, Bugs, Oddish, Bellsprout, Pinsir
    const grassList = [16, 19, 21, 29, 32, 25, 39, 43, 69]; // Pidgey, Rattata, Nidoran, Pikachu, Jigglypuff
    const urbanList = [19, 52, 58, 74, 81, 88, 100, 109, 133, 137, 143]; // Rattata, Meowth, Growlithe, Geodude, Magnemite, Grimer, Voltorb, Koffing, Eevee, Porygon, Snorlax
    const ruralList = [21, 23, 37, 58, 77, 128, 114]; // Spearow, Ekans, Vulpix, Growlithe, Ponyta, Tauros

    let list: number[] = urbanList; // Default

    if (biome === 'WATER') list = waterList;
    if (biome === 'FOREST') list = forestList;
    if (biome === 'GRASS') list = grassList;
    if (biome === 'RURAL') list = ruralList;
    if (biome === 'URBAN') list = urbanList;

    // Fallback if list empty (shouldn't happen)
    if (list.length === 0) list = [19];

    // Use the normalized random value to pick from list
    const index = Math.floor(listRandom * list.length);
    return list[index];
};

export const RARE_POKEMON_IDS = [
    1, 4, 7,      // Starters
    25,           // Pikachu
    133,          // Eevee
    143,          // Snorlax
    147, 148, 149, // Dratini line
    150, 151      // Mewtwo, Mew
];

export const LEGENDARY_IDS = [144, 145, 146, 150, 151];

export const isRarePokemon = (id: number): boolean => {
    return RARE_POKEMON_IDS.includes(id);
};

export const isLegendaryPokemon = (id: number): boolean => {
    return LEGENDARY_IDS.includes(id);
};
