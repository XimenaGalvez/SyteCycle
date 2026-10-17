import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('sytecycle.db');

export const generarId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
};

export const initDatabase = async () => {
  try {
    // ⚠️ TEMPORAL: Borrar tablas viejas con estructura incorrecta
    // Esto se puede quitar después de la primera ejecución exitosa
    await db.execAsync(`DROP TABLE IF EXISTS aplicacion_insulina`);
    await db.execAsync(`DROP TABLE IF EXISTS dosis_insulina`);
    await db.execAsync(`DROP TABLE IF EXISTS insulina`);
    await db.execAsync(`DROP TABLE IF EXISTS toma_medicamento`);
    await db.execAsync(`DROP TABLE IF EXISTS medicamento`);
    await db.execAsync(`DROP TABLE IF EXISTS recordatorio`);
    console.log('🗑️ Tablas limpiadas para migración');

    // ============ TABLA USUARIO ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS usuario (
        id_usuario TEXT PRIMARY KEY,
        nombre TEXT NOT NULL CHECK (
          LENGTH(TRIM(nombre)) >= 2
          AND nombre NOT GLOB '*[0-9]*'
        ),
        contrasena TEXT NOT NULL CHECK (LENGTH(TRIM(contrasena)) >= 4),
        fecha_nacimiento TEXT CHECK (
          fecha_nacimiento IS NULL
          OR (
            LENGTH(fecha_nacimiento) = 10
            AND fecha_nacimiento GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
          )
        ),
        peso REAL CHECK (peso IS NULL OR peso > 0),
        relacion_insulina_carbohidrato REAL CHECK (
          relacion_insulina_carbohidrato IS NULL
          OR relacion_insulina_carbohidrato > 0
        ),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============ TABLA INSULINA (NUEVA ESTRUCTURA) ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS insulina (
        id_insulina TEXT PRIMARY KEY,
        nombre TEXT NOT NULL CHECK (LENGTH(TRIM(nombre)) > 0),
        tipo TEXT NOT NULL CHECK (tipo IN ('Rápida', 'Lenta', 'Intermedia')),
        caducidad TEXT CHECK (
          caducidad IS NULL
          OR (
            LENGTH(caducidad) = 10
            AND caducidad GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
          )
        ),
        notas TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============ TABLA DOSIS_INSULINA (NUEVA) ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS dosis_insulina (
        id_dosis TEXT PRIMARY KEY,
        insulina_id TEXT NOT NULL,
        etiqueta TEXT,
        horario TEXT NOT NULL CHECK (
          LENGTH(horario) = 5
          AND horario GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
        unidades REAL NOT NULL CHECK (unidades > 0),
        FOREIGN KEY (insulina_id) REFERENCES insulina (id_insulina)
      );
    `);

    // ============ TABLA MEDICAMENTO ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medicamento (
        id_medicamento TEXT PRIMARY KEY,
        nombre TEXT NOT NULL CHECK (LENGTH(TRIM(nombre)) > 0),
        dosis TEXT NOT NULL CHECK (LENGTH(TRIM(dosis)) > 0),
        frecuencia TEXT NOT NULL CHECK (LENGTH(TRIM(frecuencia)) > 0),
        horario TEXT NOT NULL CHECK (
          LENGTH(horario) = 5
          AND horario GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
        caducidad TEXT CHECK (
          caducidad IS NULL
          OR (
            LENGTH(caducidad) = 10
            AND caducidad GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
          )
        ),
        indicaciones TEXT,
        activo INTEGER DEFAULT 1 CHECK (activo IN (0, 1)),
        duracion_dias INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============ TABLA APLICACION_INSULINA ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS aplicacion_insulina (
        id_aplicacion_insulina TEXT PRIMARY KEY,
        insulina_id TEXT NOT NULL,
        dosis_id TEXT,
        unidades REAL NOT NULL CHECK (unidades > 0),
        fecha TEXT NOT NULL CHECK (
          LENGTH(fecha) = 10
          AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        ),
        hora TEXT NOT NULL CHECK (
          LENGTH(hora) = 5
          AND hora GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
        zona TEXT NOT NULL CHECK (zona IN ('abdomen', 'brazo', 'muslo')),
        sitio_detalle TEXT,
        notas TEXT,
        FOREIGN KEY (insulina_id) REFERENCES insulina (id_insulina)
      );
    `);

    // ============ TABLA TOMA_MEDICAMENTO ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS toma_medicamento (
        id_toma_medicamento TEXT PRIMARY KEY,
        medicamento_id TEXT NOT NULL,
        fecha TEXT NOT NULL CHECK (
          LENGTH(fecha) = 10
          AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        ),
        hora TEXT NOT NULL CHECK (
          LENGTH(hora) = 5
          AND hora GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
        estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (
          estado IN ('Pendiente', 'Realizado', 'Omitido')
        ),
        notas TEXT,
        FOREIGN KEY (medicamento_id) REFERENCES medicamento (id_medicamento)
      );
    `);

    // ============ TABLA RECORDATORIO ============
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recordatorio (
        id_recordatorio TEXT PRIMARY KEY,
        tipo TEXT NOT NULL CHECK (tipo IN ('Insulina', 'Medicamento', 'Caducidad')),
        referencia_id TEXT NOT NULL,
        hora TEXT NOT NULL CHECK (
          LENGTH(hora) = 5
          AND hora GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
        activo INTEGER DEFAULT 1 CHECK (activo IN (0, 1)),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Base de datos SyteCycle inicializada con estructura nueva');
  } catch (error) {
    console.error('❌ Error al inicializar:', error);
  }
};