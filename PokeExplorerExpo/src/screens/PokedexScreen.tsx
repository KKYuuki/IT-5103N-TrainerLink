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
} from 'react-native';
import { getPokemonList, PokemonListResult } from '../services/api';

const PokedexScreen = ({ navigation }: any) => {
    const [pokemon, setPokemon] = useState<PokemonListResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchPokemon = async () => {
        if (loading || !hasMore) return;

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
                <Image source={{ uri: imageUrl }} style={styles.image} />
                <Text style={styles.name}>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</Text>
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
            <FlatList
                data={pokemon}
                renderItem={renderItem}
                keyExtractor={(item) => item.name}
                numColumns={2}
                onEndReached={fetchPokemon}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                contentContainerStyle={styles.listContent}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listContent: {
        padding: 10,
    },
    card: {
        flex: 1,
        margin: 5,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    image: {
        width: 100,
        height: 100,
    },
    name: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default PokedexScreen;
