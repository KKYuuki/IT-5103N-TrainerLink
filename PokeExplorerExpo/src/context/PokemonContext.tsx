import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from './UserContext';

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
    const { user } = useUser();
    const [caughtPokemon, setCaughtPokemon] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadCaughtPokemon(user.uid);
        } else {
            setCaughtPokemon([]); // Reset if no user
            setLoading(false);
        }
    }, [user]);

    const loadCaughtPokemon = async (uid: string) => {
        setLoading(true);
        try {
            const key = `caught_pokemon_${uid}`;
            const stored = await AsyncStorage.getItem(key);
            if (stored) {
                setCaughtPokemon(JSON.parse(stored));
            } else {
                setCaughtPokemon([]);
            }
        } catch (error) {
            console.error("Failed to load caught pokemon", error);
        } finally {
            setLoading(false);
        }
    };

    const markCaught = async (id: number) => {
        if (!user || caughtPokemon.includes(id)) return;

        const updated = [...caughtPokemon, id];
        setCaughtPokemon(updated);
        try {
            const key = `caught_pokemon_${user.uid}`;
            await AsyncStorage.setItem(key, JSON.stringify(updated));
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
