import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { crearUsuario } from '../database/queries';

const validarNombre = (nombre: string): string | null => {
  const limpio = nombre.trim();
  if (limpio.length === 0) return 'El nombre no puede estar vacío.';
  if (limpio.length < 2) return 'El nombre debe tener al menos 2 letras.';
  if (limpio.length > 50) return 'El nombre es demasiado largo.';
  const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/;
  if (!regex.test(limpio)) return 'El nombre solo puede tener letras y espacios.';
  return null;
};

const validarPeso = (peso: string): string | null => {
  if (!peso.trim()) return null;
  const numero = parseFloat(peso.replace(',', '.'));
  if (isNaN(numero)) return 'El peso debe ser un número.';
  if (numero <= 0) return 'El peso debe ser mayor a 0.';
  if (numero > 300) return 'El peso es un poco elevado.';
  return null;
};

const validarFecha = (fecha: string): string | null => {
  if (!fecha.trim()) return null;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) return 'Usa el formato AAAA-MM-DD (ej: 2005-08-15).';

  const [anioStr, mesStr, diaStr] = fecha.split('-');
  const anio = parseInt(anioStr, 10);
  const mes = parseInt(mesStr, 10);
  const dia = parseInt(diaStr, 10);
  const anioActual = new Date().getFullYear();

  if (anio < 1900) return 'El año debe ser mayor.';
  if (anio > anioActual) return `El año no puede ser mayor a ${anioActual}.`;
  if (mes < 1 || mes > 12) return 'El mes debe estar entre 01 y 12.';

  const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const esBisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  const maxDias = mes === 2 && esBisiesto ? 29 : diasPorMes[mes - 1];

  if (dia < 1 || dia > maxDias) return `El mes ${mes} tiene máximo ${maxDias} días.`;

  const fechaIngresada = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fechaIngresada > hoy) return 'La fecha no puede ser futura.';

  return null;
};

const validarContrasena = (contrasena: string): string | null => {
  if (contrasena.length === 0) return 'La contraseña no puede estar vacía.';
  if (contrasena.length < 4) return 'La contraseña debe tener al menos 4 caracteres.';
  if (contrasena.length > 50) return 'La contraseña es demasiado larga.';
  return null;
};

type Props = {
  onUsuarioCreado: () => void;
};

export default function CrearUsuarioScreen({ onUsuarioCreado }: Props) {
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [peso, setPeso] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    const errorNombre = validarNombre(nombre);
    if (errorNombre) return Alert.alert('Nombre inválido', errorNombre);

    const errorContrasena = validarContrasena(contrasena);
    if (errorContrasena) return Alert.alert('Contraseña inválida', errorContrasena);

    const errorPeso = validarPeso(peso);
    if (errorPeso) return Alert.alert('Peso inválido', errorPeso);

    const errorFecha = validarFecha(fechaNacimiento);
    if (errorFecha) return Alert.alert('Fecha inválida', errorFecha);

    try {
      setGuardando(true);
      await crearUsuario({
        nombre: nombre.trim(),
        contrasena,
        peso: peso.trim() ? parseFloat(peso.replace(',', '.')) : undefined,
        fecha_nacimiento: fechaNacimiento.trim() || undefined,
      });
      onUsuarioCreado();
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={['#308be6', '#d7fbcf']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.appName}>SYTECYCLE</Text>
          <Text style={styles.saludo}>¡Bienvenido/a!</Text>
          <Text style={styles.subtitulo}>
            Cuéntanos un poco sobre ti para empezar.
          </Text>
        </LinearGradient>

        <View style={styles.form}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa tu nombre."
            value={nombre}
            onChangeText={setNombre}
            maxLength={50}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 4 caracteres"
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry
            maxLength={50}
          />

          <Text style={styles.label}>Peso (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="00.0"
            value={peso}
            onChangeText={setPeso}
            keyboardType="decimal-pad"
            maxLength={6}
          />

          <Text style={styles.label}>Fecha de nacimiento</Text>
          <TextInput
            style={styles.input}
            placeholder="AAAA-MM-DD"
            value={fechaNacimiento}
            onChangeText={setFechaNacimiento}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          <TouchableOpacity
            style={styles.boton}
            onPress={handleGuardar}
            disabled={guardando}
          >
            <Text style={styles.botonTexto}>
              {guardando ? 'Guardando...' : 'Continuar'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    paddingLeft: 10,
  },
  saludo: {
    fontSize: 20,
    color: '#fff',
    marginTop: 18,
    fontWeight: '600',
    paddingLeft: 10,
  },
  subtitulo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 14,
    paddingLeft: 10,
  },
  form: { padding: 24, gap: 8 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  boton: {
    marginTop: 32,
    backgroundColor: '#308be6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});