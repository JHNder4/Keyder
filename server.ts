/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as OTPAuth from 'otpauth';


// Cargar variables de entorno robustamente
const dotenvPath = path.join(process.cwd(), '.env');
const dotenvExamplePath = path.join(process.cwd(), '.env.example');

if (fs.existsSync(dotenvPath)) {
  dotenv.config({ path: dotenvPath, override: true });
} else if (fs.existsSync(dotenvExamplePath)) {
  // Fallback si no existe .env pero el usuario configuró .env.example
  dotenv.config({ path: dotenvExamplePath, override: true });
  try {
    // También creamos el archivo .env de forma automática para persistir su configuración estándar
    fs.copyFileSync(dotenvExamplePath, dotenvPath);
    console.log('Se ha creado el archivo .env a partir de .env.example');
  } catch (copyErr) {
    console.warn('No se pudo copiar .env.example a .env:', copyErr);
  }
} else {
  dotenv.config({ override: true });
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper for local JSON database file
const DB_FILE = path.join(process.cwd(), 'local_db.json');

interface LocalDB {
  vault_config: { key: string; value: string }[];
  accounts: any[];
  password_history: any[];
  passkey_requests: any[];
}

function initLocalFileDB(): LocalDB {
  const defaultSeeds = {
    vault_config: [],
    accounts: [
      {
        id: 'seed-amazon',
        accountName: 'Amazon Prime',
        category: 'online-shop',
        loginPage: 'https://amazon.es',
        username: 'martin.gans@example.com',
        password: '', // encrypted dynamically on unlock
        costPerMonth: 4.99,
        checklist: ['Verificar renovación el día 25', 'Verificar descuento familiar'],
        completedTasks: ['Verificar renovación el día 25'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        passkeyEnabled: false
      },
      {
        id: 'seed-netflix',
        accountName: 'Netflix Premium',
        category: 'streaming',
        loginPage: 'https://netflix.com',
        username: 'martin.gans@example.com',
        password: '', // encrypted dynamically on unlock
        costPerMonth: 17.99,
        checklist: ['Compartir cobro con mamá', 'Añadir miembro extra'],
        completedTasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        passkeyEnabled: false
      },
      {
        id: 'seed-spotify',
        accountName: 'Spotify Duo',
        category: 'streaming',
        loginPage: 'https://spotify.com',
        username: 'm.gans75@gmail.com',
        password: '', // encrypted dynamically on unlock
        costPerMonth: 14.99,
        checklist: ['Revisar cobro tarjeta prepago'],
        completedTasks: ['Revisar cobro tarjeta prepago'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        passkeyEnabled: false
      }
    ],
    password_history: [],
    passkey_requests: []
  };

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const loaded = JSON.parse(raw);
      return {
        vault_config: loaded.vault_config || [],
        accounts: loaded.accounts || [],
        password_history: loaded.password_history || [],
        passkey_requests: loaded.passkey_requests || []
      };
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultSeeds, null, 2), 'utf8');
      return defaultSeeds;
    }
  } catch (err) {
    console.error('Error al inicializar la base de datos local:', err);
    return defaultSeeds;
  }
}

function saveLocalFileDB(db: LocalDB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error al guardar la base de datos local:', err);
  }
}

// Obtener cliente Supabase dinámicamente con Lazy Initialization
let supabaseClient: SupabaseClient | null = null;
let supabaseActive = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

function getSupabase(): SupabaseClient | null {
  if (!supabaseActive) return null;
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      supabaseActive = false;
      return null;
    }
    try {
      supabaseClient = createClient(url, key);
    } catch (e) {
      console.warn('No se pudo inicializar el cliente de Supabase:', e);
      supabaseActive = false;
      return null;
    }
  }
  return supabaseClient;
}

// Helper para cifrar / descifrar contraseñas locales (AES-256-CBC)
const CRYPTO_SALT = 'keyder-secure-salt-987';

function deriveKey(password: string): Buffer {
  return crypto.pbkdf2Sync(password, CRYPTO_SALT, 80000, 32, 'sha256');
}

