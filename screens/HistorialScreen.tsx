import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/db';
import { escucharTratamientoActualizado } from '../utils/events';

type Aplicacion = {
  id_aplicacion_insulina: string;
  insulina_id: string;
  dosis_id: string | null;
  unidades: number;
  fecha: string;
  hora: string;
  zona: string;
  sitio_detalle: string | null;
  notas: string | null;
};

type Insulina = {
  id_insulina: string;
  nombre: string;
  tipo: string;
};

type Dosis = {
  id_dosis: string;
  etiqueta: string | null;
  horario: string;
};

type AplicacionConDetalles = Aplicacion & {
  insulinaNombre: string;
  insulinaTipo: string;
  dosisEtiqueta: string | null;
  dosisHorario: string | null;
};

export default function HistorialScreen() {
  const [aplicaciones, setAplicaciones] = useState<AplicacionConDetalles[]>([]);
  const [insulinas, setInsulinas] = useState<Insulina[]>([]);
  const [filtroInsulina, setFiltroInsulina] = useState<string | null>(null);
  const [modalFiltroVisible, setModalFiltroVisible] = useState(false);

  const cargarDatos = async () => {
    try {
      // Cargar todas las aplicaciones ordenadas por fecha/hora descendente
      const resAplicaciones = await db.getAllAsync<Aplicacion>(
        `SELECT * FROM aplicacion_insulina ORDER BY fecha DESC, hora DESC`
      );

      // Cargar insulinas y dosis para enriquecer los datos
      const resInsulinas = await db.getAllAsync<Insulina>('SELECT * FROM insulina');
      const resDosis = await db.getAllAsync<Dosis>('SELECT * FROM dosis_insulina');

      setInsulinas(resInsulinas);

      // Enriquecer cada aplicación con datos de insulina y dosis
      const enriquecidas: AplicacionConDetalles[] = resAplicaciones.map(a => {
        const insulina = resInsulinas.find(i => i.id_insulina === a.insulina_id);
        const dosis = resDosis.find(d => d.id_dosis === a.dosis_id);
        return {
          ...a,
          insulinaNombre: insulina?.nombre || 'Insulina eliminada',
          insulinaTipo: insulina?.tipo || '',
          dosisEtiqueta: dosis?.etiqueta || null,
          dosisHorario: dosis?.horario || null,
        };
      });

      setAplicaciones(enriquecidas);

      console.log('📚 Historial cargado:', enriquecidas.length, 'aplicaciones');
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  useEffect(() => {
    const suscripcion = escucharTratamientoActualizado(() => {
      cargarDatos();
    });
    return () => suscripcion.remove();
  }, []);

  // --- Filtro aplicado ---
  const aplicacionesFiltradas = filtroInsulina
    ? aplicaciones.filter(a => a.insulina_id === filtroInsulina)
    : aplicaciones;

  // --- Agrupar por fecha ---
  const agruparPorFecha = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    const grupos: { titulo: string; datos: AplicacionConDetalles[] }[] = [];
    const mapaGrupos: { [key: string]: AplicacionConDetalles[] } = {};

    aplicacionesFiltradas.forEach(a => {
      const fecha = new Date(a.fecha + 'T00:00:00');
      let clave: string;

      if (fecha.getTime() === hoy.getTime()) {
        clave = 'Hoy';
      } else if (fecha.getTime() === ayer.getTime()) {
        clave = 'Ayer';
      } else {
        const diffDias = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDias <= 7) {
          clave = 'Esta semana';
        } else if (diffDias <= 30) {
          clave = 'Este mes';
        } else {
          clave = 'Anteriores';
        }
      }

      if (!mapaGrupos[clave]) mapaGrupos[clave] = [];
      mapaGrupos[clave].push(a);
    });

    const ordenGrupos = ['Hoy', 'Ayer', 'Esta semana', 'Este mes', 'Anteriores'];
    ordenGrupos.forEach(g => {
      if (mapaGrupos[g] && mapaGrupos[g].length > 0) {
        grupos.push({ titulo: g, datos: mapaGrupos[g] });
      }
    });

    return grupos;
  };

  const grupos = agruparPorFecha();

  // --- Estadísticas ---
  const calcularEstadisticas = () => {
    if (aplicacionesFiltradas.length === 0) {
      return { total: 0, dias: 0, puntoMasUsado: '-', zonaMasUsada: '-' };
    }

    // Total de aplicaciones
    const total = aplicacionesFiltradas.length;

    // Días únicos con aplicación
    const diasUnicos = new Set(aplicacionesFiltradas.map(a => a.fecha));
    const dias = diasUnicos.size;

    // Punto más usado
    const conteoPuntos: { [key: string]: number } = {};
    aplicacionesFiltradas.forEach(a => {
      const key = a.sitio_detalle || 'Sin punto';
      conteoPuntos[key] = (conteoPuntos[key] || 0) + 1;
    });
    let puntoMasUsado = '-';
    let maxPunto = 0;
    Object.entries(conteoPuntos).forEach(([p, c]) => {
      if (c > maxPunto) {
        maxPunto = c;
        puntoMasUsado = p;
      }
    });

    // Zona más usada
    const conteoZonas: { [key: string]: number } = {};
    aplicacionesFiltradas.forEach(a => {
      conteoZonas[a.zona] = (conteoZonas[a.zona] || 0) + 1;
    });
    let zonaMasUsada = '-';
    let maxZona = 0;
    Object.entries(conteoZonas).forEach(([z, c]) => {
      if (c > maxZona) {
        maxZona = c;
        zonaMasUsada = z;
      }
    });

    return {
      total,
      dias,
      puntoMasUsado,
      zonaMasUsada: zonaMasUsada.charAt(0).toUpperCase() + zonaMasUsada.slice(1),
    };
  };

  const stats = calcularEstadisticas();

  // --- Formatear fecha legible ---
  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr + 'T00:00:00');
    const dia = fecha.getDate();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mes = meses[fecha.getMonth()];
    const anio = fecha.getFullYear();
    return `${dia} ${mes} ${anio}`;
  };

  // --- Renderizar cada aplicación ---
  const renderAplicacion = (item: AplicacionConDetalles) => {
    const zonaCapitalizada = item.zona.charAt(0).toUpperCase() + item.zona.slice(1);

    return (
      <View style={styles.cardAplicacion}>
        <View style={styles.horaBox}>
          <Text style={styles.horaTexto}>{item.hora}</Text>
        </View>

        <View style={styles.infoPrincipal}>
          <View style={styles.filaTitulo}>
            <Ionicons name="water" size={16} color="#308be6" />
            <Text style={styles.nombreInsulina}>
              {item.insulinaNombre}
            </Text>
            <Text style={styles.tipoInsulina}>({item.insulinaTipo})</Text>
          </View>

          <Text style={styles.unidadesTexto}>
            {item.unidades} U
            {item.dosisEtiqueta ? ` • ${item.dosisEtiqueta}` : ''}
          </Text>

          <View style={styles.filaDetalles}>
            <View style={styles.detalleItem}>
              <Ionicons name="location-outline" size={14} color="#308be6" />
              <Text style={styles.detalleTexto}>
                {zonaCapitalizada} - {item.sitio_detalle || 'Sin punto'}
              </Text>
            </View>
          </View>

          {item.dosisHorario && (
            <Text style={styles.dosisProgramada}>
              Programada: {item.dosisHorario}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // --- Renderizar grupo ---
  const renderGrupo = ({ item }: { item: { titulo: string; datos: AplicacionConDetalles[] } }) => {
    return (
      <View style={styles.grupoContainer}>
        <View style={styles.grupoHeader}>
          <Text style={styles.grupoTitulo}>{item.titulo}</Text>
          <Text style={styles.grupoCount}>{item.datos.length}</Text>
        </View>
        {item.datos.map(a => (
          <View key={a.id_aplicacion_insulina}>
            {renderAplicacion(a)}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.titulo}>Historial</Text>
        <Text style={styles.subtitulo}>Registro de todas tus aplicaciones</Text>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumero}>{stats.total}</Text>
          <Text style={styles.statLabel}>Aplicaciones</Text>
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
        <TouchableOpacity
          style={styles.botonFiltro}
          onPress={() => setModalFiltroVisible(true)}
        >
          <Ionicons name="filter" size={16} color="#308be6" />
          <Text style={styles.botonFiltroTexto}>
            {filtroInsulina
              ? insulinas.find(i => i.id_insulina === filtroInsulina)?.nombre || 'Filtrar'
              : 'Todas las insulinas'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#308be6" />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {aplicacionesFiltradas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#cbd5e0" />
          <Text style={styles.emptyTitulo}>Sin registros todavía</Text>
          <Text style={styles.emptyTexto}>
            Cuando registres tu primera aplicación de insulina, aparecerá aquí.
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
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalFiltroVisible(false)}
        >
          <View style={styles.modalFiltroContent}>
            <Text style={styles.modalFiltroTitulo}>Filtrar por insulina</Text>

            <TouchableOpacity
              style={[
                styles.opcionFiltro,
                filtroInsulina === null && styles.opcionFiltroActiva,
              ]}
              onPress={() => {
                setFiltroInsulina(null);
                setModalFiltroVisible(false);
              }}
            >
              <Ionicons
                name={filtroInsulina === null ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={filtroInsulina === null ? '#308be6' : '#a0aec0'}
              />
              <Text style={[
                styles.opcionFiltroTexto,
                filtroInsulina === null && styles.opcionFiltroTextoActiva,
              ]}>
                Todas las insulinas
              </Text>
            </TouchableOpacity>

            {insulinas.map(i => (
              <TouchableOpacity
                key={i.id_insulina}
                style={[
                  styles.opcionFiltro,
                  filtroInsulina === i.id_insulina && styles.opcionFiltroActiva,
                ]}
                onPress={() => {
                  setFiltroInsulina(i.id_insulina);
                  setModalFiltroVisible(false);
                }}
              >
                <Ionicons
                  name={filtroInsulina === i.id_insulina ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={filtroInsulina === i.id_insulina ? '#308be6' : '#a0aec0'}
                />
                <Text style={[
                  styles.opcionFiltroTexto,
                  filtroInsulina === i.id_insulina && styles.opcionFiltroTextoActiva,
                ]}>
                  {i.nombre} ({i.tipo})
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#1a365d' },
  subtitulo: { fontSize: 13, color: '#718096', marginTop: 2 },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#308be6',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#718096',
    textAlign: 'center',
  },

  filtroContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  botonFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebf8ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bee3f8',
  },
  botonFiltroTexto: {
    flex: 1,
    fontSize: 13,
    color: '#2c5282',
    fontWeight: '600',
    marginLeft: 8,
  },

  listaContenido: {
    padding: 20,
    paddingBottom: 40,
  },

  grupoContainer: {
    marginBottom: 20,
  },
  grupoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  grupoTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grupoCount: {
    fontSize: 12,
    color: '#a0aec0',
    marginLeft: 8,
    backgroundColor: '#edf2f7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '600',
  },

  cardAplicacion: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  horaBox: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ebf8ff',
    borderRadius: 10,
    marginRight: 12,
    paddingVertical: 8,
  },
  horaTexto: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  infoPrincipal: {
    flex: 1,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nombreInsulina: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2d3748',
    marginLeft: 6,
  },
  tipoInsulina: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 4,
  },
  unidadesTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2f855a',
    marginBottom: 6,
  },
  filaDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  detalleTexto: {
    fontSize: 12,
    color: '#4a5568',
    marginLeft: 4,
  },
  dosisProgramada: {
    fontSize: 11,
    color: '#a0aec0',
    marginTop: 4,
    fontStyle: 'italic',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a5568',
    marginTop: 16,
  },
  emptyTexto: {
    fontSize: 13,
    color: '#a0aec0',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalFiltroContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalFiltroTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 16,
  },
  opcionFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  opcionFiltroActiva: {
    backgroundColor: '#ebf8ff',
  },
  opcionFiltroTexto: {
    fontSize: 14,
    color: '#4a5568',
    marginLeft: 10,
    fontWeight: '500',
  },
  opcionFiltroTextoActiva: {
    color: '#2c5282',
    fontWeight: 'bold',
  },
});