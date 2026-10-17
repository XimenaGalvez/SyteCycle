import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native'; // <-- Agregamos Platform
import HomeScreen from './HomeScreen';
import TratamientoScreen from './TratamientoScreen';
import HistorialScreen from './HistorialScreen';
import PerfilScreen from './PerfilScreen';

type Props = {
  onCerrarSesion: () => void;
  onCuentaEliminada: () => void;
};

const Tab = createBottomTabNavigator();

export default function MainTabs({ onCerrarSesion, onCuentaEliminada }: Props) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#308be6',
        tabBarInactiveTintColor: '#a0aec0',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 80 : 85, // Altura total del menú
          paddingBottom: Platform.OS === 'ios' ? 30 : 15, // Espacio abajo (lo sube)
          paddingTop: 8, // Espacio arriba
          borderTopWidth: 1,
          borderTopColor: '#edf2f7',
          backgroundColor: '#fff',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 5, // Ajuste para el texto
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'home-outline';
          if (route.name === 'Inicio') iconName = 'home-outline';
          else if (route.name === 'Tratamiento') iconName = 'medkit-outline';
          else if (route.name === 'Historial') iconName = 'time-outline';
          else if (route.name === 'Perfil') iconName = 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio">
        {() => <HomeScreen onCerrarSesion={onCerrarSesion} />}
      </Tab.Screen>

      <Tab.Screen name="Tratamiento" component={TratamientoScreen} />

      <Tab.Screen name="Historial" component={HistorialScreen} />

      <Tab.Screen name="Perfil">
        {() => (
          <PerfilScreen
            onCerrarSesion={onCerrarSesion}
            onCuentaEliminada={onCuentaEliminada}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}