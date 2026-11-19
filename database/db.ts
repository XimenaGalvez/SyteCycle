import * as SQLite from 'expo-sqlite';

// ✅ ESTA LÍNEA ES LA QUE FALTA O ESTÁ MAL
export const db = SQLite.openDatabaseSync('sytecycle.db');

export const generarId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
};



export const initDatabase = async () => {
  try {
  
    // ============ TABLA USUARIO ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS usuario (
        id_usuario TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        contrasena TEXT NOT NULL,
        fecha_nacimiento TEXT,
        peso REAL,
        relacion_insulina_carbohidrato REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============ TABLA INSULINA (Con id_usuario) ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS insulina (
        id_insulina TEXT PRIMARY KEY,
        id_usuario TEXT NOT NULL,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        caducidad TEXT,
        notas TEXT,
        activo INTEGER DEFAULT 1, -- <-- AGREGA ESTA LÍNEA
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
      );
    `);

    // ============ TABLA DOSIS_INSULINA ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS dosis_insulina (
        id_dosis TEXT PRIMARY KEY,
        insulina_id TEXT NOT NULL,
        etiqueta TEXT,
        horario TEXT NOT NULL,
        unidades REAL NOT NULL,
        FOREIGN KEY (insulina_id) REFERENCES insulina (id_insulina) ON DELETE CASCADE
      );
    `);

    // ============ TABLA MEDICAMENTO (Con id_usuario) ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medicamento (
        id_medicamento TEXT PRIMARY KEY,
        id_usuario TEXT NOT NULL,
        nombre TEXT NOT NULL,
        dosis TEXT NOT NULL,
        frecuencia TEXT NOT NULL,
        horario TEXT NOT NULL,
        caducidad TEXT,
        indicaciones TEXT,
        activo INTEGER DEFAULT 1,
        duracion_dias INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
      );
    `);

    // ============ TABLA APLICACION_INSULINA ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS aplicacion_insulina (
        id_aplicacion_insulina TEXT PRIMARY KEY,
        insulina_id TEXT NOT NULL,
        dosis_id TEXT,
        unidades REAL NOT NULL,
        fecha TEXT NOT NULL,
        hora TEXT NOT NULL,
        zona TEXT NOT NULL,
        sitio_detalle TEXT,
        notas TEXT,
        FOREIGN KEY (insulina_id) REFERENCES insulina (id_insulina) ON DELETE CASCADE
      );
    `);

    // ============ TABLA TOMA_MEDICAMENTO ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS toma_medicamento (
        id_toma_medicamento TEXT PRIMARY KEY,
        medicamento_id TEXT NOT NULL,
        fecha TEXT NOT NULL,
        hora TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'Pendiente',
        notas TEXT,
        FOREIGN KEY (medicamento_id) REFERENCES medicamento (id_medicamento) ON DELETE CASCADE
      );
    `);

    // ============ TABLA RECORDATORIO ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recordatorio (
        id_recordatorio TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        referencia_id TEXT NOT NULL,
        hora TEXT NOT NULL,
        activo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Base de datos actualizada con soporte multi-usuario');
  } catch (error) {
    console.error('❌ Error al inicializar:', error);
  }
};