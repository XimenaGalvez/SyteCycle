import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CENTROS_INYECCION,
  PUNTOS_ROTACION,
  calcularPosicionPunto,
  calcularSiguienteSitio,
  InfoRotacion,
} from '../constants/bodyMap';
import { ZonaInyeccion } from '../types';

type Props = {
  zonaSiguiente?: ZonaInyeccion;
  puntoSiguiente?: number;
  zonaAnterior?: ZonaInyeccion;
  puntoAnterior?: number;
  notas?: string | null;
  zona?: ZonaInyeccion;
  puntoUsado?: number | null;
  nombreInsulina: string;
  esSiguienteDosis?: boolean;
};

export default function MiniMapaRotaSitio({
  zonaSiguiente,
  puntoSiguiente,
  zonaAnterior,
  puntoAnterior,
  notas,
  zona,
  puntoUsado,
  nombreInsulina,
  esSiguienteDosis = false,
}: Props) {
  let rotacion: InfoRotacion;
  if (zonaSiguiente && puntoSiguiente) {
    rotacion = {
      zonaSiguiente,
      puntoSiguiente,
      zonaAnterior: zonaAnterior || 'abdomen',
      puntoAnterior: puntoAnterior ?? 0,
    };
  } else if (notas !== undefined) {
    rotacion = calcularSiguienteSitio(notas);
  } else if (zona) {
    rotacion = calcularSiguienteSitio(`Zona: ${zona} | Punto: ${puntoUsado ?? 0}`);
  } else {
    rotacion = calcularSiguienteSitio(null);
  }

  const zonaAMostrar = rotacion.zonaSiguiente;
  const puntoAMostrar = rotacion.puntoSiguiente;
  const zonaDelUsado = rotacion.zonaAnterior;
  const puntoDelUsado = rotacion.puntoAnterior;

  const centroAMostrar =
    CENTROS_INYECCION[zonaAMostrar as keyof typeof CENTROS_INYECCION] || CENTROS_INYECCION.abdomen;
  const mostrarParcheGris = zonaAMostrar === zonaDelUsado && puntoDelUsado > 0;

  return (
    <View style={styles.container}>
      <View style={styles.tituloContainer}>
        <Ionicons name="medical" size={14} color="#1f4e79" />
        <Text style={styles.tituloTexto}>
          {esSiguienteDosis ? 'Siguiente dosis' : 'Dosis pendiente'}:{' '}
          <Text style={{ fontWeight: 'bold' }}>{nombreInsulina}</Text>
        </Text>
      </View>

      <ImageBackground
        source={require('../assets/Cuerpo.png')}
        style={styles.imagen}
        resizeMode="contain"
      >
        <View style={[styles.parcheContainer, { top: centroAMostrar.top, left: centroAMostrar.left }]}>
          <View style={styles.donaFondo} />
          {[0, 45, 90, 135].map((angulo) => (
            <View key={angulo} style={[styles.linea, { transform: [{ rotate: `${angulo}deg` }] }]} />
          ))}
          {PUNTOS_ROTACION.map((num, index) => {
            const { x, y } = calcularPosicionPunto(index, 38);
            const esSiguiente = num === puntoAMostrar;
            const esElUsado = num === puntoDelUsado && mostrarParcheGris;

            return (
              <View
                key={num}
                style={[
                  styles.puntoCirculo,
                  { transform: [{ translateX: x }, { translateY: y }] },
                  esSiguiente && styles.puntoSiguiente,
                  esElUsado && styles.puntoUsado,
                ]}
              >
                <Text
                  style={[
                    styles.puntoTexto,
                    esSiguiente && styles.puntoTextoSiguiente,
                    esElUsado && styles.puntoTextoUsado,
                  ]}
                >
                  {num}
                </Text>
              </View>
            );
          })}
        </View>
      </ImageBackground>

      <View style={styles.infoRotacion}>
        <View style={styles.sugerenciaCaja}>
          <Text style={styles.sugerenciaLabel}>Te toca aplicar en:</Text>
          <Text style={styles.sugerenciaValor}>
            {zonaAMostrar.toUpperCase()} • PUNTO {puntoAMostrar}
          </Text>
        </View>

        {puntoDelUsado > 0 ? (
          <Text style={styles.ultimoTexto}>
            (Último aplicado: {zonaDelUsado.toUpperCase()} • Punto {puntoDelUsado})
          </Text>
        ) : (
          <Text style={styles.ultimoTexto}>
            (Sin aplicaciones previas registradas)
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  tituloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tituloTexto: {
    fontSize: 13,
    color: '#1f4e79',
  },
  imagen: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parcheContainer: {
    position: 'absolute',
    width: 90,
    height: 90,
    marginLeft: -45,
    marginTop: -45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donaFondo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderColor: '#308be6',
  },
  linea: {
    position: 'absolute',
    width: 90,
    height: 1.5,
    backgroundColor: '#B0BEC5',
  },
  puntoCirculo: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#308be6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntoSiguiente: {
    backgroundColor: '#308be6',
    borderColor: '#1f4e79',
    transform: [{ scale: 1.25 }],
    elevation: 3,
  },
  puntoUsado: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E0',
  },
  puntoTexto: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#308be6',
  },
  puntoTextoSiguiente: {
    color: '#FFF',
  },
  puntoTextoUsado: {
    color: '#A0AEC0',
  },
  infoRotacion: {
    alignItems: 'center',
    marginTop: 4,
  },
  sugerenciaCaja: {
    backgroundColor: '#e6f4fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  sugerenciaLabel: {
    fontSize: 10,
    color: '#1f4e79',
  },
  sugerenciaValor: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#308be6',
  },
  ultimoTexto: {
    fontSize: 10,
    color: '#718096',
    marginTop: 4,
  },
});
