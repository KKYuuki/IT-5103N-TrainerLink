import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, TouchableOpacity, Image } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { generateRandomSpawns, SpawnLocation } from '../utils/spawning';

const MapScreen = () => {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [spawns, setSpawns] = useState<SpawnLocation[]>([]);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                Alert.alert('Permission Denied', 'We need your location to find Pokemon!');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);

            // Generate initial spawns (15 Pokemon, 200m radius)
            const newSpawns = generateRandomSpawns(location.coords.latitude, location.coords.longitude, 200, 15);
            setSpawns(newSpawns);
        })();
    }, []);

    if (errorMsg) {
        return (
            <View style={styles.container}>
                <Text>{errorMsg}</Text>
            </View>
        );
    }

    if (!location) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#ff0000" />
                <Text style={{ marginTop: 10 }}>Accessing GPS...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.001, // High Zoom (1:1 Scale)
                    longitudeDelta: 0.001,
                }}
                showsUserLocation={true}
                followsUserLocation={true}
                showsMyLocationButton={true}
            >
                {spawns.map((spawn) => (
                    <Marker
                        key={spawn.id}
                        coordinate={{ latitude: spawn.latitude, longitude: spawn.longitude }}
                        title={`Pokemon #${spawn.pokemonId}`}
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
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    if (location) {
                        const newSpawns = generateRandomSpawns(location.coords.latitude, location.coords.longitude, 200, 15);
                        setSpawns(newSpawns);
                    }
                }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>RESPAWN</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    map: {
        width: '100%',
        height: '100%',
    },
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
