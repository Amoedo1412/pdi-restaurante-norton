import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

// IMPORTAR O useTheme DA TUA NUVEM
import { ThemeProvider, useTheme } from './components/TemaContexto';

// Importações dos ecrãs
import Home from './tabs/Home';
import Pontos from './tabs/Pontos';
import Reservas from './screens/TakeAway'; 
import Perfil from './screens/Perfil'; 
import AuthScreen from './screens/AuthScreens';
import RegisterScreen from './screens/RegisterScreen'; 
import MenuScreen from './screens/MenuScreens';
import SplashScreen from './screens/SplashScreen'; 
import HistoricoPedidos from './screens/HistoricoPedidos'; 
import HistoricoPontos from './screens/HistoricoPontos'; 

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator(); 

// --- NAVEGAÇÃO POR ABAS (BOTTOM TABS) ---
function TabNavigator() {
  const { theme, isDark } = useTheme();

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
        tabBarActiveTintColor: '#FF6B00', 
        
        // Preto no Modo Claro, Cinza no Modo Escuro!
        tabBarInactiveTintColor: isDark ? theme.textSec : '#1a1a1a', 
        
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card, 
          height: Platform.OS === 'android' ? 85 : 90, 
          paddingBottom: Platform.OS === 'android' ? 25 : 30, 
          paddingTop: 12,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          position: 'absolute',
          borderTopWidth: isDark ? 1 : 0, 
          borderTopColor: theme.border,
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
    // Função silenciosa para validar se a conta ainda existe no servidor
    async function validarSessaoReal() {
      // AGORA TAMBÉM CAPTURAMOS O ERRO (erroSessao)
      const { data: { session: sessaoAtual }, error: erroSessao } = await supabase.auth.getSession();
      
      // Se houver um erro de Refresh Token ou a sessão for nula, forçamos o logout
      if (erroSessao || !sessaoAtual) {
        await supabase.auth.signOut();
        setSession(null);
        return;
      }

      // O telemóvel tem a chave guardada, mas vamos confirmar à Base de Dados!
      const { data: perfilAtivo } = await supabase
        .from('perfis')
        .select('id')
        .eq('id', sessaoAtual.user.id)
        .maybeSingle();

      // Se o perfil já não existir (foi apagado pelo Admin), forçamos Logout local
      if (!perfilAtivo) {
        await supabase.auth.signOut();
        setSession(null);
        return;
      }
      
      setSession(sessaoAtual);
    }

    validarSessaoReal();

    // Escutar mudanças de estado (quando o utilizador faz login/logout manualmente)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, sessaoAlterada) => {
      if (sessaoAlterada) {
        const { data: perfilAtivo } = await supabase
          .from('perfis')
          .select('id')
          .eq('id', sessaoAlterada.user.id)
          .maybeSingle();

        if (!perfilAtivo) {
          await supabase.auth.signOut();
          setSession(null);
          return;
        }
      }
      setSession(sessaoAlterada);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  if (!session) {
    return (
      <ThemeProvider>
        <NavigationContainer>
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={AuthScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
          </AuthStack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="MenuScreens" component={MenuScreen} />
          <Stack.Screen name="HistoricoPedidos" component={HistoricoPedidos} />
          <Stack.Screen name="HistoricoPontos" component={HistoricoPontos} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}