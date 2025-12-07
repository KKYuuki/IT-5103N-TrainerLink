# Gameplay Mechanics - PokeExplorer

## **Core Gameplay Mechanics**

### **1. Procedural Pokemon Spawning System**
- **Grid-Based World**: The world is divided into ~11 meter grid cells (0.0001 degrees)
- **Deterministic Spawning**: Each grid cell has a consistent spawn chance (1.5%) based on location hash and current hour
- **Hourly Rotation**: Pokemon spawns change every hour to keep gameplay fresh
- **Spawn Radius**: 100 meter visible radius around player
- **Species Uniqueness**: No duplicate Pokemon species spawn simultaneously in view
- **Despawn Timing**: Spawns persist for one hour before rotating

### **2. Biome System**

The game uses multi-layer noise generation to create 5 distinct biomes that determine which Pokemon appear:

#### **URBAN** (60% of world)
Concrete jungle environments found in developed areas.
- **Pokemon**: Rattata, Meowth, Growlithe, Geodude, Magnemite, Grimer, Voltorb, Koffing, Eevee, Porygon, Snorlax

#### **GRASS** 
City parks and grassy areas.
- **Pokemon**: Pidgey, Rattata, Spearow, Nidoran (♀/♂), Pikachu, Jigglypuff, Oddish, Bellsprout

#### **FOREST** (within 40% nature zones)
Dense woods and natural tree coverage.
- **Pokemon**: Bulbasaur, Caterpie, Metapod, Weedle, Kakuna, Oddish, Venonat, Paras, Bellsprout, Scyther, Pinsir

#### **WATER** (lakes, rivers, canals)
Bodies of water and aquatic environments.
- **Pokemon**: Squirtle, Psyduck, Poliwag, Tentacool, Slowpoke, Seel, Shellder, Krabby, Horsea, Goldeen, Staryu, Magikarp, Lapras

#### **RURAL** (plains and fields)
Open countryside and farmland.
- **Pokemon**: Spearow, Ekans, Vulpix, Growlithe, Ponyta, Tauros, Tangela

### **3. AR Catch Mechanics**

When you encounter a Pokemon, the game switches to AR (Augmented Reality) mode:

- **Camera Integration**: Real-time AR view using your device camera
- **Gyroscope Parallax**: Pokemon moves dynamically based on phone tilt for immersive AR effect
  - Fallback simulated wiggle animation on emulators
- **Breathing Animation**: Floating effect makes Pokemon feel alive and present
- **One-Tap Catch**: Simple tap mechanic to catch Pokemon (currently 100% success rate)
- **30 Meter Interaction Range**: Must be within 30 meters of a spawn point to initiate catch
- **Pokeball Visual**: Red and white Pokeball button interface

### **4. Location & Movement**

Real-world GPS tracking powers the core gameplay:

- **Real GPS Tracking**: Uses device location services with high accuracy mode
- **Movement Threshold**: Spawn calculations update every 2 meters of player movement
- **Manual Offset (D-pad)**: Testing/accessibility feature for manual position adjustment
- **Live Biome Display**: HUD shows current environment type
- **Distance Tracking**: Monitors total distance moved from starting position
- **Recenter Button**: Quickly snap map view back to player location

### **5. Notification System**

Smart notifications keep you informed about nearby Pokemon:

#### **Legendary Alerts** (High Priority)
Special notifications with unique messages for each legendary Pokemon:
- **Articuno (#144)**: "❄️ A Chill in the Air... ❄️" - The legendary Articuno has been sighted near you!
- **Zapdos (#145)**: "⚡ The Sky Crackles! ⚡" - A storm is brewing... Zapdos is nearby!
- **Moltres (#146)**: "🔥 The Air is Burning! 🔥" - Moltres has set the sky ablaze nearby!
- **Mewtwo (#150)**: "🧬 Psychic Pressure Detected 🧬" - Mewtwo is watching you from the shadows...
- **Mew (#151)**: "🔮 A Playful Giggle? 🔮" - The mythical Mew is playing hide and seek nearby!

#### **Proximity Notifications**
- Generic "Pokemon Nearby 🐾" alerts when Pokemon spawn in your area
- Throttled to every 2 minutes to avoid notification spam
- Welcome notification when opening the map

### **6. Rare & Legendary Pokemon**

Special Pokemon with unique significance:

#### **Starters**
- Bulbasaur (#1), Charmander (#4), Squirtle (#7)

#### **Special Pokemon**
- Pikachu (#25) - The franchise mascot
- Eevee (#133) - Evolution Pokemon
- Snorlax (#143) - Rare sleepy giant

#### **Pseudo-Legendaries**
- Dratini line (#147-149)

#### **Legendary Pokemon**
- Articuno (#144) - Ice/Flying legendary bird
- Zapdos (#145) - Electric/Flying legendary bird
- Moltres (#146) - Fire/Flying legendary bird
- Mewtwo (#150) - Psychic legendary
- Mew (#151) - Mythical Pokemon

### **7. Persistence & Progress**

Your Pokemon journey is saved:

- **Caught Pokemon Tracking**: Permanently marks Pokemon as caught in local storage
- **Pokedex Integration**: View all caught Pokemon in your Pokedex
- **User Profile**: Displays trainer information and stats

### **8. Technical Implementation**

#### **Deterministic World Generation**
- Uses `mulberry32` pseudo-random number generator with coordinate-based seeding
- Ensures all players see the same Pokemon at the same locations
- Hash-based system combines latitude, longitude, and time for consistency

#### **Grid Hash Algorithm**
```
seed = gridX * 73856093 ^ gridY * 19349663 ^ timeShift * 83492791
```

#### **Spawn Calculation**
- Math Radius: 150m (calculation buffer)
- Sprite Radius: 100m (visible spawns)
- Sorted processing by world coordinates (not player distance) ensures consistent spawn priority
- Maximum 10 attempts to ensure species uniqueness per visible area

#### **Performance Optimizations**
- Location updates throttled by movement distance (2m threshold)
- Sorted candidate processing for deterministic results
- Efficient grid-based spatial indexing

---

## Generation 1 Pokemon (Kanto Region)

This game features Pokemon #1-151 from the original Pokemon Red/Blue/Yellow games.
