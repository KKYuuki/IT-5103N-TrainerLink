import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
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
    type: 'CATCH_ANY' | 'CATCH_TYPE' | 'WALK' | 'COMMUNITY';
    targetType?: string;
    date?: string; // Track which day this quest belongs to
}

type QuestTemplate = Omit<Quest, 'id' | 'progress' | 'isCompleted'>;

const QUEST_POOL: QuestTemplate[] = [
    { title: 'Novice Catcher', description: 'Catch 5 Pokemon', target: 5, reward: 'Badge: Novice', type: 'CATCH_ANY' },
    { title: 'Pro Catcher', description: 'Catch 10 Pokemon', target: 10, reward: 'Badge: Pro', type: 'CATCH_ANY' },
    { title: 'Pyromaniac', description: 'Catch 3 Fire Types', target: 3, reward: 'Badge: Fire Tamer', type: 'CATCH_TYPE', targetType: 'fire' },
    { title: 'Swimmer', description: 'Catch 3 Water Types', target: 3, reward: 'Badge: Aqua Grunt', type: 'CATCH_TYPE', targetType: 'water' },
    { title: 'Botanist', description: 'Catch 3 Grass Types', target: 3, reward: 'Badge: Gardener', type: 'CATCH_TYPE', targetType: 'grass' },
    { title: 'Electrician', description: 'Catch 3 Electric Types', target: 3, reward: 'Badge: Sparky', type: 'CATCH_TYPE', targetType: 'electric' },
    { title: 'Explorer', description: 'Walk 1km', target: 1000, reward: 'Badge: Explorer', type: 'WALK' },
    { title: 'Scout', description: 'Walk 500m', target: 500, reward: 'Badge: Scout', type: 'WALK' },
    { title: 'Community Star', description: 'Post in Community', target: 1, reward: 'Badge: Socialite', type: 'COMMUNITY' },
];

const getDailyQuests = () => {
    // Seed random with today's date string to ensure same quests for the whole day
    const today = new Date().toDateString();
    let seed = 0;
    for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);

    // Simple seeded random function
    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    // Shuffle and pick 3
    const shuffled = [...QUEST_POOL].sort(() => 0.5 - random());

    return shuffled.slice(0, 3).map((template, index) => ({
        ...template,
        id: `daily_${today}_${index}`,
        progress: 0,
        isCompleted: false
    }));
};

interface UserContextType {
    user: User | null;
    userData: any;
    loading: boolean;
    // New Gamification State
    dailyQuests: Quest[];
    badges: Badge[];
    completeQuest: (questId: string, questObj?: Quest) => Promise<void>;
    checkQuestProgress: (action: 'CATCH' | 'WALK' | 'COMMUNITY', payload?: any) => void;
    updateUserLocation: (lat: number, lng: number) => Promise<void>;
}

// Define ALL Possible badges here, but don't load them into state by default
const ALL_BADGES_METADATA: Record<string, Omit<Badge, 'id' | 'earnedAt'>> = {
    'Badge: Novice': { name: 'Novice Catcher', icon: 'catching-pokemon', color: '#8d6e63', description: 'Catch 5 Pokemon' },
    'Badge: Pro': { name: 'Pro Catcher', icon: 'catching-pokemon', color: '#f44336', description: 'Catch 10 Pokemon' },
    'Badge: Fire Tamer': { name: 'Fire Tamer', icon: 'whatshot', color: '#ff5722', description: 'Master of Fire' },
    'Badge: Aqua Grunt': { name: 'Aqua Grunt', icon: 'water-drop', color: '#2196f3', description: 'Master of Water' },
    'Badge: Gardener': { name: 'Gardener', icon: 'grass', color: '#4caf50', description: 'Master of Grass' },
    'Badge: Sparky': { name: 'Sparky', icon: 'flash-on', color: '#ffeb3b', description: 'Master of Electric' },
    'Badge: Explorer': { name: 'Explorer', icon: 'map', color: '#795548', description: 'Walk 1km' },
    'Badge: Scout': { name: 'Scout', icon: 'directions-walk', color: '#8bc34a', description: 'Walk 500m' },
    'Badge: Socialite': { name: 'Socialite', icon: 'people', color: '#ff9800', description: 'Engaged with community' },
};

