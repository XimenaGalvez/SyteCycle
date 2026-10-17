import { db, generarId } from './db';

export type Usuario = {
  id_usuario: string;
  nombre: string;
  contrasena: string;
  fecha_nacimiento: string | null;
  peso: number | null;
  relacion_insulina_carbohidrato: number | null;
  created_at: string;
};

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
    return id;
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    if (error?.message?.includes('CHECK')) {
      throw new Error('Los datos del usuario no son válidos.');
    }
    throw new Error('No se pudo crear el usuario.');
  }
};

export const obtenerUsuario = async (): Promise<Usuario | null> => {
  const resultado = await db.getFirstAsync<Usuario>(
    `SELECT * FROM usuario ORDER BY created_at ASC LIMIT 1`
  );
  return resultado ?? null;
};

export const validarCredenciales = async (
  nombre: string,
  contrasena: string
): Promise<Usuario | null> => {
  const resultado = await db.getFirstAsync<Usuario>(
    `SELECT * FROM usuario WHERE nombre = ? AND contrasena = ? LIMIT 1`,
    [nombre.trim(), contrasena]
  );
  return resultado ?? null;
};

export const eliminarCuenta = async (): Promise<void> => {
  await db.runAsync(`DELETE FROM aplicacion_insulina`);
  await db.runAsync(`DELETE FROM toma_medicamento`);
  await db.runAsync(`DELETE FROM recordatorio`);
  await db.runAsync(`DELETE FROM dosis_insulina`);
  await db.runAsync(`DELETE FROM insulina`);
  await db.runAsync(`DELETE FROM medicamento`);
  await db.runAsync(`DELETE FROM usuario`);
};

// Actualizar datos del usuario
export const actualizarUsuario = async (datos: {
  nombre?: string;
  fecha_nacimiento?: string | null;
  peso?: number | null;
  relacion_insulina_carbohidrato?: number | null;
}): Promise<void> => {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new Error('No hay usuario');

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

// Obtener estadísticas del usuario (CORREGIDO)
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

    // 2. Totales históricos
    const resultadoApp = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total FROM aplicacion_insulina`
    );
    const totalAplicaciones = resultadoApp?.total || 0;

    const resultadoTomas = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total FROM toma_medicamento WHERE estado = 'Realizado'`
    );
    const totalTomas = resultadoTomas?.total || 0;

    // 3. Buscar la fecha del primer tratamiento creado
    const primerInsulina = await db.getFirstAsync<{ fecha: string }>(
      `SELECT MIN(created_at) as fecha FROM insulina`
    );
    const primerMedicamento = await db.getFirstAsync<{ fecha: string }>(
      `SELECT MIN(created_at) as fecha FROM medicamento`
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

    // Días que lleva el tratamiento activo (mínimo 1)
    const diffTratamiento = hoy.getTime() - fechaInicioTratamiento.getTime();
    const diasTratamiento = Math.max(1, Math.floor(diffTratamiento / (1000 * 60 * 60 * 24)) + 1);

    // 4. Dosis esperadas de insulina
    const dosisResult = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total FROM dosis_insulina`
    );
    const dosisPorDia = dosisResult?.total || 0;
    let totalEsperadas = dosisPorDia * diasTratamiento;

    // 5. Tomas esperadas de medicamentos
    const medicamentos = await db.getAllAsync<{ id_medicamento: string; frecuencia: string }>(
      `SELECT id_medicamento, frecuencia FROM medicamento WHERE activo = 1`
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