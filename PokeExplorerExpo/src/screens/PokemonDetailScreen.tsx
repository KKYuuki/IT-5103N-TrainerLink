import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    Platform
} from 'react-native';
import { getPokemonDetails, PokemonDetail, getPokemonSpecies, getEvolutionChain, EvolutionChain, EvolutionNode } from '../services/api';
import { usePokemon } from '../context/PokemonContext';
import { useNavigation } from '@react-navigation/native';
import * as MediaLibrary from 'expo-media-library';
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialIcons } from '@expo/vector-icons';

const PokemonDetailScreen = ({ route }: any) => {
    const { pokemonId } = route.params;
    const [details, setDetails] = useState<PokemonDetail | null>(null);
    const [description, setDescription] = useState<string>('');
    const [evolutionChain, setEvolutionChain] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { isCaught } = usePokemon();
    const navigation = useNavigation();

    const handleSaveToGallery = async () => {
        if (!details) return;

        try {
            setSaving(true);
            // 1. Request Permission
            const { status } = await MediaLibrary.requestPermissionsAsync(true);
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "We need access to your gallery to save the Pokemon!");
                return;
            }

            // 2. Download Image
            const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${details.id}.png`;
            const fileUri = `${FileSystem.documentDirectory}${details.name}_${details.id}.png`;

            const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);

            // 3. Save to Media Library
            const asset = await MediaLibrary.createAssetAsync(uri);
            await MediaLibrary.createAlbumAsync("PokeExplorer", asset, false);

            Alert.alert("Saved! 📸", `${details.name.toUpperCase()} has been saved to your gallery.`);
        } catch (error: any) {
            Alert.alert("Error", "Failed to save image: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Add Save Button to Header
    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity onPress={handleSaveToGallery} style={{ marginRight: 15 }} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#000" />
                    ) : (
                        <MaterialIcons name="camera-alt" size={28} color="black" />
                    )}
                </TouchableOpacity>
            ),
            title: details ? details.name.charAt(0).toUpperCase() + details.name.slice(1) : 'Loading...',
        });
    }, [navigation, details, saving]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Basic Details
                const detailData = await getPokemonDetails(pokemonId);
                setDetails(detailData);

                // 2. Fetch Species (for Description + Evo URL)
                const speciesData = await getPokemonSpecies(detailData.id);

                // Find English description
                const entry = speciesData.flavor_text_entries.find(e => e.language.name === 'en');
                if (entry) {
                    setDescription(entry.flavor_text.replace(/\n|\f/g, ' '));
                }

                // 3. Fetch Evolution Chain
                if (speciesData.evolution_chain?.url) {
                    const evoData = await getEvolutionChain(speciesData.evolution_chain.url);
                    const chain = parseEvolutionChain(evoData.chain);
                    setEvolutionChain(chain);
                }

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [pokemonId]);

    // Recursive function to flatten the chain
    const parseEvolutionChain = (node: EvolutionNode): any[] => {
        const speciesId = node.species.url.split('/').slice(-2, -1)[0];
        const current = {
            id: parseInt(speciesId),
            name: node.species.name
        };

        // Handle branching evolutions (e.g. Eevee) - just taking first path for simplicity or map all
        let nextEvolutions: any[] = [];
        if (node.evolves_to.length > 0) {
            // Flatten all branches
            node.evolves_to.forEach(nextBranch => {
                nextEvolutions = [...nextEvolutions, ...parseEvolutionChain(nextBranch)];
            });
        }

        return [current, ...nextEvolutions];
    };

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

    const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${details.id}.png`;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image Section */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: imageUrl }} style={styles.image} />
                </View>

                {/* Flavor Text */}
                {description ? (
                    <View style={styles.descriptionBox}>
                        <Text style={styles.descriptionText}>{description}</Text>
                    </View>
                ) : null}

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

                {/* Base Stats */}
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

                {/* Evolution Chain */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Evolution Chain</Text>
                    <View style={styles.evolutionRow}>
                        {evolutionChain.map((evo, index) => {
                            const caught = isCaught(evo.id);
                            // If it's the current pokemon we are viewing, always show it, or if caught
                            const isVisible = caught || evo.id === details.id;
                            const evoImage = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.id}.png`;

                            return (
                                <View key={evo.id} style={styles.evoNode}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (isVisible) {
                                                // @ts-ignore
                                                navigation.push('PokemonDetail', { pokemonId: evo.id, pokemonName: evo.name });
                                            } else {
                                                Alert.alert("Unknown", "You haven't caught this Pokemon yet!");
                                            }
                                        }}
                                        disabled={false}
                                    >
                                        <Image
                                            source={{ uri: evoImage }}
                                            style={[styles.evoImage, !isVisible && styles.hiddenImage]}
                                        />
                                        {!isVisible && (
                                            <View style={styles.questionMarkOverlay}>
                                                <Text style={styles.questionMark}>?</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    <Text style={styles.evoName}>
                                        {isVisible ? (evo.name.charAt(0).toUpperCase() + evo.name.slice(1)) : '???'}
                                    </Text>
                                    {index < evolutionChain.length - 1 && (
                                        <Text style={styles.arrow}>→</Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 20, alignItems: 'center' },
    imageContainer: { alignItems: 'center', marginBottom: 20 },
    image: { width: 250, height: 250 },
    descriptionBox: {
        padding: 15,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        marginBottom: 20,
        width: '100%'
    },
    descriptionText: { fontStyle: 'italic', color: '#555', textAlign: 'center' },
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
    evolutionRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
    evoNode: { alignItems: 'center', margin: 5 },
    evoImage: { width: 80, height: 80 },
    hiddenImage: { tintColor: 'black', opacity: 0.1 },
    questionMarkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    questionMark: { fontSize: 40, fontWeight: 'bold', color: '#ccc' },
    evoName: { fontSize: 12, marginTop: 5, fontWeight: 'bold' },
    arrow: { fontSize: 20, color: '#ccc', marginHorizontal: 5 }
});

export default PokemonDetailScreen;
