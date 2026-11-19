import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('sytecycle.db');

export const generarId = (): string => {
  try {
    // Import lazy para evitar crash al inicializar módulo en Expo Go
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Crypto = require('expo-crypto') as typeof import('expo-crypto');
    if (Crypto && typeof Crypto.randomUUID === 'function') {
      return Crypto.randomUUID();
    }
  } catch (_e) {
    // Fallback a generación pseudoaleatoria
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
};

export const initDatabase = async () => {
  try {
    // 1. Habilitar claves foráneas si es soportado
    try {
      await db.execAsync('PRAGMA foreign_keys = ON;');
    } catch (e) {
      console.warn('PRAGMA foreign_keys:', e);
    }

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

    // ============ TABLA INSULINA ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS insulina (
        id_insulina TEXT PRIMARY KEY,
        id_usuario TEXT NOT NULL,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        caducidad TEXT,
        notas TEXT,
        activo INTEGER DEFAULT 1,
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

    // ============ TABLA MEDICAMENTO ============
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

    // ============ ÍNDICES DE RENDIMIENTO ============
    // Separados en llamadas individuales para mayor compatibilidad con expo-sqlite
    try {
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_insulina_usuario ON insulina(id_usuario);'
      );
    } catch (_e) { /* Ya existe o no se puede crear */ }
    try {
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_medicamento_usuario ON medicamento(id_usuario);'
      );
    } catch (_e) { /* Ya existe o no se puede crear */ }
    try {
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_dosis_insulina ON dosis_insulina(insulina_id);'
      );
    } catch (_e) { /* Ya existe o no se puede crear */ }

    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar base de datos:', error);
  }
};
