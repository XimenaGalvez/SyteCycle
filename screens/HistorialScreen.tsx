import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/db';
import { escucharTratamientoActualizado } from '../utils/events';

// Tipos
type Aplicacion = {
  id_aplicacion_insulina: string;
  insulina_id: string;
  dosis_id: string | null;
  unidades: number;
  fecha: string;
  hora: string;
  zona: string;
  sitio_detalle: string | null;
};

type TomaMedicamento = {
  id_toma_medicamento: string;
  medicamento_id: string;
  fecha: string;
  hora: string;
  estado: string;
};

type HistorialItem = {
  id: string;
  tipo: 'insulina' | 'medicamento';
  fecha: string;
  hora: string;
  titulo: string;
  subtitulo: string;
  detalles: string;
  estaEliminado: boolean;
  dosisEtiqueta?: string | null;
  dosisHorario?: string | null;
};

export default function HistorialScreen() {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'insulina' | 'medicamento'>('todas');
  const [modalFiltroVisible, setModalFiltroVisible] = useState(false);

  const cargarDatos = async () => {
    try {
      // 1. Traer aplicaciones de insulina
      const resAplicaciones = await db.getAllAsync<Aplicacion>(
        `SELECT * FROM aplicacion_insulina ORDER BY fecha DESC, hora DESC`
      );
      const resInsulinas = await db.getAllAsync<{ id_insulina: string; nombre: string; tipo: string; activo: number }>('SELECT * FROM insulina');      const resDosis = await db.getAllAsync<{ id_dosis: string; etiqueta: string | null; horario: string }>('SELECT * FROM dosis_insulina');

      // 2. Traer tomas de medicamentos
      const resTomas = await db.getAllAsync<TomaMedicamento>(
        `SELECT * FROM toma_medicamento WHERE estado = 'Realizado' ORDER BY fecha DESC, hora DESC`
      );
      const resMedicamentos = await db.getAllAsync<{ id_medicamento: string; nombre: string; dosis: string; activo: number }>('SELECT * FROM medicamento');
      // 3. Unificar todo en un solo arreglo
      const itemsUnificados: HistorialItem[] = [];

      // Procesar insulinas
      resAplicaciones.forEach(a => {
        const insulina = resInsulinas.find(i => i.id_insulina === a.insulina_id);
        const dosis = resDosis.find(d => d.id_dosis === a.dosis_id);
        itemsUnificados.push({
          id: a.id_aplicacion_insulina,
          tipo: 'insulina',
          fecha: a.fecha,
          hora: a.hora,
          titulo: insulina?.nombre || 'Insulina eliminada',
          subtitulo: insulina ? `${insulina.tipo} • ${a.unidades} U` : `${a.unidades} U`,
          detalles: `${a.zona.charAt(0).toUpperCase() + a.zona.slice(1)} - ${a.sitio_detalle || 'Sin punto'}`,
          estaEliminado: insulina ? insulina.activo === 0 : true, // <-- Si activo es 0, está eliminado
          dosisEtiqueta: dosis?.etiqueta || null,
          dosisHorario: dosis?.horario || null,
        });
      });

      // Procesar medicamentos
      resTomas.forEach(t => {
        const med = resMedicamentos.find(m => m.id_medicamento === t.medicamento_id);
        itemsUnificados.push({
          id: t.id_toma_medicamento,
          tipo: 'medicamento',
          fecha: t.fecha,
          hora: t.hora,
          titulo: med?.nombre || 'Medicamento eliminado',
          subtitulo: med?.dosis || '',
          detalles: 'Medicamento tomado',
          estaEliminado: med ? med.activo === 0 : true, // <-- Si activo es 0, está eliminado
        });
      });
      // 4. Ordenar por fecha y hora
      itemsUnificados.sort((a, b) => {
        return `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`);
      });

      setHistorial(itemsUnificados);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  useEffect(() => { cargarDatos(); }, []);
  useFocusEffect(useCallback(() => { cargarDatos(); }, []));
  useEffect(() => {
    const suscripcion = escucharTratamientoActualizado(() => { cargarDatos(); });
    return () => suscripcion.remove();
  }, []);

  // --- Filtro ---
  const historialFiltrado = filtroTipo === 'todas'
    ? historial
    : historial.filter(h => h.tipo === filtroTipo);

  // --- Estadísticas Adaptadas ---
  const calcularEstadisticas = () => {
    if (historialFiltrado.length === 0) {
      return { total: 0, dias: 0, zonaMasUsada: '-', puntoMasUsado: '-' };
    }
    const total = historialFiltrado.length;
    const diasUnicos = new Set(historialFiltrado.map(h => h.fecha));
    
    // Solo contamos zonas y puntos de las insulinas
    const insulinasHist = historialFiltrado.filter(h => h.tipo === 'insulina');
    
    let zonaMasUsada = '-';
    let puntoMasUsado = '-';

    if (insulinasHist.length > 0) {
      const conteoZonas: { [key: string]: number } = {};
      const conteoPuntos: { [key: string]: number } = {};
      
      insulinasHist.forEach(h => {
        // Extraer zona de los detalles (formato: "Abdomen - Punto 4")
        const zona = h.detalles.split(' - ')[0];
        const punto = h.detalles.split(' - ')[1];
        
        conteoZonas[zona] = (conteoZonas[zona] || 0) + 1;
        if (punto) conteoPuntos[punto] = (conteoPuntos[punto] || 0) + 1;
      });

      let maxZona = 0;
      Object.entries(conteoZonas).forEach(([z, c]) => {
        if (c > maxZona) { maxZona = c; zonaMasUsada = z; }
      });

      let maxPunto = 0;
      Object.entries(conteoPuntos).forEach(([p, c]) => {
        if (c > maxPunto) { maxPunto = c; puntoMasUsado = p; }
      });
    }

    return { total, dias: diasUnicos.size, zonaMasUsada, puntoMasUsado };
  };

  const stats = calcularEstadisticas();

  // --- Agrupar por fecha ---
  const agruparPorFecha = () => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);

    const grupos: { titulo: string; datos: HistorialItem[] }[] = [];
    const mapaGrupos: { [key: string]: HistorialItem[] } = {};

    historialFiltrado.forEach(a => {
      const fecha = new Date(a.fecha + 'T00:00:00');
      let clave: string;

      if (fecha.getTime() === hoy.getTime()) clave = 'Hoy';
      else if (fecha.getTime() === ayer.getTime()) clave = 'Ayer';
      else {
        const diffDias = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDias <= 7) clave = 'Esta semana';
        else if (diffDias <= 30) clave = 'Este mes';
        else clave = 'Anteriores';
      }

      if (!mapaGrupos[clave]) mapaGrupos[clave] = [];
      mapaGrupos[clave].push(a);
    });

    ['Hoy', 'Ayer', 'Esta semana', 'Este mes', 'Anteriores'].forEach(g => {
      if (mapaGrupos[g] && mapaGrupos[g].length > 0) {
        grupos.push({ titulo: g, datos: mapaGrupos[g] });
      }
    });

    return grupos;
  };

  const grupos = agruparPorFecha();

  // --- Formatear hora ---
  const formatearHora = (horaStr: string) => {
    if (!horaStr) return '';
    const [h, m] = horaStr.split(':');
    const hora24 = parseInt(h, 10);
    const ampm = hora24 >= 12 ? 'PM' : 'AM';
    const hora12 = hora24 % 12 || 12;
    return `${hora12}:${m} ${ampm}`;
  };

  // --- Renderizar cada item ---
  const renderItem = (item: HistorialItem) => {
    const esInsulina = item.tipo === 'insulina';

    return (
      <View style={[
        styles.cardAplicacion, 
        item.estaEliminado && { opacity: 0.7, backgroundColor: '#fcfcfc' } // Estilo sutil si está eliminado
      ]}>
        <View style={[styles.horaBox, item.estaEliminado && { backgroundColor: '#edf2f7' }]}>
          <Text style={[styles.horaTexto, item.estaEliminado && { color: '#a0aec0' }]}>
            {formatearHora(item.hora)}
          </Text>
        </View>

        <View style={styles.infoPrincipal}>
          <View style={styles.filaTitulo}>
            <Ionicons 
              name={esInsulina ? "water" : "medical"} 
              size={16} 
              color={item.estaEliminado ? "#a0aec0" : (esInsulina ? "#308be6" : "#2e7d32")} 
            />
            <Text style={[
              styles.nombreInsulina, 
              !esInsulina && !item.estaEliminado && { color: '#2e7d32' },
              item.estaEliminado && { color: '#718096', fontStyle: 'italic' }
            ]}>
              {item.titulo}
            </Text>
            {item.estaEliminado && (
              <View style={{ backgroundColor: '#edf2f7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 }}>
                <Text style={{ fontSize: 10, color: '#718096', fontWeight: 'bold' }}>Registro histórico</Text>
              </View>
            )}
          </View>

          <Text style={[styles.unidadesTexto, !esInsulina && { color: '#4a5568' }, item.estaEliminado && { color: '#a0aec0' }]}>
            {item.subtitulo}
            {item.dosisEtiqueta ? ` • ${item.dosisEtiqueta}` : ''}
          </Text>

          <View style={styles.filaDetalles}>
            <View style={styles.detalleItem}>
              <Ionicons 
                name={esInsulina ? "location-outline" : "checkmark-circle-outline"} 
                size={14} 
                color={item.estaEliminado ? "#a0aec0" : (esInsulina ? "#308be6" : "#2e7d32")} 
              />
              <Text style={[styles.detalleTexto, item.estaEliminado && { color: '#a0aec0' }]}>
                {item.detalles}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderGrupo = ({ item }: { item: { titulo: string; datos: HistorialItem[] } }) => {
    return (
      <View style={styles.grupoContainer}>
        <View style={styles.grupoHeader}>
          <Text style={styles.grupoTitulo}>{item.titulo}</Text>
          <Text style={styles.grupoCount}>{item.datos.length}</Text>
        </View>
        {item.datos.map(a => (
          <View key={a.id}>
            {renderItem(a)}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Historial</Text>
        <Text style={styles.subtitulo}>Registro de todas tus aplicaciones y tomas</Text>
      </View>

      {/* ESTADÍSTICAS RECUPERADAS */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumero}>{stats.total}</Text>
          <Text style={styles.statLabel}>Registros</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumero}>{stats.dias}</Text>
          <Text style={styles.statLabel}>Días</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumero} numberOfLines={1}>{stats.zonaMasUsada}</Text>
          <Text style={styles.statLabel}>Zona frecuente</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumero} numberOfLines={1}>
            {stats.puntoMasUsado.replace('Punto ', 'P. ')}
          </Text>
          <Text style={styles.statLabel}>Punto frecuente</Text>
        </View>
      </View>

      {/* Filtro */}
      <View style={styles.filtroContainer}>
        <TouchableOpacity style={styles.botonFiltro} onPress={() => setModalFiltroVisible(true)}>
          <Ionicons name="filter" size={16} color="#308be6" />
          <Text style={styles.botonFiltroTexto}>
            {filtroTipo === 'todas' ? 'Todo el historial' : (filtroTipo === 'insulina' ? 'Solo Insulinas' : 'Solo Medicamentos')}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#308be6" />
        </TouchableOpacity>
      </View>

      {historialFiltrado.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#cbd5e0" />
          <Text style={styles.emptyTitulo}>Sin registros todavía</Text>
          <Text style={styles.emptyTexto}>
            Cuando registres una aplicación o tomes un medicamento, aparecerá aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={grupos}
          keyExtractor={(item) => item.titulo}
          renderItem={renderGrupo}
          contentContainerStyle={styles.listaContenido}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de filtro */}
      <Modal visible={modalFiltroVisible} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalFiltroVisible(false)}>
          <View style={styles.modalFiltroContent}>
            <Text style={styles.modalFiltroTitulo}>Filtrar por tipo</Text>
            {['todas', 'insulina', 'medicamento'].map((tipo) => (
              <TouchableOpacity
                key={tipo}
                style={[styles.opcionFiltro, filtroTipo === tipo && styles.opcionFiltroActiva]}
                onPress={() => { setFiltroTipo(tipo as any); setModalFiltroVisible(false); }}
              >
                <Ionicons name={filtroTipo === tipo ? 'radio-button-on' : 'radio-button-off'} size={20} color={filtroTipo === tipo ? '#308be6' : '#a0aec0'} />
                <Text style={[styles.opcionFiltroTexto, filtroTipo === tipo && styles.opcionFiltroTextoActiva]}>
                  {tipo === 'todas' ? 'Todo el historial' : (tipo === 'insulina' ? 'Solo Insulinas' : 'Solo Medicamentos')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#1a365d' },
  subtitulo: { fontSize: 13, color: '#718096', marginTop: 2 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  statBox: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statNumero: { fontSize: 18, fontWeight: 'bold', color: '#308be6', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#718096', textAlign: 'center' },
  filtroContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  botonFiltro: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ebf8ff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#bee3f8' },
  botonFiltroTexto: { flex: 1, fontSize: 13, color: '#2c5282', fontWeight: '600', marginLeft: 8 },
  listaContenido: { padding: 20, paddingBottom: 40 },
  grupoContainer: { marginBottom: 20 },
  grupoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  grupoTitulo: { fontSize: 14, fontWeight: 'bold', color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.5 },
  grupoCount: { fontSize: 12, color: '#a0aec0', marginLeft: 8, backgroundColor: '#edf2f7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontWeight: '600' },
  cardAplicacion: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  horaBox: { width: 85, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ebf8ff', borderRadius: 10, marginRight: 12, paddingVertical: 8, paddingHorizontal: 4 },
  horaTexto: { fontSize: 14, fontWeight: 'bold', color: '#2c5282' },
  infoPrincipal: { flex: 1 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  nombreInsulina: { fontSize: 15, fontWeight: 'bold', color: '#2d3748', marginLeft: 6 },
  unidadesTexto: { fontSize: 14, fontWeight: '600', color: '#2f855a', marginBottom: 6 },
  filaDetalles: { flexDirection: 'row', flexWrap: 'wrap' },
  detalleItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  detalleTexto: { fontSize: 12, color: '#4a5568', marginLeft: 4 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitulo: { fontSize: 18, fontWeight: 'bold', color: '#4a5568', marginTop: 16 },
  emptyTexto: { fontSize: 13, color: '#a0aec0', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalFiltroContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalFiltroTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1a365d', marginBottom: 16 },
  opcionFiltro: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  opcionFiltroActiva: { backgroundColor: '#ebf8ff' },
  opcionFiltroTexto: { fontSize: 14, color: '#4a5568', marginLeft: 10, fontWeight: '500' },
  opcionFiltroTextoActiva: { color: '#2c5282', fontWeight: 'bold' },
});