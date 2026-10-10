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
import { db } from '../database/db';

type Props = {
  onCerrarSesion: () => void;
};

type Insulina = {
  id_insulina: string;
  nombre: string;
  tipo: string;
  unidades_indicadas: number;
  horario: string;
  caducidad: string | null;
  notas: string | null;
};

type Medicamento = {
  id_medicamento: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
  horario: string;
  caducidad: string | null;
  indicaciones: string | null;
  activo: number;
};

export default function HomeScreen({ onCerrarSesion }: Props) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [insulinas, setInsulinas] = useState<Insulina[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);

  const cargarDatosHome = async () => {
    try {
      const u = await obtenerUsuario();
      setUsuario(u);

      const resInsulinas = await db.getAllAsync<Insulina>('SELECT * FROM insulina ORDER BY horario ASC');
      const resMeds = await db.getAllAsync<Medicamento>('SELECT * FROM medicamento WHERE activo = 1 ORDER BY horario ASC');
      
      setInsulinas(resInsulinas);
      setMedicamentos(resMeds);
    } catch (error) {
      console.error('Error al cargar datos en Home:', error);
    }
  };

  useEffect(() => {
    cargarDatosHome();
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
      'Aquí podrás registrar que ya cumpliste con tu aplicación o tratamiento actual.'
    );
  };

  // Tomamos la primera insulina registrada como la "próxima" a modo de ejemplo dinámico
  const proximaInsulina = insulinas.length > 0 ? insulinas[0] : null;

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
              ¡Hola, {usuario?.nombre ?? 'Usuario'}! 👋
            </Text>

            {/* Contenedor dinámico de Próxima Aplicación */}
            <View style={styles.proxima}>
              <View style={styles.proximaHeader}>
                <Ionicons name="time-outline" size={20} color="#1f4e79" />
                <Text style={styles.proximaTitulo}>Próxima aplicación</Text>
              </View>
              {proximaInsulina ? (
                <>
                  <Text style={styles.proximaHora}>{proximaInsulina.horario}</Text>
                  <Text style={styles.proximaDetalle}>
                    {proximaInsulina.nombre} ({proximaInsulina.tipo}) — {proximaInsulina.unidades_indicadas} U
                  </Text>
                  <Text style={styles.proximaSitio}>
                    {proximaInsulina.notas ? `📍 ${proximaInsulina.notas}` : '📍 RotaSitio activo'}
                  </Text>
                </>
              ) : (
                <Text style={[styles.proximaDetalle, { fontStyle: 'italic', color: '#555' }]}>
                  No hay insulinas registradas en tu tratamiento.
                </Text>
              )}
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={confirmarCerrarSesion}
          >
            <Text style={styles.botonCerrarTexto}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.seccion1}>
          {/* Medicamentos del día dinámicos */}
          <View style={styles.medicamentos}>
            <Text style={styles.seccionTitulo}>Medicamentos de hoy</Text>
            {medicamentos.length === 0 ? (
              <Text style={styles.textoSecundario}>No hay medicamentos coadyuvantes activos.</Text>
            ) : (
              medicamentos.map((med) => (
                <View key={med.id_medicamento} style={styles.itemMed}>
                  <Ionicons name="medical-outline" size={18} color="#2e7d32" />
                  <Text style={styles.itemMedTexto}>
                    {med.nombre} ({med.dosis}) - {med.horario}
                  </Text>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#2e7d32" />
                </View>
              ))
            )}
          </View>

          {/* Estado de Aplicación / RotaSitio */}
          <View style={styles.aplicacion}>
            <Text style={styles.seccionTituloSecundaria}>Rotación RotaSitio</Text>
            <Text style={styles.textoSecundario}>
              {proximaInsulina?.notas ?? 'Siguiente zona sugerida lista para tu inyección.'}
            </Text>
          </View>

          {/* Círculo de Progreso */}
          <View style={styles.progreso}>
            <Text style={styles.progresoPorcentaje}>75%</Text>
            <Text style={styles.progresoTexto}>Adherencia hoy</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleMarcarToma}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

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
    minHeight: 160,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  seccion1: { 
    backgroundColor: '#fff' 
  },
  medicamentos: {
    marginTop: 24,
    marginHorizontal: 20,
    minHeight: 120,
    backgroundColor: '#d7ffea7a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c6f6d5',
  },
  aplicacion: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: '#e8eafd50',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c3cffc',
  },
  progreso: {
    width: 150,                     
    height: 150,                     
    borderRadius: 75,               
    alignSelf: 'center',             
    marginTop: 24,                   
    alignItems: 'center',            
    justifyContent: 'center',      
    borderWidth: 15,
    borderColor: '#baf0ee',
  },
  fab: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    width: 260,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3182ce',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 20,
  },
  proximaTitulo: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1f4e79', 
    marginLeft: 6 
  },
  proximaHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  proximaHora: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1f4e79' 
  },
  proximaDetalle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333', 
    marginTop: 4 
  },
  proximaSitio: { 
    fontSize: 14, 
    color: '#555', 
    marginTop: 4 
  },
  seccionTitulo: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1b5e20', 
    marginBottom: 8 
  },
  seccionTituloSecundaria: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1a237e', 
    marginBottom: 4 
  },
  textoSecundario: { 
    fontSize: 13, 
    color: '#555' 
  },
  itemMed: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: 8 
  },
  itemMedTexto: { 
    fontSize: 14, 
    color: '#333', 
    flex: 1, 
    marginLeft: 8 
  },
  progresoPorcentaje: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#308be6'
  },
  progresoTexto: { 
    fontSize: 12, 
    color: '#666',
    marginTop: 2 
  },
});