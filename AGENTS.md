# SyteCycle — Directrices de Desarrollo

Esta es una aplicación móvil desarrollada con Expo / React Native (SDK 58) y TypeScript estricto.

## Arquitectura del Proyecto

- **Navegación:** Se utiliza **React Navigation** (`@react-navigation/native`, `@react-navigation/native-stack` y `@react-navigation/bottom-tabs`).
  - `App.tsx`: Stack raíz con gestión de flujo de autenticación nativo (Bienvenida, Login, Registro) y sesión activa (`MainTabs`).
  - `screens/MainTabs.tsx`: Navegador de pestañas inferiores (Inicio, Tratamiento, Historial, Perfil).
- **Base de Datos Local:** SQLite a través de `expo-sqlite`.
  - Esquema y conexión en `database/db.ts`. Las claves foráneas están habilitadas (`PRAGMA foreign_keys = ON;`).
  - La capa de acceso a datos y consultas reside en `database/queries.ts`. **No ejecutar consultas SQL crudas directamente en pantallas de UI**.
- **Aislamiento Multi-usuario:**
  - Toda consulta de insulinas, dosis, medicamentos, aplicaciones e historial **DEBE** estar estrictamente filtrada por el `id_usuario` activo.
- **Estructura de Directorios:**
  - `components/`: Componentes visuales reutilizables (`CuerpoHumano`, `MiniMapaRotaSitio`, `CirculoProgreso`, `TimePicker`).
  - `screens/`: Pantallas de la aplicación.
  - `types/`: Definiciones de interfaces y tipos TypeScript compartidos (`Usuario`, `Insulina`, `Medicamento`, etc.).
  - `constants/`: Constantes de dominio (coordenadas de puntos de inyección `CENTROS_INYECCION`, rotación, etc.).
  - `utils/`: Utilidades de sistema nativas (`notifications.ts`, `events.ts`).

## Comandos Principales

```bash
npx expo start              # Iniciar el servidor de desarrollo
npx tsc --noEmit            # Comprobación de tipos TypeScript estricta
npx expo-doctor             # Diagnosticar dependencias y configuración
```

Siempre ejecuta `npx tsc --noEmit` antes de dar una tarea por terminada.
