import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  onCrearCuenta: () => void;
  onIniciarSesion: () => void;
};

export default function BienvenidaScreen({ onCrearCuenta, onIniciarSesion }: Props) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#308be6', '#d7fbcf']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.appName}>SYTECYCLE</Text>
        <Text style={styles.subtitulo}>Tu tratamiento, organizado.</Text>
      </LinearGradient>

      <View style={styles.botones}>
        <TouchableOpacity style={styles.botonPrimario} onPress={onIniciarSesion}>
          <Text style={styles.botonPrimarioTexto}>Iniciar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonSecundario} onPress={onCrearCuenta}>
          <Text style={styles.botonSecundarioTexto}>Crear cuenta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  subtitulo: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 12,
    textAlign: 'center',
  },
  botones: { padding: 24, gap: 12, marginTop: 40 },
  botonPrimario: {
    backgroundColor: '#308be6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  botonPrimarioTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  botonSecundario: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#308be6',
  },
  botonSecundarioTexto: { color: '#308be6', fontSize: 16, fontWeight: 'bold' },
});