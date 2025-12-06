import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

const LoginScreen = ({ navigation }: any) => {
    const [input, setInput] = useState(''); // Can be email OR username
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!input || !password) return;
        setLoading(true);

        try {
            let emailToUse = input;

            // Check if input is likely an email
            if (!input.includes('@')) {
                // It's a username! Look it up.
                const q = query(collection(db, "users"), where("username", "==", input));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    Alert.alert("Login Failed", "Username not found.");
                    setLoading(false);
                    return;
                }

                // Get the email from the first match
                emailToUse = querySnapshot.docs[0].data().email;
            }

            // Sign in using the resolved email
            await signInWithEmailAndPassword(auth, emailToUse, password);
        } catch (error: any) {
            Alert.alert('Login Error', error.message);
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#ff5722" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>PokeExplorer Login</Text>
            <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 }}>
                Enter Email or Trainer Name
            </Text>
            <TextInput
                style={styles.input}
                placeholder="Email or Trainer Name"
                value={input}
                onChangeText={setInput}
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <Button title="Login" onPress={handleLogin} />
            <Button title="Create Account" onPress={() => navigation.navigate('Signup')} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
});

export default LoginScreen;
