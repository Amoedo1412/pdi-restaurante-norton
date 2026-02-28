import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Importação dos teus ecrãs
import Home from './tabs/Home';
import MenuScreen from './screens/MenuScreens';
import Reservas from './screens/Reservas'; 
import Pontos from './tabs/Pontos';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator 
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName: any;

            // Configuração dos ícones para cada aba
            if (route.name === 'Início') iconName = 'home';
            else if (route.name === 'Ementa') iconName = 'restaurant';
            else if (route.name === 'Reservas') iconName = 'calendar';
            else if (route.name === 'Pontos') iconName = 'gift';

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#e67e22', // Cor de destaque (Laranja Norton)
          tabBarInactiveTintColor: 'gray',
          headerShown: false, // Esconde o cabeçalho padrão para um look mais limpo
        })}
      >
        <Tab.Screen name="Início" component={Home} />
        <Tab.Screen name="Ementa" component={MenuScreen} />
        <Tab.Screen name="Reservas" component={Reservas} />
        <Tab.Screen name="Pontos" component={Pontos} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}