function encrypt(text: string, masterPass: string): string {
  try {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const key = deriveKey(masterPass);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Error encriptando contraseña:', error);
    return 'ERROR_CIFRADO';
  }
}

function decrypt(encryptedText: string, masterPass: string): string {
  try {
    if (!encryptedText) return '';
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText; // Formato incorrecto o no cifrado
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = deriveKey(masterPass);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return '[Cifrado - Clave Incorrecta]';
  }
}

// Helper para verificar el token JWT de Supabase o fallback local
interface AuthenticatedUser {
  id: string;
  email: string;
}

async function getAuthenticatedUser(req: express.Request): Promise<AuthenticatedUser | null> {
  const clientSupabase = getSupabase();
  const authHeader = req.headers['authorization'];
  
  if (authHeader && authHeader.startsWith('Bearer ') && clientSupabase && supabaseActive) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await clientSupabase.auth.getUser(token);
      if (user) {
        return { id: user.id, email: user.email || '' };
      }
    } catch (e) {
      console.warn('Error verificando JWT en Supabase Auth:', e);
    }
  }

  // Fallback para cabecera directa o modo local/sandbox
  const userHeaderId = req.headers['x-user-id'] as string;
  if (userHeaderId) {
    return { id: userHeaderId, email: req.headers['x-user-email'] as string || 'usuario@local.com' };
  }

  return null;
}

// Configuración pública (para que el cliente sepa si Supabase está activo)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseActive: supabaseActive,
    supabaseUrl: process.env.SUPABASE_URL || ''
  });
});

// Endpoint de Registro (Sign Up) en Supabase Auth o local_db fallback
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
  }

  const clientSupabase = getSupabase();

  if (clientSupabase && supabaseActive) {
    try {
      const { data, error } = await clientSupabase.auth.signUp({
        email,
        password
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          token: data.session?.access_token || ''
        }
      });
    } catch (err: any) {
      console.error('Error de registro en Supabase:', err);
      return res.status(500).json({ error: err.message || 'Error en el servidor de autenticación' });
    }
  }

  // Modo local / Sandbox
  try {
    const db = initLocalFileDB();
    const localUsers: any[] = (db as any).users || [];
    const exists = localUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const newUser = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      passwordHash: crypto.createHash('sha256').update(password).digest('hex')
    };

    localUsers.push(newUser);
    (db as any).users = localUsers;
    saveLocalFileDB(db);

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        token: 'local-token-' + newUser.id
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error interno en registro local: ' + err.message });
  }
});

// Helper para verificar TOTP usando otpauth
function verifyTOTP(secret: string, code: string): boolean {
  try {
    const normalized = secret.trim().replace(/\s+/g, '').toUpperCase();
    const secretObj = OTPAuth.Secret.fromBase32(normalized);
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secretObj
    });
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  } catch (err) {
    console.error('Error verificando TOTP:', err);
    return false;
  }
}

// Helper para obtener el 2FA secret de un usuario (de Supabase o Local DB)
async function getUser2FASecret(userId: string): Promise<string | null> {
  const clientSupabase = getSupabase();
  if (clientSupabase && supabaseActive) {
    try {
      const { data, error } = await clientSupabase
        .from('vault_config')
        .select('value')
        .eq('key', `2fa_secret_${userId}`);
      if (!error && data && data.length > 0) {
        return data[0].value;
      }
    } catch (e) {
      console.warn('Error al buscar 2FA en Supabase:', e);
    }
  }

  // Fallback local
  const db = initLocalFileDB();
  const config = db.vault_config || [];
  const found = config.find(c => c.key === `2fa_secret_${userId}`);
  return found ? found.value : null;
}

