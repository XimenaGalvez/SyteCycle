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
      const horas = selectedDate.getHours().toString().padStart(2, '0');
      const minutos = selectedDate.getMinutes().toString().padStart(2, '0');
      onChange(`${horas}:${minutos}`);
    }
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
        onPress={() => setMostrar(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="time-outline" size={20} color="#308be6" />
        <Text style={[
          styles.inputTexto,
          !value && { color: '#a0aec0', fontWeight: '400' }
        ]}>
          {formatearHora12(value)}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#a0aec0" />
      </TouchableOpacity>

      {Platform.OS === 'ios' && mostrar && (
        <Modal transparent animationType="slide" visible={mostrar}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setMostrar(false)}>
                  <Text style={styles.modalBoton}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={getDateFromString()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleChange}
                textColor="#000000"
                themeVariant="light"
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && mostrar && (
        <DateTimePicker
          value={getDateFromString()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a5568',
    marginBottom: 4,
    marginLeft: 2,
  },
  inputBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#f7fafc',
    marginBottom: 12,
  },
  inputTexto: {
    fontSize: 15,
    color: '#2d3748',
    marginLeft: 10,
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  modalBoton: {
    color: '#308be6',
    fontWeight: 'bold',
    fontSize: 16,
  },
});