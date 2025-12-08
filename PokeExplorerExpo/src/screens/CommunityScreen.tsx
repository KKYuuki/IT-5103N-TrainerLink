import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';

interface Post {
    id: string;
    username: string;
    pokemonName: string;
    pokemonId: number;
    timestamp: any; // Firestore Timestamp
    avatar?: 'boy' | 'girl';
}

const CommunityScreen = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useUser();

    useEffect(() => {
        // Query last 50 posts, newest first
        const q = query(
            collection(db, "posts"),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        // Realtime Listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts: Post[] = [];
            snapshot.forEach((doc) => {
                fetchedPosts.push({ id: doc.id, ...doc.data() } as Post);
            });
            setPosts(fetchedPosts);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const renderItem = ({ item }: { item: Post }) => {
        // Format Timestamp with relative time
        let timeString = '';
        if (item.timestamp?.seconds) {
            const postDate = new Date(item.timestamp.seconds * 1000);
            const now = new Date();
            const diffMs = now.getTime() - postDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) timeString = 'Just now';
            else if (diffMins < 60) timeString = `${diffMins}m ago`;
            else if (diffHours < 24) timeString = `${diffHours}h ago`;
            else timeString = `${diffDays}d ago`;
        } else {
            timeString = 'Just now';
        }

        const pokemonUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${item.pokemonId}.png`;

        return (
            <View style={styles.card}>
                {/* Large Pokemon Image Background */}
                <View style={styles.pokemonImageContainer}>
                    <Image source={{ uri: pokemonUrl }} style={styles.pokemonImage} />
                    <View style={styles.pokemonOverlay} />
                </View>

                {/* Content Overlay */}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={styles.trainerBadge}>
                            <MaterialIcons name="person" size={20} color="#d50000" />
                            <Text style={styles.username}>{item.username}</Text>
                        </View>
                        <View style={styles.timeContainer}>
                            <MaterialIcons name="access-time" size={12} color="#999" />
                            <Text style={styles.time}>{timeString}</Text>
                        </View>
                    </View>

                    <View style={styles.cardBody}>
                        <View style={styles.pokeballIcon}>
                            <MaterialIcons name="catching-pokemon" size={24} color="#d50000" />
                        </View>
                        <View style={styles.catchInfo}>
                            <Text style={styles.catchLabel}>CAUGHT</Text>
                            <Text style={styles.pokemonName}>{item.pokemonName}</Text>
                            <Text style={styles.pokemonNumber}>#{String(item.pokemonId).padStart(3, '0')}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#d50000" /></View>;
    }

    return (
        <View style={styles.container}>
            {/* Modern Header with Gradient-like Effect */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <MaterialIcons name="public" size={28} color="white" />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Community Feed</Text>
                        <Text style={styles.headerSubtitle}>Recent catches from trainers worldwide</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="explore" size={80} color="#ccc" />
                        <Text style={styles.emptyText}>No recent catches yet</Text>
                        <Text style={styles.emptySubtext}>Be the first to catch a Pokemon!</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f8f9fa' 
    },
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f8f9fa'
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#d50000',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    headerTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 13,
        marginTop: 2,
    },
    listContent: {
        padding: 15,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    pokemonImageContainer: {
        height: 180,
        backgroundColor: '#fafafa',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    pokemonImage: { 
        width: 160, 
        height: 160, 
        resizeMode: 'contain',
    },
    pokemonOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(213, 0, 0, 0.03)',
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    trainerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5f5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    username: { 
        fontWeight: 'bold', 
        fontSize: 15, 
        color: '#d50000',
        marginLeft: 6,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    time: { 
        color: '#999', 
        fontSize: 12,
        marginLeft: 4,
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 12,
    },
    pokeballIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    catchInfo: {
        flex: 1,
    },
    catchLabel: {
        fontSize: 10,
        color: '#999',
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 2,
    },
    pokemonName: { 
        fontWeight: 'bold', 
        fontSize: 18, 
        color: '#333',
        textTransform: 'capitalize',
        marginBottom: 2,
    },
    pokemonNumber: {
        fontSize: 13,
        color: '#d50000',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: 40,
    },
    emptyText: { 
        textAlign: 'center', 
        marginTop: 20, 
        color: '#666', 
        fontSize: 18,
        fontWeight: '600',
    },
    emptySubtext: {
        textAlign: 'center',
        marginTop: 8,
        color: '#999',
        fontSize: 14,
    },
});

export default CommunityScreen;