// Helper para guardar el 2FA secret de un usuario (en Supabase o Local DB)
async function saveUser2FASecret(userId: string, encryptedSecret: string): Promise<boolean> {
  const clientSupabase = getSupabase();
  if (clientSupabase && supabaseActive) {
    try {
      const { data: existing } = await clientSupabase
        .from('vault_config')
        .select('id')
        .eq('key', `2fa_secret_${userId}`);

      if (existing && existing.length > 0) {
        const { error } = await clientSupabase
          .from('vault_config')
          .update({ value: encryptedSecret })
          .eq('key', `2fa_secret_${userId}`);
        if (!error) return true;
      } else {
        const { error } = await clientSupabase
          .from('vault_config')
          .insert({ key: `2fa_secret_${userId}`, value: encryptedSecret });
        if (!error) return true;
      }
    } catch (e) {
      console.warn('Error al guardar 2FA en Supabase, reintentando local:', e);
    }
  }

  // Fallback local
  const db = initLocalFileDB();
  db.vault_config = db.vault_config || [];
  const idx = db.vault_config.findIndex(c => c.key === `2fa_secret_${userId}`);
  if (idx > -1) {
    db.vault_config[idx].value = encryptedSecret;
  } else {
    db.vault_config.push({ key: `2fa_secret_${userId}`, value: encryptedSecret });
  }
  saveLocalFileDB(db);
  return true;
}

// Endpoint de Registro (Sign Up) en Supabase Auth o local_db fallback
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
  }

  const clientSupabase = getSupabase();

  if (clientSupabase && supabaseActive) {
    try {
      const { data, error } = await clientSupabase.auth.signUp({
        email,
        password
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          token: data.session?.access_token || ''
        }
      });
    } catch (err: any) {
      console.error('Error de registro en Supabase:', err);
      return res.status(500).json({ error: err.message || 'Error en el servidor de autenticación' });
    }
  }

  // Modo local / Sandbox
  try {
    const db = initLocalFileDB();
    const localUsers: any[] = (db as any).users || [];
    const exists = localUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const newUser = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      passwordHash: crypto.createHash('sha256').update(password).digest('hex')
    };

    localUsers.push(newUser);
    (db as any).users = localUsers;
    saveLocalFileDB(db);

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        token: 'local-token-' + newUser.id
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error interno en registro local: ' + err.message });
  }
});

// Endpoint de Inicio de Sesión (Login) en Supabase Auth o local_db fallback
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
  }

  const clientSupabase = getSupabase();
  let userDetails: any = null;

  if (clientSupabase && supabaseActive) {
    try {
      const { data, error } = await clientSupabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      userDetails = {
        id: data.user?.id,
        email: data.user?.email,
        token: data.session?.access_token || ''
      };
    } catch (err: any) {
      console.error('Error de login en Supabase:', err);
      return res.status(500).json({ error: err.message || 'Error en el servidor de inicio de sesión' });
    }
  } else {
    // Modo local / Sandbox
    try {
      const db = initLocalFileDB();
      const localUsers: any[] = (db as any).users || [];
      const found = localUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      
      if (!found) {
        return res.status(401).json({ error: 'Usuario no encontrado o credenciales incorrectas.' });
      }

      const inputHash = crypto.createHash('sha256').update(password).digest('hex');
      if (found.passwordHash !== inputHash) {
        return res.status(401).json({ error: 'Contraseña incorrecta.' });
      }

      userDetails = {
        id: found.id,
        email: found.email,
        token: 'local-token-' + found.id
      };
    } catch (err: any) {
      return res.status(500).json({ error: 'Error interno en login local: ' + err.message });
    }
  }

  if (userDetails) {
    // Verificar si tiene 2FA configurado
    const has2FA = await getUser2FASecret(userDetails.id);
    if (has2FA) {
      return res.json({
        success: true,
        requires2FA: true,
        user: {
          id: userDetails.id,
          email: userDetails.email
        }
      });
    }

    return res.json({
      success: true,
      requires2FA: false,
      user: userDetails
    });
  }

  return res.status(401).json({ error: 'Credenciales inválidas.' });
});

