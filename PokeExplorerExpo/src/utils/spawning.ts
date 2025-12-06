export interface SpawnLocation {
    id: string;
    latitude: number;
    longitude: number;
    pokemonId: number;
}

export const generateRandomSpawns = (
    centerLat: number,
    centerLng: number,
    radiusMeters: number = 200,
    count: number = 5
): SpawnLocation[] => {
    const spawns: SpawnLocation[] = [];
    const r_earth = 6378137; // Radius of earth in meters

    for (let i = 0; i < count; i++) {
        // Random distance and angle
        const distance = Math.random() * radiusMeters;
        const theta = Math.random() * 2 * Math.PI;

        const dy = distance * Math.cos(theta); // North/South change in meters
        const dx = distance * Math.sin(theta); // East/West change in meters

        const newLat = centerLat + (dy / r_earth) * (180 / Math.PI);
        const newLng = centerLng + (dx / r_earth) * (180 / Math.PI) / Math.cos(centerLat * Math.PI / 180);

        // Simple random Pokemon ID between 1 and 151 (Gen 1)
        const pokemonId = Math.floor(Math.random() * 151) + 1;

        spawns.push({
            id: `spawn_${Date.now()}_${i}`,
            latitude: newLat,
            longitude: newLng,
            pokemonId: pokemonId
        });
    }

    return spawns;
};
