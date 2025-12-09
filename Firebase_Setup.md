# Firebase Setup Guide - PokeExplorer TrainerLink

## Overview

This application uses **Firebase** for backend services including user authentication and cloud data storage. This guide covers the complete Firebase setup and integration.

---

## Firebase Services Used

### 1. **Firebase Authentication**
- Email/Password authentication for trainer accounts
- User profile management (displayName)
- Session persistence with automatic re-authentication

### 2. **Firebase Firestore**
- NoSQL cloud database for user data
- Real-time data synchronization
- Username uniqueness validation
- User profile storage

---

## Firebase Configuration

### Project Details

```typescript
Project ID: pokeexplorer-trainerlink
Auth Domain: pokeexplorer-trainerlink.firebaseapp.com
Storage Bucket: pokeexplorer-trainerlink.firebasestorage.app
Messaging Sender ID: 106837492446
App ID: 1:106837492446:android:96f144b80147bd37d4b84f
```

### Configuration File

Located at: `src/services/firebaseConfig.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
```

---

## Dependencies

### Required npm Packages

```json
{
  "firebase": "^12.6.0",
  "@react-native-async-storage/async-storage": "2.2.0"
}
```

Install with:
```bash
npm install firebase @react-native-async-storage/async-storage
```

---

## Authentication Flow

### 1. User Registration (Signup)

**Location**: `src/screens/SignupScreen.tsx`

**Process**:
1. User enters email, password, and trainer name (username)
2. Check if username is unique in Firestore
3. Create Firebase Auth account with email/password
4. Update Auth profile with displayName (username)
5. Store user data in Firestore `users` collection

**Firestore Document Structure**:
```typescript
{
  uid: string,           // Firebase Auth UID
  email: string,         // User's email
  username: string,      // Unique trainer name
  createdAt: Date        // Account creation timestamp
}
```

**Code Example**:
```typescript
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
```

### 2. User Login

**Location**: `src/screens/LoginScreen.tsx`

**Features**:
- **Dual Input Support**: Users can login with either email OR trainer name (username)
- **Username Lookup**: If input doesn't contain '@', queries Firestore to resolve username → email
- **Email Login**: Uses resolved email for Firebase Authentication

**Code Flow**:
```typescript
let emailToUse = input;

// If input is a username (no @), look it up
if (!input.includes('@')) {
    const q = query(collection(db, "users"), where("username", "==", input));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        emailToUse = querySnapshot.docs[0].data().email;
    }
}

// Sign in with resolved email
await signInWithEmailAndPassword(auth, emailToUse, password);
```

### 3. Session Management

**Location**: `src/context/UserContext.tsx`

**Features**:
- React Context Provider for global user state
- Automatic auth state listener
- Session persistence across app restarts

**Implementation**:
```typescript
const UserContext = createContext<UserContextType>({ user: null, loading: true });

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (userState) => {
            setUser(userState);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    return (
        <UserContext.Provider value={{ user, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
```

---

## Firestore Database Structure

### Collections

#### **users** Collection

Each document represents a trainer account.

**Document ID**: Firebase Auth UID

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Firebase Auth User ID (matches document ID) |
| `email` | string | User's email address |
| `username` | string | Unique trainer name for display and login |
| `createdAt` | timestamp | Account creation date |

**Indexes**:
- `username` field must be indexed for efficient username lookups during login

**Security Rules** (Recommended):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can read their own document
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Anyone can create (signup)
      allow create: if request.auth != null;
      
      // Users can update their own document
      allow update: if request.auth != null && request.auth.uid == userId;
      
      // No deletes
      allow delete: if false;
    }
  }
}
```

---

## User Profile Display

**Location**: `src/screens/ProfileScreen.tsx`

**Displayed Information**:
- Trainer Name (from `user.displayName`)
- Email Address (from `user.email`)
- Pokedex Progress (caught Pokemon count / 151)

**Access User Data**:
```typescript
const { user } = useUser();

// Display name
user?.displayName || "Trainer"

