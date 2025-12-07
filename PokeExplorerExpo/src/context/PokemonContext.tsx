import React, { createContext, useState, useEffect, useContext } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
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
            setCaughtPokemon([]);
            setLoading(false);
        }
    }, [user]);

    const loadCaughtPokemon = async (uid: string) => {
        setLoading(true);
        try {
            const userRef = doc(db, "users", uid);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.caughtPokemon && Array.isArray(data.caughtPokemon)) {
                    setCaughtPokemon(data.caughtPokemon);
                } else {
                    setCaughtPokemon([]);
                }
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

        // Optimistic Update
        const updated = [...caughtPokemon, id];
        setCaughtPokemon(updated);

        try {
            const userRef = doc(db, "users", user.uid);
            // Try to update specifically
            await updateDoc(userRef, {
                caughtPokemon: arrayUnion(id)
            }).catch(async (err) => {
                // If doc doesn't exist or other error, try setDoc with merge
                await setDoc(userRef, { caughtPokemon: arrayUnion(id) }, { merge: true });
            });
        } catch (error) {
            console.error("Failed to save caught pokemon", error);
            // Revert on failure? For now, we keep optimistic state to avoid UI flicker
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
