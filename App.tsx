import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider, useUser } from './src/context/UserContext';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();

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
    <Stack.Navigator>
      {user ? (
        <Stack.Screen name="Home" component={HomeScreen} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </UserProvider>
    </SafeAreaProvider>
  );
};

export default App;
