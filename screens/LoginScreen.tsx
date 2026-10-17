import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { validarCredenciales } from '../database/queries';

type Props = {
  onLoginExitoso: () => void;
  onVolver: () => void;
};

export default function LoginScreen({ onLoginExitoso, onVolver }: Props) {
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!nombre.trim() || !contrasena.trim()) {
      return Alert.alert('Atención', 'Por favor llena todos los campos.');
    }
    try {
      setCargando(true);
      const usuario = await validarCredenciales(nombre, contrasena);
      if (usuario) onLoginExitoso();
      else Alert.alert('Error', 'Nombre o contraseña incorrectos.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <LinearGradient
            colors={['#308be6', '#d7fbcf']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.appName}>SYTECYCLE</Text>
            <Text style={styles.subtitulo}>Bienvenido de nuevo</Text>
          </LinearGradient>

          <View style={styles.form}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor="#aaa"
              value={nombre}
              onChangeText={setNombre}
              maxLength={50}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu contraseña"
              placeholderTextColor="#aaa"
              value={contrasena}
              onChangeText={setContrasena}
              secureTextEntry
              maxLength={50}
            />

            <TouchableOpacity style={styles.boton} onPress={handleLogin} disabled={cargando}>
              <Text style={styles.botonTexto}>
                {cargando ? 'Entrando...' : 'Iniciar Sesión'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botonSecundario} onPress={onVolver} disabled={cargando}>
              <Text style={styles.botonSecundarioTexto}>Volver</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Línea decorativa - FUERA del KeyboardAvoidingView */}
      <View style={styles.lineaDecorativaContainer} pointerEvents="none">
        <LinearGradient
          colors={['transparent', '#308be6', '#d7fbcf', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.lineaDecorativa}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#fff', letterSpacing: 2, paddingLeft: 10 },
  subtitulo: { fontSize: 15, color: 'rgba(255,255,255,0.9)', marginTop: 8, paddingLeft: 10 },
  form: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, backgroundColor: '#fafafa' },
  boton: { marginTop: 32, backgroundColor: '#308be6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  botonSecundario: { marginTop: 12, backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#cbd5e0' },
  botonSecundarioTexto: { color: '#4a5568', fontSize: 14, fontWeight: '600' },

  // Línea decorativa
  lineaDecorativaContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  lineaDecorativa: {
    width: '60%',
    height: 3,
    borderRadius: 2,
  },
});