// Email
user?.email
```

---

## Security Considerations

### API Key Exposure

⚠️ **Note**: The Firebase API key is visible in the codebase. This is normal for client-side Firebase apps.

**Security Measures**:
1. Firebase API keys are **not secret** - they identify your Firebase project
2. Security is enforced through **Firebase Security Rules** in Firestore and Auth
3. Implement proper Firestore Security Rules to restrict data access
4. Enable **Firebase App Check** for production to prevent unauthorized API usage

### Authentication Security

- Passwords are hashed by Firebase Auth (not stored in plain text)
- Email verification can be added for production
- Password reset functionality can be implemented via Firebase Auth

---

## Setup Instructions for New Projects

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name (e.g., "pokeexplorer-trainerlink")
4. Follow setup wizard

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. (Optional) Configure email templates for verification

### 3. Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Start in **Test mode** (for development)
3. Choose a Cloud Firestore location (closest to your users)

### 4. Register Android App (Expo)

1. In Firebase Console → **Project Settings** → **General**
2. Click **Add app** → Select **Android**
3. Android package name: `com.anonymous.pokeexplorerexpo` (or your package)
4. Download `google-services.json`
5. Add to Expo config:

```json
// app.json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json",
      "package": "com.anonymous.pokeexplorerexpo"
    }
  }
}
```

### 5. Get Configuration Object

1. Project Settings → General → Your apps
2. Copy the Firebase config object
3. Paste into `firebaseConfig.ts`

### 6. Create Firestore Index

1. Go to **Firestore Database** → **Indexes**
2. Create a composite index:
   - Collection: `users`
   - Field: `username` (Ascending)
   - Query scope: Collection

---

## Error Handling

### Common Authentication Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `auth/email-already-in-use` | Email already registered | Use different email or login |
| `auth/invalid-email` | Email format invalid | Check email format |
| `auth/weak-password` | Password too short | Use 6+ characters |
| `auth/user-not-found` | User doesn't exist | Check credentials or signup |
| `auth/wrong-password` | Incorrect password | Verify password |
| `auth/network-request-failed` | Network error | Check internet connection |

### Username Validation

```typescript
// Check if username already exists
const q = query(collection(db, "users"), where("username", "==", username));
const querySnapshot = await getDocs(q);

if (!querySnapshot.empty) {
    Alert.alert("Error", "Username already taken.");
    return;
}
```

---

## Testing

### Test Accounts

For development, create test trainer accounts:

```
Email: trainer1@test.com
Username: Ash
Password: test123

Email: trainer2@test.com
Username: Misty
Password: test123
```

### Authentication Flow Test

1. ✅ Signup with new email + unique username
2. ✅ Logout
3. ✅ Login with email
4. ✅ Logout
5. ✅ Login with username
6. ✅ Verify session persists after app restart

---

## Future Enhancements

### Potential Firebase Features to Add

1. **Cloud Storage**
   - Store trainer profile pictures
   - Save screenshot gallery

2. **Cloud Functions**
   - Automated username validation
   - Leaderboard calculations
   - Push notifications

3. **Realtime Database**
   - Live multiplayer features
   - Trading system
   - Nearby trainers

4. **Firebase Analytics**
   - Track user engagement
   - Monitor catch rates
   - Feature usage statistics

5. **Email Verification**
   - Require email verification on signup
   - Password reset via email

6. **Social Features**
   - Friend system
   - Pokemon trading
   - Battle system

---

## Troubleshooting

### "Module not found: firebase/app"
```bash
npm install firebase
```

### "Auth domain mismatch"
- Verify `authDomain` in firebaseConfig.ts matches Firebase Console

### "Permission denied" in Firestore
- Check Firebase Security Rules
- Ensure user is authenticated before writing

### "Username lookup not working"
- Verify Firestore index exists for `username` field
- Check query syntax in LoginScreen.tsx

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Auth Guide](https://firebase.google.com/docs/auth)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [React Native Firebase](https://rnfirebase.io/)
- [Expo Firebase Guide](https://docs.expo.dev/guides/using-firebase/)
