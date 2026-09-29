import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { eliminarCuenta } from '../database/queries';

type Props = {
  onCuentaEliminada: () => void;
};

export default function PerfilScreen({ onCuentaEliminada }: Props) {
  const confirmarEliminar = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Seguro que quieres eliminar tu cuenta? Se borrarán todos tus datos y no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarCuenta();
              onCuentaEliminada();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la cuenta.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Perfil</Text>
      <Text style={styles.subtitulo}>Aquí irá tu configuración</Text>

      <TouchableOpacity
        style={styles.botonEliminar}
        onPress={confirmarEliminar}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={16} color="#FF3B30" />
        <Text style={styles.botonEliminarTexto}>Eliminar cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#308be6' },
  subtitulo: { fontSize: 14, color: '#666', marginTop: 8 },
  botonEliminar: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: '#fff',
  },
  botonEliminarTexto: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
});