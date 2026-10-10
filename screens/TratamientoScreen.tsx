import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { db, generarId } from '../database/db';
import { Ionicons } from '@expo/vector-icons';

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

export default function TratamientoScreen() {
  const [insulinas, setInsulinas] = useState<Insulina[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [busqueda, setBusqueda] = useState('');
  
  // Modales de Formularios
  const [modalInsulinaVisible, setModalInsulinaVisible] = useState(false);
  const [modalMedVisible, setModalMedVisible] = useState(false);

  // Modales de Confirmación de Eliminación Personalizados
  const [modalEliminarInsVisible, setModalEliminarInsVisible] = useState(false);
  const [modalEliminarMedVisible, setModalEliminarMedVisible] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState<{ id: string; nombre: string } | null>(null);

  const [idEditandoInsulina, setIdEditandoInsulina] = useState<string | null>(null);
  const [idEditandoMed, setIdEditandoMed] = useState<string | null>(null);

  // Estados Formulario Insulina
  const [nombreIns, setNombreIns] = useState('');
  const [tipoIns, setTipoIns] = useState('Rápida');
  const [unidadesIns, setUnidadesIns] = useState('');
  const [horarioIns, setHorarioIns] = useState('');
  const [caducidadIns, setCaducidadIns] = useState('');
  const [zonaIns, setZonaIns] = useState<'abdomen' | 'brazo' | 'muslo'>('abdomen');
  const [errorInsulina, setErrorInsulina] = useState<string | null>(null);

  // Estados Formulario Medicamento
  const [nombreMed, setNombreMed] = useState('');
  const [dosisMed, setDosisMed] = useState('');
  const [frecuenciaMed, setFrecuenciaMed] = useState('');
  const [horarioMed, setHorarioMed] = useState('');
  const [caducidadMed, setCaducidadMed] = useState('');
  const [indicacionesMed, setIndicacionesMed] = useState('');
  const [errorMedicamento, setErrorMedicamento] = useState<string | null>(null);

  // Estado para Banner de Éxito personalizado
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const mostrarMensajeExito = (texto: string) => {
    setMensajeExito(texto);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setMensajeExito(null));
  };

  const cargarTratamientos = async () => {
    try {
      const resInsulinas = await db.getAllAsync<Insulina>('SELECT * FROM insulina');
      const resMeds = await db.getAllAsync<Medicamento>('SELECT * FROM medicamento');
      setInsulinas(resInsulinas);
      setMedicamentos(resMeds);
    } catch (error) {
      console.error('Error al cargar tratamientos:', error);
    }
  };

  useEffect(() => {
    cargarTratamientos();
  }, []);

  const normalizarHora = (h: string) => {
    const trimmed = h.trim();
    if (/^[0-9]:[0-9][0-9]$/.test(trimmed)) {
      return `0${trimmed}`;
    }
    return trimmed;
  };

  // Función para verificar estado de caducidad (retorna 'caducado', 'proximo' o 'ok')
  const verificarCaducidad = (fechaStr: string | null) => {
    if (!fechaStr) return 'ok';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaCaducidad = new Date(fechaStr + 'T00:00:00');
    
    // Diferencia en días
    const diferenciaDias = Math.ceil((fechaCaducidad.getTime() - hoy.getTime()) / (1000 * 3600 * 24));

    if (diferenciaDias < 0) return 'caducado';
    if (diferenciaDias <= 30) return 'proximo'; // Alerta si faltan 30 días o menos
    return 'ok';
  };

  // --- ACCIONES INSULINA ---
  const abrirNuevoInsulina = () => {
    setIdEditandoInsulina(null);
    setNombreIns('');
    setTipoIns('Rápida');
    setUnidadesIns('');
    setHorarioIns('');
    setCaducidadIns('');
    setZonaIns('abdomen');
    setErrorInsulina(null);
    setModalInsulinaVisible(true);
  };

  const abrirEditarInsulina = (item: Insulina) => {
    setIdEditandoInsulina(item.id_insulina);
    setNombreIns(item.nombre);
    setTipoIns(item.tipo);
    setUnidadesIns(item.unidades_indicadas.toString());
    setHorarioIns(item.horario);
    setCaducidadIns(item.caducidad || '');
    setErrorInsulina(null);
    if (item.notas && item.notas.includes('Zona RotaSitio base:')) {
      const z = item.notas.replace('Zona RotaSitio base: ', '').trim() as any;
      if (['abdomen', 'brazo', 'muslo'].includes(z)) setZonaIns(z);
    }
    setModalInsulinaVisible(true);
  };

  const guardarInsulina = async () => {
    if (!nombreIns.trim() || !unidadesIns || !horarioIns) {
      setErrorInsulina('Por favor llena los campos obligatorios (Nombre, Unidades y Horario).');
      return;
    }

    const horaFinal = normalizarHora(horarioIns);
    if (!/^[0-9][0-9]:[0-9][0-9]$/.test(horaFinal)) {
      setErrorInsulina('El formato de hora debe ser HH:MM (ej. 08:00).');
      return;
    }

    try {
      const esEdicion = !!idEditandoInsulina;
      if (esEdicion) {
        await db.runAsync(
          `UPDATE insulina SET nombre = ?, tipo = ?, unidades_indicadas = ?, horario = ?, caducidad = ?, notas = ? WHERE id_insulina = ?`,
          [nombreIns.trim(), tipoIns, parseFloat(unidadesIns), horaFinal, caducidadIns.trim() || null, `Zona RotaSitio base: ${zonaIns}`, idEditandoInsulina]
        );
      } else {
        const id = generarId();
        await db.runAsync(
          `INSERT INTO insulina (id_insulina, nombre, tipo, unidades_indicadas, horario, caducidad, notas) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, nombreIns.trim(), tipoIns, parseFloat(unidadesIns), horaFinal, caducidadIns.trim() || null, `Zona RotaSitio base: ${zonaIns}`]
        );
      }
      setModalInsulinaVisible(false);
      cargarTratamientos();
      mostrarMensajeExito(esEdicion ? '¡Cambios guardados con éxito!' : '¡Esquema de insulina registrado con éxito!');
    } catch (error) {
      console.error('Error al guardar insulina:', error);
      setErrorInsulina('Ocurrió un error al guardar en la base de datos.');
    }
  };

  const confirmarEliminarInsulina = (id: string, nombreItem: string) => {
    setItemAEliminar({ id, nombre: nombreItem });
    setModalEliminarInsVisible(true);
  };

  const ejecutarEliminarInsulina = async () => {
    if (!itemAEliminar) return;
    try {
      await db.runAsync(`DELETE FROM insulina WHERE id_insulina = ?`, [itemAEliminar.id]);
      setModalEliminarInsVisible(false);
      setItemAEliminar(null);
      cargarTratamientos();
      mostrarMensajeExito('¡Registro eliminado de manera exitosa!');
    } catch (error) {
      console.error('Error al eliminar insulina:', error);
    }
  };

  // --- ACCIONES MEDICAMENTO ---
  const abrirNuevoMedicamento = () => {
    setIdEditandoMed(null);
    setNombreMed('');
    setDosisMed('');
    setFrecuenciaMed('');
    setHorarioMed('');
    setCaducidadMed('');
    setIndicacionesMed('');
    setErrorMedicamento(null);
    setModalMedVisible(true);
  };

  const abrirEditarMedicamento = (item: Medicamento) => {
    setIdEditandoMed(item.id_medicamento);
    setNombreMed(item.nombre);
    setDosisMed(item.dosis);
    setFrecuenciaMed(item.frecuencia);
    setHorarioMed(item.horario);
    setCaducidadMed(item.caducidad || '');
    setIndicacionesMed(item.indicaciones || '');
    setErrorMedicamento(null);
    setModalMedVisible(true);
  };

  const guardarMedicamento = async () => {
    if (!nombreMed.trim() || !dosisMed.trim() || !frecuenciaMed.trim() || !horarioMed.trim()) {
      setErrorMedicamento('Por favor llena los campos obligatorios del medicamento.');
      return;
    }

    const horaFinal = normalizarHora(horarioMed);
    if (!/^[0-9][0-9]:[0-9][0-9]$/.test(horaFinal)) {
      setErrorMedicamento('El formato de hora debe ser HH:MM (ej. 08:00).');
      return;
    }

    try {
      const esEdicion = !!idEditandoMed;
      if (esEdicion) {
        await db.runAsync(
          `UPDATE medicamento SET nombre = ?, dosis = ?, frecuencia = ?, horario = ?, caducidad = ?, indicaciones = ? WHERE id_medicamento = ?`,
          [nombreMed.trim(), dosisMed.trim(), frecuenciaMed.trim(), horaFinal, caducidadMed.trim() || null, indicacionesMed.trim() || null, idEditandoMed]
        );
      } else {
        const id = generarId();
        await db.runAsync(
          `INSERT INTO medicamento (id_medicamento, nombre, dosis, frecuencia, horario, caducidad, indicaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [id, nombreMed.trim(), dosisMed.trim(), frecuenciaMed.trim(), horaFinal, caducidadMed.trim() || null, indicacionesMed.trim() || null]
        );
      }
      setModalMedVisible(false);
      cargarTratamientos();
      mostrarMensajeExito(esEdicion ? '¡Medicamento actualizado con éxito!' : '¡Medicamento guardado con éxito!');
    } catch (error) {
      console.error('Error al guardar medicamento:', error);
      setErrorMedicamento('Ocurrió un error al guardar en la base de datos.');
    }
  };

  const confirmarEliminarMedicamento = (id: string, nombreItem: string) => {
    setItemAEliminar({ id, nombre: nombreItem });
    setModalEliminarMedVisible(true);
  };

  const ejecutarEliminarMedicamento = async () => {
    if (!itemAEliminar) return;
    try {
      await db.runAsync(`DELETE FROM medicamento WHERE id_medicamento = ?`, [itemAEliminar.id]);
      setModalEliminarMedVisible(false);
      setItemAEliminar(null);
      cargarTratamientos();
      mostrarMensajeExito('¡Medicamento eliminado de manera exitosa!');
    } catch (error) {
      console.error('Error al eliminar medicamento:', error);
    }
  };

  // Filtrado por buscador en tiempo real
  const insulinasFiltradas = insulinas.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const medicamentosFiltrados = medicamentos.filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <View style={styles.container}>
      {/* Banner de Éxito Flotante */}
      {mensajeExito && (
        <Animated.View style={[styles.bannerExito, { opacity: fadeAnim }]}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.textoBannerExito}>{mensajeExito}</Text>
        </Animated.View>
      )}

      <View style={styles.header}>
        <Text style={styles.titulo}>Mi Tratamiento</Text>
        <Text style={styles.subtitulo}>Gestión de insulinas y medicamentos coadyuvantes</Text>

        {/* Buscador General */}
        <View style={styles.buscadorContenedor}>
          <Ionicons name="search" size={18} color="#a0aec0" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.buscadorInput}
            placeholder="Buscar tratamiento por nombre..."
            placeholderTextColor="#a0aec0"
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={18} color="#a0aec0" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SECCIÓN INSULINAS */}
        <View style={styles.seccionHeaderRow}>
          <Text style={styles.seccionTitulo}>Esquemas de Insulina</Text>
          <TouchableOpacity style={styles.botonAgregarMini} onPress={abrirNuevoInsulina} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.textoAgregarMini}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {insulinasFiltradas.length === 0 ? (
          <Text style={styles.vacio}>No se encontraron insulinas.</Text>
        ) : (
          insulinasFiltradas.map((item) => {
            const estadoCad = verificarCaducidad(item.caducidad);
            return (
              <View key={item.id_insulina} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitulo}>{item.nombre} ({item.tipo})</Text>
                  <Text style={styles.cardDetalle}>Dosis: {item.unidades_indicadas} U • Horario: {item.horario}</Text>
                  
                  {item.caducidad && (
                    <View style={styles.caducidadFila}>
                      <Text style={styles.cardCaducidad}>Caducidad: {item.caducidad}</Text>
                      {estadoCad === 'caducado' && (
                        <View style={styles.badgeCaducado}><Text style={styles.textoBadgeCaducado}>¡Caducado!</Text></View>
                      )}
                      {estadoCad === 'proximo' && (
                        <View style={styles.badgeProximo}><Text style={styles.textoBadgeProximo}>⚠️ Próximo a caducar</Text></View>
                      )}
                    </View>
                  )}

                  {item.notas && <Text style={styles.cardIndicacion}>📍 {item.notas}</Text>}
                </View>
                <View style={styles.accionesCard}>
                  <TouchableOpacity onPress={() => abrirEditarInsulina(item)} style={styles.btnAccion}>
                    <Ionicons name="pencil-outline" size={18} color="#308be6" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmarEliminarInsulina(item.id_insulina, item.nombre)} style={styles.btnAccion}>
                    <Ionicons name="trash-outline" size={18} color="#d9534f" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* SECCIÓN MEDICAMENTOS COADYUVANTES */}
        <View style={[styles.seccionHeaderRow, { marginTop: 28 }]}>
          <Text style={styles.seccionTitulo}>Medicamentos Coadyuvantes</Text>
          <TouchableOpacity style={[styles.botonAgregarMini, { backgroundColor: '#2e7d32' }]} onPress={abrirNuevoMedicamento} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.textoAgregarMini}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {medicamentosFiltrados.length === 0 ? (
          <Text style={styles.vacio}>No se encontraron medicamentos.</Text>
        ) : (
          medicamentosFiltrados.map((item) => {
            const estadoCad = verificarCaducidad(item.caducidad);
            return (
              <View key={item.id_medicamento} style={[styles.card, styles.cardMed]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitulo, { color: '#2e7d32' }]}>{item.nombre}</Text>
                  <Text style={styles.cardDetalle}>Dosis: {item.dosis} • Horario: {item.horario}</Text>
                  <Text style={styles.cardDetalle}>Frecuencia: {item.frecuencia}</Text>
                  
                  {item.caducidad && (
                    <View style={styles.caducidadFila}>
                      <Text style={styles.cardCaducidad}>Caducidad: {item.caducidad}</Text>
                      {estadoCad === 'caducado' && (
                        <View style={styles.badgeCaducado}><Text style={styles.textoBadgeCaducado}>¡Caducado!</Text></View>
                      )}
                      {estadoCad === 'proximo' && (
                        <View style={styles.badgeProximo}><Text style={styles.textoBadgeProximo}>⚠️ Próximo a caducar</Text></View>
                      )}
                    </View>
                  )}

                  {item.indicaciones && <Text style={styles.cardIndicacion}>Indicaciones: {item.indicaciones}</Text>}
                </View>
                <View style={styles.accionesCard}>
                  <TouchableOpacity onPress={() => abrirEditarMedicamento(item)} style={styles.btnAccion}>
                    <Ionicons name="pencil-outline" size={18} color="#2e7d32" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmarEliminarMedicamento(item.id_medicamento, item.nombre)} style={styles.btnAccion}>
                    <Ionicons name="trash-outline" size={18} color="#d9534f" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODAL INSULINA */}
      <Modal visible={modalInsulinaVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderDecor}>
              <Ionicons name="water" size={24} color="#308be6" />
              <Text style={styles.modalTitulo}>{idEditandoInsulina ? 'Editar Insulina' : 'Nueva Insulina'}</Text>
            </View>

            {errorInsulina && (
              <View style={styles.alertaErrorContenedor}>
                <Ionicons name="alert-circle" size={18} color="#e53e3e" style={{ marginRight: 6 }} />
                <Text style={styles.textoErrorAlerta}>{errorInsulina}</Text>
              </View>
            )}
            
            <ScrollView style={{ maxHeight: 310 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.labelInput}>Nombre de la Insulina *</Text>
              <TextInput style={styles.input} placeholder="ej. Lispro" placeholderTextColor="#aaa" value={nombreIns} onChangeText={setNombreIns} />
              
              <Text style={styles.labelInput}>Unidades (U) *</Text>
              <TextInput style={styles.input} placeholder="ej. 6" placeholderTextColor="#aaa" keyboardType="numeric" value={unidadesIns} onChangeText={setUnidadesIns} />
              
              <Text style={styles.labelInput}>Horario (HH:MM) *</Text>
              <TextInput style={styles.input} placeholder="ej. 20:00" placeholderTextColor="#aaa" value={horarioIns} onChangeText={setHorarioIns} />
              
              <Text style={styles.labelInput}>Caducidad (Opcional)</Text>
              <TextInput style={styles.input} placeholder="AAAA-MM-DD" placeholderTextColor="#aaa" value={caducidadIns} onChangeText={setCaducidadIns} />
              
              <Text style={styles.labelZona}>Zona base de RotaSitio:</Text>
              <View style={styles.selectorZona}>
                {(['abdomen', 'brazo', 'muslo'] as const).map((z) => (
                  <TouchableOpacity key={z} style={[styles.botonZona, zonaIns === z && styles.botonZonaActivo]} onPress={() => setZonaIns(z)} activeOpacity={0.8}>
                    <Text style={[styles.textoZona, zonaIns === z && styles.textoZonaActivo]}>{z.charAt(0).toUpperCase() + z.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.botonModal, styles.botonCancelar]} onPress={() => setModalInsulinaVisible(false)} activeOpacity={0.8}>
                <Text style={styles.botonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonModal, styles.botonGuardar]} onPress={guardarInsulina} activeOpacity={0.8}>
                <Text style={styles.botonTextoGuardar}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL MEDICAMENTO COADYUVANTE */}
      <Modal visible={modalMedVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderDecor}>
              <Ionicons name="medical" size={24} color="#2e7d32" />
              <Text style={[styles.modalTitulo, { color: '#2e7d32' }]}>{idEditandoMed ? 'Editar Medicamento' : 'Nuevo Medicamento'}</Text>
            </View>

            {errorMedicamento && (
              <View style={styles.alertaErrorContenedor}>
                <Ionicons name="alert-circle" size={18} color="#e53e3e" style={{ marginRight: 6 }} />
                <Text style={styles.textoErrorAlerta}>{errorMedicamento}</Text>
              </View>
            )}
            
            <ScrollView style={{ maxHeight: 310 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.labelInput}>Nombre del Medicamento *</Text>
              <TextInput style={styles.input} placeholder="ej. Metformina" placeholderTextColor="#aaa" value={nombreMed} onChangeText={setNombreMed} />
              
              <Text style={styles.labelInput}>Dosis *</Text>
              <TextInput style={styles.input} placeholder="ej. 500 mg" placeholderTextColor="#aaa" value={dosisMed} onChangeText={setDosisMed} />
              
              <Text style={styles.labelInput}>Frecuencia *</Text>
              <TextInput style={styles.input} placeholder="ej. Diaria" placeholderTextColor="#aaa" value={frecuenciaMed} onChangeText={setFrecuenciaMed} />
              
              <Text style={styles.labelInput}>Horario (HH:MM) *</Text>
              <TextInput style={styles.input} placeholder="ej. 08:00" placeholderTextColor="#aaa" value={horarioMed} onChangeText={setHorarioMed} />
              
              <Text style={styles.labelInput}>Caducidad (Opcional)</Text>
              <TextInput style={styles.input} placeholder="AAAA-MM-DD" placeholderTextColor="#aaa" value={caducidadMed} onChangeText={setCaducidadMed} />
              
              <Text style={styles.labelInput}>Indicaciones Médicas</Text>
              <TextInput style={styles.input} placeholder="ej. Tomar en ayunas" placeholderTextColor="#aaa" value={indicacionesMed} onChangeText={setIndicacionesMed} />
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.botonModal, styles.botonCancelar]} onPress={() => setModalMedVisible(false)} activeOpacity={0.8}>
                <Text style={styles.botonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonModal, { backgroundColor: '#2e7d32' }, styles.botonGuardar]} onPress={guardarMedicamento} activeOpacity={0.8}>
                <Text style={styles.botonTextoGuardar}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODALES DE ELIMINACIÓN */}
      <Modal visible={modalEliminarInsVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 340, alignItems: 'center' }]}>
            <View style={styles.iconoAlertaContenedor}><Ionicons name="trash-bin-outline" size={32} color="#e53e3e" /></View>
            <Text style={styles.tituloAlerta}>¿Eliminar Esquema?</Text>
            <Text style={styles.textoAlerta}>¿Estás seguro de eliminar <Text style={{ fontWeight: 'bold' }}>"{itemAEliminar?.nombre}"</Text>?</Text>
            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.botonModal, styles.botonCancelar]} onPress={() => setModalEliminarInsVisible(false)} activeOpacity={0.8}>
                <Text style={styles.botonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonModal, styles.botonEliminarRojo]} onPress={ejecutarEliminarInsulina} activeOpacity={0.8}>
                <Text style={styles.botonTextoGuardar}>Sí, eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalEliminarMedVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 340, alignItems: 'center' }]}>
            <View style={styles.iconoAlertaContenedor}><Ionicons name="trash-bin-outline" size={32} color="#e53e3e" /></View>
            <Text style={styles.tituloAlerta}>¿Eliminar Medicamento?</Text>
            <Text style={styles.textoAlerta}>¿Estás seguro de eliminar <Text style={{ fontWeight: 'bold' }}>"{itemAEliminar?.nombre}"</Text>?</Text>
            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.botonModal, styles.botonCancelar]} onPress={() => setModalEliminarMedVisible(false)} activeOpacity={0.8}>
                <Text style={styles.botonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonModal, styles.botonEliminarRojo]} onPress={ejecutarEliminarMedicamento} activeOpacity={0.8}>
                <Text style={styles.botonTextoGuardar}>Sí, eliminar</Text>
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
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#1a365d' },
  subtitulo: { fontSize: 13, color: '#718096', marginTop: 2, marginBottom: 12 },

  buscadorContenedor: {
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buscadorInput: { flex: 1, fontSize: 14, color: '#2d3748', padding: 0 },

  scrollContent: { padding: 20, paddingBottom: 40 },
  
  bannerExito: {
    position: 'absolute',
    top: 45,
    alignSelf: 'center',
    backgroundColor: '#2f855a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 1000,
    elevation: 8,
  },
  textoBannerExito: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  seccionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seccionTitulo: { fontSize: 18, fontWeight: 'bold', color: '#2d3748' },
  botonAgregarMini: { flexDirection: 'row', backgroundColor: '#3182ce', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, alignItems: 'center' },
  textoAgregarMini: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  vacio: { fontSize: 13, color: '#a0aec0', fontStyle: 'italic', marginBottom: 10, textAlign: 'center', marginTop: 8 },
  
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    alignItems: 'center',
  },
  cardMed: { borderColor: '#c6f6d5', backgroundColor: '#f7fafc' },
  cardTitulo: { fontSize: 16, fontWeight: 'bold', color: '#2b6cb0' },
  cardDetalle: { fontSize: 13, color: '#4a5568', marginTop: 4 },
  
  caducidadFila: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  cardCaducidad: { fontSize: 12, color: '#718096' },
  badgeCaducado: { backgroundColor: '#fed7d7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  textoBadgeCaducado: { color: '#9b2c2c', fontSize: 10, fontWeight: 'bold' },
  badgeProximo: { backgroundColor: '#feebc8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  textoBadgeProximo: { color: '#c05621', fontSize: 10, fontWeight: 'bold' },

  cardIndicacion: { fontSize: 12, color: '#276749', marginTop: 3, fontWeight: '600' },
  accionesCard: { flexDirection: 'row', marginLeft: 10 },
  btnAccion: { padding: 8, marginLeft: 4, backgroundColor: '#edf2f7', borderRadius: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 24, padding: 22, elevation: 10 },
  modalHeaderDecor: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#edf2f7', paddingBottom: 10 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#3182ce', marginLeft: 10 },
  
  alertaErrorContenedor: { flexDirection: 'row', backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#feb2b2', borderRadius: 10, padding: 10, marginBottom: 12, alignItems: 'center' },
  textoErrorAlerta: { color: '#c53030', fontSize: 12, fontWeight: '600', flex: 1 },

  labelInput: { fontSize: 12, fontWeight: '700', color: '#4a5568', marginBottom: 4, marginLeft: 2 },
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
  labelZona: { fontSize: 13, fontWeight: '700', color: '#4a5568', marginBottom: 8, marginTop: 4 },
  selectorZona: { flexDirection: 'row', marginBottom: 14 },
  botonZona: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, alignItems: 'center', marginHorizontal: 3, backgroundColor: '#f7fafc' },
  botonZonaActivo: { backgroundColor: '#3182ce', borderColor: '#3182ce' },
  textoZona: { fontSize: 12, color: '#4a5568', fontWeight: '600' },
  textoZonaActivo: { color: '#fff' },

  iconoAlertaContenedor: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  tituloAlerta: { fontSize: 18, fontWeight: 'bold', color: '#2d3748', marginBottom: 8, textAlign: 'center' },
  textoAlerta: { fontSize: 13, color: '#718096', textAlign: 'center', marginBottom: 20, lineHeight: 18 },

  modalBotones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, width: '100%' },
  botonModal: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  botonCancelar: { backgroundColor: '#edf2f7', marginRight: 6 },
  botonGuardar: { backgroundColor: '#3182ce', marginLeft: 6 },
  botonEliminarRojo: { backgroundColor: '#e53e3e', marginLeft: 6 },
  botonTextoCancelar: { color: '#4a5568', fontWeight: 'bold', fontSize: 13 },
  botonTextoGuardar: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});