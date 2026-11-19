import { db, generarId } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Usuario,
  Insulina,
  Dosis,
  Medicamento,
  AplicacionInsulina,
  TomaMedicamento,
  EstadisticasUsuario,
} from '../types';

export type { Usuario } from '../types';

// ==========================================
// --- SEGURIDAD: HASHING DE CONTRASEÑA ---
// ==========================================

const SALT_APP = 'sytecycle_secure_salt_v1';

export const hashContrasena = async (texto: string): Promise<string> => {
  // Import lazy: evita crash al cargar módulo en Expo Go si native no está listo
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Crypto = require('expo-crypto') as typeof import('expo-crypto');
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${SALT_APP}_${texto.trim()}`
  );
};

// ==========================================
// --- GESTIÓN DE SESIÓN (AsyncStorage) ---
// ==========================================

export const guardarSesion = async (idUsuario: string) => {
  await AsyncStorage.setItem('@sytecycle_user_id', idUsuario);
};

export const cerrarSesion = async () => {
  await AsyncStorage.removeItem('@sytecycle_user_id');
};

export const obtenerUsuarioActivo = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('@sytecycle_user_id');
};

// ==========================================
// --- CRUD DE USUARIO ---
// ==========================================

export const crearUsuario = async (datos: {
  nombre: string;
  contrasena: string;
  fecha_nacimiento?: string;
  peso?: number;
}): Promise<string> => {
  const nombreLimpio = datos.nombre.trim();

  // 1. Validar si ya existe un usuario con el mismo nombre
  const existe = await db.getFirstAsync<{ id_usuario: string }>(
    `SELECT id_usuario FROM usuario WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1`,
    [nombreLimpio]
  );

  if (existe) {
    throw new Error('Ya existe un usuario con este nombre. Elige otro nombre.');
  }

  // 2. Hashear la contraseña con sal antes de guardarla
  const passHash = await hashContrasena(datos.contrasena);
  const id = generarId();

  try {
    await db.runAsync(
      `INSERT INTO usuario (id_usuario, nombre, contrasena, fecha_nacimiento, peso)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        nombreLimpio,
        passHash,
        datos.fecha_nacimiento ?? null,
        datos.peso ?? null,
      ]
    );

    // Iniciar sesión automáticamente
    await guardarSesion(id);
    return id;
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    if (error?.message?.includes('CHECK')) {
      throw new Error('Los datos del usuario no son válidos.');
    }
    throw new Error('No se pudo crear el usuario.');
  }
};

export const validarCredenciales = async (
  nombre: string,
  contrasena: string
): Promise<Usuario | null> => {
  const nombreLimpio = nombre.trim();
  const usuario = await db.getFirstAsync<Usuario>(
    `SELECT * FROM usuario WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1`,
    [nombreLimpio]
  );

  if (!usuario) {
    return null;
  }

  // Validar con hash
  const passHash = await hashContrasena(contrasena);
  let coincide = usuario.contrasena === passHash;

  // Migración transparente para cuentas preexistentes en texto plano
  if (!coincide && usuario.contrasena === contrasena) {
    coincide = true;
    try {
      // Actualizar automáticamente la contraseña antigua con el nuevo hash
      await db.runAsync(
        `UPDATE usuario SET contrasena = ? WHERE id_usuario = ?`,
        [passHash, usuario.id_usuario]
      );
    } catch (e) {
      console.warn('No se pudo migrar contraseña a hash:', e);
    }
  }

  if (coincide) {
    await guardarSesion(usuario.id_usuario);
    return usuario;
  }

  return null;
};

export const obtenerUsuario = async (): Promise<Usuario | null> => {
  const idActivo = await obtenerUsuarioActivo();
  if (!idActivo) return null;

  const resultado = await db.getFirstAsync<Usuario>(
    `SELECT * FROM usuario WHERE id_usuario = ? LIMIT 1`,
    [idActivo]
  );
  return resultado ?? null;
};

export const eliminarCuenta = async (): Promise<void> => {
  const idActivo = await obtenerUsuarioActivo();
  if (!idActivo) return;

  try {
    await db.runAsync(`DELETE FROM usuario WHERE id_usuario = ?`, [idActivo]);
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
  } finally {
    await cerrarSesion();
  }
};

