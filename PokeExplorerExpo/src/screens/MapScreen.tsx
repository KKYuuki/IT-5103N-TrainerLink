import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, TouchableOpacity, Image, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { MaterialIcons } from '@expo/vector-icons';
import { generateRandomSpawns, SpawnLocation } from '../utils/spawning';

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const MapScreen = ({ navigation }: any) => {
    const mapRef = useRef<MapView>(null);
    const [realLocation, setRealLocation] = useState<Location.LocationObject | null>(null);
    const [offset, setOffset] = useState({ lat: 0, lng: 0 }); // Manual movement offset
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [spawns, setSpawns] = useState<SpawnLocation[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);
    const [hasZoomed, setHasZoomed] = useState(false);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            const { status: notifStatus } = await Notifications.requestPermissionsAsync();

            let loc = await Location.getCurrentPositionAsync({});
            setRealLocation(loc);

            // Set initial offset to 0 so "You" are at real location
            setOffset({ lat: 0, lng: 0 });

            // Trigger spawns at this real location
            triggerSpawns(loc.coords.latitude, loc.coords.longitude);
        })();
    }, []);

    // Effect to handle initial zoom once both Location and Map are ready
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

    const triggerSpawns = async (lat: number, lng: number) => {
        const newSpawns = generateRandomSpawns(lat, lng, 200, 15);
        setSpawns(newSpawns);
        // ... notification logic ...
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

    return (
        <View style={styles.container}>
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
                showsUserLocation={false} // Hide real blue dot
                showsMyLocationButton={false}
                onMapReady={() => setIsMapReady(true)}
            >
                {/* Custom Player Marker */}
                <Marker coordinate={{ latitude: playerLat, longitude: playerLng }} title="You">
                    <View style={styles.playerMarker}>
                        <View style={styles.playerDot} />
                    </View>
                </Marker>

                {/* Restored Spawns rendering */}
                {spawns.map((spawn) => (
                    <Marker
                        key={`${spawn.id}-${spawn.pokemonId}_v3`}
                        coordinate={{ latitude: spawn.latitude, longitude: spawn.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        tracksViewChanges={true}
                        onPress={() => {
                            // Calculate distance between Player and Pokemon
                            const playerLat = realLocation?.coords.latitude! + offset.lat;
                            const playerLng = realLocation?.coords.longitude! + offset.lng;

                            // Haversine approximation for short distances
                            const R = 6371e3; // metres
                            const φ1 = playerLat * Math.PI / 180;
                            const φ2 = spawn.latitude * Math.PI / 180;
                            const Δφ = (spawn.latitude - playerLat) * Math.PI / 180;
                            const Δλ = (spawn.longitude - playerLng) * Math.PI / 180;

                            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                                Math.cos(φ1) * Math.cos(φ2) *
                                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            const distance = R * c;

                            if (distance > 30) { // 30 meters range
                                Alert.alert("Too Far!", `Get closer to interact! (${Math.round(distance)}m away)`);
                                return;
                            }

                            // @ts-ignore - Navigate to Root Stack Screen
                            navigation.navigate('Catch', {
                                pokemonId: spawn.pokemonId,
                                pokemonName: 'Pokemon'
                            });
                        }}
                    >
                        <View style={{ width: 50, height: 50 }}>
                            <Image
                                source={{ uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${spawn.pokemonId}.png` }}
                                style={{ width: 50, height: 50, resizeMode: 'contain' }}
                            />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Recenter Button (Styled to look like Native Google Maps button) */}
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

            {/* Respawn Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => triggerSpawns(playerLat, playerLng)}
            >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>RESPAWN</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    map: { ...StyleSheet.absoluteFillObject },
    playerMarker: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: 'rgba(0,0,255,0.3)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'blue'
    },
    playerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'blue' },
    recenterBtn: {
        position: 'absolute',
        top: 60, // Pushed down as requested
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
        bottom: 100, // Above Respawn button
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
