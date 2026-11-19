export const CENTROS_INYECCION = {
  abdomen: { top: '47%', left: '50%' },
  brazo: { top: '35%', left: '38%' },
  muslo: { top: '55%', left: '44%' },
} as const;

export const PUNTOS_ROTACION = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const RADIO_DONA = 42;

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
