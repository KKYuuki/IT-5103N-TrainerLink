---
description: Demo on Real Android Device (Native Build)
---
# How to Demo on a Real Android Device (Without "Expo Go")

Your professor wants a "Native" demo. This means the app should run as a standalone app on the phone (with its own icon), not inside the Expo Go wrapper.

The best way to do this for development/demo is **USB Debugging**.

## Prerequisites
1.  **USB Cable**: Connect your Android phone to your PC.
2.  **Developer Mode**: On your phone:
    -   Go to **Settings** > **About Phone**.
    -   Tap **Build Number** 7 times until it says "You are a developer".
3.  **USB Debugging**: On your phone:
    -   Go to **Settings** > **System** > **Developer Options**.
    -   Enable **USB Debugging**.
    -   **Important**: When you plug in the USB, a popup will ask "Allow USB Debugging?". Check "Always allow" and tap **Allow**.

## Step-by-Step Demo Guide

### 1. Verify Connection
Run this in your terminal to make sure your PC sees the phone:
```powershell
adb devices
```
You should see a device ID (e.g., `ZE223... device`).
*   If it says `unauthorized`, look at your phone screen and click **Allow**.
*   If the list is empty, check your cable or drivers.

### 2. Run the Native Build
Since you already have the `android` folder (Prebuild is done), run:

```powershell
npx expo run:android --device
```

### 3. What Happens Next
1.  **Build**: Metro will start bundling the JavaScript. Gradle will build the Java/Kotlin native code.
2.  **Install**: It will install an app called **"PokeExplorerExpo"** (or whatever name is in app.json) directly onto your phone.
3.  **Launch**: The app will open.

### 4. The Demo Experience
*   **App Icon**: Close the app and look at your app drawer. You will see your **custom app icon**. Show this to your professor!
*   **Native Features**: Voice Search, Google Maps, and Local Notifications will work perfectly because this is a native build.
*   **No Expo Go**: You are NOT opening the "Expo Go" app. You are opening YOUR app.

### Troubleshooting
*   **Samsung Users (Galaxy S20 FE)**:
    *   To find "Build Number": Go to **Settings** > **About Phone** > **Software Information**.
    *   If the PC doesn't see the phone, ensure you have installed the **Samsung Android USB Driver** on your computer.
    *   Watch your phone screen for an "Allow access to phone data?" popup and tap **Allow**.
*   **Xiaomi Users (Important)**:
    *   You MUST enable **"Install via USB"** in Developer Options.
    *   If you can't enable it, you must insert a **SIM card** and sign into your **Xiaomi Account**.
    *   If it still fails, find **"Turn on MIUI optimization"** (at the very bottom of Developer Options) and **Disable** it.
*   **"React Native Version Mismatch"**: If you see this red screen, shake the phone (or run `adb shell input keyevent 82`) -> Settings -> Toggle "JS Dev Mode" or reload.
*   **Build Failures**: If the build fails, try `cd android` and `./gradlew clean`, then try again.
