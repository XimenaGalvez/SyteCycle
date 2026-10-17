import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  porcentaje: number;
  tamaño?: number;
  grosor?: number;
  colorFondo?: string;
  etiqueta?: string;
};

export default function CirculoProgreso({
  porcentaje,
  tamaño = 150,
  grosor = 15,
  colorFondo = '#e2e8f0',
  etiqueta = 'Adherencia',
}: Props) {
  const radio = (tamaño - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const progreso = Math.min(Math.max(porcentaje, 0), 100);
  const offset = circunferencia - (progreso / 100) * circunferencia;

  let colorFinal = '#cbd5e0';
  if (progreso >= 80) colorFinal = '#2e7d32';
  else if (progreso >= 50) colorFinal = '#c05621';
  else if (progreso > 0) colorFinal = '#c53030';

  return (
    <View style={[styles.container, { width: tamaño, height: tamaño }]}>
      <Svg width={tamaño} height={tamaño}>
        <Circle
          cx={tamaño / 2}
          cy={tamaño / 2}
          r={radio}
          stroke={colorFondo}
          strokeWidth={grosor}
          fill="none"
        />
        {progreso > 0 && (
          <Circle
            cx={tamaño / 2}
            cy={tamaño / 2}
            r={radio}
            stroke={colorFinal}
            strokeWidth={grosor}
            fill="none"
            strokeDasharray={`${circunferencia} ${circunferencia}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${tamaño / 2}, ${tamaño / 2}`}
          />
        )}
      </Svg>
      <View style={styles.textoContainer}>
        <Text style={[styles.porcentaje, { color: colorFinal }]}>
          {Math.round(progreso)}%
        </Text>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  porcentaje: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  etiqueta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});