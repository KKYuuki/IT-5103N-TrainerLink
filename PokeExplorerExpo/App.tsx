import React from 'react';
import { Button, View, Text, LogBox } from 'react-native';

// Suppress annoying warnings in the app UI
LogBox.ignoreLogs([
  'You are initializing Firebase Auth', // Firebase Persistence Warning
  'Task orphaned for request',          // Common Metro warning
  'expo-notifications: Android Push',   // Expo Go limitation warning
  'functionality is not fully supported', // Another Expo Go warning
  'SafeAreaView has been deprecated',   // Third-party library warning
]);
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
import { UserProvider, useUser } from './src/context/UserContext';
import { auth } from './src/services/firebaseConfig';
import { signOut } from 'firebase/auth';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import PokedexScreen from './src/screens/PokedexScreen';
import PokemonDetailScreen from './src/screens/PokemonDetailScreen';
import MapScreen from './src/screens/MapScreen';
import CatchScreen from './src/screens/CatchScreen';

const PokedexStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PokedexMain"
        component={PokedexScreen}
        options={{
          headerShown: false, // Custom header in PokedexScreen handles Notch/Status Bar
        }}
      />
      <Stack.Screen
        name="PokemonDetail"
        component={PokemonDetailScreen}
        options={({ route }: any) => ({ title: route.params.pokemonName })}
      />
    </Stack.Navigator>
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="PokedexTab" component={PokedexStack} options={{ title: 'Pokedex' }} />
      <Tab.Screen name="MapTab" component={MapScreen} options={{ title: 'Map' }} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <React.Fragment>
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
            <Text>Loading Firebase...</Text>
          </View>
        </SafeAreaProvider>
      </React.Fragment>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="Catch" component={CatchScreen} options={{ presentation: 'fullScreenModal' }} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <AppNavigator />
      </UserProvider>
    </SafeAreaProvider>
  );
};

export default App;
