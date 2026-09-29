import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { obtenerUsuario, Usuario } from '../database/queries';

type Props = {
  onCerrarSesion: () => void;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  headerWrapper: { position: 'relative' },
  header: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    paddingLeft: 10,
  },
  saludo: {
    fontSize: 16,
    color: '#ffffffe6',
    marginTop: 4,
    paddingLeft: 10,
  },
  botonCerrar: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    zIndex: 10,
  },
  botonCerrarTexto: { color: '#fff', fontSize: 13, fontWeight: '600' },
  proxima: {
    marginTop: 24,
    minHeight: 180,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  seccion1: 
  { 
    backgroundColor: '#fff' 
  },
  medicamentos: {
    marginTop: 24,
    marginLeft: 20,
    marginRight: 20,
    minHeight: 180,
    backgroundColor: '#d7ffea7a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  aplicacion: {
    marginTop: 24,
    marginLeft: 20,
    marginRight: 20,
    minHeight: 80,
    backgroundColor: '#e8eafd50',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  progreso: {
    width: 150,                    
    height: 150,                   
    borderRadius: 75,              
    alignSelf: 'center',           
    marginTop: 24,                 
    alignItems: 'center',          
    justifyContent: 'center',      
    borderWidth: 20,
    borderColor: '#baf0ee',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 290,
    height: 50,
    borderRadius: 40,
    backgroundColor: '#5871ed',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 20,
  },
});

export default function HomeScreen({ onCerrarSesion }: Props) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    const cargar = async () => {
      const u = await obtenerUsuario();
      setUsuario(u);
    };
    cargar();
  }, []);

  const confirmarCerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: onCerrarSesion,
        },
      ]
    );
  };

  const handleMarcarToma = () => {
    Alert.alert(
      'Marcar toma',
      'Aquí podrás registrar que ya tomaste tu medicamento.'
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={['#308be6', '#d7fbcf']}
            start={{ x: 1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.appName}>SYTECYCLE</Text>
            <Text style={styles.saludo}>
              ¡Hola, {usuario?.nombre ?? 'Usuario'}!
            </Text>
            <View style={styles.proxima}></View>
          </LinearGradient>

          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={confirmarCerrarSesion}
          >
            <Text style={styles.botonCerrarTexto}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.seccion1}>
          <View style={styles.medicamentos}></View>
          <View style={styles.aplicacion}></View>
          <View style={styles.progreso}></View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleMarcarToma}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}