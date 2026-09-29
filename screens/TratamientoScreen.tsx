import { View, Text, StyleSheet } from 'react-native';

export default function TratamientoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Mi tratamiento</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#308be6' },
  subtitulo: { fontSize: 14, color: '#666', marginTop: 8 },
});