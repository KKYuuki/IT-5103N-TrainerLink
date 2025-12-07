import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

interface UserContextType {
    user: User | null;
    userData: any;
    loading: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, userData: null, loading: true });

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (userState) => {
            setUser(userState);

            if (userState) {
                try {
                    const snap = await getDoc(doc(db, "users", userState.uid));
                    if (snap.exists()) {
                        setUserData(snap.data());
                    }
                } catch (e) {
                    console.log("Error loading user data", e);
                }
            } else {
                setUserData(null);
            }

            setLoading(false);
        });
        return unsubscribe;
    }, []);

    return (
        <UserContext.Provider value={{ user, userData, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
