import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Alert,
    Platform,
    StatusBar,
    Modal
} from 'react-native';
import { getPokemonList, getPokemonDetails, PokemonListResult } from '../services/api';
import { pokemonNames } from '../utils/pokemonNames';
import { findClosestMatch } from '../utils/stringUtils';
import { auth } from '../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { MaterialIcons } from '@expo/vector-icons';
import {
    useSpeechRecognitionEvent,
    ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";
import { Audio } from 'expo-av';

const PokedexScreen = ({ navigation }: any) => {
    const [pokemon, setPokemon] = useState<PokemonListResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);

    // Voice State
    const [isListening, setIsListening] = useState(false);
    const [showInputModal, setShowInputModal] = useState(false);
    const [voiceInput, setVoiceInput] = useState('');

    const fetchPokemon = async () => {
        if (loading || !hasMore || searchQuery.length > 0) return;

        setLoading(true);
        try {
            const response = await getPokemonList(20, offset);
            if (response.results.length > 0) {
                setPokemon((prev) => {
                    const newPokemon = response.results.filter(
                        (p) => !prev.some((existing) => existing.name === p.name)
                    );
                    return [...prev, ...newPokemon];
                });
                setOffset((prev) => prev + 20);
            } else {
                setHasMore(false);
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error Loading Pokedex", error.message || "Unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const details = await getPokemonDetails(searchQuery.toLowerCase().trim());
            navigation.navigate('PokemonDetail', {
                pokemonId: details.id,
                pokemonName: details.name
            });
            setSearchQuery('');
        } catch (error) {
            Alert.alert('Not Found', `Could not find Pokemon: "${searchQuery}"`);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        fetchPokemon();
    }, []);

    // Speech Recognition Event Handlers
    useSpeechRecognitionEvent("result", (event) => {
        const transcription = event.results[0]?.transcript;
        if (transcription) {
            setVoiceInput(transcription);
            setIsListening(false);
            processVoiceCommand(transcription);
        }
    });

    useSpeechRecognitionEvent("end", () => {
        setIsListening(false);
    });

    useSpeechRecognitionEvent("error", (event) => {
        console.log("Speech Recognition Error:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
            Alert.alert("Voice Error", "Please try again.");
        }
    });

    const processVoiceCommand = async (text: string) => {
        let cleanText = text.trim().toLowerCase();
        setShowInputModal(false); // Close modal

        // Fuzzy Match Attempt
        // We use a threshold of 5 because some voice inputs are very botched (e.g. "To Two Dial" -> Totodile is dist 4 or 5)
        const closest = findClosestMatch(cleanText, pokemonNames, 5);
        if (closest) {
            console.log(`Fuzzy Match: "${cleanText}" -> "${closest}"`);
            cleanText = closest.toLowerCase();
        }

        // optimistic search using the (potentially) corrected name
        setSearchQuery(cleanText);
        setSearching(true);
        try {
            // Use existing getPokemonDetails which handles name-to-id
            const details = await getPokemonDetails(cleanText);
            navigation.navigate('PokemonDetail', {
                pokemonId: details.id,
                pokemonName: details.name
            });
            setSearchQuery('');
        } catch (error) {
            // If fuzzy match failed or API failed
            if (closest && closest.toLowerCase() !== text.trim().toLowerCase()) {
                Alert.alert("Not Found", `Could not find Pokemon: "${text}"\nDid you mean: ${closest}?`);
            } else {
                Alert.alert("Not Found", `Could not find Pokemon: "${text}"`);
            }
        } finally {
            setSearching(false);
        }
    };

    const handleVoiceButton = async () => {
        setVoiceInput('');
        setShowInputModal(true);
        setIsListening(true);

        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                setIsListening(false);
                Alert.alert("Permission", "Mic permission required for voice.");
                return;
            }

            const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!result.granted) {
                setIsListening(false);
                Alert.alert("Permission", "Speech recognition permission required.");
                return;
            }

            await ExpoSpeechRecognitionModule.start({
                lang: "en-US",
                interimResults: true,
                maxAlternatives: 1,
                continuous: false,
                androidIntentOptions: {
                    EXTRA_LANGUAGE_MODEL: "free_form",
                },
            });

        } catch (e) {
            console.log("Speech recognition start error", e);
            setIsListening(false);
            Alert.alert("Error", "Could not start speech recognition. Please type instead.");
        }
    };

    const getPokemonId = (url: string) => {
        const parts = url.split('/');
        return parts[parts.length - 2];
    };

    const renderItem = ({ item }: { item: PokemonListResult }) => {
        const id = getPokemonId(item.url);
        const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('PokemonDetail', { pokemonId: id, pokemonName: item.name })}
            >
                <View style={styles.cardBg}>
                    <MaterialIcons name="catching-pokemon" size={60} color="rgba(213, 0, 0, 0.1)" />
                </View>
                <Image source={{ uri: imageUrl }} style={styles.image} />
                <View style={styles.cardFooter}>
                    <Text style={styles.pokemonNumber}>#{id.padStart(3, '0')}</Text>
                    <Text style={styles.name}>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (!loading) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Modern Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialIcons name="catching-pokemon" size={28} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Pokedex</Text>
                        <Text style={styles.headerSubtitle}>Discover all Pokemon</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => signOut(auth)} style={styles.logoutBtn}>
                    <MaterialIcons name="logout" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search by name or ID..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                    disabled={searching}
                >
                    {searching ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <MaterialIcons name="arrow-forward" size={24} color="white" />
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={pokemon}
                renderItem={renderItem}
                keyExtractor={(item) => item.name}
                numColumns={2}
                onEndReached={fetchPokemon}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* Voice Search FAB */}
            <TouchableOpacity
                style={[styles.micFab, isListening && styles.micFabActive]}
                onPress={handleVoiceButton}
            >
                {isListening ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <MaterialIcons name="mic" size={30} color="white" />
                )}
            </TouchableOpacity>

            {/* Voice Modal */}
            <Modal
                transparent
                visible={showInputModal}
                animationType="slide"
                onRequestClose={() => setShowInputModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Say a Pokemon!</Text>

                        {isListening ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                <ActivityIndicator color="#d50000" style={{ marginRight: 10 }} />
                                <Text style={{ color: '#d50000', fontWeight: 'bold' }}>Listening...</Text>
                            </View>
                        ) : (
                            <Text style={styles.modalSubtitle}>Try saying "Pikachu"</Text>
                        )}

                        <Text style={styles.voiceText}>{voiceInput || "..."}</Text>

                        <TouchableOpacity
                            onPress={() => {
                                setIsListening(false);
                                ExpoSpeechRecognitionModule.stop();
                                setShowInputModal(false);
                            }}
                            style={styles.modalBtnCancel}
                        >
                            <Text style={{ color: '#666' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Voice Search FAB */}
            <TouchableOpacity
                style={[styles.micFab, isListening && styles.micFabActive]}
                onPress={handleVoiceButton}
            >
                {isListening ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <MaterialIcons name="mic" size={30} color="white" />
                )}
            </TouchableOpacity>

            {/* Voice Modal (Replicated from HuntScreen but styled for Pokedex) */}
            <Modal
                transparent
                visible={showInputModal}
                animationType="slide"
                onRequestClose={() => setShowInputModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Say a Pokemon!</Text>

                        {isListening ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                <ActivityIndicator color="#d50000" style={{ marginRight: 10 }} />
                                <Text style={{ color: '#d50000', fontWeight: 'bold' }}>Listening...</Text>
                            </View>
                        ) : (
                            <Text style={styles.modalSubtitle}>Try saying "Pikachu"</Text>
                        )}

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Recording... or type Pokemon name"
                            placeholderTextColor="#ccc"
                            value={voiceInput}
                            onChangeText={setVoiceInput}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsListening(false);
                                    ExpoSpeechRecognitionModule.stop();
                                    setShowInputModal(false);
                                }}
                                style={styles.modalBtnCancel}
                            >
                                <Text style={{ color: '#666' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setIsListening(false);
                                    ExpoSpeechRecognitionModule.stop();
                                    setShowInputModal(false);
                                    if (voiceInput.trim()) {
                                        processVoiceCommand(voiceInput);
                                    }
                                }}
                                style={styles.modalBtnSubmit}
                            >
                                <Text style={styles.modalBtnText}>FIND!</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#d50000',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerTextContainer: {
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    logoutBtn: {
        padding: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
        elevation: 2,
        alignItems: 'center',
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 25,
        paddingHorizontal: 16,
        marginRight: 12,
        height: 50,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#333',
    },
    searchButton: {
        backgroundColor: '#ff5722',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    listContent: {
        padding: 12,
        paddingBottom: 100,
    },
    card: {
        flex: 1,
        margin: 6,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    cardBg: {
        position: 'absolute',
        top: -10,
        right: -10,
    },
    image: {
        width: 110,
        height: 110,
        marginVertical: 8,
    },
    cardFooter: {
        alignItems: 'center',
        width: '100%',
    },
    pokemonNumber: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
    },
    name: {
        marginTop: 4,
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    footer: {
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micFab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#d50000',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: 'black',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 3,
        borderColor: 'white'
    },
    micFabActive: {
        backgroundColor: '#ff9100',
    },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
    },
    modalContent: {
        width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10
    },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#d50000', marginBottom: 10 },
    modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    voiceText: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 30, textAlign: 'center' },
    modalInput: {
        width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10, fontSize: 18, marginBottom: 20, color: 'black'
    },
    modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    modalBtnCancel: { padding: 10, flex: 1, alignItems: 'center' },
    modalBtnSubmit: {
        padding: 10, backgroundColor: '#d50000', borderRadius: 10, flex: 1, alignItems: 'center', marginLeft: 10
    },
    modalBtnText: { color: 'white', fontWeight: 'bold' },
});

export default PokedexScreen;
