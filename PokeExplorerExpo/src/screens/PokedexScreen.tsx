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
    StatusBar
} from 'react-native';
import { getPokemonList, getPokemonDetails, PokemonListResult } from '../services/api';
import { auth } from '../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { MaterialIcons } from '@expo/vector-icons';

const PokedexScreen = ({ navigation }: any) => {
    const [pokemon, setPokemon] = useState<PokemonListResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);

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
        } catch (error) {
            console.error(error);
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
});

export default PokedexScreen;
