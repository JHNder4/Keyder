# Guía de Compilación de Keyder a .exe (Windows) y Multiplataforma

Keyder ha sido diseñado utilizando una arquitectura modular de React en el Frontend y una capa lógica/Persistencia intercambiable. Para empaquetar esta base de código como una aplicación nativa de escritorio para Windows (`.exe`) sin perder información, recomendamos las siguientes dos opciones profesionales:

---

## Opción 1: Tauri v2 + Rust SQLite (Recomendada - Rendimiento Apple-Like)
Tauri utiliza el motor web nativo del sistema operativo (WebView2 en Windows) en lugar de incluir Chromium entero, dando como resultado un ejecutable final de **~10-15 MB** con un uso de memoria Ram mínimo (~40 MB) y seguridad excelente administrada en Rust.

### Arquitectura de Integración:
1. **Frontend:** React + Tailwind (la misma interfaz minimalista de Keyder).
2. **Backend / Seguridad:** En lugar de Express, la persistencia y la encriptación AES-256 se delegan al Kernel de Rust mediante comandos (`tauri::command`).
3. **Persistencia:** Rust gestiona una base de datos local SQLite encriptada con **SQLCipher** almacenada en la ruta local de datos del usuario (`%APPDATA%/Keyder/keyder.db`).

### Guía Paso a Paso para Compilar con Tauri:
1. **Instalar Dependencias de Desarrollo de Tauri:**
   ```bash
   npm install --save-dev @tauri-apps/cli @tauri-apps/api
   ```
2. **Inicializar Proyecto Tauri:**
   ```bash
   npm run tauri init
   ```
   * *¿Cuál es el puerto de desarrollo?* `3000`
   * *¿Cuál es la ruta de salida de la compilación estática?* `../dist`
3. **Sincronización de Comandos:**
   En tu archivo `src-tauri/src/main.rs`, define las funciones homólogas a nuestra API de Express utilizando Rust Crypto (AES-GCM-256):
   ```rust
   #[tauri::command]
   fn decrypt_password(encrypted_str: String, key: String) -> String {
       // Lógica de descifrado AES con PBKDF2 en Rust
   }
   ```
4. **Compilar el Ejecutable .exe:**
   ```bash
   npm run tauri build
   ```
   Esto generará un instalador `.msi` y un ejecutable directo `.exe` en `src-tauri/target/release/bundle/`.

---

## Opción 2: Electron + Express Bundle (La vía más rápida compartiendo 100% de este código)
Electron incrusta Chromium y Node.js. Esto te permite empaquetar **exactamente** la misma App Express y base de datos local de JSON/SQLite que acabamos de construir de manera directa.

### Arquitectura de Integración:
1. El archivo principal de Electron (`main.js`) inicia el servidor Express `server.ts` en un puerto local interno (e.g., `3000` o dinámico).
2. Abre una ventana (`BrowserWindow`) apuntando a `http://localhost:3000`.

### Guía Paso a Paso para Compilar con Electron:
1. **Instalar Electron:**
   ```bash
   npm install --save-dev electron electron-builder ts-node
   ```
2. **Escribir el cargador nativo `index.js` (Root del proyecto):**
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const path = require('path');
   
   // Levantar servidor Express integrado
   require('./dist/server.cjs'); 

   function createWindow() {
     const win = new BrowserWindow({
       width: 1080,
       height: 760,
       titleBarStyle: 'hidden', // Look Apple sin bordes estándar
       titleBarOverlay: true,
       webPreferences: {
         nodeIntegration: false,
         contextIsolation: true
       }
     });

     win.loadURL('http://localhost:3000');
   }

   app.whenReady().then(createWindow);
   ```
3. **Configurar Compilador en `package.json`:**
   Añade el script de compilación para generar el instalador nacional de Windows `.exe`:
   ```json
   "build-desktop": "npm run build && electron-builder"
   ```
4. **Ejecutar comando de compilación:**
   ```bash
   npm run build-desktop
   ```
   Esto empaquetará la base de datos local encriptada junto con la App para crear un `.exe` totalmente autónomo e instalable listo para usar en Windows.
