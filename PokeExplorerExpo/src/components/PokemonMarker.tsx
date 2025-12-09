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

    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

    useEffect(() => {
        setTracksViewChanges(true);
        // Simple 500ms timeout to render image then freeze
        const timer = setTimeout(() => {
            setTracksViewChanges(false);
        }, 1000); // 1s safety
        return () => clearTimeout(timer);
    }, [pokemonId]); // Reset on ID change

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
                    fadeDuration={0} // Ensure instant appearance
                    onLoad={() => {
                        // Optional: force update if needed, but timer handles it
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