export const actualizarUsuario = async (datos: {
  nombre?: string;
  fecha_nacimiento?: string | null;
  peso?: number | null;
  relacion_insulina_carbohidrato?: number | null;
}): Promise<void> => {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new Error('No hay usuario activo');

  const campos: string[] = [];
  const valores: any[] = [];

  if (datos.nombre !== undefined) {
    campos.push('nombre = ?');
    valores.push(datos.nombre.trim());
  }
  if (datos.fecha_nacimiento !== undefined) {
    campos.push('fecha_nacimiento = ?');
    valores.push(datos.fecha_nacimiento);
  }
  if (datos.peso !== undefined) {
    campos.push('peso = ?');
    valores.push(datos.peso);
  }
  if (datos.relacion_insulina_carbohidrato !== undefined) {
    campos.push('relacion_insulina_carbohidrato = ?');
    valores.push(datos.relacion_insulina_carbohidrato);
  }

  if (campos.length === 0) return;

  valores.push(usuario.id_usuario);
  await db.runAsync(
    `UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = ?`,
    valores
  );
};

// ==========================================
// --- TRATAMIENTOS (INSULINA & MEDICAMENTOS)
// ==========================================

export const obtenerTratamientosUsuario = async (userId: string): Promise<{
  insulinas: Insulina[];
  dosisPorInsulina: { [key: string]: Dosis[] };
  dosisTodas: Dosis[];
  medicamentos: Medicamento[];
}> => {
  const insulinas = await db.getAllAsync<Insulina>(
    'SELECT * FROM insulina WHERE id_usuario = ? AND activo = 1 ORDER BY created_at DESC',
    [userId]
  );

  // Obtener todas las dosis en UNA SOLA consulta (Elimina el problema N+1)
  const dosisTodas = await db.getAllAsync<Dosis>(
    `SELECT d.* FROM dosis_insulina d
     INNER JOIN insulina i ON d.insulina_id = i.id_insulina
     WHERE i.id_usuario = ? AND i.activo = 1
     ORDER BY d.horario ASC`,
    [userId]
  );

  const dosisPorInsulina: { [key: string]: Dosis[] } = {};
  for (const ins of insulinas) {
    dosisPorInsulina[ins.id_insulina] = [];
  }
  for (const d of dosisTodas) {
    if (dosisPorInsulina[d.insulina_id]) {
      dosisPorInsulina[d.insulina_id].push(d);
    }
  }

  const medicamentos = await db.getAllAsync<Medicamento>(
    'SELECT * FROM medicamento WHERE id_usuario = ? AND activo = 1 ORDER BY horario ASC',
    [userId]
  );

  return { insulinas, dosisPorInsulina, dosisTodas, medicamentos };
};

// ==========================================
// --- TOMAS Y APLICACIONES DEL DÍA ---
// ==========================================

export const obtenerTomasHoy = async (
  userId: string,
  fecha: string
): Promise<{ [key: string]: number }> => {
  const tomas = await db.getAllAsync<{ medicamento_id: string; total: number }>(
    `SELECT t.medicamento_id, COUNT(*) as total
     FROM toma_medicamento t
     INNER JOIN medicamento m ON t.medicamento_id = m.id_medicamento
     WHERE t.fecha = ? AND t.estado = 'Realizado' AND m.id_usuario = ?
     GROUP BY t.medicamento_id`,
    [fecha, userId]
  );

  const mapa: { [key: string]: number } = {};
  tomas.forEach((t) => {
    mapa[t.medicamento_id] = t.total;
  });
  return mapa;
};

export const obtenerAplicacionesHoy = async (
  userId: string,
  fecha: string
): Promise<{ [key: string]: { hora: string } }> => {
  const aplicaciones = await db.getAllAsync<{ dosis_id: string; hora: string }>(
    `SELECT a.dosis_id, a.hora
     FROM aplicacion_insulina a
     INNER JOIN insulina i ON a.insulina_id = i.id_insulina
     WHERE a.fecha = ? AND a.dosis_id IS NOT NULL AND i.id_usuario = ?`,
    [fecha, userId]
  );

  const mapa: { [key: string]: { hora: string } } = {};
  aplicaciones.forEach((a) => {
    if (a.dosis_id) {
      mapa[a.dosis_id] = { hora: a.hora };
    }
  });
  return mapa;
};

