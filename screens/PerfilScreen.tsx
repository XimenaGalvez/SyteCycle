import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  eliminarCuenta,
  obtenerUsuario,
  actualizarUsuario,
  Usuario,
  obtenerEstadisticasUsuario,
} from '../database/queries';
import { cancelarTodasLasNotificaciones } from '../utils/notifications';

type Props = {
  onCuentaEliminada: () => void;
  onCerrarSesion: () => void;
};

type Estadisticas = {
  diasUsando: number;
  totalAplicaciones: number;
  totalTomas: number;
  adherenciaPromedio: number;
};

export default function PerfilScreen({ onCuentaEliminada, onCerrarSesion }: Props) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [stats, setStats] = useState<Estadisticas>({
    diasUsando: 0,
    totalAplicaciones: 0,
    totalTomas: 0,
    adherenciaPromedio: 0,
  });

  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [nombreEdit, setNombreEdit] = useState('');
  const [pesoEdit, setPesoEdit] = useState('');
  const [fechaNacEdit, setFechaNacEdit] = useState('');
  const [errorEdit, setErrorEdit] = useState<string | null>(null);

  const cargarDatos = async () => {
    const u = await obtenerUsuario();
    setUsuario(u);
    const s = await obtenerEstadisticasUsuario();
    setStats(s);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const formatearFecha = (fechaStr: string | null) => {
    if (!fechaStr) return 'No especificada';
    const fecha = new Date(fechaStr + 'T00:00:00');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${fecha.getDate()} de ${meses[fecha.getMonth()]}, ${fecha.getFullYear()}`;
  };

  // ============================================================
  // CERRAR SESIÓN (movida desde HomeScreen)
  // ============================================================
  const confirmarCerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            onCerrarSesion();
          },
        },
      ]
    );
  };

  // ============================================================
  // EDITAR PERFIL
  // ============================================================
  const abrirEditar = () => {
    if (!usuario) return;
    setNombreEdit(usuario.nombre);
    setPesoEdit(usuario.peso?.toString() || '');
    setFechaNacEdit(usuario.fecha_nacimiento || '');
    setErrorEdit(null);
    setModalEditarVisible(true);
  };

  const guardarCambios = async () => {
    if (!nombreEdit.trim()) {
      setErrorEdit('El nombre no puede estar vacío.');
      return;
    }
    if (nombreEdit.trim().length < 2) {
      setErrorEdit('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (/\d/.test(nombreEdit)) {
      setErrorEdit('El nombre no puede contener números.');
      return;
    }

    const pesoNum = pesoEdit.trim() ? parseFloat(pesoEdit) : null;
    if (pesoEdit.trim() && (isNaN(pesoNum!) || pesoNum! <= 0)) {
      setErrorEdit('El peso debe ser un número mayor a 0.');
      return;
    }

    if (fechaNacEdit.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacEdit)) {
      setErrorEdit('La fecha debe tener el formato AAAA-MM-DD.');
      return;
    }

    try {
      await actualizarUsuario({
        nombre: nombreEdit.trim(),
        peso: pesoNum,
        fecha_nacimiento: fechaNacEdit.trim() || null,
      });
      setModalEditarVisible(false);
      cargarDatos();
      Alert.alert('¡Éxito!', 'Tu perfil se actualizó correctamente.');
    } catch (error) {
      console.error('Error al guardar:', error);
      setErrorEdit('No se pudo guardar. Verifica los datos.');
    }
  };

  // ============================================================
  // ELIMINAR CUENTA
  // ============================================================
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
              // Cancelar notificaciones antes de borrar la cuenta
              await cancelarTodasLasNotificaciones();
              await eliminarCuenta();
              onCuentaEliminada();
            } catch (error) {
              console.error('Error al eliminar cuenta:', error);
              Alert.alert('Error', 'No se pudo eliminar la cuenta.');
            }
          },
        },
      ]
    );
  };

  const mostrarAcercaDe = () => {
    Alert.alert(
      'SyteCycle',
      'Versión 1.0.0\n\nAplicación de apoyo para el control de insulina y medicamentos coadyuvantes.\n\nRota hoy, cuida tu mañana. 💙',
      [{ text: 'Cerrar' }]
    );
  };

  const mostrarAyuda = () => {
    Alert.alert(
      'Ayuda',
      'Si tienes dudas sobre cómo usar la app, contacta a tu profesional de la salud o al soporte técnico.\n\nCORREODESOPORTE',
      [{ text: 'Cerrar' }]
    );
  };

  const inicial = usuario?.nombre
    ? usuario.nombre.trim().charAt(0).toUpperCase()
    : '?';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <LinearGradient
          colors={['#308be6', '#d7fbcf']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{inicial}</Text>
          </View>
          <Text style={styles.nombre}>{usuario?.nombre || 'Usuario'}</Text>
          <Text style={styles.fechaDesde}>
            Miembro desde {formatearFecha(usuario?.created_at?.split(' ')[0] || null)}
          </Text>
        </LinearGradient>

        {/* ESTADÍSTICAS */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Ionicons name="calendar-outline" size={22} color="#308be6" />
            <Text style={styles.statNumero}>{stats.diasUsando}</Text>
            <Text style={styles.statLabel}>
              {stats.diasUsando === 1 ? 'Día' : 'Días'}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="water-outline" size={22} color="#308be6" />
            <Text style={styles.statNumero}>{stats.totalAplicaciones}</Text>
            <Text style={styles.statLabel}>Aplicaciones</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="medical-outline" size={22} color="#2e7d32" />
            <Text style={styles.statNumero}>{stats.totalTomas}</Text>
            <Text style={styles.statLabel}>Tomas</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="trending-up" size={22} color="#c05621" />
            <Text style={styles.statNumero}>{stats.adherenciaPromedio}%</Text>
            <Text style={styles.statLabel}>Adherencia</Text>
          </View>
        </View>

        {/* INFORMACIÓN PERSONAL */}
        <View style={styles.seccion}>
          <View style={styles.seccionHeader}>
            <Text style={styles.seccionTitulo}>Información personal</Text>
            <TouchableOpacity style={styles.botonEditar} onPress={abrirEditar}>
              <Ionicons name="pencil" size={14} color="#308be6" />
              <Text style={styles.botonEditarTexto}>Editar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#718096" />
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.infoValor}>{usuario?.nombre || '-'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#718096" />
            <Text style={styles.infoLabel}>Nacimiento</Text>
            <Text style={styles.infoValor}>{formatearFecha(usuario?.fecha_nacimiento || null)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="barbell-outline" size={18} color="#718096" />
            <Text style={styles.infoLabel}>Peso</Text>
            <Text style={styles.infoValor}>
              {usuario?.peso ? `${usuario.peso} kg` : 'No especificado'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calculator-outline" size={18} color="#718096" />
            <Text style={styles.infoLabel}>Relación I/C</Text>
            <Text style={styles.infoValor}>
              {usuario?.relacion_insulina_carbohidrato
                ? `1 U : ${usuario.relacion_insulina_carbohidrato} g`
                : 'No especificada'}
            </Text>
          </View>
        </View>

        {/* OPCIONES */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Opciones</Text>

          <TouchableOpacity style={styles.opcionItem} onPress={mostrarAyuda}>
            <View style={styles.opcionIcono}>
              <Ionicons name="help-circle-outline" size={20} color="#308be6" />
            </View>
            <Text style={styles.opcionTexto}>Ayuda y soporte</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.opcionItem} onPress={mostrarAcercaDe}>
            <View style={styles.opcionIcono}>
              <Ionicons name="information-circle-outline" size={20} color="#308be6" />
            </View>
            <Text style={styles.opcionTexto}>Acerca de SyteCycle</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e0" />
          </TouchableOpacity>
        </View>

        <View style={styles.seccion}>
          <Text style={[styles.seccionTitulo, { color: '#c53030' }]}>Opciones Directas</Text>

          <TouchableOpacity style={styles.botonCerrarSesion} onPress={confirmarCerrarSesion}>
            <Ionicons name="log-out-outline" size={20} color="#c05621" />
            <Text style={styles.botonCerrarSesionTexto}>Cerrar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botonEliminar} onPress={confirmarEliminar}>
            <Ionicons name="trash-outline" size={20} color="#c53030" />
            <Text style={styles.botonEliminarTexto}>Eliminar cuenta</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>SyteCycle v1.0.0</Text>
      </ScrollView>

      {/* MODAL EDITAR */}
      <Modal visible={modalEditarVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="person-circle-outline" size={24} color="#308be6" />
              <Text style={styles.modalTitulo}>Editar Perfil</Text>
            </View>

            {errorEdit && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#e53e3e" />
                <Text style={styles.errorTexto}>{errorEdit}</Text>
              </View>
            )}

            <Text style={styles.labelInput}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={nombreEdit}
              onChangeText={setNombreEdit}
              placeholder="Tu nombre"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.labelInput}>Fecha de nacimiento (Opcional)</Text>
            <TextInput
              style={styles.input}
              value={fechaNacEdit}
              onChangeText={setFechaNacEdit}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.labelInput}>Peso en kg (Opcional)</Text>
            <TextInput
              style={styles.input}
              value={pesoEdit}
              onChangeText={setPesoEdit}
              placeholder="ej. 70"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={[styles.botonModal, styles.botonCancelar]}
                onPress={() => setModalEditarVisible(false)}
              >
                <Text style={styles.botonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonModal, styles.botonGuardar]}
                onPress={guardarCambios}
              >
                <Text style={styles.botonTextoGuardar}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingBottom: 40 },

  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  avatarTexto: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#308be6',
  },
  nombre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  fechaDesde: {
    fontSize: 12,
    color: '#ffffffcc',
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginTop: -20,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#718096',
    marginTop: 2,
  },

  seccion: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  seccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seccionTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a365d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  botonEditar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebf8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bee3f8',
  },
  botonEditarTexto: {
    fontSize: 12,
    color: '#308be6',
    fontWeight: 'bold',
    marginLeft: 4,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  infoLabel: {
    fontSize: 13,
    color: '#718096',
    marginLeft: 10,
    width: 110,
  },
  infoValor: {
    flex: 1,
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '600',
    textAlign: 'right',
  },

  opcionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  opcionIcono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ebf8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  opcionTexto: {
    flex: 1,
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '600',
  },

  botonCerrarSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffaf0',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fbd38d',
  },
  botonCerrarSesionTexto: {
    fontSize: 14,
    color: '#c05621',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  botonEliminar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  botonEliminarTexto: {
    fontSize: 14,
    color: '#c53030',
    fontWeight: 'bold',
    marginLeft: 8,
  },

  version: {
    fontSize: 12,
    color: '#a0aec0',
    textAlign: 'center',
    marginTop: 30,
    fontStyle: 'italic',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingBottom: 10,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#308be6',
    marginLeft: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#feb2b2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorTexto: {
    color: '#c53030',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginLeft: 6,
  },
  labelInput: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a5568',
    marginBottom: 4,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#f7fafc',
    color: '#2d3748',
  },
  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  botonModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  botonCancelar: {
    backgroundColor: '#edf2f7',
    marginRight: 6,
  },
  botonGuardar: {
    backgroundColor: '#308be6',
    marginLeft: 6,
  },
  botonTextoCancelar: {
    color: '#4a5568',
    fontWeight: 'bold',
    fontSize: 13,
  },
  botonTextoGuardar: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});