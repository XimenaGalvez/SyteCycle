import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const pedirPermisosNotificaciones = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permisos de notificación denegados');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('insulina-recordatorio', {
      name: 'Recordatorios de Tratamiento',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#308be6',
      sound: 'default',
    });
  }

  return true;
};

// ============ INSULINA ============
export const programarNotificacionInsulina = async (
  idInsulina: string,
  nombreInsulina: string,
  tipoInsulina: string,
  unidades: number,
  horario: string
) => {
  try {
    await cancelarNotificacionInsulina(idInsulina);
    const [hora, minuto] = horario.split(':').map(Number);

    const idNotificacion = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💉 SyteCycle - Recordatorio de Insulina',
        body: `Es hora de tu dosis: ${nombreInsulina} (${tipoInsulina}) - ${unidades} U`,
        data: { idInsulina, tipo: 'insulina' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hora,
        minute: minuto,
        channelId: 'insulina-recordatorio',
      },
    });

    console.log(`Notificación programada para ${nombreInsulina} a las ${horario}`);
    return idNotificacion;
  } catch (error) {
    console.error('Error al programar notificación:', error);
    return null;
  }
};

export const cancelarNotificacionInsulina = async (idInsulina: string) => {
  try {
    const notificacionesProgramadas = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of notificacionesProgramadas) {
      if (notif.content.data?.idInsulina === idInsulina) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (error) {
    console.error('Error al cancelar notificación:', error);
  }
};

// ============ MEDICAMENTO (POR FRECUENCIA) ============
export const programarNotificacionesPorFrecuencia = async (
  idMedicamento: string,
  nombreMedicamento: string,
  dosis: string,
  frecuencia: string,
  horarioBase: string // "HH:MM"
) => {
  try {
    // Cancelar todas las notificaciones previas de este medicamento
    await cancelarNotificacionMedicamento(idMedicamento);

    const [horaBase, minutoBase] = horarioBase.split(':').map(Number);

    // Determinar cuántas horas de intervalo según la frecuencia
    let horasIntervalo = 24; // Por defecto: 1 vez al día
    const frecLower = frecuencia.toLowerCase();
    if (frecLower.includes('cada 12')) horasIntervalo = 12;
    else if (frecLower.includes('cada 8')) horasIntervalo = 8;
    else if (frecLower.includes('cada 6')) horasIntervalo = 6;
    else if (frecLower.includes('cada 4')) horasIntervalo = 4;

    const tomasAlDia = Math.floor(24 / horasIntervalo);
    const notificacionesProgramadas: string[] = [];

    for (let i = 0; i < tomasAlDia; i++) {
      const hora = (horaBase + i * horasIntervalo) % 24;

      const idNotif = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 SyteCycle - Recordatorio de Medicamento',
          body: `Es hora de tomar: ${nombreMedicamento} - ${dosis}`,
          data: { idMedicamento, tipo: 'medicamento' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hora,
          minute: minutoBase,
          channelId: 'insulina-recordatorio',
        },
      });

      notificacionesProgramadas.push(idNotif);
      const horaStr = hora.toString().padStart(2, '0');
      const minStr = minutoBase.toString().padStart(2, '0');
      console.log(`✅ Notificación programada para ${nombreMedicamento} a las ${horaStr}:${minStr}`);
    }

    return notificacionesProgramadas;
  } catch (error) {
    console.error('Error al programar notificaciones:', error);
    return [];
  }
};

export const cancelarNotificacionMedicamento = async (idMedicamento: string) => {
  try {
    const notificacionesProgramadas = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of notificacionesProgramadas) {
      if (notif.content.data?.idMedicamento === idMedicamento) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (error) {
    console.error('Error al cancelar notificación:', error);
  }
};

// ============ GENERAL ============
export const cancelarTodasLasNotificaciones = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};