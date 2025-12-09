import React, { useState, useEffect, memo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { pokemonNames } from '../utils/pokemonNames';

interface Props {
    id: number | string;
    pokemonId: number;
    lat: number;
    lng: number;
    onPress: () => void;
}

const PokemonMarker = memo(({ id, pokemonId, lat, lng, onPress }: Props) => {
    // Optimization: Start with true to render, then switch to false to "freeze" the bitmap
    const [tracksViewChanges, setTracksViewChanges] = useState(true);

    // Switch to sprite (96x96) for performance instead of HD (475x475)
    // Using the classic sprite is 10x smaller in memory
    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

    useEffect(() => {
        // Once mounted, give it a split second to render the image, then freeze it.
        // This stops the map from re-rasterizing this marker 60fps.
        const timer = setTimeout(() => {
            setTracksViewChanges(false);
        }, 500); // 500ms allows image to load (usually)

        return () => clearTimeout(timer);
    }, []);

    // If the pokemon changes (unlikely for same ID), re-enable tracking
    useEffect(() => {
        setTracksViewChanges(true);
        const timer = setTimeout(() => {
            setTracksViewChanges(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [pokemonId]);

    return (
        <Marker
            coordinate={{ latitude: lat, longitude: lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={tracksViewChanges}
            onPress={onPress}
            title={pokemonNames[pokemonId - 1]}
        >
            <View style={styles.markerContainer}>
                <Image
                    source={{ uri: spriteUrl }}
                    style={styles.image}
                    onLoad={() => {
                        // Optional: trigger re-render if loaded after timeout
                        // But mostly 500ms safety net covers it
                    }}
                />
            </View>
        </Marker>
    );
});

const styles = StyleSheet.create({
    markerContainer: {
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        // Removing complex shadows/borders for low-end optimization
    },
    image: {
        width: 45,
        height: 45,
        resizeMode: 'contain'
    }
});

export default PokemonMarker;
