import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import {
  CENTROS_INYECCION,
  PUNTOS_ROTACION,
  calcularPosicionPunto,
} from '../constants/bodyMap';
import { ZonaInyeccion } from '../types';

type Props = {
  zonaSeleccionada: ZonaInyeccion;
  puntoSeleccionado: number;
  onSelectZona: (zona: ZonaInyeccion) => void;
  onSelectPunto: (punto: number) => void;
  puntosUsados?: number[];
  puntoAnterior?: number | null;
};

export default function CuerpoHumano({
  zonaSeleccionada,
  puntoSeleccionado,
  onSelectZona,
  onSelectPunto,
  puntosUsados = [],
  puntoAnterior = null,
}: Props) {
  const centro = CENTROS_INYECCION[zonaSeleccionada] || CENTROS_INYECCION.abdomen;

  return (
    <View style={styles.container}>
      <View style={styles.selectorZona}>
        {(['abdomen', 'brazo', 'muslo'] as const).map((z) => (
          <TouchableOpacity
            key={z}
            style={[styles.botonZona, zonaSeleccionada === z && styles.botonZonaActivo]}
            onPress={() => {
              onSelectZona(z);
              onSelectPunto(1);
            }}
          >
            <Text style={[styles.textoZona, zonaSeleccionada === z && styles.textoZonaActivo]}>
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ImageBackground
        source={require('../assets/Cuerpo.png')}
        style={styles.imagen}
        resizeMode="contain"
      >
        <View style={[styles.parcheContainer, { top: centro.top, left: centro.left }]}>
          <View style={styles.donaFondo} />
          {[0, 45, 90, 135].map((angulo) => (
            <View key={angulo} style={[styles.linea, { transform: [{ rotate: `${angulo}deg` }] }]} />
          ))}
          {PUNTOS_ROTACION.map((num, index) => {
            const { x, y } = calcularPosicionPunto(index, 46);
            const esSeleccionado = puntoSeleccionado === num;
            const esUsado = puntosUsados.includes(num);
            const esPuntoAnterior = puntoAnterior === num;

            return (
              <TouchableOpacity
                key={num}
                style={[
                  styles.puntoBtn,
                  { transform: [{ translateX: x }, { translateY: y }] },
                  esSeleccionado && styles.puntoSeleccionado,
                  (esPuntoAnterior || esUsado) && !esSeleccionado && styles.puntoUsado,
                ]}
                onPress={() => onSelectPunto(num)}
              >
                <Text
                  style={[
                    styles.puntoTexto,
                    esSeleccionado && styles.puntoTextoActivo,
                    (esPuntoAnterior || esUsado) && !esSeleccionado && styles.puntoTextoUsado,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ImageBackground>

      {/* Selector con botones grandes para accesibilidad */}
      <Text style={styles.instruccionTexto}>O elige el punto aquí:</Text>
      <View style={styles.botonesGrandesContainer}>
        {PUNTOS_ROTACION.map((num) => {
          const esSeleccionado = puntoSeleccionado === num;
          const esUsado = puntosUsados.includes(num);
          const esPuntoAnterior = puntoAnterior === num;

          return (
            <TouchableOpacity
              key={num}
              style={[
                styles.botonGrande,
                esSeleccionado && styles.botonGrandeSeleccionado,
                (esPuntoAnterior || esUsado) && !esSeleccionado && styles.botonGrandeUsado,
              ]}
              onPress={() => onSelectPunto(num)}
            >
              <Text
                style={[
                  styles.botonGrandeTexto,
                  esSeleccionado && styles.botonGrandeTextoSeleccionado,
                  (esPuntoAnterior || esUsado) && !esSeleccionado && styles.botonGrandeTextoUsado,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 0 },
  selectorZona: { flexDirection: 'row', marginBottom: 14 },
  botonZona: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3,
    backgroundColor: '#f7fafc',
  },
  botonZonaActivo: { backgroundColor: '#3182ce', borderColor: '#3182ce' },
  textoZona: { fontSize: 12, color: '#4a5568', fontWeight: '600' },
  textoZonaActivo: { color: '#fff' },
  imagen: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    marginBottom: -10,
  },
  parcheContainer: {
    position: 'absolute',
    width: 110,
    height: 110,
    marginLeft: -55,
    marginTop: -55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donaFondo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderColor: '#308be6',
  },
  linea: { position: 'absolute', width: 110, height: 1.5, backgroundColor: '#B0BEC5' },
  puntoBtn: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#308be6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntoSeleccionado: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
    transform: [{ scale: 1.15 }],
  },
  puntoUsado: { backgroundColor: '#E2E8F0', borderColor: '#CBD5E0' },
  puntoTexto: { fontSize: 12, fontWeight: 'bold', color: '#308be6' },
  puntoTextoActivo: { color: '#FFF' },
  puntoTextoUsado: { color: '#A0AEC0' },
  instruccionTexto: {
    fontSize: 13,
    color: '#4a5568',
    marginTop: 10,
    marginBottom: 8,
    fontWeight: '600',
  },
  botonesGrandesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    width: '100%',
  },
  botonGrande: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  botonGrandeSeleccionado: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
    elevation: 3,
  },
  botonGrandeUsado: {
    backgroundColor: '#F7FAFC',
    borderColor: '#E2E8F0',
  },
  botonGrandeTexto: { fontSize: 18, fontWeight: 'bold', color: '#4a5568' },
  botonGrandeTextoSeleccionado: { color: '#fff' },
  botonGrandeTextoUsado: { color: '#CBD5E0' },
});