export const registrarTomaMedicamento = async (
  medicamentoId: string,
  fecha: string,
  hora: string
): Promise<string> => {
  const idToma = generarId();
  await db.runAsync(
    `INSERT INTO toma_medicamento (id_toma_medicamento, medicamento_id, fecha, hora, estado)
     VALUES (?, ?, ?, ?, 'Realizado')`,
    [idToma, medicamentoId, fecha, hora]
  );
  return idToma;
};

export const deshacerUltimaTomaMedicamento = async (
  medicamentoId: string,
  fecha: string
): Promise<void> => {
  await db.runAsync(
    `DELETE FROM toma_medicamento
     WHERE id_toma_medicamento IN (
       SELECT id_toma_medicamento FROM toma_medicamento
       WHERE medicamento_id = ? AND fecha = ?
       ORDER BY hora DESC LIMIT 1
     )`,
    [medicamentoId, fecha]
  );
};

export const registrarAplicacionInsulina = async (datos: {
  insulinaId: string;
  dosisId: string | null;
  unidades: number;
  fecha: string;
  hora: string;
  zona: string;
  sitioDetalle: string;
  notas?: string | null;
}): Promise<string> => {
  const idApp = generarId();
  await db.runAsync(
    `INSERT INTO aplicacion_insulina (id_aplicacion_insulina, insulina_id, dosis_id, unidades, fecha, hora, zona, sitio_detalle, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      idApp,
      datos.insulinaId,
      datos.dosisId,
      datos.unidades,
      datos.fecha,
      datos.hora,
      datos.zona,
      datos.sitioDetalle,
      datos.notas ?? null,
    ]
  );
  return idApp;
};

export const deshacerUltimaAplicacionInsulina = async (
  insulinaId: string,
  dosisId: string,
  fecha: string
): Promise<void> => {
  await db.runAsync(
    `DELETE FROM aplicacion_insulina
     WHERE id_aplicacion_insulina IN (
       SELECT id_aplicacion_insulina FROM aplicacion_insulina
       WHERE insulina_id = ? AND dosis_id = ? AND fecha = ?
       ORDER BY hora DESC LIMIT 1
     )`,
    [insulinaId, dosisId, fecha]
  );
};

// ==========================================
// --- HISTORIAL COMPLETO DE USUARIO ---
// ==========================================

export const obtenerHistorialUsuario = async (userId: string): Promise<{
  aplicaciones: AplicacionInsulina[];
  insulinas: { id_insulina: string; nombre: string; tipo: string; activo: number }[];
  dosis: { id_dosis: string; etiqueta: string | null; horario: string }[];
  tomas: TomaMedicamento[];
  medicamentos: { id_medicamento: string; nombre: string; dosis: string; activo: number }[];
}> => {
  const aplicaciones = await db.getAllAsync<AplicacionInsulina>(
    `SELECT a.* FROM aplicacion_insulina a
     INNER JOIN insulina i ON a.insulina_id = i.id_insulina
     WHERE i.id_usuario = ?
     ORDER BY a.fecha DESC, a.hora DESC`,
    [userId]
  );

  const insulinas = await db.getAllAsync<{ id_insulina: string; nombre: string; tipo: string; activo: number }>(
    `SELECT id_insulina, nombre, tipo, activo FROM insulina WHERE id_usuario = ?`,
    [userId]
  );

  const dosis = await db.getAllAsync<{ id_dosis: string; etiqueta: string | null; horario: string }>(
    `SELECT d.id_dosis, d.etiqueta, d.horario FROM dosis_insulina d
     INNER JOIN insulina i ON d.insulina_id = i.id_insulina
     WHERE i.id_usuario = ?`,
    [userId]
  );

  const tomas = await db.getAllAsync<TomaMedicamento>(
    `SELECT t.* FROM toma_medicamento t
     INNER JOIN medicamento m ON t.medicamento_id = m.id_medicamento
     WHERE m.id_usuario = ? AND t.estado = 'Realizado'
     ORDER BY t.fecha DESC, t.hora DESC`,
    [userId]
  );

  const medicamentos = await db.getAllAsync<{ id_medicamento: string; nombre: string; dosis: string; activo: number }>(
    `SELECT id_medicamento, nombre, dosis, activo FROM medicamento WHERE id_usuario = ?`,
    [userId]
  );

  return { aplicaciones, insulinas, dosis, tomas, medicamentos };
};

// ==========================================
// --- ESTADÍSTICAS DEL USUARIO ---
// ==========================================

export const obtenerEstadisticasUsuario = async (): Promise<EstadisticasUsuario> => {
  try {
    const usuario = await obtenerUsuario();
    if (!usuario) {
      return { diasUsando: 0, totalAplicaciones: 0, totalTomas: 0, adherenciaPromedio: 0 };
    }

    // 1. Días usando la app
    const fechaInicio = new Date(usuario.created_at);
    const hoy = new Date();
    const diffMs = hoy.getTime() - fechaInicio.getTime();
    const diasUsando = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    // 2. Totales históricos filtrados por el usuario activo
    const resultadoApp = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total FROM aplicacion_insulina a
       INNER JOIN insulina i ON a.insulina_id = i.id_insulina
       WHERE i.id_usuario = ?`,
      [usuario.id_usuario]
    );
    const totalAplicaciones = resultadoApp?.total || 0;

    const resultadoTomas = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total FROM toma_medicamento t
       INNER JOIN medicamento m ON t.medicamento_id = m.id_medicamento
       WHERE m.id_usuario = ? AND t.estado = 'Realizado'`,
      [usuario.id_usuario]
    );
    const totalTomas = resultadoTomas?.total || 0;

    // 3. Fecha del primer tratamiento del usuario
    const primerInsulina = await db.getFirstAsync<{ fecha: string }>(
      `SELECT MIN(created_at) as fecha FROM insulina WHERE id_usuario = ?`,
      [usuario.id_usuario]
    );
    const primerMedicamento = await db.getFirstAsync<{ fecha: string }>(
      `SELECT MIN(created_at) as fecha FROM medicamento WHERE id_usuario = ?`,
      [usuario.id_usuario]
    );

    let fechaInicioTratamiento: Date | null = null;
    const fechas = [primerInsulina?.fecha, primerMedicamento?.fecha].filter(Boolean) as string[];

    if (fechas.length > 0) {
      const fechaMasAntigua = fechas.sort()[0];
      fechaInicioTratamiento = new Date(fechaMasAntigua.replace(' ', 'T'));
    }

    if (!fechaInicioTratamiento) {
      return { diasUsando, totalAplicaciones, totalTomas, adherenciaPromedio: 0 };
    }

    const diffTratamiento = hoy.getTime() - fechaInicioTratamiento.getTime();
    const diasTratamiento = Math.max(1, Math.floor(diffTratamiento / (1000 * 60 * 60 * 24)) + 1);

    // 4. Dosis esperadas de insulina
    const dosisResult = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total FROM dosis_insulina d
       INNER JOIN insulina i ON d.insulina_id = i.id_insulina
       WHERE i.id_usuario = ?`,
      [usuario.id_usuario]
    );
    const dosisPorDia = dosisResult?.total || 0;
    let totalEsperadas = dosisPorDia * diasTratamiento;

    // 5. Tomas esperadas de medicamentos
    const medicamentos = await db.getAllAsync<{ id_medicamento: string; frecuencia: string }>(
      `SELECT id_medicamento, frecuencia FROM medicamento WHERE id_usuario = ? AND activo = 1`,
      [usuario.id_usuario]
    );

    for (const med of medicamentos) {
      const f = med.frecuencia.toLowerCase();
      let tomasDia = 1;
      if (f.includes('cada 12')) tomasDia = 2;
      else if (f.includes('cada 8')) tomasDia = 3;
      else if (f.includes('cada 6')) tomasDia = 4;

      totalEsperadas += tomasDia * diasTratamiento;
    }

    const totalRealizadas = totalAplicaciones + totalTomas;

    const adherenciaPromedio = totalEsperadas > 0
      ? Math.min(100, Math.round((totalRealizadas / totalEsperadas) * 100))
      : 0;

    return {
      diasUsando,
      totalAplicaciones,
      totalTomas,
      adherenciaPromedio,
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return { diasUsando: 0, totalAplicaciones: 0, totalTomas: 0, adherenciaPromedio: 0 };
  }
};
