import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { initDatabase } from './database/db';
import { obtenerUsuario, eliminarCuenta } from './database/queries'; // <-- IMPORT CORREGIDO
import { pedirPermisosNotificaciones } from './utils/notifications';
import BienvenidaScreen from './screens/BienvenidaScreen';
import CrearUsuarioScreen from './screens/CrearUsuarioScreen';
import LoginScreen from './screens/LoginScreen';
import MainTabs from './screens/MainTabs';
import * as Notifications from 'expo-notifications';

type Pantalla = 'bienvenida' | 'crear' | 'login' | 'home';

export default function App() {
  const [cargando, setCargando] = useState(true);
  const [pantalla, setPantalla] = useState<Pantalla>('bienvenida');

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        
        try {
          await Notifications.cancelAllScheduledNotificationsAsync();
          console.log('🧹 Notificaciones viejas canceladas');
        } catch (err) {
          console.warn('No se pudieron cancelar las notificaciones viejas:', err);
        }

        await pedirPermisosNotificaciones();
        const usuario = await obtenerUsuario();
        setPantalla(usuario !== null ? 'login' : 'bienvenida');
      } catch (error) {
        console.error('Error al iniciar:', error);
        setPantalla('bienvenida');
      } finally {
        setCargando(false);
      }
    };
    setup();
  }, []);

  if (cargando) {
    return (
      <View style={styles.carga}>
        <ActivityIndicator size="large" color="#308be6" />
      </View>
    );
  }

  if (pantalla === 'bienvenida') {
    return (
      <BienvenidaScreen
        onCrearCuenta={() => setPantalla('crear')}
        onIniciarSesion={() => setPantalla('login')}
      />
    );
  }

  if (pantalla === 'crear') {
    return (
      <CrearUsuarioScreen
        onUsuarioCreado={() => setPantalla('home')}
        onVolver={() => setPantalla('bienvenida')}
      />
    );
  }

  if (pantalla === 'login') {
    return (
      <LoginScreen
        onLoginExitoso={() => setPantalla('home')}
        onVolver={() => setPantalla('bienvenida')}
      />
    );
  }

  return (
    <NavigationContainer>
      <MainTabs
        onCerrarSesion={async () => { // <-- AQUÍ ESTÁ EL CAMBIO
          await eliminarCuenta(); // Borra todos los datos de la cuenta
          setPantalla('bienvenida');
        }}
        onCuentaEliminada={() => setPantalla('bienvenida')}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  carga: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});