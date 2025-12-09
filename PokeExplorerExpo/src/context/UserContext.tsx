import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import * as Notifications from 'expo-notifications';

// Types
export interface Badge {
    id: string;
    name: string;
    icon: string; // MaterialIcon name
    color: string;
    description: string;
    earnedAt?: number;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    isCompleted: boolean;
    reward: string;
}

interface UserContextType {
    user: User | null;
    userData: any;
    loading: boolean;
    // New Gamification State
    dailyQuests: Quest[];
    badges: Badge[];
    completeQuest: (questId: string) => Promise<void>;
}

const DEFAULT_QUESTS: Quest[] = [
    { id: 'q1', title: 'Novice Catcher', description: 'Catch 5 Pokemon', progress: 2, target: 5, isCompleted: false, reward: 'Pokeballs x5' },
    { id: 'q2', title: 'Explorer', description: 'Walk 1km', progress: 500, target: 1000, isCompleted: false, reward: 'Incense x1' },
    { id: 'q3', title: 'Community Star', description: 'Post in Community', progress: 0, target: 1, isCompleted: false, reward: 'Badge: Socialite' },
];

const DEFAULT_BADGES: Badge[] = [
    { id: 'b1', name: 'First Steps', icon: 'directions-walk', color: '#4caf50', description: 'Started your journey', earnedAt: Date.now() },
    { id: 'b2', name: 'Collector', icon: 'catching-pokemon', color: '#f44336', description: 'Caught 50 Pokemon' },
    { id: 'b3', name: 'Sharpshooter', icon: 'gps-fixed', color: '#2196f3', description: 'Hit a Great Throw' },
    { id: 'b4', name: 'Socialite', icon: 'people', color: '#ff9800', description: 'Engaged with community' },
];

const UserContext = createContext<UserContextType>({
    user: null, userData: null, loading: true,
    dailyQuests: [], badges: [], completeQuest: async () => { }
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Local state for demo purposes (would ideally sync to Firestore too)
    const [dailyQuests, setDailyQuests] = useState<Quest[]>(DEFAULT_QUESTS);
    const [badges, setBadges] = useState<Badge[]>(DEFAULT_BADGES);

    // Function to complete a quest and notify community
    const completeQuest = async (questId: string) => {
        if (!user) return;

        // 1. Update Local State
        const quest = dailyQuests.find(q => q.id === questId);
        if (!quest || quest.isCompleted) return;

        setDailyQuests(prev => prev.map(q => q.id === questId ? { ...q, isCompleted: true, progress: q.target } : q));

        // 2. Post to Community
        try {
            await addDoc(collection(db, 'posts'), {
                userId: user.uid,
                userName: user.displayName || 'Trainer',
                pokemonId: 0, // 0 indicates a special event/text post
                imageUrl: '', // No image for quest completion
                description: `Just completed the quest: "${quest.title}"! 🎉`,
                questTitle: quest.title, // Special field
                likes: 0,
                timestamp: serverTimestamp(),
            });
            // Alert.alert("Quest Complete!", `You finished: ${quest.title}`);

            // Trigger Local Notification
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Quest Completed! 🎉",
                    body: `You finished: ${quest.title}. Check your rewards!`,
                    sound: true,
                    vibrate: [0, 250, 250, 250],
                },
                trigger: null,
            });

        } catch (e) {
            console.error("Error posting quest completion", e);
        }
    };

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
        <UserContext.Provider value={{ user, userData, loading, dailyQuests, badges, completeQuest }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
