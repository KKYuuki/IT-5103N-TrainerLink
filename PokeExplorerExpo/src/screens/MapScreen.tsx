import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, TouchableOpacity, Image, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useUser } from '../context/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { MaterialIcons } from '@expo/vector-icons';
import { checkGridForSpawns, SpawnLocation } from '../utils/spawning';
import { getBiomeAtLocation, isRarePokemon, isLegendaryPokemon } from '../utils/procedural';

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

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

const MapScreen = ({ navigation }: any) => {
    const { user } = useUser();
    const mapRef = useRef<MapView>(null);
    const [realLocation, setRealLocation] = useState<Location.LocationObject | null>(null);
    const [offset, setOffset] = useState({ lat: 0, lng: 0 }); // Manual movement offset
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [spawns, setSpawns] = useState<SpawnLocation[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);
    const [hasZoomed, setHasZoomed] = useState(false);
    const [currentBiome, setCurrentBiome] = useState<string>("Loading...");

    // Tracking last spawn location to trigger updates every X meters
    const lastSpawnLocation = useRef<{ lat: number, lng: number } | null>(null);
    // Track notification time to avoid spam
    const lastNotificationTime = useRef<number>(0);
    // Audio ref
    const soundRef = useRef<Audio.Sound | null>(null);

    // DEBUG: Track start location
    const startLocation = useRef<{ lat: number, lng: number } | null>(null);

    useEffect(() => {
        let locationSubscription: Location.LocationSubscription;

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            const { status: notifStatus } = await Notifications.requestPermissionsAsync();
            if (notifStatus === 'granted' && user) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Welcome back, Trainer!",
                        body: `Ready to explore the world, ${user.displayName || 'Trainer'}?`,
                    },
                    trigger: null, // Send immediately
                });
            }

            // Initial position
            let loc = await Location.getCurrentPositionAsync({});
            setRealLocation(loc);

            if (!startLocation.current) {
                startLocation.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
            }

            // Watch for position updates
            locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 1,
                },
                (newLocation) => {
                    setRealLocation(newLocation);
                    // We DO NOT call checkAndSpawn here anymore to avoid stale closures
                }
            );

            setOffset({ lat: 0, lng: 0 });
        })();

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, []);

    // Background Audio Handling
    useFocusEffect(
        useCallback(() => {
            const playSound = async () => {
                try {
                    console.log('Loading Sound');
                    const { sound } = await Audio.Sound.createAsync(
                        require('../../assets/maps-bgmusic.mp3'),
                        { isLooping: true, shouldPlay: true, volume: 0.5 }
                    );
                    soundRef.current = sound;
                    console.log('Playing Sound');
                    await sound.playAsync();
                } catch (error) {
                    console.log('Error playing sound:', error);
                }
            };

            playSound();

            return () => {
                console.log('Unloading Sound');
                if (soundRef.current) {
                    soundRef.current.stopAsync();
                    soundRef.current.unloadAsync();
                    soundRef.current = null;
                }
            };
        }, [])
    );

    // MAIN GAME LOOP: React to location or offset changes
    useEffect(() => {
        if (realLocation) {
            checkAndSpawn(realLocation.coords.latitude, realLocation.coords.longitude);
        }
    }, [realLocation, offset]);

    // Effect to handle initial zoom
    useEffect(() => {
        if (realLocation && isMapReady && !hasZoomed && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: realLocation.coords.latitude,
                longitude: realLocation.coords.longitude,
                latitudeDelta: 0.001,
                longitudeDelta: 0.001,
            }, 1000);
            setHasZoomed(true);
        }
    }, [realLocation, isMapReady]);

    const notifyForSpawns = (newSpawns: SpawnLocation[]) => {
        const now = Date.now();
        const regulatoryThrottle = 120000; // 2 Minutes

        // Check for Legendaries FIRST
        const legendarySpawn = newSpawns.find(s => isLegendaryPokemon(s.pokemonId));

        if (legendarySpawn) {
            // Legendary Notification (High Priority)
            if (now - lastNotificationTime.current > 10000) { // 10s grace period for distinct events

                let title = "⚠️ LEGENDARY DETECTED ⚠️";
                let body = "A powerful energy feels close! A Legendary Pokemon has appeared!";

                // Custom notifications per ID
                switch (legendarySpawn.pokemonId) {
                    case 144: // Articuno
                        title = "❄️ A Chill in the Air... ❄️";
                        body = "The legendary Articuno has been sighted near you!";
                        break;
                    case 145: // Zapdos
                        title = "⚡ The Sky Crackles! ⚡";
                        body = "A storm is brewing... Zapdos is nearby!";
                        break;
                    case 146: // Moltres
                        title = "🔥 The Air is Burning! 🔥";
                        body = "Moltres has set the sky ablaze nearby!";
                        break;
                    case 150: // Mewtwo
                        title = "🧬 Psychic Pressure Detected 🧬";
                        body = "Mewtwo is watching you from the shadows...";
                        break;
                    case 151: // Mew
                        title = "🔮 A Playful Giggle? 🔮";
                        body = "The mythical Mew is playing hide and seek nearby!";
                        break;
                }

                Notifications.scheduleNotificationAsync({
                    content: {
                        title: title,
                        body: body,
                        sound: true,
                        priority: Notifications.AndroidNotificationPriority.MAX,
                        vibrate: [0, 500, 250, 500],
                    },
                    trigger: null,
                });
                lastNotificationTime.current = now;
            }
            return;
        }

        // Standard "Nearby" Notification (Strict 2 Minute Throttle)
        if (now - lastNotificationTime.current > regulatoryThrottle && newSpawns.length > 0) {
            Notifications.scheduleNotificationAsync({
                content: {
                    title: "Pokemon Nearby 🐾",
                    body: `There are wild Pokemon in your area. Go catch them!`
                },
                trigger: null,
            });
            lastNotificationTime.current = now;
        }
    };

    const checkAndSpawn = (currentLat: number, currentLng: number) => {
        // Effective position includes offset (for dpad testing)
        const effectiveLat = currentLat + offset.lat;
        const effectiveLng = currentLng + offset.lng;

        // Update Biome
        const biome = getBiomeAtLocation(effectiveLat, effectiveLng);
        setCurrentBiome(biome);

        const MOVEMENT_THRESHOLD = 5; // Higher threshold to reduce jitter

        // Always update if no last location
        const dist = lastSpawnLocation.current
            ? getDistance(effectiveLat, effectiveLng, lastSpawnLocation.current.lat, lastSpawnLocation.current.lng)
            : 9999;

        if (dist > MOVEMENT_THRESHOLD) {

            // 100m radius check (High density, short range)
            const newSpawns = checkGridForSpawns(effectiveLat, effectiveLng, 100);

            setSpawns(newSpawns);
            lastSpawnLocation.current = { lat: effectiveLat, lng: effectiveLng };

            notifyForSpawns(newSpawns);
        }
    };

    const movePlayer = (dLat: number, dLng: number) => {
        setOffset(prev => ({ lat: prev.lat + dLat, lng: prev.lng + dLng }));
    };

    const recenterMap = () => {
        if (realLocation && mapRef.current) {
            const playerLat = realLocation.coords.latitude + offset.lat;
            const playerLng = realLocation.coords.longitude + offset.lng;
            mapRef.current.animateToRegion({
                latitude: playerLat,
                longitude: playerLng,
                latitudeDelta: 0.001,
                longitudeDelta: 0.001,
            });
        }
    };

    if (errorMsg) return <View style={styles.container}><Text>{errorMsg}</Text></View>;
    if (!realLocation) return <View style={styles.container}><ActivityIndicator size="large" color="#ff0000" /><Text>GPS Locking...</Text></View>;

    const playerLat = realLocation.coords.latitude + offset.lat;
    const playerLng = realLocation.coords.longitude + offset.lng;

    // Calculate distance from start for debugging
    const distFromStart = startLocation.current
        ? getDistance(playerLat, playerLng, startLocation.current.lat, startLocation.current.lng)
        : 0;

    return (
        <View style={styles.container}>
            {/* Debug Info Bar */}
            <View style={styles.debugBar}>
                <View>
                    <Text style={styles.debugText}>Biome: {currentBiome}</Text>
                    <Text style={styles.debugText}>Spawns: {spawns.length}</Text>
                </View>
                <View>
                    <Text style={styles.debugText}>Loc: {playerLat.toFixed(4)}, {playerLng.toFixed(4)}</Text>
                    <Text style={styles.debugText}>Moved: {Math.round(distFromStart)}m</Text>
                </View>
            </View>

            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude: playerLat,
                    longitude: playerLng,
                    latitudeDelta: 0.001,
                    longitudeDelta: 0.001,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
                onMapReady={() => setIsMapReady(true)}
            >
                {/* Custom Player Marker */}
                <Marker coordinate={{ latitude: playerLat, longitude: playerLng }} title="You">
                    <View style={styles.playerMarker}>
                        <View style={styles.playerDot} />
                    </View>
                </Marker>

                {/* Spawns rendering */}
                {spawns.map((spawn) => (
                    <Marker
                        key={spawn.id}
                        coordinate={{ latitude: spawn.latitude, longitude: spawn.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        tracksViewChanges={true} // FORCE TRUE to fix invisible images
                        onPress={() => {
                            const dist = getDistance(playerLat, playerLng, spawn.latitude, spawn.longitude);

                            if (dist > 30) {
                                Alert.alert("Too Far!", `Get closer to interact! (${Math.round(dist)}m away)`);
                                return;
                            }

                            // @ts-ignore
                            navigation.navigate('Catch', {
                                pokemonId: spawn.pokemonId,
                                pokemonName: 'Wild Pokemon'
                            });
                        }}
                    >
                        {/* Added background color to verify position even if image fails */}
                        <View style={{ width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' }}>
                            <Image
                                source={{ uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${spawn.pokemonId}.png` }}
                                style={{ width: 50, height: 50, resizeMode: 'contain' }}
                            />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Recenter Button */}
            <TouchableOpacity style={styles.recenterBtn} onPress={recenterMap}>
                <MaterialIcons name="my-location" size={24} color="black" />
            </TouchableOpacity>

            {/* D-Pad Controls */}
            <View style={styles.dpadContainer}>
                <TouchableOpacity style={styles.dpadBtn} onPress={() => movePlayer(0.0001, 0)}>
                    <MaterialIcons name="keyboard-arrow-up" size={30} color="black" />
                </TouchableOpacity>
                <View style={styles.dpadRow}>
                    <TouchableOpacity style={styles.dpadBtn} onPress={() => movePlayer(0, -0.0001)}>
                        <MaterialIcons name="keyboard-arrow-left" size={30} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dpadBtn} onPress={() => movePlayer(0, 0.0001)}>
                        <MaterialIcons name="keyboard-arrow-right" size={30} color="black" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dpadBtn} onPress={() => movePlayer(-0.0001, 0)}>
                    <MaterialIcons name="keyboard-arrow-down" size={30} color="black" />
                </TouchableOpacity>
            </View>

            {/* Manual Respawn Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    checkAndSpawn(realLocation.coords.latitude, realLocation.coords.longitude);
                    Alert.alert("Scanned!", `Checked for pokemon in ${currentBiome} biome.`);
                }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>SCAN AREA</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    map: { ...StyleSheet.absoluteFillObject },
    debugBar: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 5,
        zIndex: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20
    },
    debugText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12
    },
    playerMarker: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: 'rgba(0,0,255,0.3)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'blue'
    },
    playerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'blue' },
    recenterBtn: {
        position: 'absolute',
        top: 80,
        right: 20,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 30, // Circle
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 10
    },
    dpadContainer: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
        padding: 5
    },
    dpadRow: { flexDirection: 'row' },
    dpadBtn: { padding: 10 },
    btnText: { fontSize: 20 },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#ff5722',
        padding: 15,
        borderRadius: 30,
        elevation: 5
    }
});

export default MapScreen;
