import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CENTROS_INYECCION,
  PUNTOS_ROTACION,
  calcularPosicionPunto,
} from '../constants/bodyMap';
import { ZonaInyeccion } from '../types';

type Props = {
  zona: ZonaInyeccion;
  puntoUsado: number | null;
  nombreInsulina: string;
  esSiguienteDosis?: boolean;
};

export default function MiniMapaRotaSitio({
  zona,
  puntoUsado,
  nombreInsulina,
  esSiguienteDosis = false,
}: Props) {
  const calcularSiguiente = (zonaActual: string, puntoActual: number | null) => {
    if (!puntoActual) return { zonaAMostrar: 'abdomen', puntoAMostrar: 1, zonaDelUsado: 'abdomen' };

    if (puntoActual >= 8) {
      const zonas = ['abdomen', 'brazo', 'muslo'];
      const indexActual = zonas.indexOf(zonaActual);
      const siguienteZona = zonas[(indexActual + 1) % 3];
      return { zonaAMostrar: siguienteZona, puntoAMostrar: 1, zonaDelUsado: zonaActual };
    }

    return { zonaAMostrar: zonaActual, puntoAMostrar: puntoActual + 1, zonaDelUsado: zonaActual };
  };

  const { zonaAMostrar, puntoAMostrar, zonaDelUsado } = calcularSiguiente(zona, puntoUsado);
  const centroAMostrar =
    CENTROS_INYECCION[zonaAMostrar as keyof typeof CENTROS_INYECCION] || CENTROS_INYECCION.abdomen;
  const mostrarParcheGris = zonaAMostrar === zonaDelUsado;

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
            const esElUsado = num === puntoUsado && mostrarParcheGris;

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

        {puntoUsado && (
          <Text style={styles.ultimoTexto}>
            (Último aplicado: {zona.toUpperCase()} • Punto {puntoUsado})
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
