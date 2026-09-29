import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { initDatabase } from './database/db';
import { obtenerUsuario } from './database/queries';
import BienvenidaScreen from './screens/BienvenidaScreen';
import CrearUsuarioScreen from './screens/CrearUsuarioScreen';
import LoginScreen from './screens/LoginScreen';
import MainTabs from './screens/MainTabs';

type Pantalla = 'bienvenida' | 'crear' | 'login' | 'home';

export default function App() {
  const [cargando, setCargando] = useState(true);
  const [pantalla, setPantalla] = useState<Pantalla>('bienvenida');

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        const usuario = await obtenerUsuario();
        // Si ya hay usuario → login, si no → bienvenida
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
        onCerrarSesion={() => setPantalla('bienvenida')}
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