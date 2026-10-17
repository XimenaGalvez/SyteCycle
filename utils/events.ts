import { DeviceEventEmitter } from 'react-native';

export const EVENTOS = {
  TRATAMIENTO_ACTUALIZADO: 'TRATAMIENTO_ACTUALIZADO',
};

export const emitirTratamientoActualizado = () => {
  DeviceEventEmitter.emit(EVENTOS.TRATAMIENTO_ACTUALIZADO);
};

export const escucharTratamientoActualizado = (callback: () => void) => {
  return DeviceEventEmitter.addListener(EVENTOS.TRATAMIENTO_ACTUALIZADO, callback);
};