export interface Zone {
    name: string;
    lat: number;
    lng: number;
    radius: number; // meters
    forcedBiome?: string; // 'URBAN', 'WATER', 'FOREST', etc.
    legendaryId?: number; // If defined, this legendary spawns here
    spawnRateBonus?: number; // 0-1 (e.g. 0.05 = 5% chance per scan)
}

// 1. LEGENDARY ZONES (Specific Points of Interest)
export const LEGENDARY_ZONES: Zone[] = [
    {
        name: "Lapu-Lapu Shrine",
        lat: 10.3105, lng: 124.0153,
        radius: 600, // Large area around shrine
        forcedBiome: "WATER", // Provide Water biome even on land
        legendaryId: 149, // Dragonite (pseudo-legendary rep) or Kyogre
        spawnRateBonus: 0.10 // High chance
    },
    {
        name: "Magellan's Cross",
        lat: 10.2936, lng: 123.9018,
        radius: 400,
        forcedBiome: "URBAN",
        legendaryId: 146, // Moltres
        spawnRateBonus: 0.05
    },
    {
        name: "Tops Lookout",
        lat: 10.3705, lng: 123.8708,
        radius: 800,
        forcedBiome: "FOREST", // Or Mountain if we had it
        legendaryId: 144, // Articuno (High altitude)
        spawnRateBonus: 0.05
    },
    {
        name: "SM Seaside",
        lat: 10.2820, lng: 123.8814,
        radius: 600,
        forcedBiome: "URBAN",
        legendaryId: 145, // Zapdos (Modern/Electric)
    }
];

// 2. BIOME REGIONS (Large Fixes for "My subdivision is water")
// These are large circles to enforce a general biome in a city
export const BIOME_REGIONS: Zone[] = [
    {
        name: "Cebu City Core",
        lat: 10.3157, lng: 123.8854,
        radius: 5000, // 5km Radius covers most of the city
        forcedBiome: "URBAN"
    },
    {
        name: "Mactan Island Center",
        lat: 10.2933, lng: 123.9632,
        radius: 4000, // Covers Lapu-Lapu City center
        forcedBiome: "URBAN"
    },
    {
        name: "Olango Island",
        lat: 10.2544, lng: 124.0543,
        radius: 3000,
        forcedBiome: "WATER" // It's a sanctuary
    }
];
