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
 * Now uses SECTOR-BASED spawning to enforce uniqueness and density.
 */
export const checkGridForSpawns = (
    centerLat: number,
    centerLng: number,
    calcRadius: number = 150,    // "Math" Radius
    visibleRadius: number = 100  // "Sprite" Radius
): SpawnLocation[] => {

    // Grid size ~ 0.0001 deg (~11 meters)
    const GRID_SIZE = 0.0001;
    const SECTOR_SIZE = 20; // 20x20 cells per sector (~220m x 220m)

    // Current hour index (changes every hour)
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));

    // Calculate Center Sector
    const centerLatIdx = Math.round(centerLat / GRID_SIZE);
    const centerLngIdx = Math.round(centerLng / GRID_SIZE);

    const centerSectorX = Math.floor(centerLatIdx / SECTOR_SIZE);
    const centerSectorY = Math.floor(centerLngIdx / SECTOR_SIZE);

    // How many sectors to check? (Radius / SectorSize)
    // 150m / 88m ~ 2 sectors. So check +/- 2 sectors is plenty safe.
    const sectorRange = 2;

    const allSpawns: SpawnLocation[] = [];

    for (let sx = -sectorRange; sx <= sectorRange; sx++) {
        for (let sy = -sectorRange; sy <= sectorRange; sy++) {
            const sectorX = centerSectorX + sx;
            const sectorY = centerSectorY + sy;

            const sectorSpawns = getSpawnsForSector(sectorX, sectorY, currentHour, GRID_SIZE, SECTOR_SIZE);
            allSpawns.push(...sectorSpawns);
        }
    }

    // Filter by actual distance from player
    return allSpawns.filter(spawn => {
        const dLatK = (spawn.latitude - centerLat) * 111111;
        const dLngK = (spawn.longitude - centerLng) * 111111 * Math.cos(centerLat * Math.PI / 180);
        const dist = Math.sqrt(dLatK * dLatK + dLngK * dLngK);

        // Special Visibility Rule for Legendaries (User Request: 50m)
        // Special Visibility Rule for Legendaries
        // We allow them in the list if within 200m (so we can Notify "Nearby!")
        // But the UI will hide them until 50m.
        if (spawn.biome === 'LEGENDARY') {
            return dist <= 200;
        }

        return dist <= visibleRadius;
    });
};

const getSpawnsForSector = (
    sectorX: number,
    sectorY: number,
    hour: number,
    GRID_SIZE: number,
    SECTOR_SIZE: number
): SpawnLocation[] => {
    const spawns: SpawnLocation[] = [];

    // Deterministic Seed for this Sector
    const sectorSeed = getGridHash(sectorX, sectorY, hour);

    // 1. Determine how many spawns in this sector (e.g., 8 to 12)
    // Larger sector = more pokemon needed to fill space
    // 8 + (0..4) = 8, 9, 10, 11, 12
    const spawnCount = 8 + Math.floor(getGridHash(sectorX, sectorY, hour + 123) * 5);

    // 2. Determine Biome for this sector (sample center)
    const sectorCenterLat = (sectorX * SECTOR_SIZE + (SECTOR_SIZE / 2)) * GRID_SIZE;
    const sectorCenterLng = (sectorY * SECTOR_SIZE + (SECTOR_SIZE / 2)) * GRID_SIZE;
    const biome = getBiomeAtLocation(sectorCenterLat, sectorCenterLng);

    // 3. Select UNIQUE species
    const speciesSet = new Set<number>();
    const speciesList: number[] = [];
    let attempt = 0;

    while (speciesList.length < spawnCount && attempt < 20) {
        attempt++;
        // mix seed: sector + attempt
        const hash = getGridHash(sectorX, sectorY, hour + (attempt * 777));
        const pid = getPokemonForBiome(biome, hash);

        if (!speciesSet.has(pid)) {
            speciesSet.add(pid);
            speciesList.push(pid);
        }
    }

    // 4. Select UNIQUE positions (sub-cells)
    const posSet = new Set<string>();

    for (const pid of speciesList) {
        let posAttempt = 0;
        let placed = false;

        while (!placed && posAttempt < 15) {
            posAttempt++;
            // Unique hash for position based on PID to distribute effectively
            const ph = getGridHash(sectorX, sectorY, hour + pid + (posAttempt * 111));

            // 0..63
            const cellIndex = Math.floor(ph * (SECTOR_SIZE * SECTOR_SIZE));
            const subX = Math.floor(cellIndex / SECTOR_SIZE); // 0..7
            const subY = cellIndex % SECTOR_SIZE;             // 0..7

            if (!posSet.has(`${subX},${subY}`)) {
                posSet.add(`${subX},${subY}`);
                placed = true;

                // Calculate absolute coordinates
                const latIdx = sectorX * SECTOR_SIZE + subX;
                const lngIdx = sectorY * SECTOR_SIZE + subY;

                const finalLat = (latIdx * GRID_SIZE) + (GRID_SIZE / 2);
                const finalLng = (lngIdx * GRID_SIZE) + (GRID_SIZE / 2);

                // Push Standard Spawn
                spawns.push({
                    id: `spawn_sec_${sectorX}_${sectorY}_${latIdx}_${lngIdx}_${hour}`,
                    latitude: finalLat,
                    longitude: finalLng,
                    pokemonId: pid,
                    despawnTime: (hour + 1) * 60 * 60 * 1000,
                    biome: biome
                });
            }
        }
    }

    // --- LEGENDARY OVERRIDE (SINGLETON / HIGHLANDER RULE) ---
    // Instead of replacing every spawn in the zone (Swarm), we verify if the current SECTOR
    // contains the center point of a Legendary Zone. If it does, we deterministically ADD
    // exactly one instance of that Legendary to the spawn list at its exact location.

    // We import here to avoid circular dependency issues at top level if any
    const { LEGENDARY_ZONES } = require('./zones');

    for (const zone of LEGENDARY_ZONES) {
        if (zone.legendaryId) {
            // Find which sector this legendary BELONGS to
            const zLatIdx = Math.round(zone.lat / GRID_SIZE);
            const zLngIdx = Math.round(zone.lng / GRID_SIZE);

            const zSectorX = Math.floor(zLatIdx / SECTOR_SIZE);
            const zSectorY = Math.floor(zLngIdx / SECTOR_SIZE);

            // If the sector we are currently generating (sectorX, sectorY) is the owner of this Legendary...
            if (sectorX === zSectorX && sectorY === zSectorY) {
                // ...Then we check if we should spawn it (Time based? Always? For now: ALWAYS).
                // "Preloaded" spawn.

                console.log(`Injecting Unique Legendary: ${zone.name}`);

                spawns.push({
                    id: `legendary_unique_${zone.legendaryId}_${hour}`, // Unique ID per hour
                    latitude: zone.lat, // Exact Center
                    longitude: zone.lng,
                    pokemonId: zone.legendaryId,
                    despawnTime: (hour + 1) * 60 * 60 * 1000,
                    biome: 'LEGENDARY' // Special biome tag
                });
            }
        }
    }

    return spawns;
};

// Helper to check distance (Duped from procedural to avoid cycle, or move to utils)
const getDistMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
