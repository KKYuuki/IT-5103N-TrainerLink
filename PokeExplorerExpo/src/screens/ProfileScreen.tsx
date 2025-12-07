import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { usePokemon } from '../context/PokemonContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
// Use legacy API to avoid downloadAsync deprecation error in SDK 52+
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';
import { pokemonNames } from '../utils/pokemonNames';

// ... existing constants ...
const POKEMON_IDS = Array.from({ length: 151 }, (_, i) => i + 1);
const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMNS = 4;
const ITEM_SIZE = SCREEN_WIDTH / COLUMNS;

const ProfileScreen = ({ navigation }: any) => {
    const { user } = useUser();
    const { isCaught, caughtPokemon } = usePokemon();

    const renderPokemonItem = ({ item: id }: { item: number }) => {
        const caught = isCaught(id);
        const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
        const name = pokemonNames[id - 1];

        return (
            <View style={styles.gridItem}>
                <TouchableOpacity
                    style={[styles.imageContainer, !caught && styles.uncaughtContainer]}
                    onPress={() => caught && navigation.navigate('PokemonDetail', { pokemonId: id, pokemonName: name })}
                    disabled={!caught}
                >
                    <Image
                        source={{ uri: imageUrl }}
                        style={[styles.pokemonImage, !caught && styles.silhouette]}
                    />
                </TouchableOpacity>
                <Text style={styles.pokemonId}>#{id.toString().padStart(3, '0')}</Text>
                <Text style={styles.pokemonName}>{caught ? name : "????"}</Text>
            </View>
        );
    };

    // ... existing return ...


    return (
        <SafeAreaView style={styles.container}>
            {/* Header / Trainer Card */}
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <MaterialIcons name="person" size={60} color="white" />
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user?.displayName || "Trainer"}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            Pokedex: {caughtPokemon.length} / 151
                        </Text>
                    </View>
                </View>
            </View>

            {/* Collection Grid */}
            <FlatList
                data={POKEMON_IDS}
                renderItem={renderPokemonItem}
                keyExtractor={(item) => item.toString()}
                numColumns={COLUMNS}
                contentContainerStyle={styles.listContent}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#ff5722',
        alignItems: 'center',
        elevation: 4
    },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 20,
        borderWidth: 2, borderColor: 'white'
    },
    userInfo: { flex: 1 },
    userName: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    userEmail: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 5 },
    badge: {
        backgroundColor: 'white',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 12, alignSelf: 'flex-start'
    },
    badgeText: { color: '#ff5722', fontWeight: 'bold', fontSize: 12 },

    // Grid Styles
    listContent: { padding: 10 },
    gridItem: {
        width: ITEM_SIZE - 5,
        marginBottom: 15,
        alignItems: 'center'
    },
    imageContainer: {
        width: ITEM_SIZE - 20,
        height: ITEM_SIZE - 20,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 5
    },
    uncaughtContainer: {
        // Optional: add background for empty slots
    },
    pokemonImage: {
        width: '100%', height: '100%',
        resizeMode: 'contain'
    },
    silhouette: {
        tintColor: 'black',
        opacity: 0.3
    },
    pokemonId: { fontSize: 10, color: '#888' },
    pokemonName: { fontSize: 12, fontWeight: 'bold', color: '#333' }
});

export default ProfileScreen;
