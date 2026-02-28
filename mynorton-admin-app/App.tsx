import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './lib/supabase';

import Auth from './Auth';

// Importar as páginas da barra inferior (Tabs)
import Home from './tabs/Home';
import Pedidos from './tabs/Pedidos';
import Pontos from './tabs/Pontos';
import Definicoes from './tabs/Definicoes';

// Importar as páginas do Centro de Controlo (Screens)
import GestaoUtilizadores from './screens/GestaoUtilizadores'; 
import GestaoCatalogo from './screens/GestaoCatalogo';
import GestaoEmenta from './screens/GestaoEmenta';
import PortalCriticas from './screens/PortalCriticas';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Criar a "Pilha" para o Centro de Controlo
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: '#e67e22' }}>
      <Stack.Screen name="HomePrincipal" component={Home} options={{ headerShown: false }} />
      <Stack.Screen name="GestaoUtilizadores" component={GestaoUtilizadores} options={{ title: 'Utilizadores' }} />
      <Stack.Screen name="GestaoCatalogo" component={GestaoCatalogo} options={{ title: 'Catálogo de Pratos' }} />
      <Stack.Screen name="GestaoEmenta" component={GestaoEmenta} options={{ title: 'Ementa Semanal' }} />
      <Stack.Screen name="PortalCriticas" component={PortalCriticas} options={{ title: 'Moderação de Críticas' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) verificarCargo(session.user.id);
      else setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) verificarCargo(session.user.id);
      else { setRole(null); setLoading(false); }
    });
  }, []);

  async function verificarCargo(userId: string) {
    const { data } = await supabase.from('perfis').select('tipo_utilizador').eq('id', userId).single();
    if (data) setRole(data.tipo_utilizador);
    setLoading(false);
  }

  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#e67e22" /></View>;

  return (
    <NavigationContainer>
      {session && (role === 'admin' || role === 'funcionario') ? (
        <Tab.Navigator 
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: any;
              if (route.name === 'Início') iconName = focused ? 'home' : 'home-outline';
              else if (route.name === 'Pedidos') iconName = focused ? 'list' : 'list-outline';
              else if (route.name === 'Pontos') iconName = focused ? 'qr-code' : 'qr-code-outline';
              else if (route.name === 'Definições') iconName = focused ? 'settings' : 'settings-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#e67e22',
            tabBarInactiveTintColor: 'gray',
            headerShown: false // Esconde o cabeçalho duplo nas abas
          })}
        >
          <Tab.Screen name="Início" component={HomeStack} />
          <Tab.Screen name="Pedidos" component={Pedidos} />
          <Tab.Screen name="Pontos" component={Pontos} />
          <Tab.Screen name="Definições" component={Definicoes} />
        </Tab.Navigator>
      ) : (
        <Auth />
      )}
    </NavigationContainer>
  );
}