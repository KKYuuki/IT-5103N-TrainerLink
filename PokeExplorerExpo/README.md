# PokeExplorerExpo 🌍

**PokeExplorerExpo** is an immersive, geolocation-based Augmented Reality (AR) game built with **React Native** and **Expo**. Inspired by Pokemon GO, it allows players to explore the real world to find, catch, and collect Pokemon.

---

## 🚀 Key Features

### 🗺️ Geolocation & Map
*   **Real-World Biomes**: Procedurally generated biomes (Water, Urban, Forest) based on real coordinates.
*   **Hunt Mode**: Scan your surroundings using GPS to find hidden Pokemon.
*   **Legendary Radar**: Detect Legendary Pokemon from **200m** away with a special notification system.
*   **Singleton Spawns**: Unique Legendary spawns at real-world landmarks (e.g., Magellan's Cross).

### 📸 AR Catch System
*   **Camera Integration**: See Pokemon in the real world using your device's camera.
*   **Parallax Effect**: Gyroscope-enabled "breathing" animations for immersion.
*   **Voice Commands**: Shout **"Gotcha!"** to trigger a capture attempt using `@react-native-voice/voice`.

### 🎒 Pokedex & Progression
*   **Pokedex**: View detailed stats, types, and descriptions of caught Pokemon.
*   **Daily Quests**: Complete challenges (e.g., "Walk 1km", "Catch 3 Fire Types") for rewards.
*   **Badges**: Earn achievements for milestones like "Total Distance Walked".
*   **Leveling**: XP system based on catches and exploration.

### 🤝 Social Logic
*   **Community Feed**: See what other trainers nearby are catching (simulated).
*   **Share**: Share your caught Pokemon snapshots to social media.

---

## 🛠️ Technology Stack

*   **Framework**: React Native (Expo SDK 52)
*   **Language**: TypeScript
*   **Navigation**: React Navigation (Stack & Bottom Tabs)
*   **Maps**: `react-native-maps` (Google Maps Provider)
*   **Sensors**: `expo-sensors` (Gyroscope, Magnetometer)
*   **Audio**: `expo-av` (Background Music & SFX), `expo-speech` (TTS)
*   **Voice**: `@react-native-voice/voice`
*   **Database**: Firebase Firestore (Authentication & User Data)
*   **Styling**: `StyleSheet`

---

## 📱 Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   Java JDK 17 (for Android Build)
*   Android Studio (for Emulator/SDK)

### Getting Started

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-repo/PokeExplorerExpo.git
    cd PokeExplorerExpo
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment**
    Create a `local.properties` file in `android/` if native building:
    ```properties
    sdk.dir=C:\\Users\\YourUser\\AppData\\Local\\Android\\Sdk
    ```

4.  **Run Development Server**
    ```bash
    npm start
    ```
    *   Press `a` to open in Android Emulator.
    *   Press `s` to switch to Expo Go (if configured).

---

## ⚠️ Troubleshooting

### "Player accessed on wrong thread" (Android)
If you see this red screen on reload:
*   **Fix**: This is a known issue with `expo-av` and fast refresh. We have implemented a "Fire and Forget" cleanup fix in `MapScreen.tsx`. Just reload again.

### "Location Permission Denied"
*   Ensure your Emulator or Device has Location Services enabled and permissions granted to the app.

---

## 👨‍💻 Development Status

*   **Current Phase**: Polish & Optimization
*   **Next Steps**: 
    *   Refining AR Accuracy
    *   Expanding Biome Database
    *   Multiplayer Battles

---

*Gotta Catch 'Em All!* 🧢
