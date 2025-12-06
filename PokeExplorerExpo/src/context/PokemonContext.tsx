import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PokemonContextType {
    caughtPokemon: number[];
    markCaught: (id: number) => Promise<void>;
    isCaught: (id: number) => boolean;
    loading: boolean;
}

const PokemonContext = createContext<PokemonContextType>({
    caughtPokemon: [],
    markCaught: async () => { },
    isCaught: () => false,
    loading: true
});

export const PokemonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [caughtPokemon, setCaughtPokemon] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCaughtPokemon();
    }, []);

    const loadCaughtPokemon = async () => {
        try {
            const stored = await AsyncStorage.getItem('caughtPokemon');
            if (stored) {
                setCaughtPokemon(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Failed to load caught pokemon", error);
        } finally {
            setLoading(false);
        }
    };

    const markCaught = async (id: number) => {
        if (caughtPokemon.includes(id)) return;

        const updated = [...caughtPokemon, id];
        setCaughtPokemon(updated);
        try {
            await AsyncStorage.setItem('caughtPokemon', JSON.stringify(updated));
        } catch (error) {
            console.error("Failed to save caught pokemon", error);
        }
    };

    const isCaught = (id: number) => {
        return caughtPokemon.includes(id);
    };

    return (
        <PokemonContext.Provider value={{ caughtPokemon, markCaught, isCaught, loading }}>
            {children}
        </PokemonContext.Provider>
    );
};

export const usePokemon = () => useContext(PokemonContext);
