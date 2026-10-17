import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { obtenerUsuario, Usuario } from '../database/queries';
import { db, generarId } from '../database/db';
import { escucharTratamientoActualizado } from '../utils/events';
import CirculoProgreso from '../utils/CirculoProgreso';

type Props = {
  onCerrarSesion: () => void;
};

type Insulina = {
  id_insulina: string;
  nombre: string;
  tipo: string;
  caducidad: string | null;
  notas: string | null;
};

type Dosis = {
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

type ProximaDosis = {
  insulina: Insulina;
  dosis: Dosis;
};

type InfoPunto = {
  usadoReciente: boolean;
  diasDesdeUso: number | null;
  nivel: 'ok' | 'precaucion' | 'advertencia';
};

export default function HomeScreen({ onCerrarSesion }: Props) {
  const navigation = useNavigation<any>();
  
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [insulinas, setInsulinas] = useState<Insulina[]>([]);
  const [dosisTodas, setDosisTodas] = useState<Dosis[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [tomasHoy, setTomasHoy] = useState<{ [key: string]: number }>({});
  const [aplicacionesHoy, setAplicacionesHoy] = useState<{ [key: string]: { hora: string } }>({});
  const [adherenciaSemanal, setAdherenciaSemanal] = useState(0);

  const [modalRegistroVisible, setModalRegistroVisible] = useState(false);
  const [dosisSeleccionada, setDosisSeleccionada] = useState<ProximaDosis | null>(null);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<'abdomen' | 'brazo' | 'muslo'>('abdomen');
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<number>(1);
  const [infoPuntoActual, setInfoPuntoActual] = useState<InfoPunto>({ usadoReciente: false, diasDesdeUso: null, nivel: 'ok' });


  const getFechaLocal = () => {
    const d = new Date();
    const año = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };


  const cargarDatosHome = async () => {
    try {
      const u = await obtenerUsuario();
      setUsuario(u);

      const resInsulinas = await db.getAllAsync<Insulina>(
        'SELECT * FROM insulina ORDER BY created_at DESC'
      );
      const resDosis = await db.getAllAsync<Dosis>(
        'SELECT * FROM dosis_insulina ORDER BY horario ASC'
      );
      const resMeds = await db.getAllAsync<Medicamento>(
        `SELECT * FROM medicamento WHERE activo = 1 ORDER BY horario ASC`
      );
      
      setInsulinas(resInsulinas);
      setDosisTodas(resDosis);
      setMedicamentos(resMeds);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  const cargarTomasHoy = async () => {
    try {
      const hoy = getFechaLocal();
      const tomas = await db.getAllAsync<{ medicamento_id: string; total: number }>(
        `SELECT medicamento_id, COUNT(*) as total 
         FROM toma_medicamento 
         WHERE fecha = ? AND estado = 'Realizado'
         GROUP BY medicamento_id`,
        [hoy]
      );
      const mapa: { [key: string]: number } = {};
      tomas.forEach(t => { mapa[t.medicamento_id] = t.total; });
      setTomasHoy(mapa);
    } catch (error) {
      console.error('Error al cargar tomas:', error);
    }
  };

  const cargarAplicacionesHoy = async () => {
    try {
      const hoy = getFechaLocal();
      const aplicaciones = await db.getAllAsync<{ dosis_id: string; hora: string }>(
        `SELECT dosis_id, hora FROM aplicacion_insulina WHERE fecha = ?`,
        [hoy]
      );
      const mapa: { [key: string]: { hora: string } } = {};
      aplicaciones.forEach(a => { 
        if (a.dosis_id) mapa[a.dosis_id] = { hora: a.hora }; 
      });
      setAplicacionesHoy(mapa);
    } catch (error) {
      console.error('Error al cargar aplicaciones:', error);
    }
  };

  // ============================================================
  // HELPERS MEDICAMENTOS
  // ============================================================
  const tomasPorDia = (frecuencia: string): number => {
    const f = frecuencia.toLowerCase();
    if (f.includes('cada 12')) return 2;
    if (f.includes('cada 8')) return 3;
    if (f.includes('cada 6')) return 4;
    if (f.includes('cada 4')) return 6;
    return 1;
  };

  const tratamientoTerminado = (med: Medicamento): boolean => {
    if (!med.duracion_dias || med.duracion_dias <= 0) return false;
    if (!med.created_at) return false;
    const fechaInicio = new Date(med.created_at.replace(' ', 'T'));
    const hoy = new Date();
    fechaInicio.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    const diffMs = hoy.getTime() - fechaInicio.getTime();
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return dias >= med.duracion_dias;
  };

  // ============================================================
  // ADHERENCIA HOY
  // ============================================================
  const calcularAdherenciaHoy = useCallback((): number => {
    let totalEsperadas = 0;
    let totalRealizadas = 0;

    const dosisHoy = dosisTodas.length;
    const dosisRealizadas = dosisTodas.filter(d => aplicacionesHoy[d.id_dosis]).length;
    totalEsperadas += dosisHoy;
    totalRealizadas += dosisRealizadas;

    medicamentos.forEach(med => {
      if (tratamientoTerminado(med)) return;
      const maxTomas = tomasPorDia(med.frecuencia);
      const realizadas = tomasHoy[med.id_medicamento] || 0;
      totalEsperadas += maxTomas;
      totalRealizadas += Math.min(realizadas, maxTomas);
    });

    if (totalEsperadas === 0) return 0;
    return Math.round((totalRealizadas / totalEsperadas) * 100);
  }, [dosisTodas, aplicacionesHoy, medicamentos, tomasHoy]);

  // ============================================================
  // ADHERENCIA SEMANAL (CON useCallback)
  // ============================================================
  const calcularAdherenciaSemanal = useCallback(async (): Promise<number> => {
    try {
      const hoy = new Date();
      const hace7Dias = new Date(hoy);
      hace7Dias.setDate(hace7Dias.getDate() - 6);

      const fechaFin = getFechaLocal();
      const fechaInicio = `${hace7Dias.getFullYear()}-${String(hace7Dias.getMonth() + 1).padStart(2, '0')}-${String(hace7Dias.getDate()).padStart(2, '0')}`;

      let totalEsperadas = 0;
      let totalRealizadas = 0;

      const dosisPorDia = dosisTodas.length;
      if (dosisPorDia > 0) {
        totalEsperadas += dosisPorDia * 7;
        const aplicaciones = await db.getAllAsync<{ fecha: string }>(
          `SELECT fecha FROM aplicacion_insulina WHERE fecha >= ? AND fecha <= ?`,
          [fechaInicio, fechaFin]
        );
        totalRealizadas += Math.min(aplicaciones.length, dosisPorDia * 7);
      }

      for (const med of medicamentos) {
        if (tratamientoTerminado(med)) continue;
        const maxTomas = tomasPorDia(med.frecuencia);
        totalEsperadas += maxTomas * 7;

        const tomas = await db.getAllAsync<{ fecha: string }>(
          `SELECT fecha FROM toma_medicamento 
           WHERE medicamento_id = ? AND fecha >= ? AND fecha <= ? AND estado = 'Realizado'`,
          [med.id_medicamento, fechaInicio, fechaFin]
        );
        totalRealizadas += Math.min(tomas.length, maxTomas * 7);
      }

      if (totalEsperadas === 0) return 0;
      return Math.round((totalRealizadas / totalEsperadas) * 100);
    } catch (error) {
      console.error('Error al calcular adherencia semanal:', error);
      return 0;
    }
  }, [dosisTodas, medicamentos]);

  // ============================================================
  // EFECTOS
  // ============================================================
  const cargarTodo = async () => {
    await cargarDatosHome();
    await cargarTomasHoy();
    await cargarAplicacionesHoy();
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarTodo();
    }, [])
  );

  useEffect(() => {
    const suscripcion = escucharTratamientoActualizado(() => {
      cargarTodo();
    });
    return () => suscripcion.remove();
  }, []);

  useEffect(() => {
    let cancelado = false;
    const calcularSemanal = async () => {
      if (dosisTodas.length === 0 && medicamentos.length === 0) {
        setAdherenciaSemanal(0);
        return;
      }
      const semanal = await calcularAdherenciaSemanal();
      if (!cancelado) setAdherenciaSemanal(semanal);
    };
    calcularSemanal();
    return () => { cancelado = true; };
  }, [dosisTodas, medicamentos, aplicacionesHoy, tomasHoy, calcularAdherenciaSemanal]);

  // ============================================================
  // VERIFICAR PUNTO
  // ============================================================
  const verificarPuntoReciente = async (zona: string, punto: number): Promise<InfoPunto> => {
    try {
      const sitioBuscado = `Punto ${punto}`;

      const resultado = await db.getFirstAsync<{ fecha: string; hora: string }>(
        `SELECT fecha, hora FROM aplicacion_insulina 
         WHERE LOWER(TRIM(zona)) = LOWER(TRIM(?)) 
           AND LOWER(TRIM(sitio_detalle)) = LOWER(TRIM(?))
         ORDER BY fecha DESC, hora DESC 
         LIMIT 1`,
        [zona, sitioBuscado]
      );

      if (!resultado) {
        return { usadoReciente: false, diasDesdeUso: null, nivel: 'ok' };
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaUso = new Date(resultado.fecha + 'T00:00:00');
      const diffMs = hoy.getTime() - fechaUso.getTime();
      const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diasNormalizados = dias < 0 ? 0 : dias;

      let nivel: 'ok' | 'precaucion' | 'advertencia' = 'ok';
      if (diasNormalizados <= 3) nivel = 'advertencia';
      else if (diasNormalizados <= 7) nivel = 'precaucion';

      return {
        usadoReciente: diasNormalizados <= 7,
        diasDesdeUso: diasNormalizados,
        nivel,
      };
    } catch (error) {
      console.error('Error al verificar punto:', error);
      return { usadoReciente: false, diasDesdeUso: null, nivel: 'ok' };
    }
  };

  useEffect(() => {
    if (!modalRegistroVisible) {
      setInfoPuntoActual({ usadoReciente: false, diasDesdeUso: null, nivel: 'ok' });
      return;
    }

    let cancelado = false;
    const verificar = async () => {
      const info = await verificarPuntoReciente(zonaSeleccionada, puntoSeleccionado);
      if (!cancelado) setInfoPuntoActual(info);
    };
    verificar();
    return () => { cancelado = true; };
  }, [zonaSeleccionada, puntoSeleccionado, modalRegistroVisible]);

  // ============================================================
  // SESIÓN Y MEDICAMENTOS
  // ============================================================
  const confirmarCerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: onCerrarSesion },
      ]
    );
  };

  const registrarToma = async (idMedicamento: string, maxTomas: number) => {
    try {
      const hoy = getFechaLocal();
      const actuales = tomasHoy[idMedicamento] || 0;
      if (actuales >= maxTomas) {
        Alert.alert('Completado', 'Ya registraste todas las tomas de hoy.');
        return;
      }
      const idToma = generarId();
      const hora = new Date().toTimeString().slice(0, 5);
      await db.runAsync(
        `INSERT INTO toma_medicamento (id_toma_medicamento, medicamento_id, fecha, hora, estado) VALUES (?, ?, ?, ?, 'Realizado')`,
        [idToma, idMedicamento, hoy, hora]
      );
      setTomasHoy(prev => ({ ...prev, [idMedicamento]: (prev[idMedicamento] || 0) + 1 }));
    } catch (error) {
      console.error('Error al registrar toma:', error);
    }
  };

  const deshacerToma = async (idMedicamento: string) => {
    try {
      const hoy = getFechaLocal();
      if ((tomasHoy[idMedicamento] || 0) <= 0) return;
      await db.runAsync(
        `DELETE FROM toma_medicamento 
         WHERE id_toma_medicamento IN (
           SELECT id_toma_medicamento FROM toma_medicamento 
           WHERE medicamento_id = ? AND fecha = ? 
           ORDER BY hora DESC LIMIT 1
         )`,
        [idMedicamento, hoy]
      );
      setTomasHoy(prev => ({ 
        ...prev, 
        [idMedicamento]: Math.max(0, (prev[idMedicamento] || 0) - 1) 
      }));
    } catch (error) {
      console.error('Error al deshacer toma:', error);
    }
  };

  const obtenerDosisDelDia = (): ProximaDosis[] => {
    if (dosisTodas.length === 0) return [];
    const ordenadas = [...dosisTodas].sort((a, b) => a.horario.localeCompare(b.horario));
    return ordenadas
      .map(d => {
        const insulina = insulinas.find(i => i.id_insulina === d.insulina_id);
        if (!insulina) return null;
        return { insulina, dosis: d };
      })
      .filter((x): x is ProximaDosis => x !== null);
  };

  const dosisDelDia = obtenerDosisDelDia();

  const obtenerProximaDosisPendiente = (): ProximaDosis | null => {
    if (dosisTodas.length === 0) return null;
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    const ordenadas = [...dosisTodas].sort((a, b) => a.horario.localeCompare(b.horario));

    for (const d of ordenadas) {
      const insulina = insulinas.find(i => i.id_insulina === d.insulina_id);
      if (!insulina) continue;
      if (aplicacionesHoy[d.id_dosis]) continue;
      const [h, m] = d.horario.split(':').map(Number);
      const minutosDosis = h * 60 + m;
      if (minutosDosis < minutosActuales) return { insulina, dosis: d };
    }

    for (const d of ordenadas) {
      const insulina = insulinas.find(i => i.id_insulina === d.insulina_id);
      if (!insulina) continue;
      if (aplicacionesHoy[d.id_dosis]) continue;
      return { insulina, dosis: d };
    }
    return null;
  };

  const proximaDosis = obtenerProximaDosisPendiente();
  const proximaInsulina = proximaDosis?.insulina || null;

  const calcularSiguientePunto = (notas: string | null) => {
    if (!notas) return 1;
    const matchPunto = notas.match(/Punto:\s*(\d+)/);
    const puntoActual = matchPunto ? parseInt(matchPunto[1]) : 0;
    return puntoActual >= 7 ? 1 : puntoActual + 1;
  };

  const zonaActual = proximaInsulina?.notas?.match(/Zona:\s*(\w+)/)?.[1] || 'abdomen';
  const todasAplicadas = dosisDelDia.length > 0 && dosisDelDia.every(d => aplicacionesHoy[d.dosis.id_dosis]);

  const insulinaReferencia = proximaInsulina || (insulinas.length > 0 ? insulinas[0] : null);
  const zonaReferencia = insulinaReferencia?.notas?.match(/Zona:\s*(\w+)/)?.[1] || 'abdomen';
  const puntoReferencia = insulinaReferencia ? calcularSiguientePunto(insulinaReferencia.notas) : 1;

  // ============================================================
  // GUARDAR REGISTRO
  // ============================================================
  const guardarRegistroInyeccion = async () => {
    if (!dosisSeleccionada) {
      Alert.alert('Error', 'No hay una dosis seleccionada.');
      return;
    }

    const yaAplicada = !!aplicacionesHoy[dosisSeleccionada.dosis.id_dosis];
    if (yaAplicada) {
      Alert.alert('Ya registrada', 'Esta dosis ya se registró hoy.');
      return;
    }

    if (infoPuntoActual.usadoReciente) {
      const mensajeDias = infoPuntoActual.diasDesdeUso === 0
        ? 'hoy'
        : infoPuntoActual.diasDesdeUso === 1
          ? 'ayer'
          : `hace ${infoPuntoActual.diasDesdeUso} días`;

      const zonaCapitalizada = zonaSeleccionada.charAt(0).toUpperCase() + zonaSeleccionada.slice(1);

      Alert.alert(
        '⚠️ Punto utilizado recientemente',
        `Usaste ${zonaCapitalizada} - Punto ${puntoSeleccionado} ${mensajeDias}.\n\nLa rotación de sitios previene lipohipertrofia.\n\n¿Confirmas que esta fue tu aplicación real?`,
        [
          { text: 'Cambiar punto', style: 'cancel' },
          {
            text: 'Sí, confirmar',
            style: 'destructive',
            onPress: () => ejecutarRegistro(),
          },
        ]
      );
      return;
    }

    ejecutarRegistro();
  };

  const ejecutarRegistro = async () => {
    if (!dosisSeleccionada) return;

    try {
      const idApp = generarId();
      const hoy = getFechaLocal();
      const horaReal = new Date().toTimeString().slice(0, 5);

      await db.runAsync(
        `INSERT INTO aplicacion_insulina (id_aplicacion_insulina, insulina_id, dosis_id, unidades, fecha, hora, zona, sitio_detalle) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [idApp, dosisSeleccionada.insulina.id_insulina, dosisSeleccionada.dosis.id_dosis, dosisSeleccionada.dosis.unidades, hoy, horaReal, zonaSeleccionada, `Punto ${puntoSeleccionado}`]
      );

      const nuevasNotas = `Zona: ${zonaSeleccionada} | Punto: ${puntoSeleccionado}`;
      await db.runAsync(
        `UPDATE insulina SET notas = ? WHERE id_insulina = ?`,
        [nuevasNotas, dosisSeleccionada.insulina.id_insulina]
      );

      setModalRegistroVisible(false);
      setDosisSeleccionada(null);
      setInfoPuntoActual({ usadoReciente: false, diasDesdeUso: null, nivel: 'ok' });
      
      await cargarTodo();

      Alert.alert('¡Éxito!', `Aplicación registrada a las ${horaReal} en ${zonaSeleccionada}, punto ${puntoSeleccionado}.`);
    } catch (error) {
      console.error('Error al registrar:', error);
      Alert.alert('Error', 'No se pudo guardar.');
    }
  };

  const abrirModalParaDosis = (item: ProximaDosis) => {
    setDosisSeleccionada(item);
    const siguientePuntoCalc = calcularSiguientePunto(item.insulina.notas);
    const zonaActualCalc = item.insulina.notas?.match(/Zona:\s*(\w+)/)?.[1] || 'abdomen';
    setPuntoSeleccionado(siguientePuntoCalc);
    setZonaSeleccionada(zonaActualCalc as any);
    setModalRegistroVisible(true);
  };

  // ============================================================
  // RENDER
  // ============================================================
  const esUsuarioNuevo = insulinas.length === 0 && medicamentos.length === 0;
  const adherenciaHoyValor = calcularAdherenciaHoy();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={['#308be6', '#d7fbcf']}
            start={{ x: 1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.appName}>SYTECYCLE</Text>
            <Text style={styles.saludo}>¡Hola, {usuario?.nombre ?? 'Usuario'}! 👋</Text>

            <View style={styles.proxima}>
              <View style={styles.proximaHeader}>
                <Ionicons name="time-outline" size={20} color="#1f4e79" />
                <Text style={styles.proximaTitulo}>Dosis de hoy</Text>
              </View>

              {dosisDelDia.length === 0 ? (
                <Text style={[styles.proximaDetalle, { fontStyle: 'italic', color: '#555' }]}>
                  No hay dosis programadas.
                </Text>
              ) : (
                <View style={{ marginTop: -10 }}>
                  {dosisDelDia.map((item) => {
                    const aplicada = aplicacionesHoy[item.dosis.id_dosis];
                    const [h, m] = item.dosis.horario.split(':').map(Number);
                    const minutosDosis = h * 60 + m;
                    const ahora = new Date();
                    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
                    const esPasada = minutosDosis < minutosActuales;
                    const esProxima = !esPasada && (minutosDosis - minutosActuales) <= 60;

                    let estadoColor = '#4a5568';
                    let estadoTexto = 'Programada';
                    let estadoIcono = 'time-outline';

                    if (aplicada) {
                      estadoColor = '#2e7d32';
                      estadoTexto = `Aplicada (${aplicada.hora})`;
                      estadoIcono = 'checkmark-circle';
                    } else if (esPasada) {
                      estadoColor = '#e53e3e';
                      estadoTexto = 'Pendiente • Toca';
                      estadoIcono = 'alert-circle';
                    } else if (esProxima) {
                      estadoColor = '#308be6';
                      estadoTexto = 'Próxima • Toca';
                      estadoIcono = 'notifications';
                    }

                    return (
                      <TouchableOpacity
                        key={item.dosis.id_dosis}
                        style={styles.dosisRow}
                        onPress={() => {
                          if (aplicada) {
                            Alert.alert('Ya aplicada', `Esta dosis ya se registró hoy a las ${aplicada.hora}.`);
                            return;
                          }
                          abrirModalParaDosis(item);
                        }}
                        activeOpacity={aplicada ? 1 : 0.7}
                        disabled={!!aplicada}
                      >
                        <Ionicons name={estadoIcono as any} size={18} color={estadoColor} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={[styles.dosisHora, { color: estadoColor }]}>
                            {item.dosis.horario} — {item.dosis.unidades} U
                          </Text>
                          <Text style={styles.dosisEtiqueta}>
                            {item.dosis.etiqueta || 'Dosis'} • {item.insulina.nombre} • {estadoTexto}
                          </Text>
                        </View>
                        {aplicada ? (
                          <Ionicons name="checkmark-done" size={18} color="#2e7d32" />
                        ) : (
                          <Ionicons name="chevron-forward" size={18} color="#a0aec0" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {insulinaReferencia && (
                <View style={styles.proximaSitioContainer}>
                  <Text style={styles.proximaSitioLabel}>
                    {todasAplicadas ? 'Próxima dosis - RotaSitio:' : '📍 RotaSitio sugerido:'}
                  </Text>
                  <Text style={styles.proximaSitio}>
                    {zonaReferencia.charAt(0).toUpperCase() + zonaReferencia.slice(1)} - Punto {puntoReferencia}
                  </Text>
                  {todasAplicadas && (
                    <Text style={styles.proximaSitioHint}>
                      Todas las dosis de hoy están registradas. Esta es la recomendación para tu próxima dosis.
                    </Text>
                  )}
                </View>
              )}
            </View>
          </LinearGradient>

          <TouchableOpacity style={styles.botonCerrar} onPress={confirmarCerrarSesion}>
            <Text style={styles.botonCerrarTexto}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.seccion1}>
          
          {esUsuarioNuevo && (
            <View style={styles.bannerBienvenida}>
              <View style={styles.bannerIconoContainer}>
                <Ionicons name="sparkles" size={32} color="#308be6" />
              </View>
              <Text style={styles.bannerTitulo}>¡Comienza tu viaje con SyteCycle!</Text>
              <Text style={styles.bannerTexto}>
                Aún no tienes tratamientos registrados. Ingresa a la sección de <Text style={{ fontWeight: 'bold' }}>Tratamiento</Text> para agregar tu insulina o medicamentos y llevar un control completo de tu día a día.
              </Text>
              <TouchableOpacity 
                style={styles.bannerBoton}
                onPress={() => navigation.navigate('Tratamiento')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.bannerBotonTexto}>Ir a Tratamiento</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.medicamentos}>
            <Text style={styles.seccionTitulo}>Medicamentos de hoy</Text>
            {medicamentos.length === 0 ? (
              <Text style={styles.textoSecundario}>No hay medicamentos activos.</Text>
            ) : (
              medicamentos.map((med) => {
                const terminado = tratamientoTerminado(med);
                const maxTomas = tomasPorDia(med.frecuencia);
                const realizadas = tomasHoy[med.id_medicamento] || 0;
                const completado = realizadas >= maxTomas;

                if (terminado) {
                  return (
                    <View key={med.id_medicamento} style={styles.itemTerminado}>
                      <Ionicons name="checkmark-done-circle" size={22} color="#2f855a" />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.itemTerminadoNombre}>{med.nombre}</Text>
                        <Text style={styles.itemTerminadoTexto}>
                          Terminado ({med.duracion_dias} {med.duracion_dias === 1 ? 'día' : 'días'})
                        </Text>
                      </View>
                    </View>
                  );
                }

                return (
                  <View key={med.id_medicamento} style={styles.itemMed}>
                    <TouchableOpacity
                      style={styles.itemMedTouchable}
                      onPress={() => registrarToma(med.id_medicamento, maxTomas)}
                      onLongPress={() => deshacerToma(med.id_medicamento)}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={completado ? "checkmark-circle" : "medical-outline"} 
                        size={20} 
                        color={completado ? "#2e7d32" : "#718096"} 
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[
                          styles.itemMedTexto,
                          completado && { textDecorationLine: 'line-through', color: '#a0aec0' }
                        ]}>
                          {med.nombre} ({med.dosis})
                        </Text>
                        <Text style={styles.itemMedSubtexto}>
                          {med.horario} • {realizadas} de {maxTomas}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.itemMedAcciones}>
                      <View style={[styles.contadorBadge, completado && styles.contadorBadgeCompletado]}>
                        <Text style={[styles.contadorTexto, completado && styles.contadorTextoCompletado]}>
                          {realizadas}/{maxTomas}
                        </Text>
                      </View>
                      {!completado && (
                        <TouchableOpacity onPress={() => registrarToma(med.id_medicamento, maxTomas)}>
                          <Ionicons name="add-circle" size={26} color="#2e7d32" />
                        </TouchableOpacity>
                      )}
                      {completado && (
                        <TouchableOpacity onPress={() => deshacerToma(med.id_medicamento)}>
                          <Ionicons name="refresh-circle" size={24} color="#a0aec0" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.aplicacion}>
            <Text style={styles.seccionTituloSecundaria}>Rotación RotaSitio</Text>
            {insulinaReferencia ? (
              <>
                <Text style={styles.recomendacionTexto}>
                  {todasAplicadas ? 'Próxima dosis:' : 'Siguiente aplicación:'}
                </Text>
                <Text style={styles.recomendacionPunto}>
                  {zonaReferencia.charAt(0).toUpperCase() + zonaReferencia.slice(1)} - Punto {puntoReferencia}
                </Text>
                <Text style={styles.textoSecundario}>
                  {insulinaReferencia.notas 
                    ? `Último: ${insulinaReferencia.notas}` 
                    : 'Sin registros aún'}
                </Text>
              </>
            ) : (
              <Text style={styles.textoSecundario}>Agrega una insulina para comenzar.</Text>
            )}
          </View>

          <View style={styles.progresoContainer}>
            <CirculoProgreso
              porcentaje={adherenciaHoyValor}
              tamaño={150}
              grosor={15}
              etiqueta="Hoy"
            />
            <View style={styles.adherenciaSemanalContainer}>
              <Ionicons name="trending-up" size={16} color="#2e7d32" />
              <Text style={styles.adherenciaSemanalTexto}>
                {adherenciaSemanal}% esta semana
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.botonRegistrar,
          (todasAplicadas || !proximaDosis) && styles.botonRegistrarDeshabilitado,
        ]}
        onPress={() => {
          if (!proximaDosis) {
            Alert.alert('Sin dosis', 'No hay dosis programadas para hoy.');
            return;
          }
          if (todasAplicadas) {
            Alert.alert('Todas registradas', 'Ya registraste todas las dosis de hoy. 🎉');
            return;
          }
          abrirModalParaDosis(proximaDosis);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.textoBotonRegistrar}>
          {todasAplicadas ? 'Todas registradas' : 'Registrar Aplicación'}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalRegistroVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderDecor}>
              <Ionicons name="water" size={24} color="#308be6" />
              <Text style={styles.modalTitulo}>Registrar Aplicación</Text>
            </View>

            {dosisSeleccionada && (
              <View style={styles.infoDosis}>
                <Text style={styles.infoDosisTexto}>
                  {dosisSeleccionada.insulina.nombre} — {dosisSeleccionada.dosis.unidades} U
                </Text>
                <Text style={styles.infoDosisEtiqueta}>
                  {dosisSeleccionada.dosis.etiqueta || 'Dosis'} • Programada: {dosisSeleccionada.dosis.horario}
                </Text>
                <Text style={styles.infoDosisHoraReal}>
                  Hora de registro: {new Date().toTimeString().slice(0, 5)}
                </Text>
              </View>
            )}

            <Text style={styles.labelZona}>Zona del RotaSitio:</Text>
            <View style={styles.selectorZona}>
              {(['abdomen', 'brazo', 'muslo'] as const).map((z) => (
                <TouchableOpacity 
                  key={z} 
                  style={[styles.botonZona, zonaSeleccionada === z && styles.botonZonaActivo]} 
                  onPress={() => setZonaSeleccionada(z)}
                >
                  <Text style={[styles.textoZona, zonaSeleccionada === z && styles.textoZonaActivo]}>
                    {z.charAt(0).toUpperCase() + z.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.labelZona}>Punto (1 al 7):</Text>
            <View style={styles.selectorPuntos}>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                const esSeleccionado = puntoSeleccionado === p;
                return (
                  <TouchableOpacity 
                    key={p} 
                    style={[
                      styles.botonPunto,
                      esSeleccionado && styles.botonPuntoActivo,
                    ]} 
                    onPress={() => setPuntoSeleccionado(p)}
                  >
                    <Text style={[
                      styles.textoPunto,
                      esSeleccionado && styles.textoPuntoActivo,
                    ]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {infoPuntoActual.usadoReciente && (
              <View style={[
                styles.advertenciaPunto,
                infoPuntoActual.nivel === 'advertencia' 
                  ? styles.advertenciaRoja 
                  : styles.advertenciaAmarilla,
              ]}>
                <Ionicons 
                  name="warning" 
                  size={22} 
                  color={infoPuntoActual.nivel === 'advertencia' ? '#c53030' : '#c05621'} 
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[
                    styles.advertenciaTitulo,
                    infoPuntoActual.nivel === 'advertencia' 
                      ? { color: '#c53030' } 
                      : { color: '#c05621' },
                  ]}>
                    ⚠️ Punto utilizado recientemente
                  </Text>
                  <Text style={styles.advertenciaTexto}>
                    {infoPuntoActual.diasDesdeUso === 0
                      ? `Usaste ${zonaSeleccionada} - Punto ${puntoSeleccionado} HOY.`
                      : infoPuntoActual.diasDesdeUso === 1
                        ? `Usaste ${zonaSeleccionada} - Punto ${puntoSeleccionado} AYER.`
                        : `Usaste ${zonaSeleccionada} - Punto ${puntoSeleccionado} hace ${infoPuntoActual.diasDesdeUso} días.`}
                  </Text>
                  <Text style={styles.advertenciaRecomendacion}>
                    Revisa tu patrón de rotación. Puedes cambiar el punto o confirmar si esta fue tu aplicación real.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalBotones}>
              <TouchableOpacity 
                style={[styles.botonModal, styles.botonCancelar]} 
                onPress={() => {
                  setModalRegistroVisible(false);
                  setDosisSeleccionada(null);
                  setInfoPuntoActual({ usadoReciente: false, diasDesdeUso: null, nivel: 'ok' });
                }}
              >
                <Text style={styles.botonTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.botonModal, 
                  styles.botonGuardar,
                  infoPuntoActual.nivel === 'advertencia' && { backgroundColor: '#c53030' },
                  infoPuntoActual.nivel === 'precaucion' && { backgroundColor: '#c05621' },
                ]} 
                onPress={guardarRegistroInyeccion}
              >
                <Text style={styles.botonTextoGuardar}>
                  {infoPuntoActual.usadoReciente ? 'Confirmar de todos modos' : 'Confirmar Aplicación'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, paddingBottom: 150 },
  headerWrapper: { position: 'relative' },
  header: { paddingTop: 70, paddingBottom: 40, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', letterSpacing: 2, paddingLeft: 10 },
  saludo: { fontSize: 16, color: '#ffffffe6', marginTop: 4, paddingLeft: 10 },
  botonCerrar: { position: 'absolute', top: 70, right: 20, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', zIndex: 10 },
  botonCerrarTexto: { color: '#fff', fontSize: 13, fontWeight: '600' },
  proxima: { marginTop: 24, minHeight: 160, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  seccion1: { backgroundColor: '#fff' },
  
  bannerBienvenida: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: '#ebf8ff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#90cdf4',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#308be6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bannerIconoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 4,
  },
  bannerTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
    textAlign: 'center',
    marginBottom: 8,
  },
  bannerTexto: {
    fontSize: 13,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  bannerBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#308be6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 2,
  },
  bannerBotonTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  medicamentos: { marginTop: 24, marginHorizontal: 20, minHeight: 120, backgroundColor: '#d7ffea7a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#c6f6d5' },
  aplicacion: { marginTop: 24, marginHorizontal: 20, backgroundColor: '#e8eafd50', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#c3cffc' },
  botonRegistrar: { position: 'absolute', bottom: 30, alignSelf: 'center', width: '90%', height: 55, borderRadius: 30, backgroundColor: '#308be6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, zIndex: 30 },
  botonRegistrarDeshabilitado: { backgroundColor: '#a0aec0' },
  textoBotonRegistrar: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 24, padding: 22, elevation: 10 },
  modalHeaderDecor: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#edf2f7', paddingBottom: 10 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#3182ce', marginLeft: 10 },
  labelZona: { fontSize: 13, fontWeight: '700', color: '#4a5568', marginBottom: 8, marginTop: 4 },
  selectorZona: { flexDirection: 'row', marginBottom: 14 },
  botonZona: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, alignItems: 'center', marginHorizontal: 3, backgroundColor: '#f7fafc' },
  botonZonaActivo: { backgroundColor: '#3182ce', borderColor: '#3182ce' },
  textoZona: { fontSize: 12, color: '#4a5568', fontWeight: '600' },
  textoZonaActivo: { color: '#fff' },
  selectorPuntos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  botonPunto: { width: '13%', aspectRatio: 1, borderRadius: 50, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7fafc', marginBottom: 8 },
  botonPuntoActivo: { backgroundColor: '#308be6', borderColor: '#308be6' },
  textoPunto: { fontSize: 14, color: '#4a5568', fontWeight: 'bold' },
  textoPuntoActivo: { color: '#fff' },
  modalBotones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, width: '100%' },
  botonModal: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  botonCancelar: { backgroundColor: '#edf2f7', marginRight: 6 },
  botonGuardar: { backgroundColor: '#3182ce', marginLeft: 6 },
  botonTextoCancelar: { color: '#4a5568', fontWeight: 'bold', fontSize: 13 },
  botonTextoGuardar: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  proximaTitulo: { fontSize: 14, fontWeight: '700', color: '#1f4e79', marginLeft: 6 },
  proximaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  proximaDetalle: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 4 },
  proximaSitioLabel: { fontSize: 12, color: '#1f4e79', fontWeight: '700', marginBottom: 2 },
  proximaSitio: { fontSize: 15, color: '#1f4e79', fontWeight: '700' },
  proximaSitioHint: { fontSize: 11, color: '#4a5568', fontStyle: 'italic', marginTop: 4, lineHeight: 15 },
  proximaSitioContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)' },
  seccionTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1b5e20', marginBottom: 8 },
  seccionTituloSecundaria: { fontSize: 16, fontWeight: 'bold', color: '#1a237e', marginBottom: 4 },
  textoSecundario: { fontSize: 13, color: '#555' },
  itemMed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingVertical: 6 },
  itemMedTouchable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  itemMedTexto: { fontSize: 14, color: '#333', fontWeight: '600' },
  itemMedSubtexto: { fontSize: 12, color: '#718096', marginTop: 2 },
  itemMedAcciones: { flexDirection: 'row', alignItems: 'center' },
  contadorBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#edf2f7', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 6 },
  contadorBadgeCompletado: { backgroundColor: '#c6f6d5', borderColor: '#9ae6b4' },
  contadorTexto: { fontSize: 12, fontWeight: 'bold', color: '#718096' },
  contadorTextoCompletado: { color: '#22543d' },
  itemTerminado: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6fffa', borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#b2f5ea' },
  itemTerminadoNombre: { fontSize: 14, fontWeight: 'bold', color: '#234e52' },
  itemTerminadoTexto: { fontSize: 12, color: '#2c7a7b', marginTop: 2 },
  recomendacionTexto: { fontSize: 12, color: '#718096', marginBottom: 2 },
  recomendacionPunto: { fontSize: 18, fontWeight: 'bold', color: '#1a237e', marginBottom: 4 },
  dosisRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  dosisHora: { fontSize: 15, fontWeight: 'bold' },
  dosisEtiqueta: { fontSize: 12, color: '#4a5568', marginTop: 2 },
  infoDosis: { backgroundColor: '#ebf8ff', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#bee3f8' },
  infoDosisTexto: { fontSize: 15, fontWeight: 'bold', color: '#2c5282' },
  infoDosisEtiqueta: { fontSize: 12, color: '#2c5282', marginTop: 2 },
  infoDosisHoraReal: { fontSize: 12, color: '#2e7d32', marginTop: 4, fontWeight: 'bold' },
  advertenciaPunto: { flexDirection: 'row', borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 8, borderWidth: 1, alignItems: 'flex-start' },
  advertenciaRoja: { backgroundColor: '#fff5f5', borderColor: '#feb2b2' },
  advertenciaAmarilla: { backgroundColor: '#fffaf0', borderColor: '#fbd38d' },
  advertenciaTitulo: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  advertenciaTexto: { fontSize: 12, color: '#4a5568', lineHeight: 16 },
  advertenciaRecomendacion: { fontSize: 11, color: '#718096', marginTop: 4, fontStyle: 'italic', lineHeight: 15 },
  progresoContainer: { 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 24, 
    marginBottom: 24,
    minHeight: 200,
    paddingVertical: 10,
    backgroundColor: '#f7fafc',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  adherenciaSemanalContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 12, 
    backgroundColor: '#d7ffea7a', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#c6f6d5' 
  },
  adherenciaSemanalTexto: { fontSize: 13, color: '#22543d', fontWeight: '700', marginLeft: 6 },
});