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
        // Format Timestamp (handles Firestore Timestamp or Date)
        let timeString = '';
        if (item.timestamp?.seconds) {
            timeString = new Date(item.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            timeString = 'Just now';
        }


        const avatarSource = require('../../assets/icon.png');

        const pokemonUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.pokemonId}.png`;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        {/* Tiny Avatar Crop */}
                        <View style={styles.avatarContainer}>
                            <Image source={avatarSource} style={styles.avatarImage} />
                        </View>
                        <Text style={styles.username}>{item.username}</Text>
                    </View>
                    <Text style={styles.time}>{timeString}</Text>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.actionText}>
                        caught a <Text style={styles.pokemonName}>{item.pokemonName}</Text>!
                    </Text>
                    <Image source={{ uri: pokemonUrl }} style={styles.pokemonImage} />
                </View>
            </View>
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#d50000" /></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Global Feed 🌐</Text>
            </View>

            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>No recent catches. Go catch something!</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        padding: 15,
        backgroundColor: '#d50000',
        paddingTop: 50, // Status Bar
        elevation: 4
    },
    headerTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    listContent: {
        padding: 10,
        paddingBottom: 80 // Bottom Tab clearance
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5
    },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 8,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarImage: {
        width: 32 * 4, // Scale up to show crop
        height: 32 * 4,
        // Rough centering attempt since we can't perfectly crop dynamic sprite sheets easily here without complex styles
        // But 32x32 window of top-left is usually Face/Down
        marginLeft: 0,
        marginTop: 0
    },
    username: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    time: { color: '#999', fontSize: 12 },
    cardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    actionText: { fontSize: 16, color: '#555', flex: 1 },
    pokemonName: { fontWeight: 'bold', color: '#d50000', textTransform: 'capitalize' },
    pokemonImage: { width: 60, height: 60, resizeMode: 'contain' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});

export default CommunityScreen;
