import React, { createContext, useState, useEffect, useContext } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface UserContextType {
    user: FirebaseAuthTypes.User | null;
    loading: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, loading: true });

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const subscriber = auth().onAuthStateChanged((userState) => {
            setUser(userState);
            setLoading(false);
        });
        return subscriber; // unsubscribe on unmount
    }, []);

    return (
        <UserContext.Provider value={{ user, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