// Endpoint para verificar el código 2FA y completar el inicio de sesión
app.post('/api/auth/verify-2fa', async (req, res) => {
  const { email, password, code } = req.body;
  if (!email || !password || !code) {
    return res.status(400).json({ error: 'Correo, contraseña maestra y código 2FA requeridos.' });
  }

  const clientSupabase = getSupabase();
  let userDetails: any = null;

  // 1. Re-autenticar al usuario para asegurar credenciales vigentes
  if (clientSupabase && supabaseActive) {
    try {
      const { data, error } = await clientSupabase.auth.signInWithPassword({ email, password });
      if (error) return res.status(401).json({ error: error.message });
      userDetails = {
        id: data.user?.id,
        email: data.user?.email,
        token: data.session?.access_token || ''
      };
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = initLocalFileDB();
    const localUsers: any[] = (db as any).users || [];
    const found = localUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return res.status(401).json({ error: 'Usuario no encontrado.' });
    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    if (found.passwordHash !== inputHash) return res.status(401).json({ error: 'Contraseña incorrecta.' });
    userDetails = {
      id: found.id,
      email: found.email,
      token: 'local-token-' + found.id
    };
  }

  // 2. Obtener y descifrar el secreto de 2FA
  const encryptedSecret = await getUser2FASecret(userDetails.id);
  if (!encryptedSecret) {
    return res.status(400).json({ error: '2FA no está configurado para esta cuenta.' });
  }

  const decryptedSecret = decrypt(encryptedSecret, password);
  if (decryptedSecret.startsWith('[Cifrado')) {
    return res.status(400).json({ error: 'Error al descifrar llave 2FA (¿Contraseña inválida?)' });
  }

  // 3. Validar el código TOTP
  const isValid = verifyTOTP(decryptedSecret, code);
  if (!isValid) {
    return res.status(400).json({ error: 'Código 2FA incorrecto o expirado.' });
  }

  // Éxito: Retornar sesión completa
  res.json({
    success: true,
    user: userDetails
  });
});

// Endpoint para configurar y registrar 2FA por primera vez
app.post('/api/auth/setup-2fa', async (req, res) => {
  const { email, password, secret, code } = req.body;
  if (!email || !password || !secret || !code) {
    return res.status(400).json({ error: 'Faltan parámetros para configurar 2FA.' });
  }

  const clientSupabase = getSupabase();
  let userId = '';

  // Verificar credenciales del usuario
  if (clientSupabase && supabaseActive) {
    try {
      const { data, error } = await clientSupabase.auth.signInWithPassword({ email, password });
      if (error) return res.status(401).json({ error: error.message });
      userId = data.user?.id || '';
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = initLocalFileDB();
    const localUsers: any[] = (db as any).users || [];
    const found = localUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return res.status(401).json({ error: 'Usuario no encontrado.' });
    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    if (found.passwordHash !== inputHash) return res.status(401).json({ error: 'Contraseña incorrecta.' });
    userId = found.id;
  }

  // Validar código OTP con el secreto enviado
  const isValid = verifyTOTP(secret, code);
  if (!isValid) {
    return res.status(400).json({ error: 'Código de verificación de 2FA inválido.' });
  }

  // Cifrar el secreto 2FA con la contraseña maestra y guardar
  const encryptedSecret = encrypt(secret, password);
  await saveUser2FASecret(userId, encryptedSecret);

  res.json({ success: true, message: '2FA activado y configurado exitosamente' });
});


// Obtener todas las cuentas del usuario autenticado (con descifrado seguro)
app.get('/api/accounts', async (req, res) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicie sesión.' });
  }

  const masterPass = req.headers['x-master-password'] as string || 'keyder123';
  const clientSupabase = getSupabase();

  let accountsList: any[] = [];
  let historyList: any[] = [];

  if (clientSupabase && supabaseActive) {
    try {
      // Obtener solo las cuentas del usuario autenticado
      const { data: accounts, error: accError } = await clientSupabase
        .from('accounts')
        .select('*')
        .eq('user_id', authUser.id);

      if (accError) throw accError;
      accountsList = accounts || [];

      // Obtener el historial correspondiente a esas cuentas
      const userAccountIds = accountsList.map(a => a.id);
      if (userAccountIds.length > 0) {
        const { data: histories, error: histError } = await clientSupabase
          .from('password_history')
          .select('*')
          .in('accountId', userAccountIds);

        if (histError) throw histError;
        historyList = histories || [];
      }
    } catch (err) {
      console.warn('Falla de lectura Supabase, fallback temporal a local DB:', err);
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    accountsList = (db.accounts || []).filter(acc => acc.user_id === authUser.id);
    const userAccountIds = accountsList.map(a => a.id);
    historyList = (db.password_history || []).filter(h => userAccountIds.includes(h.accountId));
  }

  const sanitizedAccounts = accountsList.map(acc => {
    const accHistory = historyList
      .filter(h => h.accountId === acc.id)
      .map(h => ({
        id: h.id,
        dateTime: h.dateTime,
        password: decrypt(h.password, masterPass),
        changeReason: h.changeReason
      }));

    return {
      ...acc,
      password: decrypt(acc.password, masterPass),
      checklist: acc.checklist || [],
      completedTasks: acc.completedTasks || [],
      otpSecret: acc.otpSecret !== undefined ? acc.otpSecret : (acc.otp_secret !== undefined ? acc.otp_secret : ''),
      history: accHistory
    };
  });

  res.json({
    accounts: sanitizedAccounts,
    isLocked: false,
    supabaseActive: supabaseActive
  });
});

// Crear cuenta asociada al usuario autenticado
app.post('/api/accounts', async (req, res) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicie sesión.' });
  }

  const masterPass = req.headers['x-master-password'] as string || 'keyder123';
  const clientSupabase = getSupabase();

  const { accountName, category, loginPage, username, password, costPerMonth, checklist, otpSecret } = req.body;

  if (!accountName || !username || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const newAccount: any = {
    id: crypto.randomUUID(),
    user_id: authUser.id, // Vínculo obligatorio con el usuario autenticado
    accountName,
    category: category || 'other',
    loginPage: loginPage || '',
    username,
    password: encrypt(password, masterPass),
    costPerMonth: costPerMonth ? parseFloat(costPerMonth) : 0,
    checklist: checklist || [],
    completedTasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passkeyEnabled: false,
    otpSecret: otpSecret || ''
  };

  if (supabaseActive && clientSupabase) {
    try {
      // Intentamos insertar con otpSecret
      const { error } = await clientSupabase.from('accounts').insert(newAccount);
      if (error) {
        if (error.code === '42703') { // Columna inexistente
          const fallbackAccount = { ...newAccount };
          delete fallbackAccount.otpSecret;
          fallbackAccount.otp_secret = otpSecret || '';
          
          const { error: error2 } = await clientSupabase.from('accounts').insert(fallbackAccount);
          if (error2) {
            if (error2.code === '42703') {
              const baseAccount = { ...fallbackAccount };
              delete baseAccount.otp_secret;
              const { error: error3 } = await clientSupabase.from('accounts').insert(baseAccount);
              if (error3) throw error3;
            } else {
              throw error2;
            }
          }
        } else {
          throw error;
        }
      }
    } catch (err) {
      console.warn('Insert Supabase fallido, guardando en local:', err);
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    db.accounts = db.accounts || [];
    db.accounts.push(newAccount);
    saveLocalFileDB(db);
  }

  res.status(201).json({
    ...newAccount,
    password: password,
    history: []
  });
});

// Actualizar cuenta y registrar HISTORIAL, con control total de pertenencia
app.put('/api/accounts/:id', async (req, res) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicie sesión.' });
  }

  const masterPass = req.headers['x-master-password'] as string || 'keyder123';
  const clientSupabase = getSupabase();
  const { id } = req.params;
  let existingAccount: any = null;

  if (supabaseActive && clientSupabase) {
    try {
      const { data: accountRows, error: findError } = await clientSupabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .eq('user_id', authUser.id); // Validar pertenencia

      if (findError) throw findError;
      if (accountRows && accountRows.length > 0) {
        existingAccount = accountRows[0];
      }
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    existingAccount = (db.accounts || []).find(acc => acc.id === id && acc.user_id === authUser.id);
  }

  if (!existingAccount) {
    return res.status(404).json({ error: 'Cuenta no encontrada en tu bóveda personal.' });
  }

  const { accountName, category, loginPage, username, password, costPerMonth, checklist, changeReason, passkeyEnabled, otpSecret } = req.body;

  // Detectar si la contraseña ha cambiado
  const currentDecrypted = decrypt(existingAccount.password, masterPass);
  const isPasswordChanged = password && password !== currentDecrypted;

  if (isPasswordChanged && !changeReason) {
    return res.status(400).json({ error: 'Es obligatoria una razón de cambio para actualizar la contraseña.' });
  }

  const formattedDate = new Date().toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const newHistoryEntry = {
    id: crypto.randomUUID(),
    accountId: existingAccount.id,
    dateTime: formattedDate,
    password: existingAccount.password, // guardamos la anterior cifrada
    changeReason: changeReason || 'Actualización periódica'
  };

  const updates: any = { updatedAt: new Date().toISOString() };
  if (accountName !== undefined) updates.accountName = accountName;
  if (category !== undefined) updates.category = category;
  if (loginPage !== undefined) updates.loginPage = loginPage;
  if (username !== undefined) updates.username = username;
  if (costPerMonth !== undefined) updates.costPerMonth = parseFloat(costPerMonth) || 0;
  if (checklist !== undefined) updates.checklist = checklist;
  if (passkeyEnabled !== undefined) updates.passkeyEnabled = passkeyEnabled;
  if (otpSecret !== undefined) updates.otpSecret = otpSecret;

  if (isPasswordChanged) {
    updates.password = encrypt(password, masterPass);
  }

  if (supabaseActive && clientSupabase) {
    try {
      if (isPasswordChanged) {
        const { error: histError } = await clientSupabase
          .from('password_history')
          .insert(newHistoryEntry);
        if (histError) throw histError;
      }

      const { error: updateError } = await clientSupabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', authUser.id); // Validar pertenencia

      if (updateError) {
        if (updateError.code === '42703') { // Columna inexistente
          const fallbackUpdates = { ...updates };
          const secretVal = fallbackUpdates.otpSecret;
          delete fallbackUpdates.otpSecret;
          fallbackUpdates.otp_secret = secretVal;

          const { error: updateError2 } = await clientSupabase
            .from('accounts')
            .update(fallbackUpdates)
            .eq('id', id)
            .eq('user_id', authUser.id);

          if (updateError2) {
            if (updateError2.code === '42703') {
              const baseUpdates = { ...fallbackUpdates };
              delete baseUpdates.otp_secret;
              const { error: updateError3 } = await clientSupabase
                .from('accounts')
                .update(baseUpdates)
                .eq('id', id)
                .eq('user_id', authUser.id);
              if (updateError3) throw updateError3;
            } else {
              throw updateError2;
            }
          }
        } else {
          throw updateError;
        }
      }
    } catch (err) {
      console.warn('Update Supabase fallido, actualizando local:', err);
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    if (isPasswordChanged) {
      db.password_history.push(newHistoryEntry);
    }
    const idx = db.accounts.findIndex(acc => acc.id === id && acc.user_id === authUser.id);
    if (idx > -1) {
      db.accounts[idx] = {
        ...db.accounts[idx],
        ...updates
      };
      saveLocalFileDB(db);
    }
  }

  // Recuperar resultado final
  let finalAccount = { ...existingAccount, ...updates };
  let finalHistory: any[] = [];

  if (supabaseActive && clientSupabase) {
    try {
      const { data: updatedRows } = await clientSupabase.from('accounts').select('*').eq('id', id).eq('user_id', authUser.id);
      const { data: histRows } = await clientSupabase.from('password_history').select('*').eq('accountId', id);
      if (updatedRows && updatedRows.length > 0) finalAccount = updatedRows[0];
      finalHistory = histRows || [];
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    finalAccount = db.accounts.find(acc => acc.id === id && acc.user_id === authUser.id) || finalAccount;
    finalHistory = db.password_history.filter(h => h.accountId === id);
  }

  res.json({
    ...finalAccount,
    password: decrypt(finalAccount.password, masterPass),
    history: finalHistory.map(h => ({
      id: h.id,
      dateTime: h.dateTime,
      password: decrypt(h.password, masterPass),
      changeReason: h.changeReason
    }))
  });
});

// Eliminar cuenta certificando pertenencia
app.delete('/api/accounts/:id', async (req, res) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicie sesión.' });
  }

  const clientSupabase = getSupabase();
  const { id } = req.params;

  if (clientSupabase && supabaseActive) {
    try {
      const { error } = await clientSupabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', authUser.id); // Asegurar que sea del usuario

      if (error) throw error;
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    const belongs = db.accounts.find(acc => acc.id === id && acc.user_id === authUser.id);
    if (!belongs) {
      return res.status(404).json({ error: 'Cuenta no encontrada o no pertenece a tu cuenta.' });
    }
    db.accounts = db.accounts.filter(acc => acc.id !== id);
    db.password_history = db.password_history.filter(h => h.accountId !== id);
    saveLocalFileDB(db);
  }

  res.json({ success: true, message: 'Cuenta eliminada exitosamente' });
});

// Eliminar manual de un registro específico de historial de contraseñas
app.delete('/api/accounts/:accountId/history/:historyId', async (req, res) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicie sesión.' });
  }

  const masterPass = req.headers['x-master-password'] as string || 'keyder123';
  const clientSupabase = getSupabase();
  const { accountId, historyId } = req.params;

  // Verificar pertenencia de la cuenta primero
  let ownsAccount = false;
  if (clientSupabase && supabaseActive) {
    try {
      const { data } = await clientSupabase
        .from('accounts')
        .select('id')
        .eq('id', accountId)
        .eq('user_id', authUser.id);
      ownsAccount = data && data.length > 0;
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    ownsAccount = !!db.accounts.find(acc => acc.id === accountId && acc.user_id === authUser.id);
  }

  if (!ownsAccount) {
    return res.status(403).json({ error: 'Acceso denegado. No eres propietario de esta cuenta.' });
  }

  if (clientSupabase && supabaseActive) {
    try {
      const { error: delError } = await clientSupabase
        .from('password_history')
        .delete()
        .eq('id', historyId)
        .eq('accountId', accountId);

      if (delError) throw delError;
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    db.password_history = db.password_history.filter(
      h => !(h.id === historyId && h.accountId === accountId)
    );
    saveLocalFileDB(db);
  }

  let remainRows: any[] = [];
  if (supabaseActive && clientSupabase) {
    try {
      const { data: histRows } = await clientSupabase
        .from('password_history')
        .select('*')
        .eq('accountId', accountId);
      remainRows = histRows || [];
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    remainRows = db.password_history.filter(h => h.accountId === accountId);
  }

  res.json({
    success: true,
    message: 'Historial eliminado',
    history: remainRows.map(h => ({
      id: h.id,
      dateTime: h.dateTime,
      password: decrypt(h.password, masterPass),
      changeReason: h.changeReason
    }))
  });
});

// Toggle checklist items
app.post('/api/accounts/:id/checklist/toggle', async (req, res) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicie sesión.' });
  }

  const { id } = req.params;
  const { taskName } = req.body;
  const clientSupabase = getSupabase();
  let account: any = null;

  if (supabaseActive && clientSupabase) {
    try {
      const { data: accountRows } = await clientSupabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .eq('user_id', authUser.id); // Asegurar pertenencia

      if (accountRows && accountRows.length > 0) {
        account = accountRows[0];
      }
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    account = db.accounts.find(acc => acc.id === id && acc.user_id === authUser.id);
  }

  if (!account) {
    return res.status(404).json({ error: 'Cuenta no encontrada o no pertenece a tu cuenta.' });
  }

  const checklist = account.checklist || [];
  const completedTasks = account.completedTasks || [];

  const completedIndex = completedTasks.indexOf(taskName);
  if (completedIndex > -1) {
    completedTasks.splice(completedIndex, 1);
  } else {
    completedTasks.push(taskName);
  }

  if (supabaseActive && clientSupabase) {
    try {
      const { error: updateError } = await clientSupabase
        .from('accounts')
        .update({ completedTasks })
        .eq('id', id)
        .eq('user_id', authUser.id); // Validar pertenencia

      if (updateError) throw updateError;
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    const idx = db.accounts.findIndex(acc => acc.id === id && acc.user_id === authUser.id);
    if (idx > -1) {
      db.accounts[idx].completedTasks = completedTasks;
      saveLocalFileDB(db);
    }
  }

  res.json({
    id: account.id,
    checklist,
    completedTasks
  });
});

// --- API DE PASSKEYS FILTRADAS POR SECCIÓN ---

// Obtener todas las solicitudes de Passkey asociadas al usuario
app.get('/api/passkeys', async (req, res) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicie sesión.' });
  }

  const clientSupabase = getSupabase();

  if (supabaseActive && clientSupabase) {
    try {
      const { data, error } = await clientSupabase
        .from('passkey_requests')
        .select('*');

      if (error) throw error;
      // Filtramos en memoria de forma segura para evitar fallos si no existe la columna user_id en Supabase
      const list = data || [];
      const userList = list.filter((r: any) => !r.user_id || r.user_id === authUser.id);
      return res.json(userList);
    } catch (err) {
      supabaseActive = false;
    }
  }

  const db = initLocalFileDB();
  const list = db.passkey_requests || [];
  const userList = list.filter((r: any) => r.user_id === authUser.id);
  res.json(userList);
});

