import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { useUser } from '../context/UserContext';
import { usePokemon } from '../context/PokemonContext';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }: any) => {
    const { user } = useUser();
    const { caughtPokemon } = usePokemon();

    const features = [
        { icon: 'map', title: 'Explore', subtitle: 'Find Pokemon nearby', screen: 'MapTab', color: '#d50000' },
        { icon: 'catching-pokemon', title: 'Pokedex', subtitle: `${caughtPokemon.length}/151 caught`, screen: 'PokedexTab', color: '#ff5722' },
        { icon: 'people', title: 'Community', subtitle: 'See recent catches', screen: 'CommunityTab', color: '#ff6f00' },
        { icon: 'person', title: 'Profile', subtitle: 'View your collection', screen: 'ProfileTab', color: '#f4511e' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.trainerName}>{user?.displayName || 'Trainer'}!</Text>
                </View>
                <TouchableOpacity onPress={() => signOut(auth)} style={styles.logoutBtn}>
                    <MaterialIcons name="logout" size={24} color="#d50000" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Stats Card */}
                <View style={styles.statsCard}>
                    <Image
                        source={require('../../assets/pokeball-login-signup.png')}
                        style={styles.pokeballBg}
                    />
                    <View style={styles.statsContent}>
                        <Text style={styles.statsTitle}>Your Journey</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{caughtPokemon.length}</Text>
                                <Text style={styles.statLabel}>Caught</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{151 - caughtPokemon.length}</Text>
                                <Text style={styles.statLabel}>Remaining</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{Math.round((caughtPokemon.length / 151) * 100)}%</Text>
                                <Text style={styles.statLabel}>Complete</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.grid}>
                    {features.map((feature, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.featureCard, { backgroundColor: feature.color }]}
                            onPress={() => navigation.navigate(feature.screen)}
                        >
                            <MaterialIcons
                                name={feature.icon as any}
                                size={40}
                                color="white"
                                style={feature.title === 'Pokedex' ? { transform: [{ rotate: '180deg' }] } : undefined}
                            />
                            <Text style={styles.featureTitle}>{feature.title}</Text>
                            <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tips Section */}
                <View style={styles.tipsCard}>
                    <View style={styles.tipsHeader}>
                        <MaterialIcons name="lightbulb" size={24} color="#ff6f00" />
                        <Text style={styles.tipsTitle}>Pro Tip</Text>
                    </View>
                    <Text style={styles.tipsText}>
                        Pokemon spawn in different biomes! Try exploring urban areas, forests, and water sources to find different species.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    greeting: {
        fontSize: 16,
        color: '#666',
    },
    trainerName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#d50000',
    },
    logoutBtn: {
        padding: 8,
    },
    content: {
        padding: 20,
    },
    statsCard: {
        backgroundColor: '#d50000',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    pokeballBg: {
        position: 'absolute',
        right: -30,
        top: -30,
        width: 150,
        height: 150,
        opacity: 0.15,
        tintColor: 'white',
    },
    statsContent: {
        zIndex: 1,
    },
    statsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 24,
    },
    featureCard: {
        width: (width - 52) / 2,
        margin: 6,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 12,
    },
    featureSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
        textAlign: 'center',
    },
    tipsCard: {
        backgroundColor: '#fff3e0',
        borderRadius: 16,
        padding: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#ff6f00',
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ff6f00',
        marginLeft: 8,
    },
    tipsText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
});

export default HomeScreen;
