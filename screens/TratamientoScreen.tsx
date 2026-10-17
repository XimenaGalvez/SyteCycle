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
import { emitirTratamientoActualizado } from '../utils/events';
import { 
  programarNotificacionInsulina, 
  cancelarNotificacionInsulina,
  programarNotificacionesPorFrecuencia,
  cancelarNotificacionMedicamento,
} from '../utils/notifications';
import TimePicker from '../utils/TimePicker';

type Insulina = {
  id_insulina: string;
  nombre: string;
  tipo: string;
  caducidad: string | null;
  notas: string | null;
};

type Dosis = {
  id_dosis?: string;
  etiqueta: string;
  horario: string;
  unidades: string;
};

type DosisDB = {
  id_dosis: string;
  insulina_id: string;
  etiqueta: string | null;
  horario: string;
  unidades: number;
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
  duracion_dias?: number;
  created_at?: string;
};

const OPCIONES_FRECUENCIA = [
  'Una vez al día',
  'Cada 12 horas',
  'Cada 8 horas',
  'Cada 6 horas',
] as const;

export default function TratamientoScreen() {
  const [insulinas, setInsulinas] = useState<Insulina[]>([]);
  const [dosisPorInsulina, setDosisPorInsulina] = useState<{ [key: string]: DosisDB[] }>({});
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [busqueda, setBusqueda] = useState('');
  
  const [modalInsulinaVisible, setModalInsulinaVisible] = useState(false);
  const [modalMedVisible, setModalMedVisible] = useState(false);

  const [modalEliminarInsVisible, setModalEliminarInsVisible] = useState(false);
  const [modalEliminarMedVisible, setModalEliminarMedVisible] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState<{ id: string; nombre: string } | null>(null);

  const [idEditandoInsulina, setIdEditandoInsulina] = useState<string | null>(null);
  const [idEditandoMed, setIdEditandoMed] = useState<string | null>(null);

  // Estados Formulario Insulina
  const [nombreIns, setNombreIns] = useState('');
  const [tipoIns, setTipoIns] = useState('Rápida');
  const [caducidadIns, setCaducidadIns] = useState('');
  const [dosis, setDosis] = useState<Dosis[]>([
    { etiqueta: 'Dosis 1', horario: '', unidades: '' }
  ]);
  const [errorInsulina, setErrorInsulina] = useState<string | null>(null);

  // Estados RotaSitio inicial
  const [yaAplicadoAntes, setYaAplicadoAntes] = useState<boolean | null>(null);
  const [zonaInicial, setZonaInicial] = useState<'abdomen' | 'brazo' | 'muslo'>('abdomen');
  const [puntoInicial, setPuntoInicial] = useState<number>(1);

  // Estados Formulario Medicamento
  const [nombreMed, setNombreMed] = useState('');
  const [dosisMed, setDosisMed] = useState('');
  const [frecuenciaMed, setFrecuenciaMed] = useState('Una vez al día');
  const [horarioMed, setHorarioMed] = useState('');
  const [caducidadMed, setCaducidadMed] = useState('');
  const [indicacionesMed, setIndicacionesMed] = useState('');
  const [duracionMed, setDuracionMed] = useState('');
  const [errorMedicamento, setErrorMedicamento] = useState<string | null>(null);

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
      const resInsulinas = await db.getAllAsync<Insulina>('SELECT * FROM insulina ORDER BY created_at DESC');
      const resMeds = await db.getAllAsync<Medicamento>('SELECT * FROM medicamento');
      
      // Cargar dosis de cada insulina
      const dosisMap: { [key: string]: DosisDB[] } = {};
      for (const ins of resInsulinas) {
        const dosis = await db.getAllAsync<DosisDB>(
          'SELECT * FROM dosis_insulina WHERE insulina_id = ? ORDER BY horario ASC',
          [ins.id_insulina]
        );
        dosisMap[ins.id_insulina] = dosis;
      }
      
      setInsulinas(resInsulinas);
      setDosisPorInsulina(dosisMap);
      setMedicamentos(resMeds);
    } catch (error) {
      console.error('Error al cargar tratamientos:', error);
    }
  };

  useEffect(() => {
    cargarTratamientos();
  }, []);

  const verificarCaducidad = (fechaStr: string | null) => {
    if (!fechaStr) return 'ok';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaCaducidad = new Date(fechaStr + 'T00:00:00');
    const diferenciaDias = Math.ceil((fechaCaducidad.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
    if (diferenciaDias < 0) return 'caducado';
    if (diferenciaDias <= 30) return 'proximo';
    return 'ok';
  };

  const parsearNotas = (notas: string | null) => {
    if (!notas) return { zona: null, punto: 0 };
    const matchZona = notas.match(/Zona:\s*(\w+)/);
    const matchPunto = notas.match(/Punto:\s*(\d+)/);
    return {
      zona: matchZona ? matchZona[1] : null,
      punto: matchPunto ? parseInt(matchPunto[1]) : 0,
    };
  };

  // --- INSULINA ---
  const abrirNuevoInsulina = () => {
    setIdEditandoInsulina(null);
    setNombreIns('');
    setTipoIns('Rápida');
    setCaducidadIns('');
    setDosis([{ etiqueta: 'Dosis 1', horario: '', unidades: '' }]);
    setYaAplicadoAntes(null);
    setZonaInicial('abdomen');
    setPuntoInicial(1);
    setErrorInsulina(null);
    setModalInsulinaVisible(true);
  };

  const abrirEditarInsulina = async (item: Insulina) => {
    setIdEditandoInsulina(item.id_insulina);
    setNombreIns(item.nombre);
    setTipoIns(item.tipo);
    setCaducidadIns(item.caducidad || '');
    setErrorInsulina(null);
    
    // Cargar dosis existentes
    const dosisExistentes = await db.getAllAsync<DosisDB>(
      'SELECT * FROM dosis_insulina WHERE insulina_id = ? ORDER BY horario ASC',
      [item.id_insulina]
    );
    
    if (dosisExistentes.length > 0) {
      setDosis(dosisExistentes.map((d, i) => ({
        id_dosis: d.id_dosis,
        etiqueta: d.etiqueta || `Dosis ${i + 1}`,
        horario: d.horario,
        unidades: d.unidades.toString(),
      })));
    } else {
      setDosis([{ etiqueta: 'Dosis 1', horario: '', unidades: '' }]);
    }
    
    setModalInsulinaVisible(true);
  };

  // --- Manejo de dosis ---
  const agregarDosis = () => {
    const nuevaNum = dosis.length + 1;
    setDosis([...dosis, { etiqueta: `Dosis ${nuevaNum}`, horario: '', unidades: '' }]);
  };

  const eliminarDosis = (index: number) => {
    if (dosis.length === 1) {
      setErrorInsulina('Debe haber al menos una dosis.');
      return;
    }
    const nuevas = dosis.filter((_, i) => i !== index);
    setDosis(nuevas);
  };

  const actualizarDosis = (index: number, campo: keyof Dosis, valor: string) => {
    const nuevas = [...dosis];
    nuevas[index] = { ...nuevas[index], [campo]: valor };
    setDosis(nuevas);
  };

  const guardarInsulina = async () => {
    if (!nombreIns.trim()) {
      setErrorInsulina('Por favor ingresa el nombre de la insulina.');
      return;
    }

    // Validar dosis
    for (let i = 0; i < dosis.length; i++) {
      if (!dosis[i].horario || !dosis[i].unidades) {
        setErrorInsulina(`La dosis ${i + 1} debe tener horario y unidades.`);
        return;
      }
      const uni = parseFloat(dosis[i].unidades);
      if (isNaN(uni) || uni <= 0) {
        setErrorInsulina(`Las unidades de la dosis ${i + 1} deben ser mayores a 0.`);
        return;
      }
    }

    const esEdicion = !!idEditandoInsulina;
    if (!esEdicion && yaAplicadoAntes === null) {
      setErrorInsulina('Por favor indica si ya te has aplicado insulina antes de usar SyteCycle.');
      return;
    }

    let notasFinales: string;
    if (esEdicion) {
      const insulinaOriginal = insulinas.find(i => i.id_insulina === idEditandoInsulina);
      notasFinales = insulinaOriginal?.notas || 'Zona: abdomen | Punto: 0';
    } else {
      if (yaAplicadoAntes) {
        notasFinales = `Zona: ${zonaInicial} | Punto: ${puntoInicial}`;
      } else {
        notasFinales = `Zona: abdomen | Punto: 0`;
      }
    }

    try {
      let idInsulina = idEditandoInsulina;

      if (esEdicion) {
        await db.runAsync(
          `UPDATE insulina SET nombre = ?, tipo = ?, caducidad = ? WHERE id_insulina = ?`,
          [nombreIns.trim(), tipoIns, caducidadIns.trim() || null, idEditandoInsulina]
        );
      } else {
        const id = generarId();
        idInsulina = id;
        await db.runAsync(
          `INSERT INTO insulina (id_insulina, nombre, tipo, caducidad, notas) VALUES (?, ?, ?, ?, ?)`,
          [id, nombreIns.trim(), tipoIns, caducidadIns.trim() || null, notasFinales]
        );
      }

      // Borrar dosis anteriores y guardar las nuevas
      if (idInsulina) {
        await db.runAsync(`DELETE FROM dosis_insulina WHERE insulina_id = ?`, [idInsulina]);
        
        // Cancelar notificaciones previas
        await cancelarNotificacionInsulina(idInsulina);
        
        // Guardar cada dosis + programar notificación
        for (const d of dosis) {
          const idDosis = generarId();
          await db.runAsync(
            `INSERT INTO dosis_insulina (id_dosis, insulina_id, etiqueta, horario, unidades) VALUES (?, ?, ?, ?, ?)`,
            [idDosis, idInsulina, d.etiqueta, d.horario, parseFloat(d.unidades)]
          );
          
          // Programar notificación por cada dosis
          await programarNotificacionInsulina(
            `${idInsulina}_${idDosis}`,
            nombreIns.trim(),
            tipoIns,
            parseFloat(d.unidades),
            d.horario
          );
        }
      }

      setModalInsulinaVisible(false);
      cargarTratamientos();
      emitirTratamientoActualizado();
      mostrarMensajeExito(esEdicion ? '¡Cambios guardados!' : '¡Insulina registrada!');
    } catch (error) {
      console.error('Error al guardar insulina:', error);
      setErrorInsulina('Ocurrió un error al guardar.');
    }
  };

  const confirmarEliminarInsulina = (id: string, nombreItem: string) => {
    setItemAEliminar({ id, nombre: nombreItem });
    setModalEliminarInsVisible(true);
  };

  const ejecutarEliminarInsulina = async () => {
    if (!itemAEliminar) return;
    try {
      await cancelarNotificacionInsulina(itemAEliminar.id);
      await db.runAsync(`DELETE FROM dosis_insulina WHERE insulina_id = ?`, [itemAEliminar.id]);
      await db.runAsync(`DELETE FROM insulina WHERE id_insulina = ?`, [itemAEliminar.id]);
      setModalEliminarInsVisible(false);
      setItemAEliminar(null);
      cargarTratamientos();
      emitirTratamientoActualizado();
      mostrarMensajeExito('¡Insulina eliminada!');
    } catch (error) {
      console.error('Error al eliminar insulina:', error);
    }
  };

  // --- MEDICAMENTO ---
  const abrirNuevoMedicamento = () => {
    setIdEditandoMed(null);
    setNombreMed('');
    setDosisMed('');
    setFrecuenciaMed('Una vez al día');
    setHorarioMed('');
    setCaducidadMed('');
    setIndicacionesMed('');
    setDuracionMed('');
    setErrorMedicamento(null);
    setModalMedVisible(true);
  };

  const abrirEditarMedicamento = (item: Medicamento) => {
    setIdEditandoMed(item.id_medicamento);
    setNombreMed(item.nombre);
    setDosisMed(item.dosis);
    setFrecuenciaMed(item.frecuencia || 'Una vez al día');
    setHorarioMed(item.horario);
    setCaducidadMed(item.caducidad || '');
    setIndicacionesMed(item.indicaciones || '');
    setDuracionMed(item.duracion_dias?.toString() || '');
    setErrorMedicamento(null);
    setModalMedVisible(true);
  };

  const guardarMedicamento = async () => {
    if (!nombreMed.trim() || !dosisMed.trim() || !frecuenciaMed.trim() || !horarioMed.trim()) {
      setErrorMedicamento('Por favor llena los campos obligatorios.');
      return;
    }

    try {
      const esEdicion = !!idEditandoMed;
      const duracionNum = duracionMed.trim() ? parseInt(duracionMed) : 0;

      if (esEdicion) {
        await db.runAsync(
          `UPDATE medicamento SET nombre = ?, dosis = ?, frecuencia = ?, horario = ?, caducidad = ?, indicaciones = ?, duracion_dias = ? WHERE id_medicamento = ?`,
          [nombreMed.trim(), dosisMed.trim(), frecuenciaMed.trim(), horarioMed, caducidadMed.trim() || null, indicacionesMed.trim() || null, duracionNum, idEditandoMed]
        );
      } else {
        const id = generarId();
        await db.runAsync(
          `INSERT INTO medicamento (id_medicamento, nombre, dosis, frecuencia, horario, caducidad, indicaciones, activo, duracion_dias) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [id, nombreMed.trim(), dosisMed.trim(), frecuenciaMed.trim(), horarioMed, caducidadMed.trim() || null, indicacionesMed.trim() || null, duracionNum]
        );
      }

      const idParaNotif = esEdicion ? idEditandoMed : (await db.getFirstAsync<{ id_medicamento: string }>(
        `SELECT id_medicamento FROM medicamento WHERE nombre = ? AND horario = ? ORDER BY rowid DESC LIMIT 1`,
        [nombreMed.trim(), horarioMed]
      ))?.id_medicamento;

      if (idParaNotif) {
        await programarNotificacionesPorFrecuencia(
          idParaNotif, nombreMed.trim(), dosisMed.trim(), frecuenciaMed, horarioMed
        );
      }

      setModalMedVisible(false);
      cargarTratamientos();
      emitirTratamientoActualizado();
      mostrarMensajeExito(esEdicion ? '¡Medicamento actualizado!' : '¡Medicamento guardado!');
    } catch (error) {
      console.error('Error al guardar medicamento:', error);
      setErrorMedicamento('Ocurrió un error al guardar.');
    }
  };

  const confirmarEliminarMedicamento = (id: string, nombreItem: string) => {
    setItemAEliminar({ id, nombre: nombreItem });
    setModalEliminarMedVisible(true);
  };

  const ejecutarEliminarMedicamento = async () => {
    if (!itemAEliminar) return;
    try {
      await cancelarNotificacionMedicamento(itemAEliminar.id);
      await db.runAsync(`DELETE FROM medicamento WHERE id_medicamento = ?`, [itemAEliminar.id]);
      setModalEliminarMedVisible(false);
      setItemAEliminar(null);
      cargarTratamientos();
      emitirTratamientoActualizado();
      mostrarMensajeExito('¡Medicamento eliminado!');
    } catch (error) {
      console.error('Error al eliminar medicamento:', error);
    }
  };

  const insulinasFiltradas = insulinas.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const medicamentosFiltrados = medicamentos.filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <View style={styles.container}>
      {mensajeExito && (
        <Animated.View style={[styles.bannerExito, { opacity: fadeAnim }]}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.textoBannerExito}>{mensajeExito}</Text>
        </Animated.View>
      )}

      <View style={styles.header}>
        <Text style={styles.titulo}>Mi Tratamiento</Text>
        <Text style={styles.subtitulo}>Insulinas y medicamentos coadyuvantes</Text>

        <View style={styles.buscadorContenedor}>
          <Ionicons name="search" size={18} color="#a0aec0" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.buscadorInput}
            placeholder="Buscar por nombre..."
            placeholderTextColor="#a0aec0"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.seccionHeaderRow}>
          <Text style={styles.seccionTitulo}>Esquemas de Insulina</Text>
          <TouchableOpacity style={styles.botonAgregarMini} onPress={abrirNuevoInsulina}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.textoAgregarMini}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {insulinasFiltradas.length === 0 ? (
          <Text style={styles.vacio}>No hay insulinas.</Text>
        ) : (
          insulinasFiltradas.map((item) => {
            const estadoCad = verificarCaducidad(item.caducidad);
            const dosisItem = dosisPorInsulina[item.id_insulina] || [];
            const { zona, punto } = parsearNotas(item.notas);
            return (
              <View key={item.id_insulina} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitulo}>{item.nombre} ({item.tipo})</Text>
                  
                  {dosisItem.map((d, idx) => (
                    <Text key={d.id_dosis} style={styles.cardDetalle}>
                      • {d.etiqueta || `Dosis ${idx + 1}`}: {d.horario} — {d.unidades} U
                    </Text>
                  ))}
                  
                  {item.caducidad && (
                    <View style={styles.caducidadFila}>
                      <Text style={styles.cardCaducidad}>Cad: {item.caducidad}</Text>
                      {estadoCad === 'caducado' && (
                        <View style={styles.badgeCaducado}><Text style={styles.textoBadgeCaducado}>¡Caducado!</Text></View>
                      )}
                      {estadoCad === 'proximo' && (
                        <View style={styles.badgeProximo}><Text style={styles.textoBadgeProximo}>⚠️ Próximo</Text></View>
                      )}
                    </View>
                  )}

                  {zona && punto > 0 && (
                    <View style={styles.rotasitioFila}>
                      <Ionicons name="location-outline" size={14} color="#308be6" />
                      <Text style={styles.cardRotasitio}>
                        Último: {zona.charAt(0).toUpperCase() + zona.slice(1)} - Punto {punto}
                      </Text>
                    </View>
                  )}
                  {zona && punto === 0 && (
                    <View style={styles.rotasitioFila}>
                      <Ionicons name="location-outline" size={14} color="#a0aec0" />
                      <Text style={[styles.cardRotasitio, { color: '#a0aec0' }]}>Sin aplicar aún</Text>
                    </View>
                  )}
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

        <View style={[styles.seccionHeaderRow, { marginTop: 28 }]}>
          <Text style={styles.seccionTitulo}>Medicamentos Coadyuvantes</Text>
          <TouchableOpacity style={[styles.botonAgregarMini, { backgroundColor: '#2e7d32' }]} onPress={abrirNuevoMedicamento}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.textoAgregarMini}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {medicamentosFiltrados.length === 0 ? (
          <Text style={styles.vacio}>No hay medicamentos.</Text>
        ) : (
          medicamentosFiltrados.map((item) => {
            const estadoCad = verificarCaducidad(item.caducidad);
            return (
              <View key={item.id_medicamento} style={[styles.card, styles.cardMed]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitulo, { color: '#2e7d32' }]}>{item.nombre}</Text>
                  <Text style={styles.cardDetalle}>Dosis: {item.dosis} • Horario: {item.horario}</Text>
                  <Text style={styles.cardDetalle}>
                    Frecuencia: {item.frecuencia}
                    {item.duracion_dias && item.duracion_dias > 0 ? ` • ${item.duracion_dias} días` : ''}
                  </Text>
                  {item.caducidad && (
                    <View style={styles.caducidadFila}>
                      <Text style={styles.cardCaducidad}>Cad: {item.caducidad}</Text>
                      {estadoCad === 'caducado' && (
                        <View style={styles.badgeCaducado}><Text style={styles.textoBadgeCaducado}>¡Caducado!</Text></View>
                      )}
                    </View>
                  )}
                  {item.indicaciones && <Text style={styles.cardIndicacion}>Ind: {item.indicaciones}</Text>}
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
            
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.labelInput}>Nombre de la Insulina </Text>
              <TextInput style={styles.input} placeholder="ej. Lispro" placeholderTextColor="#aaa" value={nombreIns} onChangeText={setNombreIns} />
              
              <Text style={styles.labelZona}>Tipo de Insulina </Text>
              <View style={styles.selectorZona}>
                {(['Rápida', 'Lenta', 'Intermedia'] as const).map((tipo) => (
                  <TouchableOpacity 
                    key={tipo} 
                    style={[styles.botonZona, tipoIns === tipo && styles.botonZonaActivo]} 
                    onPress={() => setTipoIns(tipo)}
                  >
                    <Text style={[styles.textoZona, tipoIns === tipo && styles.textoZonaActivo]}>{tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* SECCIÓN DE DOSIS */}
              <View style={styles.dosisHeader}>
                <Text style={styles.labelZona}>Dosis del día </Text>
                <TouchableOpacity style={styles.botonAgregarDosis} onPress={agregarDosis}>
                  <Ionicons name="add-circle" size={20} color="#308be6" />
                  <Text style={styles.textoAgregarDosis}>Agregar dosis</Text>
                </TouchableOpacity>
              </View>

              {dosis.map((d, index) => (
                <View key={index} style={styles.dosisCard}>
                  <View style={styles.dosisHeaderRow}>
                    <TextInput
                      style={styles.inputEtiqueta}
                      placeholder={`Dosis ${index + 1}`}
                      placeholderTextColor="#aaa"
                      value={d.etiqueta}
                      onChangeText={(v) => actualizarDosis(index, 'etiqueta', v)}
                    />
                    {dosis.length > 1 && (
                      <TouchableOpacity onPress={() => eliminarDosis(index)} style={styles.botonEliminarDosis}>
                        <Ionicons name="close-circle" size={22} color="#d9534f" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TimePicker
                    label="Horario"
                    value={d.horario}
                    onChange={(v) => actualizarDosis(index, 'horario', v)}
                  />

                  <Text style={styles.labelInput}>Unidades (U)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ej. 6"
                    placeholderTextColor="#aaa"
                    keyboardType="numeric"
                    value={d.unidades}
                    onChangeText={(v) => actualizarDosis(index, 'unidades', v)}
                  />
                </View>
              ))}

              <Text style={styles.labelInput}>Caducidad (Opcional)</Text>
              <TextInput style={styles.input} placeholder="AAAA-MM-DD" placeholderTextColor="#aaa" value={caducidadIns} onChangeText={setCaducidadIns} />

              {/* ROTASITIO INICIAL */}
              {!idEditandoInsulina && (
                <View style={styles.rotasitioInicialContenedor}>
                  <View style={styles.rotasitioInicialHeader}>
                    <Ionicons name="location" size={18} color="#308be6" />
                    <Text style={styles.rotasitioInicialTitulo}>Configuración de RotaSitio</Text>
                  </View>
                  
                  <Text style={styles.rotasitioPregunta}>
                    ¿Ya te has aplicado insulina antes?
                  </Text>
                  
                  <View style={styles.selectorZona}>
                    <TouchableOpacity 
                      style={[styles.botonRespuesta, yaAplicadoAntes === false && styles.botonRespuestaActivo]}
                      onPress={() => setYaAplicadoAntes(false)}
                    >
                      <Text style={[styles.textoRespuesta, yaAplicadoAntes === false && styles.textoRespuestaActivo]}>
                        No, empezar de cero
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.botonRespuesta, yaAplicadoAntes === true && styles.botonRespuestaActivo]}
                      onPress={() => setYaAplicadoAntes(true)}
                    >
                      <Text style={[styles.textoRespuesta, yaAplicadoAntes === true && styles.textoRespuestaActivo]}>
                        Sí, ya me he aplicado
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {yaAplicadoAntes === true && (
                    <View style={styles.rotasitioDetalle}>
                      <Text style={styles.rotasitioPregunta}>¿En qué zona y punto?</Text>
                      
                      <View style={styles.selectorZona}>
                        {(['abdomen', 'brazo', 'muslo'] as const).map((z) => (
                          <TouchableOpacity 
                            key={z} 
                            style={[styles.botonZona, zonaInicial === z && styles.botonZonaActivo]} 
                            onPress={() => setZonaInicial(z)}
                          >
                            <Text style={[styles.textoZona, zonaInicial === z && styles.textoZonaActivo]}>
                              {z.charAt(0).toUpperCase() + z.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={styles.selectorPuntos}>
                        {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                          <TouchableOpacity 
                            key={p} 
                            style={[styles.botonPunto, puntoInicial === p && styles.botonPuntoActivo]} 
                            onPress={() => setPuntoInicial(p)}
                          >
                            <Text style={[styles.textoPunto, puntoInicial === p && styles.textoPuntoActivo]}>{p}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.botonModal, styles.botonCancelar]} onPress={() => setModalInsulinaVisible(false)}>
                <Text style={styles.botonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonModal, styles.botonGuardar]} onPress={guardarInsulina}>
                <Text style={styles.botonTextoGuardar}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL MEDICAMENTO */}
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
            
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.labelInput}>Nombre</Text>
              <TextInput style={styles.input} placeholder="ej. Metformina" placeholderTextColor="#aaa" value={nombreMed} onChangeText={setNombreMed} />
              
              <Text style={styles.labelInput}>Dosis</Text>
              <TextInput style={styles.input} placeholder="ej. 500 mg" placeholderTextColor="#aaa" value={dosisMed} onChangeText={setDosisMed} />
              
              <Text style={styles.labelZona}>Frecuencia</Text>
              <View style={styles.selectorFrecuencia}>
                {OPCIONES_FRECUENCIA.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.botonFrecuencia, frecuenciaMed === f && styles.botonFrecuenciaActivo]}
                    onPress={() => setFrecuenciaMed(f)}
                  >
                    <Text style={[styles.textoFrecuencia, frecuenciaMed === f && styles.textoFrecuenciaActivo]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TimePicker label="Horario de la primera toma " value={horarioMed} onChange={setHorarioMed} />

              <Text style={styles.labelInput}>Duración en días (Opcional)</Text>
              <TextInput style={styles.input} placeholder="ej. 7" placeholderTextColor="#aaa" keyboardType="numeric" value={duracionMed} onChangeText={setDuracionMed} />
              
              <Text style={styles.labelInput}>Caducidad (Opcional)</Text>
              <TextInput style={styles.input} placeholder="AAAA-MM-DD" placeholderTextColor="#aaa" value={caducidadMed} onChangeText={setCaducidadMed} />
              
              <Text style={styles.labelInput}>Indicaciones</Text>
              <TextInput style={styles.input} placeholder="ej. Tomar en ayunas" placeholderTextColor="#aaa" value={indicacionesMed} onChangeText={setIndicacionesMed} />
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.botonModal, styles.botonCancelar]} onPress={() => setModalMedVisible(false)}>
                <Text style={styles.botonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonModal, { backgroundColor: '#2e7d32' }, styles.botonGuardar]} onPress={guardarMedicamento}>
                <Text style={styles.botonTextoGuardar}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODALES ELIMINAR */}
      <Modal visible={modalEliminarInsVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 340, alignItems: 'center' }]}>
            <View style={styles.iconoAlertaContenedor}><Ionicons name="trash-bin-outline" size={32} color="#e53e3e" /></View>
            <Text style={styles.tituloAlerta}>¿Eliminar Insulina?</Text>
            <Text style={styles.textoAlerta}>¿Eliminar "{itemAEliminar?.nombre}" y todas sus dosis?</Text>
            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.botonModal, styles.botonCancelar]} onPress={() => setModalEliminarInsVisible(false)}>
                <Text style={styles.botonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonModal, styles.botonEliminarRojo]} onPress={ejecutarEliminarInsulina}>
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
            <Text style={styles.textoAlerta}>¿Eliminar "{itemAEliminar?.nombre}"?</Text>
            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.botonModal, styles.botonCancelar]} onPress={() => setModalEliminarMedVisible(false)}>
                <Text style={styles.botonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonModal, styles.botonEliminarRojo]} onPress={ejecutarEliminarMedicamento}>
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
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#1a365d' },
  subtitulo: { fontSize: 13, color: '#718096', marginTop: 2, marginBottom: 12 },
  buscadorContenedor: { flexDirection: 'row', backgroundColor: '#f7fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  buscadorInput: { flex: 1, fontSize: 14, color: '#2d3748', padding: 0 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  bannerExito: { position: 'absolute', top: 45, alignSelf: 'center', backgroundColor: '#2f855a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, zIndex: 1000, elevation: 8 },
  textoBannerExito: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  seccionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seccionTitulo: { fontSize: 18, fontWeight: 'bold', color: '#2d3748' },
  botonAgregarMini: { flexDirection: 'row', backgroundColor: '#3182ce', paddingHorizontal: 8, paddingVertical: 7, borderRadius: 20, alignItems: 'center' },
  textoAgregarMini: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  vacio: { fontSize: 13, color: '#a0aec0', fontStyle: 'italic', marginBottom: 10, textAlign: 'center', marginTop: 8 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, alignItems: 'center' },
  cardMed: { borderColor: '#c6f6d5', backgroundColor: '#f7fafc' },
  cardTitulo: { fontSize: 16, fontWeight: 'bold', color: '#2b6cb0', marginBottom: 4 },
  cardDetalle: { fontSize: 13, color: '#4a5568', marginTop: 2 },
  caducidadFila: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  cardCaducidad: { fontSize: 12, color: '#718096' },
  badgeCaducado: { backgroundColor: '#fed7d7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  textoBadgeCaducado: { color: '#9b2c2c', fontSize: 10, fontWeight: 'bold' },
  badgeProximo: { backgroundColor: '#feebc8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  textoBadgeProximo: { color: '#c05621', fontSize: 10, fontWeight: 'bold' },
  rotasitioFila: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  cardRotasitio: { fontSize: 12, color: '#308be6', fontWeight: '700', marginLeft: 4 },
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
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 12, backgroundColor: '#f7fafc', color: '#2d3748' },
  labelZona: { fontSize: 13, fontWeight: '700', color: '#4a5568', marginBottom: 8, marginTop: 4 },
  selectorZona: { flexDirection: 'row', marginBottom: 14 },
  botonZona: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, alignItems: 'center', marginHorizontal: 3, backgroundColor: '#f7fafc' },
  botonZonaActivo: { backgroundColor: '#3182ce', borderColor: '#3182ce' },
  textoZona: { fontSize: 12, color: '#4a5568', fontWeight: '600' },
  textoZonaActivo: { color: '#fff' },

  dosisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  botonAgregarDosis: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  textoAgregarDosis: { color: '#308be6', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  dosisCard: { backgroundColor: '#f7fafc', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  dosisHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inputEtiqueta: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, backgroundColor: '#fff', color: '#2d3748', fontWeight: 'bold' },
  botonEliminarDosis: { marginLeft: 8 },

  selectorFrecuencia: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  botonFrecuencia: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, backgroundColor: '#f7fafc', marginRight: 6, marginBottom: 6 },
  botonFrecuenciaActivo: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  textoFrecuencia: { fontSize: 12, color: '#4a5568', fontWeight: '600' },
  textoFrecuenciaActivo: { color: '#fff' },

  rotasitioInicialContenedor: { backgroundColor: '#ebf8ff', borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 12, borderWidth: 1, borderColor: '#bee3f8' },
  rotasitioInicialHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rotasitioInicialTitulo: { fontSize: 14, fontWeight: 'bold', color: '#2c5282', marginLeft: 6 },
  rotasitioPregunta: { fontSize: 13, color: '#2c5282', fontWeight: '600', marginBottom: 10, lineHeight: 18 },
  botonRespuesta: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1, borderColor: '#bee3f8', borderRadius: 10, backgroundColor: '#fff', marginHorizontal: 3, alignItems: 'center' },
  botonRespuestaActivo: { backgroundColor: '#308be6', borderColor: '#308be6' },
  textoRespuesta: { fontSize: 12, color: '#4a5568', fontWeight: '600' },
  textoRespuestaActivo: { color: '#fff' },
  rotasitioDetalle: { marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#bee3f8' },
  selectorPuntos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  botonPunto: { width: '13%', aspectRatio: 1, borderRadius: 50, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginBottom: 8 },
  botonPuntoActivo: { backgroundColor: '#308be6', borderColor: '#308be6' },
  textoPunto: { fontSize: 14, color: '#4a5568', fontWeight: 'bold' },
  textoPuntoActivo: { color: '#fff' },

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