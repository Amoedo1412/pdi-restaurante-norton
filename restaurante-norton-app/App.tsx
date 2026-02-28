import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// 1. IMPORTA OS TEUS FICHEIROS AQUI
import HomeScreen from './tabs/Home';
import MenuScreen from './screens/MenuScreens';
import Pontos from './tabs/Pontos'; 

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator 
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName: any;
            if (route.name === 'Início') iconName = 'restaurant';
            else if (route.name === 'Ementa') iconName = 'fast-food';
            else if (route.name === 'Pontos') iconName = 'qr-code'; 
            
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#e67e22',
          tabBarInactiveTintColor: 'gray',
          headerShown: false
        })}
      >
        <Tab.Screen name="Início" component={HomeScreen} />
        <Tab.Screen name="Ementa" component={MenuScreen} />
        
        {/* 2. ADICIONA ESTA LINHA PARA A ABA APARECER NO TELEMÓVEL */}
        <Tab.Screen name="Pontos" component={Pontos} />
        
      </Tab.Navigator>
    </NavigationContainer>
  );
}