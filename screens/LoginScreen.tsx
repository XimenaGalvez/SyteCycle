import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { validarCredenciales } from '../database/queries';

type Props = {
  onLoginExitoso: () => void;
  onVolver: () => void;
};

export default function LoginScreen({ onLoginExitoso, onVolver }: Props) {
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [entrando, setEntrando] = useState(false);

  const handleLogin = async () => {
    if (!nombre.trim() || !contrasena) {
      Alert.alert('Faltan datos', 'Ingresa nombre y contraseña.');
      return;
    }

    try {
      setEntrando(true);
      const usuario = await validarCredenciales(nombre, contrasena);

      if (!usuario) {
        Alert.alert('Datos incorrectos', 'Nombre o contraseña no coinciden.');
        return;
      }

      onLoginExitoso();
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'No se pudo iniciar sesión.');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={['#308be6', '#d7fbcf']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          
          <TouchableOpacity
            style={styles.botonVolver}
            onPress={onVolver}
            activeOpacity={0.7}
          >
                <Ionicons name="arrow-back" size={20} color="#fff" />
                <Text style={styles.regresar}>Regresar</Text>
          </TouchableOpacity>

          <Text style={styles.appName}>SYTECYCLE</Text>
          <Text style={styles.saludo}>¡Hola de nuevo!</Text>
          <Text style={styles.subtitulo}>Inicia sesión para continuar.</Text>
        </LinearGradient>

        <View style={styles.form}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa tu nombre."
            value={nombre}
            onChangeText={setNombre}
            maxLength={50}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa tu contraseña."
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry
            maxLength={50}
          />

          <TouchableOpacity
            style={styles.boton}
            onPress={handleLogin}
            disabled={entrando}
          >
            <Text style={styles.botonTexto}>
              {entrando ? 'Entrando...' : 'Iniciar sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  
  botonVolver: {
    position: 'absolute',
    bottom: 20,
    left: 255,
    flexDirection: 'row',       
    alignItems: 'center',       
    gap: 6,                     
    paddingHorizontal: 12,
    width: 115,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(120, 208, 202, 0.57)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    paddingLeft: 10,
  },
  saludo: {
    fontSize: 20,
    color: '#fff',
    marginTop: 18,
    fontWeight: '600',
    paddingLeft: 10,
  },
  subtitulo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 14,
    paddingLeft: 10,
  }, 
  regresar:{
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  form: { padding: 24, gap: 8 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  boton: {
    marginTop: 32,
    backgroundColor: '#308be6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  botonTexto: { 
    color: '#fff',
     fontSize: 16,
      fontWeight: 'bold' 
    },
});