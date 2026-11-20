import { ZonaInyeccion } from '../types';

export const CENTROS_INYECCION = {
  abdomen: { top: '47%', left: '50%' },
  brazo: { top: '35%', left: '38%' },
  muslo: { top: '55%', left: '44%' },
} as const;

export const PUNTOS_ROTACION = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const ZONAS_ROTACION: ZonaInyeccion[] = ['abdomen', 'brazo', 'muslo'];

export const RADIO_DONA = 42;

export type InfoRotacion = {
  zonaSiguiente: ZonaInyeccion;
  puntoSiguiente: number;
  zonaAnterior: ZonaInyeccion;
  puntoAnterior: number;
};

/**
 * Calcula el siguiente punto y zona de inyección siguiendo el ciclo:
 * abdomen -> brazo -> muslo -> abdomen... (8 puntos por zona)
 */
export function calcularSiguienteSitio(notas: string | null | undefined): InfoRotacion {
  if (!notas) {
    return {
      zonaSiguiente: 'abdomen',
      puntoSiguiente: 1,
      zonaAnterior: 'abdomen',
      puntoAnterior: 0,
    };
  }

  const matchZona = notas.match(/Zona:\s*(\w+)/i);
  const matchPunto = notas.match(/Punto:\s*(\d+)/i);

  let zonaAnterior: ZonaInyeccion = 'abdomen';
  if (matchZona) {
    const z = matchZona[1].toLowerCase().trim();
    if (z === 'brazo' || z === 'muslo' || z === 'abdomen') {
      zonaAnterior = z as ZonaInyeccion;
    }
  }

  const puntoAnterior = matchPunto ? parseInt(matchPunto[1], 10) : 0;

  // Si no se ha aplicado aún (Punto: 0), el siguiente es el punto 1 de la misma zona
  if (puntoAnterior === 0) {
    return {
      zonaSiguiente: zonaAnterior,
      puntoSiguiente: 1,
      zonaAnterior,
      puntoAnterior: 0,
    };
  }

  // Si completó los 8 puntos de la zona actual, avanzar a la siguiente zona
  if (puntoAnterior >= 8) {
    const idx = ZONAS_ROTACION.indexOf(zonaAnterior);
    const siguienteZona = ZONAS_ROTACION[(idx >= 0 ? idx + 1 : 0) % ZONAS_ROTACION.length];
    return {
      zonaSiguiente: siguienteZona,
      puntoSiguiente: 1,
      zonaAnterior,
      puntoAnterior,
    };
  }

  // Si está entre 1 y 7, avanza al siguiente punto en la misma zona
  return {
    zonaSiguiente: zonaAnterior,
    puntoSiguiente: puntoAnterior + 1,
    zonaAnterior,
    puntoAnterior,
  };
}

/**
 * Calcula las coordenadas (x, y) de un punto en el círculo de rotación
 * @param index Índice de 0 a 7
 * @param radio Radio en píxeles (por defecto RADIO_DONA)
 */
export function calcularPosicionPunto(index: number, radio: number = RADIO_DONA) {
  const angulo = (index * 360) / 8 - 90;
  const rad = (angulo * Math.PI) / 180;
  const x = Math.round(radio * Math.cos(rad));
  const y = Math.round(radio * Math.sin(rad));
  return { x, y, angulo };
}