// Simular una nueva solicitud de llave de acceso
app.post('/api/passkeys/simulate', async (req, res) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicie sesión.' });
  }

  const { service, username } = req.body;
  const clientSupabase = getSupabase();

  const newRequest = {
    id: crypto.randomUUID(),
    user_id: authUser.id,
    service: service || 'Google',
    username: username || 'm.gans75@gmail.com',
    timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'pending'
  };

  if (supabaseActive && clientSupabase) {
    try {
      const { error } = await clientSupabase
        .from('passkey_requests')
        .insert(newRequest);

      if (error) throw error;
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    db.passkey_requests = db.passkey_requests || [];
    db.passkey_requests.push(newRequest);
    saveLocalFileDB(db);
  }

  res.status(201).json(newRequest);
});

// Responder a una petición de Passkey (Aprobar o Rechazar)
app.post('/api/passkeys/:id/respond', async (req, res) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicie sesión.' });
  }

  const { id } = req.params;
  const { status } = req.body; // 'approved' o 'denied'
  const clientSupabase = getSupabase();

  if (supabaseActive && clientSupabase) {
    try {
      const { error: updateError } = await clientSupabase
        .from('passkey_requests')
        .update({ status })
        .eq('id', id);

      if (updateError) throw updateError;
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    const reqIdx = db.passkey_requests.findIndex(r => r.id === id);
    if (reqIdx > -1) {
      db.passkey_requests[reqIdx].status = status;
      saveLocalFileDB(db);
    }
  }

  let request: any = null;
  if (supabaseActive && clientSupabase) {
    try {
      const { data: rows } = await clientSupabase
        .from('passkey_requests')
        .select('*')
        .eq('id', id);
      request = rows && rows.length > 0 ? rows[0] : null;
    } catch (err) {
      supabaseActive = false;
    }
  }

  if (!supabaseActive) {
    const db = initLocalFileDB();
    request = db.passkey_requests.find(r => r.id === id);
  }

  if (!request) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  res.json({
    success: true,
    message: status === 'approved' ? 'Sesión autorizada por Apple Passkey' : 'Sesión rechazada',
    request
  });
});

// Configurar hosting de Vite en desarrollo o servir en producción
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
