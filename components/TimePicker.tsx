import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  value: string;
  onChange: (hora: string) => void;
  label?: string;
};

export default function TimePicker({ value, onChange, label }: Props) {
  const [mostrar, setMostrar] = useState(false);
  const [horaTemporal, setHoraTemporal] = useState<Date>(new Date());

  const getDateFromString = () => {
    const [h, m] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 8);
    d.setMinutes(m || 0);
    return d;
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setMostrar(false);
    }
    if (event.type === 'dismissed') {
      setMostrar(false);
      return;
    }
    if (selectedDate) {
      setHoraTemporal(selectedDate);
      const horas = selectedDate.getHours().toString().padStart(2, '0');
      const minutos = selectedDate.getMinutes().toString().padStart(2, '0');
      onChange(`${horas}:${minutos}`);
    }
  };

  const handleConfirmarIOS = () => {
    if (!value) {
      const horas = getDateFromString().getHours().toString().padStart(2, '0');
      const minutos = getDateFromString().getMinutes().toString().padStart(2, '0');
      onChange(`${horas}:${minutos}`);
    } else {
      const horas = horaTemporal.getHours().toString().padStart(2, '0');
      const minutos = horaTemporal.getMinutes().toString().padStart(2, '0');
      onChange(`${horas}:${minutos}`);
    }
    setMostrar(false);
  };

  const formatearHora12 = (hora24: string) => {
    if (!hora24) return 'Seleccionar hora';
    const [h, m] = hora24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={styles.inputBoton}
        onPress={() => {
          setHoraTemporal(getDateFromString());
          setMostrar(true);
        }}
      >
        <Ionicons name="time-outline" size={20} color="#308be6" />
        <Text style={[styles.textoHora, !value && styles.placeholder]}>
          {formatearHora12(value)}
        </Text>
      </TouchableOpacity>

      {/* --- MODO ANDROID --- */}
      {Platform.OS === 'android' && mostrar && (
        <DateTimePicker
          value={getDateFromString()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleChange}
        />
      )}

      {/* --- MODO iOS (MODAL) --- */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={mostrar}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMostrar(false)}
        >
          <View style={styles.modalFondo}>
            <View style={styles.modalContenido}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setMostrar(false)}>
                  <Text style={styles.botonCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitulo}>Selecciona la hora</Text>
                <TouchableOpacity onPress={handleConfirmarIOS}>
                  <Text style={styles.botonListo}>Listo</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={horaTemporal}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleChange}
                textColor="#000000"
                style={{ height: 180 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 10,
  },
  inputBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  textoHora: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  modalFondo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContenido: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  botonCancelar: {
    fontSize: 16,
    color: '#e53e3e',
  },
  botonListo: {
    fontSize: 16,
    color: '#308be6',
    fontWeight: 'bold',
  },
});
