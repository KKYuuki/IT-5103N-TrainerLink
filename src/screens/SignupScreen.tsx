import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';

const SignupScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignup = async () => {
        if (!email || !password) return;
        try {
            await auth().createUserWithEmailAndPassword(email, password);
            Alert.alert('Success', 'Account created!');
        } catch (error: any) {
            Alert.alert('Signup Error', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign Up</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <Button title="Sign Up" onPress={handleSignup} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
});

export default SignupScreen;
