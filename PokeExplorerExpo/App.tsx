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

// Screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import PokedexScreen from './src/screens/PokedexScreen';
import PokemonDetailScreen from './src/screens/PokemonDetailScreen';
import MapScreen from './src/screens/MapScreen';
import CatchScreen from './src/screens/CatchScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Suppress annoying warnings
LogBox.ignoreLogs([
  'You are initializing Firebase Auth',
  'Task orphaned for request',
  'expo-notifications: Android Push',
  'functionality is not fully supported',
  'SafeAreaView has been deprecated',
]);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 2. Main Tab Navigator (Map, Pokedex, Profile)
const MainTabNavigator = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="map" size={size} color={color} />
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

// 3. App Navigator (Auth Switch)
const AppNavigator = () => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ff5722" />
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
        <Stack.Navigator>
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
      <UserProvider>
        <PokemonProvider>
          <AppNavigator />
        </PokemonProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
};

export default App;
