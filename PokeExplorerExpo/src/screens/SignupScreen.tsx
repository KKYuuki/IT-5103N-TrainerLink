
import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

const SignupScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!email || !password || !username) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }
        setLoading(true);

        try {
            // Check if username unique
            const q = query(collection(db, "users"), where("username", "==", username));
            // Add timeout to fetch to prevent infinite hang
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout")), 10000));

            const querySnapshot = await Promise.race([getDocs(q), timeoutPromise]) as any;

            if (!querySnapshot.empty) {
                setLoading(false);
                setTimeout(() => Alert.alert("Error", "Username already taken."), 100);
                return;
            }

            // Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update Profile
            await updateProfile(user, { displayName: username });

            // Store in Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                username: username,
                createdAt: new Date()
            });

            // Auth listener in App.tsx will redirect to Map
        } catch (error: any) {
            console.log("Signup Error", error);
            setLoading(false);

            let title = 'Signup Error';
            let msg = error.message;

            if (error.code === 'auth/email-already-in-use') {
                title = 'Account Exists';
                msg = 'This email is already registered.';
                setTimeout(() => {
                    Alert.alert(title, msg, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Go to Login', onPress: () => navigation.navigate('Login') }
                    ]);
                }, 100);
            } else {
                setTimeout(() => Alert.alert(title, msg), 100);
            }
        }
    };

    if (loading) return (
        <View style={[styles.container, styles.loadingContainer]}>
            <ActivityIndicator size="large" color="#FF0000" />
            <Text style={{ marginTop: 10, color: '#FF0000', fontWeight: 'bold' }}>Registering Trainer...</Text>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            {/* Top Branding */}
            <View style={styles.header}>
                <Image
                    source={require('../../assets/pokeball-login-signup.png')}
                    style={styles.logo}
                />
                <Text style={styles.title}>NEW TRAINER</Text>
            </View>

            <View style={styles.formContainer}>


                <TextInput
                    style={styles.input}
                    placeholder="Trainer Name (Username)"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity style={styles.signupBtn} onPress={handleSignup}>
                    <Text style={styles.btnText}>JOIN THE LEAGUE</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>Already have an ID? Login</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center'
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 160,
        height: 160,
        marginBottom: 10,
        resizeMode: 'contain'
    },
    title: {
        fontSize: 32, // Larger
        fontWeight: '900', // Exact definition of "bold"
        color: '#d50000',
        letterSpacing: 2
    },
    formContainer: {
        paddingHorizontal: 30,
    },
    // Subtitle removed from styles
    input: {
        borderWidth: 2,
        borderColor: '#FF0000',
        backgroundColor: '#FFF0F0',
        padding: 15,
        marginBottom: 15,
        borderRadius: 25,
        fontSize: 16,
        color: '#333'
    },
    signupBtn: {
        backgroundColor: '#CC0000',
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 10,
        elevation: 5,
        shadowColor: 'red',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    btnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    backBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    backText: {
        color: '#CC0000',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default SignupScreen;

