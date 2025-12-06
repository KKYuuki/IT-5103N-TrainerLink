import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { getPokemonDetails, PokemonDetail } from '../services/api';

const PokemonDetailScreen = ({ route }: any) => {
    const { pokemonId, pokemonName } = route.params;
    const [details, setDetails] = useState<PokemonDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await getPokemonDetails(pokemonId);
                setDetails(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [pokemonId]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (!details) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Failed to load details.</Text>
            </View>
        );
    }

    const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>
                    {details.name.charAt(0).toUpperCase() + details.name.slice(1)}
                </Text>

                <Image source={{ uri: imageUrl }} style={styles.image} />

                <View style={styles.statsContainer}>
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Height:</Text>
                        <Text style={styles.statValue}>{details.height / 10} m</Text>
                    </View>
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Weight:</Text>
                        <Text style={styles.statValue}>{details.weight / 10} kg</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Types</Text>
                    <View style={styles.typesContainer}>
                        {details.types.map((t) => (
                            <View key={t.slot} style={styles.typeBadge}>
                                <Text style={styles.typeText}>{t.type.name.toUpperCase()}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Stats</Text>
                    {details.stats.map((s) => (
                        <View key={s.stat.name} style={styles.statBarRow}>
                            <Text style={styles.statName}>{s.stat.name.toUpperCase()}</Text>
                            <Text style={styles.statNumber}>{s.base_stat}</Text>
                            <View style={styles.barBackground}>
                                <View
                                    style={[
                                        styles.barFill,
                                        { width: `${Math.min(s.base_stat, 100)}%` },
                                    ]}
                                />
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 20, alignItems: 'center' },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
    image: { width: 250, height: 250, marginBottom: 20 },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
    statRow: { alignItems: 'center' },
    statLabel: { fontSize: 16, color: '#666' },
    statValue: { fontSize: 18, fontWeight: 'bold' },
    section: { width: '100%', marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    typesContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    typeBadge: {
        backgroundColor: '#ee1515',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 5,
    },
    typeText: { color: 'white', fontWeight: 'bold' },
    statBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    statName: { width: 100, fontSize: 12, color: '#444' },
    statNumber: { width: 30, fontSize: 12, fontWeight: 'bold', textAlign: 'right', marginRight: 10 },
    barBackground: { flex: 1, height: 10, backgroundColor: '#eee', borderRadius: 5 },
    barFill: { height: 10, backgroundColor: '#4caf50', borderRadius: 5 },
});

export default PokemonDetailScreen;
