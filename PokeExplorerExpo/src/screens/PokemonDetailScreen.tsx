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
    Platform,
    Share
} from 'react-native';
import { getPokemonDetails, PokemonDetail, getPokemonSpecies, getEvolutionChain, EvolutionChain, EvolutionNode } from '../services/api';
import { usePokemon } from '../context/PokemonContext';
import { useNavigation } from '@react-navigation/native';
import * as MediaLibrary from 'expo-media-library';
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialIcons } from '@expo/vector-icons';

const TYPE_COLORS: { [key: string]: string } = {
    bug: '#A7B723',
    dark: '#75574C',
    dragon: '#7037FF',
    electric: '#F9CF30',
    fairy: '#E69EAC',
    fighting: '#C12239',
    fire: '#F57D31',
    flying: '#A891EC',
    ghost: '#70559B',
    normal: '#AAA67F',
    grass: '#74CB48',
    ground: '#DEC16B',
    ice: '#9AD6DF',
    poison: '#A43E9E',
    psychic: '#FB5584',
    rock: '#B69E31',
    steel: '#B7B9D0',
    water: '#6493EB',
};

const PokemonDetailScreen = ({ route }: any) => {
    const { pokemonId } = route.params;
    const [details, setDetails] = useState<PokemonDetail | null>(null);
    const [description, setDescription] = useState<string>('');
    const [evolutionChain, setEvolutionChain] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { isCaught } = usePokemon();
    const navigation = useNavigation();

    // ... (rest of the component)

    // Helper to get color
    const getBackgroundColor = () => {
        if (!details || !details.types || details.types.length === 0) return '#fff';
        const type = details.types[0].type.name.toLowerCase();
        return TYPE_COLORS[type] || '#fff';
    };

    const getTypeColor = (type: string) => {
        return TYPE_COLORS[type.toLowerCase()] || '#ee1515';
    };

    const handleShare = async () => {
        if (!details) return;

        try {
            // 1. Define temp path
            const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${details.id}.png`;
            const fileUri = `${FileSystem.cacheDirectory}share_${details.id}.png`;

            // 2. Download to local cache
            const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);

            // 3. Share the local file
            await Share.share({
                message: `Check out ${details.name.toUpperCase()} (#${details.id})! 🐾`,
                url: uri,
                title: `Share ${details.name}`
            });
        } catch (error: any) {
            // Fallback to simple text if download fails
            await Share.share({
                message: `Check out ${details.name.toUpperCase()} (#${details.id}) in PokeExplorer!`,
                title: `Share ${details.name}`
            });
        }
    };

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

    // Hide Default Header
    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

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
        <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
            {/* 1. Background Pokeball (Fixed) */}
            <Image
                source={require('../../assets/Pokeball.png')}
                style={styles.bgPokeball}
            />

            <SafeAreaView style={{ flex: 1 }}>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* CUSTOM HEADER */}
                    <View style={styles.header}>
                        <View style={styles.headerRow}>
                            {/* Left: Back + Name */}
                            <View style={styles.headerLeft}>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <MaterialIcons name="arrow-back" size={30} color="white" />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>
                                    {details.name.charAt(0).toUpperCase() + details.name.slice(1)}
                                </Text>
                            </View>

                            {/* Right: Camera + ID */}
                            <View style={styles.headerRight}>
                                {/* Share Button */}
                                <TouchableOpacity onPress={handleShare} style={{ marginRight: 15 }}>
                                    <MaterialIcons name="share" size={28} color="white" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={handleSaveToGallery} disabled={saving}>
                                    {saving ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <MaterialIcons name="camera-alt" size={30} color="white" />
                                    )}
                                </TouchableOpacity>
                                <Text style={styles.headerId}>
                                    #{details.id.toString().padStart(3, '0')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* 2. Pokemon Image (Floating) */}
                    <View style={styles.imageWrapper}>
                        <Image source={{ uri: imageUrl }} style={styles.image} />
                    </View>

                    {/* 3. White Sheet (Details) */}
                    <View style={styles.whiteSheet}>

                        {/* Types (Moved here per screenshot) */}
                        <View style={styles.typesContainer}>
                            {details.types.map((t) => (
                                <View key={t.slot} style={[styles.typeBadge, { backgroundColor: getTypeColor(t.type.name) }]}>
                                    <Text style={styles.typeText}>{t.type.name.toUpperCase()}</Text>
                                </View>
                            ))}
                        </View>

                        <Text style={[styles.sectionTitle, { color: getTypeColor(details.types[0].type.name) }]}>About</Text>

                        {/* Physical Stats */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <MaterialIcons name="fitness-center" size={20} color="#666" />
                                <Text style={styles.statValue}>{details.weight / 10} kg</Text>
                                <Text style={styles.statLabel}>Weight</Text>
                            </View>
                            <View style={[styles.statItem, styles.statBorder]}>
                                <MaterialIcons name="height" size={20} color="#666" />
                                <Text style={styles.statValue}>{details.height / 10} m</Text>
                                <Text style={styles.statLabel}>Height</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{details.moves[0]?.move?.name || 'Unknown'}</Text>
                                <Text style={styles.statValue}>{details.moves[1]?.move?.name || ''}</Text>
                                <Text style={styles.statLabel}>Moves</Text>
                            </View>
                        </View>

                        {/* Flavor Text */}
                        {description ? (
                            <Text style={styles.descriptionText}>{description}</Text>
                        ) : null}

                        {/* Base Stats */}
                        <Text style={[styles.sectionTitle, { color: getTypeColor(details.types[0].type.name) }]}>Base Stats</Text>
                        <View style={styles.section}>
                            {details.stats.map((s) => (
                                <View key={s.stat.name} style={styles.statBarRow}>
                                    <Text style={styles.statName}>{getStatLabel(s.stat.name)}</Text>
                                    <Text style={styles.statNumber}>{s.base_stat.toString().padStart(3, '0')}</Text>
                                    <View style={styles.barBackground}>
                                        <View
                                            style={[
                                                styles.barFill,
                                                {
                                                    width: `${Math.min(s.base_stat, 100)}%`,
                                                    backgroundColor: getTypeColor(details.types[0].type.name)
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Evolution Chain */}
                        <Text style={[styles.sectionTitle, { color: getTypeColor(details.types[0].type.name) }]}>Evolution Chain</Text>
                        <View style={styles.evolutionRow}>
                            {evolutionChain.map((evo, index) => {
                                const caught = isCaught(evo.id);
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
                                            <MaterialIcons name="arrow-forward" size={24} color="#ccc" />
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

// Helper for Stat Names (HP, ATK, DEF...)
const getStatLabel = (name: string) => {
    switch (name) {
        case 'hp': return 'HP';
        case 'attack': return 'ATK';
        case 'defense': return 'DEF';
        case 'special-attack': return 'SATK';
        case 'special-defense': return 'SDEF';
        case 'speed': return 'SPD';
        default: return name.toUpperCase();
    }
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    bgPokeball: {
        position: 'absolute',
        top: 20,
        right: -20,
        width: 250,
        height: 250,
        opacity: 0.15,
        tintColor: 'white',
        transform: [{ rotate: '-20deg' }]
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: {
        paddingTop: 10, // Adjusted
        alignItems: 'center',
        paddingBottom: 20
    },
    imageWrapper: {
        zIndex: 10,
        elevation: 10,
        marginTop: 30, // Pushed up
        marginBottom: -80,
        alignItems: 'center'
    },
    image: {
        width: 250,
        height: 250,
        resizeMode: 'contain'
    },
    whiteSheet: {
        backgroundColor: 'white',
        width: '97%',
        borderRadius: 30,
        paddingTop: 100,
        paddingHorizontal: 20,
        paddingBottom: 20,
        elevation: 0,
        shadowOpacity: 0,
        borderTopWidth: 4,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        overflow: 'hidden',
    },
    sectionTitle: {
        fontSize: 22,
        fontFamily: 'Poppins_900Black', // Poppins Black
        marginBottom: 8,
        textAlign: 'center',
        marginTop: 10
    },
    typesContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 10,
        marginTop: -30
    },
    typeBadge: {
        paddingHorizontal: 25,
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: 5,
    },
    typeText: {
        color: 'white',
        fontFamily: 'Poppins_700Bold' // Poppins Bold
    },

    // About / Physical Stats
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statItem: {
        alignItems: 'center',
        flex: 1
    },
    statBorder: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#e0e0e0'
    },
    statValue: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold', // Poppins Bold
        marginTop: 5,
        textAlign: 'center'
    },
    statLabel: {
        fontSize: 12,
        color: '#999',
        fontFamily: 'Poppins_400Regular', // Poppins Regular
        marginTop: 2
    },

    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: 'Poppins_400Regular' // Poppins Regular
    },

    // Base Stats
    section: { width: '100%', marginBottom: 5 },
    statBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    statName: {
        width: 50,
        fontSize: 12,
        color: '#666',
        fontFamily: 'Poppins_700Bold' // Poppins Bold (for abbreviation)
    },
    statNumber: {
        width: 40,
        fontSize: 12,
        color: '#666',
        textAlign: 'right',
        marginRight: 10,
        fontFamily: 'Poppins_400Regular'
    },
    barBackground: { flex: 1, height: 6, backgroundColor: '#eee', borderRadius: 3 },
    barFill: { height: 6, borderRadius: 3 },

    // Evo Chain
    evolutionRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
    evoNode: { alignItems: 'center', margin: 5 },
    evoImage: { width: 80, height: 80 },
    hiddenImage: { tintColor: 'black', opacity: 0.1 },
    questionMarkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    questionMark: { fontSize: 40, fontWeight: 'bold', color: '#ccc' },
    evoName: {
        fontSize: 12,
        marginTop: 5,
        fontFamily: 'Poppins_700Bold'
    },

    // Custom Header Styles
    header: {
        width: '100%', // Full width to allow space-between to work
        paddingHorizontal: 20,
        paddingTop: 50, // Adjusted as requested
        marginBottom: 10
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerTitle: {
        color: 'white',
        fontSize: 24,
        marginLeft: 15,
        textTransform: 'capitalize',
        fontFamily: 'Poppins_900Black' // Poppins Black
    },
    headerId: {
        color: 'white',
        fontSize: 18,
        marginLeft: 15,
        fontFamily: 'Poppins_700Bold'
    },
    backButton: {
        padding: 5
    }
});

export default PokemonDetailScreen;
