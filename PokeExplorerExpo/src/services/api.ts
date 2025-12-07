export const BASE_URL = 'https://pokeapi.co/api/v2';

export interface PokemonListResult {
    name: string;
    url: string;
}

export interface PokemonListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: PokemonListResult[];
}

export interface PokemonType {
    slot: number;
    type: {
        name: string;
        url: string;
    };
}

export interface PokemonStat {
    base_stat: number;
    effort: number;
    stat: {
        name: string;
        url: string;
    };
}

export interface PokemonDetail {
    id: number;
    name: string;
    height: number;
    weight: number;
    types: PokemonType[];
    stats: PokemonStat[];
    sprites: {
        front_default: string;
        other: {
            'official-artwork': {
                front_default: string;
            };
        };
    };
    moves: {
        move: {
            name: string;
            url: string;
        };
    }[];
}

export const getPokemonList = async (limit: number = 20, offset: number = 0): Promise<PokemonListResponse> => {
    try {
        const response = await fetch(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching pokemon list:', error);
        throw error;
    }
};

export const getPokemonDetails = async (idOrName: string | number): Promise<PokemonDetail> => {
    try {
        const response = await fetch(`${BASE_URL}/pokemon/${idOrName}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching details for ${idOrName}:`, error);
        throw error;
    }
};

export interface FlavorTextEntry {
    flavor_text: string;
    language: {
        name: string;
    };
}

export interface PokemonSpecies {
    id: number;
    flavor_text_entries: FlavorTextEntry[];
    evolution_chain: {
        url: string;
    };
    is_legendary: boolean;
    is_mythical: boolean;
}

export interface EvolutionNode {
    species: {
        name: string;
        url: string;
    };
    evolves_to: EvolutionNode[];
}

export interface EvolutionChain {
    chain: EvolutionNode;
}

export const getPokemonSpecies = async (id: number): Promise<PokemonSpecies> => {
    try {
        const response = await fetch(`${BASE_URL}/pokemon-species/${id}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error(`Error fetching species for ${id}:`, error);
        throw error;
    }
};

export const getEvolutionChain = async (url: string): Promise<EvolutionChain> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error(`Error fetching evolution chain:`, error);
        throw error;
    }
};
