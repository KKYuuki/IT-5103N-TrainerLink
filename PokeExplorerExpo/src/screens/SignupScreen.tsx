import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

const SignupScreen = ({ navigation }: any) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!email || !password || !name) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            // 1. Check if username is already taken
            const q = query(collection(db, "users"), where("username", "==", name));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                Alert.alert("Username Taken", "Please choose a different Trainer Name.");
                setLoading(false);
                return;
            }

            // 2. Create Auth Account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // 3. Update Auth Profile
            await updateProfile(userCredential.user, {
                displayName: name
            });

            // 4. Save to Firestore "Phonebook"
            await setDoc(doc(db, "users", userCredential.user.uid), {
                username: name,
                email: email,
                uid: userCredential.user.uid,
                createdAt: new Date()
            });

            // Navigate back or let Auth listener handle it
        } catch (error: any) {
            Alert.alert('Signup Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#ff5722" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Join the Hunt!</Text>
            <TextInput
                style={styles.input}
                placeholder="Trainer Name (Unique)"
                value={name}
                onChangeText={setName}
            />
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
            <Button title="Back to Login" onPress={() => navigation.navigate('Login')} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
});

export default SignupScreen;
