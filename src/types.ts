/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountCategory =
  | 'email'
  | 'online-shop'
  | 'messenger'
  | 'social-media'
  | 'online-banking'
  | 'streaming'
  | 'dating-app'
  | 'software-license'
  | 'online-games'
  | 'other';

export interface PasswordHistory {
  id: string;
  dateTime: string;      // Formato YYYY-MM-DD HH:mm:ss
  password: string;      // Encriptada o texto plano para descifrar en cliente
  changeReason: string;  // Razón obligatoria para el cambio
}

export interface Account {
  id: string;
  accountName: string;
  category: AccountCategory;
  loginPage: string;
  username: string;
  password: string;      // Encriptada (o texto plano si no se ha configurado clave maestra)
  costPerMonth?: number; // Coste mensual si aplica
  checklist: string[];   // Lista de tareas pendientes (por ejemplo: ["Revisar pago", "Dar de baja"])
  completedTasks: string[]; // Lista de tareas de checklist ya hechas
  createdAt: string;
  updatedAt: string;
  history: PasswordHistory[];
  passkeyEnabled?: boolean; // Booleano para saber si soporta Passkey de Keyder
  otpSecret?: string;       // Clave Secreta 2FA (Secret Key) opcional para códigos TOTP reales
}

export interface PasskeyRequest {
  id: string;
  service: string;
  username: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'denied';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  isLocked: boolean;
}
