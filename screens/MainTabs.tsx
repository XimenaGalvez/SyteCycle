import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './HomeScreen';
import TratamientoScreen from './TratamientoScreen';
import HistorialScreen from './HistorialScreen';
import PerfilScreen from './PerfilScreen';

export type MainTabParamList = {
  Inicio: undefined;
  Tratamiento: undefined;
  Historial: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type Props = {
  onCerrarSesion: () => void;
  onCuentaEliminada: () => void;
};

export default function MainTabs({ onCerrarSesion, onCuentaEliminada }: Props) {
  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#308be6',
        tabBarInactiveTintColor: '#9aa0a6',
        tabBarStyle: {
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          height: 60,
          borderRadius: 20,
          paddingBottom: 6,
          paddingTop: 6,
          borderTopWidth: 0,
          backgroundColor: '#fff',
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'home-outline';
          if (route.name === 'Inicio') iconName = 'home-outline';
          if (route.name === 'Tratamiento') iconName = 'medkit-outline';
          if (route.name === 'Historial') iconName = 'time-outline';
          if (route.name === 'Perfil') iconName = 'person-outline';
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
        {() => <PerfilScreen onCuentaEliminada={onCuentaEliminada} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}