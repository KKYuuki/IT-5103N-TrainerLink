# PokeExplorerExpo 🌍

**PokeExplorerExpo** is a geolocation-based Augmented Reality (AR) game built with **React Native**. It is a full native Android application that interacts with device sensors, camera, and maps.

---

## 🚀 Key Features

### 🗺️ Geolocation & Map
*   **Real-World Biomes**: Procedurally generated biomes (Water, Urban, Forest) based on real coordinates.
*   **Hunt Mode**: Scan your surroundings using GPS to find hidden Pokemon.
*   **Legendary Radar**: Detect Legendary Pokemon from **200m** away.
*   **Unique Spawns**: Singleton Legendary encounters at real-world landmarks.

### 📸 AR Catch System
*   **Camera Integration**: Native camera feed for AR catching.
*   **Parallax Effect**: Gyroscope-enabled "breathing" animations.
*   **Voice Recognition**: Shout **"Gotcha!"** to trigger capture (Uses Native Microphone).

### 🎒 Progression
*   **Pokedex**: Stats and details database.
*   **Daily Quests & Badges**: Gamified achievements.

---

## 🛠️ Technology Stack

*   **Core**: React Native (0.76)
*   **Language**: TypeScript
*   **Editor**: Android Studio (for Native Build)
*   **Modules**:
    *   `react-native-maps` (Google Maps)
    *   `@react-native-voice/voice` (Native Speech Recognition)
    *   `expo-av` (Audio System)
    *   `expo-camera` (Camera Access)
*   **Backend**: Firebase Firestore

---

## 📱 Build Instructions (Android Studio)

This project is a standard React Native app. It contains a native `android` directory that can be compiled with Gradle.

### Prerequisites
*   Node.js (v18+)
*   Java JDK 17
*   Android Studio

### How to Run

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Generate Native Android Project**
    (This ensures the `android/` folder is up to date with all native modules)
    ```bash
    npx expo prebuild
    ```

3.  **Open in Android Studio**
    *   Open **Android Studio**.
    *   Select "Open an Existing Project".
    *   Navigate to `PokeExplorerExpo/android`.
    *   Click **Run** (Green Play Button) to build and launch the app on your emulator or device.

4.  **Alternative: Command Line**
    ```bash
    npm start
    # Press 'a' to build and run on Android
    ```

---

## ⚠️ Troubleshooting

### "No Java compiler found" (Build Failed)
If you see `org.gradle.api.internal.catalog.GeneratedClassCompilationException: No Java compiler found`, it means your computer is missing the **Java Development Kit (JDK)** or `JAVA_HOME` is not set.

**Fix:**
1.  **Install JDK 17**: Download specific JDK 17 (e.g. from Eclipse Adoptium).
2.  **Set Environment Variable**:
    *   **Windows**: Search "Edit the system environment variables" -> Environment Variables.
    *   Add New System Variable: `JAVA_HOME` -> Path to your install (e.g., `C:\Program Files\Eclipse Adoptium\jdk-17...`).
    *   Add `%JAVA_HOME%\bin` to your `Path` variable.
3.  **Verify**: Open a new terminal and type `javac -version`. It must print `javac 17...`.

### "Player accessed on wrong thread" (Android)
If you see this red screen on reload:
*   **Fix**: This is a known issue with `expo-av` and fast refresh. We have implemented a "Fire and Forget" cleanup fix in `MapScreen.tsx`. Just reload again.
