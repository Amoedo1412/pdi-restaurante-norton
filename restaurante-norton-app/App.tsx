import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
// import * as NavigationBar from 'expo-navigation-bar'; // Podes remover isto

// Importações dos ecrãs
import Home from './tabs/Home';
import Pontos from './tabs/Pontos';
import Reservas from './screens/TakeAway'; 
import Perfil from './screens/Perfil'; 
import AuthScreen from './screens/AuthScreens';
import RegisterScreen from './screens/RegisterScreen'; 
import MenuScreen from './screens/MenuScreens';
import SplashScreen from './screens/SplashScreen'; 

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator(); 

// --- NAVEGAÇÃO POR ABAS (BOTTOM TABS) ---
function TabNavigator() {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconSize = 26;
          if (route.name === 'Início') return <Ionicons name={focused ? "home" : "home-outline"} size={iconSize} color={color} />;
          if (route.name === 'Pontos') return <Ionicons name={focused ? "calendar" : "calendar-outline"} size={iconSize} color={color} />;
          if (route.name === 'Take away') return <MaterialCommunityIcons name={focused ? "shopping" : "shopping-outline"} size={iconSize} color={color} />;
          if (route.name === 'Perfil') return <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={iconSize} color={color} />;
          return null;
        },
        tabBarActiveTintColor: '#e67e22', 
        tabBarInactiveTintColor: '#1a1a1a',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: Platform.OS === 'android' ? 85 : 90, 
          paddingBottom: Platform.OS === 'android' ? 25 : 30, 
          paddingTop: 12,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 20,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 4 }
      })}
    >
      <Tab.Screen name="Início" component={Home} />
      <Tab.Screen name="Pontos" component={Pontos} />
      <Tab.Screen name="Take away" component={Reservas} /> 
      <Tab.Screen name="Perfil" component={Perfil} />
    </Tab.Navigator>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [isLoading, setIsLoading] = useState(true); 
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  if (!session) {
    return (
      <NavigationContainer>
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={AuthScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="MenuScreens" component={MenuScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}