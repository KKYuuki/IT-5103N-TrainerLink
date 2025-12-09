import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, TouchableOpacity, Image, Platform, Linking, FlatList, Modal, TextInput } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useUser } from '../context/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { MaterialIcons } from '@expo/vector-icons';
import { checkGridForSpawns, SpawnLocation } from '../utils/spawning';
import { getBiomeAtLocation, isRarePokemon, isLegendaryPokemon } from '../utils/procedural';
import { pokemonNames } from '../utils/pokemonNames';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';

// Haversine distance helper
const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const HuntScreen = ({ navigation }: any) => {
    const { user } = useUser();
    const mapRef = useRef<MapView>(null);
    const [realLocation, setRealLocation] = useState<Location.LocationObject | null>(null);
    const [offset, setOffset] = useState({ lat: 0, lng: 0 });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [spawns, setSpawns] = useState<SpawnLocation[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);
    const [hasZoomed, setHasZoomed] = useState(false);
    const [currentBiome, setCurrentBiome] = useState<string>("Loading...");
    const [sortedSpawns, setSortedSpawns] = useState<{ name: string; dist: number; id: number }[]>([]);

    const lastSpawnLocation = useRef<{ lat: number, lng: number } | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const startLocation = useRef<{ lat: number, lng: number } | null>(null);

    // Voice State
    const [isListening, setIsListening] = useState(false);
    const [showInputModal, setShowInputModal] = useState(false);
    const [manualInput, setManualInput] = useState('');

    // Location Setup
    useEffect(() => {
        let locationSubscription: Location.LocationSubscription;

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            // Initial position
            let loc = await Location.getLastKnownPositionAsync({});
            if (!loc) {
                try {
                    loc = await Promise.race([
                        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                    ]) as Location.LocationObject;
                } catch (e) {
                    console.log("GPS Timeout, defaulting");
                }
            }

            if (!loc) {
                loc = {
                    coords: { latitude: 37.7749, longitude: -122.4194, altitude: 0, accuracy: 0, altitudeAccuracy: 0, heading: 0, speed: 0 },
                    timestamp: Date.now()
                };
            }

            setRealLocation(loc);

            if (!startLocation.current) {
                startLocation.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
            }

            locationSubscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, distanceInterval: 1 },
                (newLocation) => setRealLocation(newLocation)
            );

            setOffset({ lat: 0, lng: 0 });
        })();

        return () => { if (locationSubscription) locationSubscription.remove(); };
    }, []);

    // Voice Setup
    useEffect(() => {
        const onSpeechResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value.length > 0) {
                const spokenText = e.value[0];
                processShout(spokenText);
                setIsListening(false);
                Voice.stop();
            }
        };

        const onSpeechError = (e: any) => {
            setIsListening(false);
            // If native voice fails (e.g. Expo Go), fallback to manual
            if (e.error?.message?.includes('not available') || e.error?.code === '5' || e.error?.code === '7') {
                setShowInputModal(true);
            } else {
                Alert.alert("Voice Error", "Could not hear you. Try getting closer.");
            }
        };

        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechError = onSpeechError;

        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);

    const processShout = (text: string) => {
        const cleanText = text.trim().toLowerCase();
        // Simple check if it's a pokemon name
        const foundId = pokemonNames.findIndex(name => name.toLowerCase() === cleanText);

        if (foundId !== -1) {
            const pokemonName = pokemonNames[foundId];
            Alert.alert("Shouted!", `You yelled "${pokemonName}"! If it's nearby, it might reveal itself!`, [{ text: "OK" }]);
            // Logic to reveal or spawn could go here
        } else {
            Alert.alert("Shouted!", `You yelled "${text}"! But nothing happened...`);
        }
    };

    const handleShout = async () => {
        try {
            setIsListening(true);
            await Voice.start('en-US');
            // Timeout to fallback if no voice engine exists (Expo Go often hangs instead of erroring instantly)
            setTimeout(() => {
                // Check if still "listening" with no partial results? 
                // For safety in Expo Go without dev client, might just error out.
            }, 2000);
        } catch (e) {
            console.log("Voice start error", e);
            setIsListening(false);
            setShowInputModal(true);
        }
    };


    // Game Loop
    useEffect(() => {
        if (realLocation) {
            checkAndSpawn(realLocation.coords.latitude, realLocation.coords.longitude);
        }
    }, [realLocation, offset]);

    // Auto-Recenter on Focus
    useFocusEffect(
        useCallback(() => {
            if (realLocation && mapRef.current) {
                const playerLat = realLocation.coords.latitude + offset.lat;
                const playerLng = realLocation.coords.longitude + offset.lng;

                mapRef.current.animateToRegion({
                    latitude: playerLat, longitude: playerLng,
                    latitudeDelta: 0.001, longitudeDelta: 0.001,
                }, 1000);
            }
        }, [realLocation, offset])
    );

    const checkAndSpawn = (currentLat: number, currentLng: number) => {
        const effectiveLat = currentLat + offset.lat;
        const effectiveLng = currentLng + offset.lng;

        const biome = getBiomeAtLocation(effectiveLat, effectiveLng);
        setCurrentBiome(biome);

        const dist = lastSpawnLocation.current
            ? getDistance(effectiveLat, effectiveLng, lastSpawnLocation.current.lat, lastSpawnLocation.current.lng)
            : 9999;

        if (dist > 5) {
            const newSpawns = checkGridForSpawns(effectiveLat, effectiveLng, 100);
            setSpawns(newSpawns);
            lastSpawnLocation.current = { lat: effectiveLat, lng: effectiveLng };
            updateRadar(newSpawns, effectiveLat, effectiveLng);
        }
    };

    const updateRadar = (currentSpawns: SpawnLocation[], lat: number, lng: number) => {
        const sorted = currentSpawns.map(s => ({
            name: pokemonNames[s.pokemonId - 1],
            dist: Math.round(getDistance(lat, lng, s.latitude, s.longitude)),
            id: s.pokemonId
        })).sort((a, b) => a.dist - b.dist).slice(0, 3); // Top 3
        setSortedSpawns(sorted);
    };

    // D-Pad for testing
    const movePlayer = (dLat: number, dLng: number) => {
        setOffset(prev => ({ lat: prev.lat + dLat, lng: prev.lng + dLng }));
    };

    if (errorMsg) return (
        <View style={styles.container}>
            <Text style={{ color: 'white', marginBottom: 20 }}>{errorMsg}</Text>
            <TouchableOpacity
                onPress={() => Linking.openSettings()}
                style={{ padding: 10, backgroundColor: 'white', borderRadius: 5 }}
            >
                <Text style={{ fontWeight: 'bold' }}>Open Settings</Text>
            </TouchableOpacity>
        </View>
    );
    if (!realLocation) return <View style={styles.container}><ActivityIndicator size="large" color="#ff0000" /></View>;

    const playerLat = realLocation.coords.latitude + offset.lat;
    const playerLng = realLocation.coords.longitude + offset.lng;

    return (
        <View style={styles.container}>
            {/* Map (90% height implied coverage behind overlays) */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude: playerLat, longitude: playerLng,
                    latitudeDelta: 0.001, longitudeDelta: 0.001,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
                onMapReady={() => setIsMapReady(true)}
            >
                <Marker coordinate={{ latitude: playerLat, longitude: playerLng }} title="You">
                    <View style={styles.playerMarker}><View style={styles.playerDot} /></View>
                </Marker>

                {spawns.map((spawn) => (
                    <Marker
                        key={spawn.id}
                        coordinate={{ latitude: spawn.latitude, longitude: spawn.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        tracksViewChanges={true}
                        onPress={() => navigation.navigate('Catch', {
                            pokemonId: spawn.pokemonId,
                            pokemonName: pokemonNames[spawn.pokemonId - 1]
                        })}
                    >
                        <View style={{ width: 40, height: 40 }}>
                            <Image
                                source={{ uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${spawn.pokemonId}.png` }}
                                style={{ width: 40, height: 40, resizeMode: 'contain', opacity: 0.8 }}
                            />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Biome Indicator (Top) */}
            <View style={styles.biomeIndicator}>
                <View style={styles.biomeIcon}>
                    <MaterialIcons name="terrain" size={24} color="white" />
                </View>
                <View>
                    <Text style={styles.biomeText}>{currentBiome} Biome</Text>
                    <Text style={styles.biomeSubtext}>Keep an eye out!</Text>
                </View>
            </View>

            {/* Shout FAB */}
            <TouchableOpacity
                style={[styles.shoutFab, isListening && styles.shoutFabActive]}
                onPress={handleShout}
            >
                {isListening ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <MaterialIcons name="record-voice-over" size={30} color="white" />
                )}
                <Text style={styles.shoutText}>{isListening ? 'LISTENING' : 'SHOUT'}</Text>
            </TouchableOpacity>

            {/* Manual Input Modal (Fallback) */}
            <Modal
                transparent
                visible={showInputModal}
                animationType="slide"
                onRequestClose={() => setShowInputModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Shout a Name!</Text>
                        <Text style={styles.modalSubtitle}>(Voice unavailable)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Pikachu"
                            placeholderTextColor="#666"
                            value={manualInput}
                            onChangeText={setManualInput}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setShowInputModal(false)} style={styles.modalBtnCancel}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowInputModal(false);
                                    processShout(manualInput);
                                    setManualInput('');
                                }}
                                style={styles.modalBtnSubmit}
                            >
                                <Text style={styles.modalBtnText}>SHOUT</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Nearby Radar (Bottom Sheet) */}
            <View style={styles.radarSheet}>
                <Text style={styles.radarTitle}>NEARBY SIGNAL</Text>
                {sortedSpawns.length === 0 ? (
                    <Text style={styles.radarEmpty}>No signals detected...</Text>
                ) : (
                    sortedSpawns.map((s, i) => (
                        <View key={i} style={styles.radarItem}>
                            <Image
                                source={{ uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${s.id}.png` }}
                                style={styles.radarImage}
                            />
                            <Text style={styles.radarName}>{s.name}</Text>
                            <View style={styles.radarDist}>
                                <Text style={styles.distText}>{s.dist}m</Text>
                                <MaterialIcons name="arrow-forward" size={14} color="#666" />
                            </View>
                        </View>
                    ))
                )}
            </View>

            {/* Hidden D-Pad for Dev/Testing */}
            <View style={styles.dpadContainer}>
                <TouchableOpacity onPress={() => movePlayer(0.0001, 0)} style={styles.dpadBtn}><MaterialIcons name="keyboard-arrow-up" size={24} color="rgba(0,0,0,0.2)" /></TouchableOpacity>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => movePlayer(0, -0.0001)} style={styles.dpadBtn}><MaterialIcons name="keyboard-arrow-left" size={24} color="rgba(0,0,0,0.2)" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => movePlayer(0, 0.0001)} style={styles.dpadBtn}><MaterialIcons name="keyboard-arrow-right" size={24} color="rgba(0,0,0,0.2)" /></TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => movePlayer(-0.0001, 0)} style={styles.dpadBtn}><MaterialIcons name="keyboard-arrow-down" size={24} color="rgba(0,0,0,0.2)" /></TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    map: { ...StyleSheet.absoluteFillObject },
    playerMarker: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,255,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#00ff00' },
    playerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00ff00' },

    // Biome UI
    biomeIndicator: {
        position: 'absolute', top: 50, alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row', alignItems: 'center',
        padding: 10, borderRadius: 30, paddingRight: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
    },
    biomeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0091ea', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    biomeText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    biomeSubtext: { color: '#bbb', fontSize: 12 },

    // Shout FAB
    shoutFab: {
        position: 'absolute', bottom: 250, right: 20,
        zIndex: 100, // Ensure it's on top
        backgroundColor: '#d50000', width: 70, height: 70, borderRadius: 35,
        justifyContent: 'center', alignItems: 'center',
        elevation: 8, shadowColor: '#d50000', shadowOpacity: 0.5, shadowRadius: 10,
        borderWidth: 3, borderColor: 'white'
    },
    shoutFabActive: {
        backgroundColor: '#ff9100', // Orange when listening
        borderColor: '#ff9100'
    },
    shoutText: { color: 'white', fontSize: 10, fontWeight: 'bold', marginTop: 2 },

    // Modal Styles
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
    },
    modalContent: {
        width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10
    },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#d50000', marginBottom: 5 },
    modalSubtitle: { fontSize: 12, color: '#666', marginBottom: 20 },
    modalInput: {
        width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10, fontSize: 18, marginBottom: 20, color: 'black'
    },
    modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    modalBtnCancel: { padding: 10, flex: 1, alignItems: 'center' },
    modalBtnSubmit: {
        padding: 10, backgroundColor: '#d50000', borderRadius: 10, flex: 1, alignItems: 'center', marginLeft: 10
    },
    modalBtnText: { color: 'white', fontWeight: 'bold' },

    // Radar Sheet
    radarSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(20,20,30,0.95)',
        borderTopLeftRadius: 25, borderTopRightRadius: 25,
        padding: 20, paddingBottom: 30,
        borderTopWidth: 1, borderColor: '#333'
    },
    radarTitle: { color: '#00ff00', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 15, textAlign: 'center' },
    radarEmpty: { color: '#666', textAlign: 'center', fontStyle: 'italic', padding: 20 },
    radarItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10 },
    radarImage: { width: 40, height: 40, marginRight: 15 },
    radarName: { color: 'white', fontWeight: 'bold', fontSize: 16, flex: 1 },
    radarDist: { flexDirection: 'row', alignItems: 'center' },
    distText: { color: '#00ff00', fontWeight: 'bold', marginRight: 5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

    // Debug DPad
    dpadContainer: { position: 'absolute', bottom: 200, left: 20 },
    dpadBtn: { padding: 5 }
});

export default HuntScreen;
