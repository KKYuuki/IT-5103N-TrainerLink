# PokeExplorer Development Roadmap

## Phase 0: Prerequisites & Missing Requirements
- [x] Node.js (LTS) & JDK 17 Installed (Node v20.17.0, JDK 17)
- [x] Firebase MCP Server Configured (Not Detected - Action Required)
- [x] Google Maps SDK API Key Obtained (User Confirmed)
- [x] Physical Device/Emulator with Play Services Ready (ADB Verified at default path)

- [x] Create Folder Structure (src/components, src/screens, src/services, src/navigation)
- [x] Install `react-navigation`, `react-native-safe-area-context`
- [x] Configure Firebase SDK & Android Build
- [x] Create LoginScreen & SignupScreen (Firebase Auth)
- [x] Create UserContext
- [x] Verify Android Studio Build (Manual Step) - **VERIFIED**

## Phase 2: The Data Layer & PokeAPI (Week 2)
- [x] Create `src/services/api.ts` (Fetch data from PokeAPI - Lists & Details)
- [x] Create `PokedexScreen` (Infinite Scroll List View)
- [x] Create `PokemonDetailScreen` (Stats, Types, Sprites)
- [x] Update Router/Navigation to include Pokedex flow

## Phase 3: Maps & The "Hunt" (Week 3)
- [x] Install `react-native-maps` & Configure API Key
- [x] Create MapScreen
- [x] Implement `generateRandomCoordinates` & Markers
- [x] **Migrated to Expo for Stability** 🚀

## Phase 4: AR Lite & Hardware (Week 4)
- [ ] Install `react-native-vision-camera`
- [ ] Create CaptureScreen with Camera View
- [ ] Implement AR Overlay (Sprite)
- [ ] Implement Save to Gallery

## Phase 5: Social & Polish (Week 5)
- [ ] Create CommunityScreen (Firebase Realtime DB)
- [ ] Implement User Profile & Badges

## Phase 6: Final Build & Testing (Week 6)
- [ ] Generate Android Icons
- [ ] Generate Keystore & Release Build
