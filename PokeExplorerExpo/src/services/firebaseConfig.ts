import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyC9YFol8BI5BkCUUcers18gAhKbpbI5ONE",
    authDomain: "pokeexplorer-trainerlink.firebaseapp.com",
    projectId: "pokeexplorer-trainerlink",
    storageBucket: "pokeexplorer-trainerlink.firebasestorage.app",
    messagingSenderId: "106837492446",
    appId: "1:106837492446:android:96f144b80147bd37d4b84f"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
