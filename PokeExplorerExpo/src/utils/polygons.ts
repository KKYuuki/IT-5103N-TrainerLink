// Polygon Utilities for Biome Detection (Free & Offline)

export interface Coord {
    lat: number;
    lng: number;
}

export type Polygon = Coord[];

/**
 * Standard Ray-Casting algorithm to check if point is inside polygon.
 */
export const isPointInPolygon = (lat: number, lng: number, polygon: Polygon): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lng;
        const xj = polygon[j].lat, yj = polygon[j].lng;

        const intersect = ((yi > lng) !== (yj > lng))
            && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// --- DEFINED REGIONS ---

// 1. MACTAN ISLAND (Rough Outline) -> URBAN / ISLAND
export const MACTAN_POLYGON: Polygon = [
    { lat: 10.342, lng: 124.032 }, // Punta Engano Tip
    { lat: 10.321, lng: 124.045 },
    { lat: 10.285, lng: 124.041 }, // Maribago
    { lat: 10.252, lng: 124.008 }, // Cordova Tip
    { lat: 10.255, lng: 123.945 }, // Cordova West
    { lat: 10.287, lng: 123.951 }, // Bridge area
    { lat: 10.315, lng: 123.965 }, // MEPZ
    { lat: 10.335, lng: 124.008 }, // Mactan North
];

// 2. CEBU MOUNTAINS (Busay / Tops / Sirao) -> FOREST / MOUNTAIN
export const CEBU_MOUNTAINS_POLYGON: Polygon = [
    { lat: 10.420, lng: 123.880 }, // North Hills
    { lat: 10.380, lng: 123.905 }, // Near City edge
    { lat: 10.350, lng: 123.885 }, // Tops Lookout area
    { lat: 10.320, lng: 123.860 }, // Guadalupe Hills
    { lat: 10.350, lng: 123.820 }, // Balamban border
    { lat: 10.400, lng: 123.840 },
];

// 3. CEBU CITY CORE -> URBAN
export const CEBU_CITY_POLYGON: Polygon = [
    { lat: 10.350, lng: 123.910 }, // Port Area
    { lat: 10.300, lng: 123.910 }, // SRP Start
    { lat: 10.280, lng: 123.875 }, // SRP / Seaside
    { lat: 10.300, lng: 123.860 }, // Labangon
    { lat: 10.340, lng: 123.880 }, // Capitol
    { lat: 10.360, lng: 123.900 }, // Mabolo
];