const UserContext = createContext<UserContextType>({
    user: null, userData: null, loading: true,
    dailyQuests: [], badges: [], completeQuest: async () => { }, checkQuestProgress: () => { },
    updateUserLocation: async () => { }
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [dailyQuests, setDailyQuests] = useState<Quest[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);

    // 4. Multiplayer Location Update
    const updateUserLocation = async (lat: number, lng: number) => {
        if (!user) return;
        try {
            await setDoc(doc(db, 'users', user.uid), {
                location: {
                    latitude: lat,
                    longitude: lng,
                    timestamp: Date.now()
                }
            }, { merge: true });
        } catch (e) {
            console.log("Loc update error", e);
        }
    };

    // Load Daily Quests (Persistence Logic)
    useEffect(() => {
        if (!user) return; // Wait for user login

        const loadQuests = async () => {
            try {
                const today = new Date().toDateString();
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                let savedQuests: Quest[] = [];
                if (userSnap.exists() && userSnap.data().dailyQuests) {
                    savedQuests = userSnap.data().dailyQuests;
                }

                // Check if saved quests are from today
                const needsRefresh = savedQuests.length === 0 || savedQuests[0].date !== today;

                if (needsRefresh) {
                    // Generate new ones
                    const newQuests = getDailyQuests().map(q => ({ ...q, date: today }));
                    setDailyQuests(newQuests);

                    // Save to Firestore
                    await setDoc(userRef, { dailyQuests: newQuests }, { merge: true });
                } else {
                    // Use saved quests (restore progress)
                    setDailyQuests(savedQuests);
                }
            } catch (e) {
                console.log("Error loading daily quests", e);
                // Fallback to local gen if offline/error
                setDailyQuests(getDailyQuests());
            }
        };

        loadQuests();
    }, [user]); // Dependency on user

    const checkQuestProgress = (action: 'CATCH' | 'WALK' | 'COMMUNITY', payload?: any) => {
        setDailyQuests(currentQuests =>
            currentQuests.map(quest => {
                if (quest.isCompleted) return quest;

                let newProgress = quest.progress;

                // Logic for different quest types
                if (action === 'CATCH' && quest.type === 'CATCH_ANY') {
                    newProgress += 1;
                }
                else if (action === 'CATCH' && quest.type === 'CATCH_TYPE' && payload?.types) {
                    // Check if caught pokemon has the required type
                    const hasType = payload.types.some((t: string) => t === quest.targetType);
                    if (hasType) newProgress += 1;
                }
                else if (action === 'WALK' && quest.type === 'WALK' && payload?.distance) {
                    newProgress += payload.distance;
                }
                else if (action === 'COMMUNITY' && quest.type === 'COMMUNITY') {
                    newProgress += 1;
                }

                // Check Completion
                if (newProgress >= quest.target && !quest.isCompleted) {
                    // Trigger completion logic immediately
                    completeQuest(quest.id, { ...quest, progress: newProgress, isCompleted: true });
                    return { ...quest, progress: newProgress, isCompleted: true };
                }

                return { ...quest, progress: Math.min(newProgress, quest.target) };
            })
        );
        // Sync handled by checkQuestProgress effect below
    };

    // Helper to sync state to Firestore
    useEffect(() => {
        if (!user || dailyQuests.length === 0) return;

        const save = async () => {
            try {
                await updateDoc(doc(db, 'users', user.uid), { dailyQuests });
            } catch (e) { console.log("Error saving quest progress", e); }
        };
        // Simple debounce/throttle could be added here
        const timeout = setTimeout(save, 2000);
        return () => clearTimeout(timeout);
    }, [dailyQuests, user]);

    // 3. Earn Badge logic
    const earnBadge = async (badgeName: string) => {
        if (!user) return;

        // Check if already earned
        if (badges.some(b => b.name === ALL_BADGES_METADATA[badgeName]?.name || b.name === badgeName)) return;

        const metadata = ALL_BADGES_METADATA[badgeName];
        if (!metadata) return;

        const newBadge: Badge = {
            id: `badge_${Date.now()}`,
            name: metadata.name,
            icon: metadata.icon,
            color: metadata.color,
            description: metadata.description,
            earnedAt: Date.now()
        };

        // Update Local
        const updatedBadges = [...badges, newBadge];
        setBadges(updatedBadges);

        // Update Firestore
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                badges: updatedBadges
            });
        } catch (e) {
            // Handle if user doc doesn't exist yet
            await setDoc(doc(db, 'users', user.uid), { badges: updatedBadges }, { merge: true });
        }
    };

    // Modified to accept quest object directly if coming from internal check
    const completeQuest = async (questId: string, questObj?: Quest) => {
        if (!user) return;

        // 1. Update Local State (if not already updated by checkQuestProgress)
        const quest = questObj || dailyQuests.find(q => q.id === questId);
        if (!quest) return;

        // Award Badge if reward is a badge
        if (quest.reward.startsWith('Badge:')) {
            await earnBadge(quest.reward);
        }

        // If called manually (e.g. debug click), mark completed
        if (!questObj) {
            setDailyQuests(prev => prev.map(q => q.id === questId ? { ...q, isCompleted: true, progress: q.target } : q));
        }

        // 2. Post to Community
        try {
            await addDoc(collection(db, 'posts'), {
                userId: user.uid,
                username: user.displayName || 'Trainer', // Fixed field name to match Post interface
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
                        if (snap.data().badges) {
                            setBadges(snap.data().badges);
                        } else {
                            setBadges([]);
                        }
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
        <UserContext.Provider value={{ user, userData, loading, dailyQuests, badges, completeQuest, checkQuestProgress, updateUserLocation }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
