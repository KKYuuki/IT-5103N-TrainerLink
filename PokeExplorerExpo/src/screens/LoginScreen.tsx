import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
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
            const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
            const user = userCredential.user;

            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);

            if (!userSnap.exists()) {
                console.log("Repairing missing user doc for", user.email);
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    username: user.email?.split('@')[0] || 'Trainer',
                    createdAt: new Date(),
                    repairedAt: new Date()
                });
            }
        } catch (error: any) {
            Alert.alert('Login Error', error.message);
            setLoading(false);
        }
    };

    if (loading) return (
        <View style={[styles.container, styles.loadingContainer]}>
            <ActivityIndicator size="large" color="#FF0000" />
            <Text style={{ marginTop: 10, color: '#FF0000', fontWeight: 'bold' }}>Authenticating...</Text>
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
                <Text style={styles.title}>TRAINER LINK</Text>
            </View>

            <View style={styles.formContainer}>


                <TextInput
                    style={styles.input}
                    placeholder="Email or Trainer Name"
                    placeholderTextColor="#999"
                    value={input}
                    onChangeText={setInput}
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

                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
                    <Text style={styles.btnText}>LOGIN</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.signupBtn} onPress={() => navigation.navigate('Signup')}>
                    <Text style={styles.signupText}>Create New Trainer ID</Text>
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
    // Subtitle removed (removed from JSX too)
    title: {
        fontSize: 36, // Much Larger
        fontWeight: '900', // HEX Extra Bold
        color: '#d50000',
        letterSpacing: 2,
        alignSelf: 'center',
        textAlign: 'center'
    },
    formContainer: {
        paddingHorizontal: 30,
    },
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
    loginBtn: {
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
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 200, // x2 (was 100)
        height: 200,
        marginBottom: 20,
        resizeMode: 'contain'
    },
    btnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    signupBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    signupText: {
        color: '#CC0000',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default LoginScreen;
