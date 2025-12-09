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
    const { user, badges } = useUser();
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
                    {caught ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.pokemonImage}
                        />
                    ) : (
                        <Image
                            source={{ uri: imageUrl }}
                            style={[styles.pokemonImage, styles.silhouette]}
                        />
                    )}
                </TouchableOpacity>
                <Text style={styles.pokemonId}>#{id.toString().padStart(3, '0')}</Text>
                <Text style={[styles.pokemonName, !caught && styles.unknownName]}>{caught ? name : "????"}</Text>
            </View>
        );
    };

    // ... existing return ...


    return (
        <SafeAreaView style={styles.container}>
            {/* Enhanced Trainer Card Header */}
            <View style={styles.header}>
                <View style={styles.headerBackground}>
                    <MaterialIcons name="catching-pokemon" size={100} color="rgba(255,255,255,0.15)" style={styles.headerIcon} />
                </View>
                <View style={styles.headerContent}>
                    <View style={styles.avatar}>
                        <MaterialIcons name="person" size={50} color="white" />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.displayName || "Trainer"}</Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statBadge}>
                                <MaterialIcons name="catching-pokemon" size={16} color="#ff5722" />
                                <Text style={styles.statText}>{caughtPokemon.length}/151</Text>
                            </View>
                            <View style={[styles.statBadge, { marginLeft: 8 }]}>
                                <MaterialIcons name="star" size={16} color="#ff6f00" />
                                <Text style={styles.statText}>{Math.round((caughtPokemon.length / 151) * 100)}%</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* Quest Stats & Badges */}
            <View style={styles.badgeSection}>
                <Text style={styles.sectionTitle}>Trainer Badges</Text>
                <View style={styles.badgeGrid}>
                    {badges?.map((badge: any) => (
                        <View key={badge.id} style={styles.badgeItem}>
                            <View style={[styles.badgeIcon, { backgroundColor: badge.color }]}>
                                <MaterialIcons name={badge.icon} size={24} color="white" />
                            </View>
                            <Text style={styles.badgeName}>{badge.name}</Text>
                        </View>
                    ))}
                    {/* Add placeholder locked badges */}
                    <View style={[styles.badgeItem, { opacity: 0.5 }]}>
                        <View style={[styles.badgeIcon, { backgroundColor: '#ccc' }]}>
                            <MaterialIcons name="lock" size={24} color="white" />
                        </View>
                        <Text style={styles.badgeName}>???</Text>
                    </View>
                </View>
            </View>

            {/* Collection Title */}
            <View style={styles.collectionHeader}>
                <Text style={styles.collectionTitle}>My Collection</Text>
                <Text style={styles.collectionSubtitle}>Tap to view details</Text>
            </View>

            {/* Collection Grid */}
            <FlatList
                data={POKEMON_IDS}
                renderItem={renderPokemonItem}
                keyExtractor={(item) => item.toString()}
                numColumns={COLUMNS}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    header: {
        backgroundColor: '#d50000',
        paddingBottom: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        overflow: 'hidden',
        position: 'relative',
    },
    headerBackground: {
        position: 'absolute',
        top: -20,
        right: -20,
    },
    headerIcon: {
        transform: [{ rotate: '195deg' }],
    },
    headerContent: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 3,
        borderColor: 'white',
        elevation: 4,
    },
    userInfo: {
        flex: 1
    },
    userName: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    userEmail: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        marginBottom: 10,
    },
    statsRow: {
        flexDirection: 'row',
    },
    statBadge: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        alignItems: 'center',
    },
    statText: {
        color: '#d50000',
        fontWeight: 'bold',
        fontSize: 13,
        marginLeft: 4,
    },
    collectionHeader: {
        padding: 20,
        paddingBottom: 12,
    },
    // Badge Styles
    badgeSection: { padding: 20, paddingBottom: 0 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    badgeItem: { alignItems: 'center', marginRight: 20, marginBottom: 15, width: 60 },
    badgeIcon: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginBottom: 5, elevation: 3 },
    badgeName: { fontSize: 10, textAlign: 'center', color: '#666' },
    collectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    collectionSubtitle: {
        fontSize: 13,
        color: '#999',
        marginTop: 2,
    },
    listContent: {
        padding: 12,
        paddingBottom: 100,
    },
    gridItem: {
        width: ITEM_SIZE - 5,
        marginBottom: 16,
        alignItems: 'center',
    },
    imageContainer: {
        width: ITEM_SIZE - 20,
        height: ITEM_SIZE - 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    uncaughtContainer: {
        backgroundColor: '#f5f5f5',
    },
    pokemonImage: {
        width: '90%',
        height: '90%',
        resizeMode: 'contain',
    },
    silhouette: {
        tintColor: 'black',
        opacity: 0.2,
    },
    lockIcon: {
        position: 'absolute',
    },
    pokemonId: {
        fontSize: 11,
        color: '#999',
        fontWeight: '600',
    },
    pokemonName: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    unknownName: {
        color: '#999',
    },
});

export default ProfileScreen;
