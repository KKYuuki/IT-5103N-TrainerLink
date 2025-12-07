import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Animated, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Gyroscope } from 'expo-sensors';
import { MaterialIcons } from '@expo/vector-icons';
import { usePokemon } from '../context/PokemonContext';
import { useUser } from '../context/UserContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const { width, height } = Dimensions.get('window');

const CatchScreen = ({ route, navigation }: any) => {
    const { pokemonId, pokemonName } = route.params;
    const [permission, requestPermission] = useCameraPermissions();
    const [caught, setCaught] = useState(false);
    const { markCaught } = usePokemon();
    const { user, userData } = useUser();

    // Animation Values
    const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const breath = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (permission && !permission.granted) {
            requestPermission();
        }
    }, [permission]);

    // Gyroscope Effect (Parallax)
    useEffect(() => {
        let subscription: any;

        const subscribe = async () => {
            const isAvailable = await Gyroscope.isAvailableAsync();
            if (isAvailable) {
                Gyroscope.setUpdateInterval(50);
                subscription = Gyroscope.addListener(data => {
                    const xOffset = data.y * 150;
                    const yOffset = data.x * 150;

                    Animated.spring(position, {
                        toValue: { x: xOffset, y: yOffset },
                        useNativeDriver: true,
                        friction: 7,
                        tension: 40
                    }).start();
                });
            } else {
                // Fallback for Emulator: Simulated Wiggle
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(position, {
                            toValue: { x: 10, y: -10 },
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(position, {
                            toValue: { x: -10, y: 10 },
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(position, {
                            toValue: { x: 0, y: 0 },
                            duration: 2000,
                            useNativeDriver: true,
                        })
                    ])
                ).start();
            }
        };

        subscribe();
        return () => subscription && subscription.remove();
    }, []);

    // Breathing Animation (Floating Loop)
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(breath, {
                    toValue: -20, // Float up
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(breath, {
                    toValue: 0, // Float down
                    duration: 1500,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    if (!permission) {
        return <View style={styles.container}><Text>Requesting permission...</Text></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>We need your camera to see the Pokemon!</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.btn}>
                    <Text style={styles.btnText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.btn, { backgroundColor: '#555' }]}>
                    <Text style={styles.btnText}>Back to Map</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleCatch = async () => {
        setCaught(true);
        markCaught(pokemonId); // Save to persistence

        // Post to Community Feed (Fire and forget)
        if (user) {
            try {
                await addDoc(collection(db, "posts"), {
                    username: userData?.username || user.displayName || 'Trainer',
                    pokemonId,
                    pokemonName,
                    timestamp: serverTimestamp()
                });
            } catch (error) {
                console.log("Failed to post to community feed", error);
            }
        }

        Alert.alert(
            "Gotcha! ⭐",
            `You caught ${pokemonName || 'Pokemon'}!`,
            [
                {
                    text: "Nice!",
                    onPress: () => navigation.goBack()
                }
            ]
        );
    };

    const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing="back">
                {/* Overlay UI */}
                <View style={styles.overlay}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Wild {pokemonName} Appeared!</Text>
                    </View>

                    {/* The Pokemon with AR Effects */}
                    <View style={styles.centerContainer}>
                        {!caught && (
                            <Animated.Image
                                source={{ uri: imageUrl }}
                                style={[
                                    styles.pokemonImage,
                                    {
                                        transform: [
                                            { translateX: position.x },
                                            { translateY: Animated.add(position.y, breath) } // Combine parallax + breathing
                                        ]
                                    }
                                ]}
                            />
                        )}
                    </View>

                    {/* Controls */}
                    <View style={styles.bottomBar}>
                        <TouchableOpacity style={styles.catchBtn} onPress={handleCatch}>
                            <View style={styles.outerRing}>
                                <View style={styles.innerRing} />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.instruction}>Tap to Catch!</Text>
                    </View>
                </View>
            </CameraView>

            {/* Back Button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <MaterialIcons name="close" size={30} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    camera: { flex: 1 },
    text: { color: 'white', fontSize: 18, textAlign: 'center', marginTop: 50 },
    overlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 40 },
    header: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 20,
        marginTop: 40
    },
    title: { color: 'white', fontSize: 24, fontWeight: 'bold', textTransform: 'capitalize' },
    centerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        // Allow pokemon to move outside its box slightly
        overflow: 'visible'
    },
    pokemonImage: {
        width: 300,
        height: 300,
        resizeMode: 'contain',
    },
    bottomBar: { alignItems: 'center', marginBottom: 20 },
    catchBtn: { marginBottom: 10 },
    outerRing: {
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 5, borderColor: 'white',
        justifyContent: 'center', alignItems: 'center'
    },
    innerRing: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: 'red',
        borderWidth: 2, borderColor: 'white'
    },
    instruction: { color: 'white', fontSize: 16, fontWeight: 'bold', textShadowColor: 'black', textShadowRadius: 5 },
    btn: { backgroundColor: '#ff5722', padding: 15, borderRadius: 10, marginTop: 20, marginHorizontal: 20 },
    btnText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        padding: 10,
    }
});

export default CatchScreen;
