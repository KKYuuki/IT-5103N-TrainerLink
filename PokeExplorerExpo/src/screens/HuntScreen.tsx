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
import PokemonMarker from '../components/PokemonMarker';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

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
    const { user, updateUserLocation } = useUser();
    const mapRef = useRef<MapView>(null);
    const [realLocation, setRealLocation] = useState<Location.LocationObject | null>(null);
    const [offset, setOffset] = useState({ lat: 0, lng: 0 });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [spawns, setSpawns] = useState<SpawnLocation[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);
    const [hasZoomed, setHasZoomed] = useState(false);
    const [currentBiome, setCurrentBiome] = useState<string>("Loading...");
    const [sortedSpawns, setSortedSpawns] = useState<{ name: string; dist: number; id: number }[]>([]);

    // Multiplayer State
    const [otherPlayers, setOtherPlayers] = useState<any[]>([]);

    // New State for Lure
    const [lureTarget, setLureTarget] = useState<{ id: number, name: string, expiresAt: number } | null>(null);

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
                (newLocation) => {
                    setRealLocation(newLocation);
                    // Broadcast Location (every ~5-10s handled by throttling or simple logic here)
                    if (user) {
                        const now = Date.now();
                        // Simple 5.5s throttle check
                        if (now % 5500 < 1000) {
                            updateUserLocation(newLocation.coords.latitude, newLocation.coords.longitude);
                        }
                    }
                }
            );

            setOffset({ lat: 0, lng: 0 });
        })();

        return () => { if (locationSubscription) locationSubscription.remove(); };
    }, []);

    // Voice Setup
    useEffect(() => {
        const onSpeechResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value.length > 0) {
                // Final result (update input one last time)
                setManualInput(e.value[0]);
                setIsListening(false);
            }
        };

        const onSpeechPartialResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value.length > 0) {
                // Live transcription
                setManualInput(e.value[0]);
            }
        };

        const onSpeechError = (e: any) => {
            console.log("Speech Error:", e);
            setIsListening(false);
            // Don't alert "No Match" (7) aggressively, just let user type
            if (e.error?.code !== '7') {
                // only show alert for weird errors
                // Alert.alert("Voice Debug", `Code: ${e.error?.code}`);
            }
        };

        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechPartialResults = onSpeechPartialResults;
        Voice.onSpeechError = onSpeechError;

        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);

    // Multiplayer Listener
    useEffect(() => {
        if (!user) return;

        // Listen for players active in the last 5 minutes
        // Note: Firestore query might need an index for 'location.timestamp'
        const q = query(
            collection(db, 'users'),
            where('location.timestamp', '>', Date.now() - 5 * 60 * 1000)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const players: any[] = [];
            snapshot.forEach(doc => {
                if (doc.id !== user.uid) { // Don't show self
                    players.push({
                        id: doc.id,
                        ...doc.data()
                    });
                }
            });
            setOtherPlayers(players);
        });

        return () => unsubscribe();
    }, [user]);

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
        // 1. Open Modal Immediately
        setManualInput('');
        setShowInputModal(true);
        setIsListening(true);

        try {
            // 2. Request Permission
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                setIsListening(false);
                Alert.alert("Permission", "Mic permission required for voice.");
                return;
            }

            // 3. Start Listening
            await Voice.stop(); // Clear any previous session
            await Voice.start('en-US');

        } catch (e) {
            console.log("Voice start error", e);
            setIsListening(false);
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

                {/* Other Players */}
                {otherPlayers.map((player) => (
                    player.location ? (
                        <Marker
                            key={player.id}
                            coordinate={{
                                latitude: player.location.latitude,
                                longitude: player.location.longitude
                            }}
                            title={player.username || "Trainer"}
                        >
                            <View style={styles.otherPlayerMarker}>
                                <Image
                                    source={require('../../assets/pokeball-login-signup.png')}
                                    style={{ width: 25, height: 25 }}
                                />
                            </View>
                        </Marker>
                    ) : null
                ))}

                {spawns.map((spawn) => (
                    <PokemonMarker
                        key={spawn.id}
                        id={spawn.id}
                        pokemonId={spawn.pokemonId}
                        lat={spawn.latitude}
                        lng={spawn.longitude}
                        onPress={() => navigation.navigate('Catch', {
                            pokemonId: spawn.pokemonId,
                            pokemonName: pokemonNames[spawn.pokemonId - 1]
                        })}
                    />
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

                        {/* Status Indicator */}
                        {isListening ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                <ActivityIndicator color="#d50000" style={{ marginRight: 10 }} />
                                <Text style={{ color: '#d50000', fontWeight: 'bold' }}>Listening...</Text>
                            </View>
                        ) : (
                            <Text style={styles.modalSubtitle}>Type or say a Pokemon name</Text>
                        )}

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Listening..."
                            placeholderTextColor="#ccc"
                            value={manualInput}
                            onChangeText={setManualInput}
                            autoFocus // Keep keyboard up so they can type immediately if voice fails
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsListening(false);
                                    Voice.stop();
                                    setShowInputModal(false);
                                }}
                                style={styles.modalBtnCancel}
                            >
                                <Text style={{ color: '#666' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setIsListening(false);
                                    Voice.stop();
                                    setShowInputModal(false);
                                    processShout(manualInput);
                                    setManualInput('');
                                }}
                                style={styles.modalBtnSubmit}
                            >
                                <Text style={styles.modalBtnText}>SHOUT!</Text>
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
    otherPlayerMarker: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#ff5722'
    },

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

    // Lure Banner
    lureBanner: {
        position: 'absolute', top: 110, alignSelf: 'center',
        backgroundColor: 'rgba(50,50,50,0.9)', flexDirection: 'row', alignItems: 'center',
        padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ffeb3b',
        elevation: 5
    },
    lureText: { color: '#ffeb3b', fontWeight: 'bold', marginHorizontal: 10 },
    lureTimer: { color: 'white', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

    // Debug DPad
    dpadContainer: { position: 'absolute', bottom: 200, left: 20 },
    dpadBtn: { padding: 5 }
});

export default HuntScreen;
