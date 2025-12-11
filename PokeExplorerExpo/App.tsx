import React from 'react';
import { View, Text, LogBox, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// Contexts
import { UserProvider, useUser } from './src/context/UserContext';
import { PokemonProvider } from './src/context/PokemonContext';

// Components
import ErrorBoundary from './src/components/ErrorBoundary';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import PokedexScreen from './src/screens/PokedexScreen';
import PokemonDetailScreen from './src/screens/PokemonDetailScreen';
import MapScreen from './src/screens/MapScreen';
import CatchScreen from './src/screens/CatchScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import HuntScreen from './src/screens/HuntScreen';

// Suppress annoying warnings
// Suppress annoying warnings
LogBox.ignoreAllLogs(true);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 2. Main Tab Navigator (Map, Pokedex, Profile)
const MainTabNavigator = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="map" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="HuntTab"
        component={HuntScreen}
        options={{
          title: 'Hunt',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="track-changes" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="CommunityTab"
        component={CommunityScreen}
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="people" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="PokedexTab"
        component={PokedexScreen}
        options={{
          title: 'Pokedex',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="grid-on" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />
        }}
      />
    </Tab.Navigator>
  );
};

import { Audio } from 'expo-av';

import { useFonts, Poppins_400Regular, Poppins_700Bold, Poppins_900Black } from '@expo-google-fonts/poppins';

// 3. App Navigator (Auth Switch)
const AppNavigator = () => {
  const { user, loading } = useUser();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_900Black,
  });
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);

  // Global Auth Music Manager
  React.useEffect(() => {
    // ... (music logic remains the same) ...
    let currentSound: Audio.Sound | null = null;
    const manageMusic = async () => {
      if (sound) { await sound.stopAsync(); await sound.unloadAsync(); setSound(null); }
      if (!user) {
        try {
          const { sound: newSound } = await Audio.Sound.createAsync(require('./assets/login-signup-bgmusic.mp3'));
          currentSound = newSound;
          setSound(newSound);
          await newSound.setIsLoopingAsync(true);
          await newSound.playAsync();
        } catch (error) { console.log("Error playing auth music:", error); }
      }
    };
    if (!loading) manageMusic();
    return () => { if (currentSound) currentSound.unloadAsync(); };
  }, [user, loading]);

  // Safety: Force app to load after 3s even if fonts/auth hang
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if ((loading || !fontsLoaded) && !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#ff5722" />
        <Text style={{ marginTop: 10 }}>Loading TrainerLink...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
          <Stack.Screen
            name="Catch"
            component={CatchScreen}
            options={{ presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen
            name="PokemonDetail"
            component={PokemonDetailScreen}
            options={({ route }: any) => ({ title: route.params.pokemonName })}
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

// 4. Root App Component
const App = () => {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <UserProvider>
          <PokemonProvider>
            <AppNavigator />
          </PokemonProvider>
        </UserProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
};

export default App;
