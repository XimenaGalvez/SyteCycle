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
  await db.runAsync(`DELETE FROM insulina`);
  await db.runAsync(`DELETE FROM medicamento`);
  await db.runAsync(`DELETE FROM usuario`);
};