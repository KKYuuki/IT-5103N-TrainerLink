import { getBiomeAtLocation, getGridHash, getPokemonForBiome } from './procedural';

export interface SpawnLocation {
    id: string;
    latitude: number;
    longitude: number;
    pokemonId: number;
    despawnTime: number; // For timer logic
    biome: string;       // For debug info
}

/**
 * Checks a grid of cells around a center point and returns deterministic spawns.
 * @param centerLat Your latitude
import { getBiomeAtLocation, getGridHash, getPokemonForBiome } from './procedural';

export interface SpawnLocation {
    id: string;
    latitude: number;
    longitude: number;
    pokemonId: number;
    despawnTime: number; // For timer logic
    biome: string;       // For debug info
}

/**
 * Checks a grid of cells around a center point and returns deterministic spawns.
 * @param centerLat Your latitude
 * @param centerLng Your longitude
 * @param calcRadius How far to calculate spawns (converted to grid cells)
 * @param visibleRadius How far to return visible spawns
 */
export const checkGridForSpawns = (
    centerLat: number,
    centerLng: number,
    calcRadius: number = 150,    // "Math" Radius
    visibleRadius: number = 100  // "Sprite" Radius
): SpawnLocation[] => {
    const spawns: SpawnLocation[] = [];
    const speciesPresent = new Set<number>();

    // Grid size ~ 0.0001 deg (~11 meters)
    const GRID_SIZE = 0.0001;

    // Calculate range based on larger MATH radius
    const cellRange = Math.ceil((calcRadius / 111111) / GRID_SIZE) + 2;

    // Current hour index (changes every hour)
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));

    // Iterate over the BUFFERED grid to collect candidates
    const candidates: { x: number, y: number, lat: number, lng: number, dist: number }[] = [];

    for (let x = -cellRange; x <= cellRange; x++) {
        for (let y = -cellRange; y <= cellRange; y++) {
            const cellLat = Math.floor(centerLat / GRID_SIZE) * GRID_SIZE + (x * GRID_SIZE);
            const cellLng = Math.floor(centerLng / GRID_SIZE) * GRID_SIZE + (y * GRID_SIZE);

            const dLatK = (cellLat - centerLat) * 111111;
            const dLngK = (cellLng - centerLng) * 111111 * Math.cos(centerLat * Math.PI / 180);
            const distMeters = Math.sqrt(dLatK * dLatK + dLngK * dLngK);

            if (distMeters <= calcRadius) {
                candidates.push({ x, y, lat: cellLat, lng: cellLng, dist: distMeters });
            }
        }
    }

    // SORT DETERMINISTICALLY (by World Latitude, then Longitude)
    // This ensures processing order is independent of player position
    candidates.sort((a, b) => (a.lat - b.lat) || (a.lng - b.lng));

    // Process sorted candidates
    for (const cell of candidates) {
        const { lat: cellLat, lng: cellLng, dist: distMeters } = cell;

        // 1. Is there a spawn here?
        const spawnChance = getGridHash(cellLat, cellLng, currentHour);

        if (spawnChance > 0.985) {
            let speciesHash = getGridHash(cellLat, cellLng, currentHour + 999);
            let biome = getBiomeAtLocation(cellLat, cellLng);
            let pokemonId = getPokemonForBiome(biome, speciesHash);

            // STRICT UNIQUENESS CHECK
            let attempts = 0;
            while (speciesPresent.has(pokemonId) && attempts < 10) {
                attempts++;
                speciesHash = getGridHash(cellLat, cellLng, currentHour + (attempts * 1000));
                pokemonId = getPokemonForBiome(biome, speciesHash);
            }

            if (speciesPresent.has(pokemonId)) continue;
            speciesPresent.add(pokemonId);

            // ONLY return if within VISIBLE radius
            if (distMeters <= visibleRadius) {
                spawns.push({
                    id: `spawn_${cellLat.toFixed(5)}_${cellLng.toFixed(5)}_${currentHour}`,
                    latitude: cellLat + (GRID_SIZE / 2),
                    longitude: cellLng + (GRID_SIZE / 2),
                    pokemonId: pokemonId,
                    despawnTime: (currentHour + 1) * 60 * 60 * 1000,
                    biome: biome
                });
            }
        }
    }

    return spawns;
};
