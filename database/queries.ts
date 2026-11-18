import { db, generarId } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Usuario = {
  id_usuario: string;
  nombre: string;
  contrasena: string;
  fecha_nacimiento: string | null;
  peso: number | null;
  relacion_insulina_carbohidrato: number | null;
  created_at: string;
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
  const id = generarId();

  try {
    await db.runAsync(
      `INSERT INTO usuario (id_usuario, nombre, contrasena, fecha_nacimiento, peso)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        datos.nombre.trim(),
        datos.contrasena,
        datos.fecha_nacimiento ?? null,
        datos.peso ?? null,
      ]
    );
    // Al crear un usuario, iniciamos su sesión automáticamente
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
  const resultado = await db.getFirstAsync<Usuario>(
    `SELECT * FROM usuario WHERE nombre = ? AND contrasena = ? LIMIT 1`,
    [nombre.trim(), contrasena]
  );
  
  if (resultado) {
    // Si las credenciales son correctas, guardamos la sesión
    await guardarSesion(resultado.id_usuario); 
  }
  return resultado ?? null;
};

export const obtenerUsuario = async (): Promise<Usuario | null> => {
  const idActivo = await obtenerUsuarioActivo();
  if (!idActivo) return null; // Si no hay ID guardado, no hay usuario

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
    // Gracias al ON DELETE CASCADE en db.ts, 
    // al borrar el usuario se borran automáticamente sus medicamentos e insulinas.
    await db.runAsync(`DELETE FROM usuario WHERE id_usuario = ?`, [idActivo]);
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
  } finally {
    // Cerramos sesión pase lo que pase
    await cerrarSesion();
  }
};

// Actualizar datos del usuario
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
// --- ESTADÍSTICAS DEL USUARIO ---
// ==========================================

export const obtenerEstadisticasUsuario = async (): Promise<{
  diasUsando: number;
  totalAplicaciones: number;
  totalTomas: number;
  adherenciaPromedio: number;
}> => {
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