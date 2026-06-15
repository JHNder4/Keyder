import * as OTPAuth from 'otpauth';

/**
 * Genera un código TOTP de 6 dígitos basado en tiempo real
 * a partir de un secreto Base32.
 */
export function getTOTPCode(secret: string): { code: string; secondsLeft: number } {
  if (!secret) return { code: '------', secondsLeft: 0 };
  
  try {
    // Normalizar secreto (quitar espacios, obligar mayúsculas)
    const normalized = secret.trim().replace(/\s+/g, '').toUpperCase();
    
    // El secreto en Base32 de otpauth debe tener una longitud mínima de 8 caracteres o ser múltiplo.
    // Si no es un secreto Base32 válido, fromBase32 arrojará un error.
    const secretObj = OTPAuth.Secret.fromBase32(normalized);
    
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secretObj
    });
    
    const code = totp.generate();
    
    // Calcular segundos restantes de manera precisa para el ciclo actual de 30s as a float decimal for super smooth transitions
    const secondsLeft = 30 - ((Date.now() / 1000) % 30);
    
    return { code, secondsLeft };
  } catch (err) {
    console.warn('Error decodificando clave secreta Base32 2FA:', err);
    return { code: '--- ---', secondsLeft: 30 };
  }
}
