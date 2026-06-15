import React, { useState, useEffect } from 'react';
import { Lock, Shield, RefreshCw, KeyRound, Mail, ArrowRight, Key, Copy, Check } from 'lucide-react';
import * as OTPAuth from 'otpauth';

interface LockScreenProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>;
  onRegister: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onVerify2FA: (email: string, password: string, code: string) => Promise<{ success: boolean; error?: string }>;
  onSetup2FA: (email: string, password: string, secret: string, code: string) => Promise<{ success: boolean; error?: string }>;
}

export default function LockScreen({ onLogin, onRegister, onVerify2FA, onSetup2FA }: LockScreenProps) {
  const [step, setStep] = useState<'credentials' | 'otp_verification' | 'otp_setup'>('credentials');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [otpCells, setOtpCells] = useState<string[]>(Array(6).fill(''));
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Focus helper for OTP verification inputs
  useEffect(() => {
    if (step !== 'credentials') {
      setOtpCells(Array(6).fill(''));
      const timer = setTimeout(() => {
        const firstInput = document.getElementById(`${step}-otp-0`);
        if (firstInput) (firstInput as HTMLInputElement).focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleOtpChange = (val: string, idx: number) => {
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) {
      const nextCells = [...otpCells];
      nextCells[idx] = '';
      setOtpCells(nextCells);
      return;
    }
    
    const nextCells = [...otpCells];
    nextCells[idx] = cleanVal[0];
    setOtpCells(nextCells);

    // Mover foco al siguiente
    if (idx < 5) {
      const nextInput = document.getElementById(`${step}-otp-${idx + 1}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      if (!otpCells[idx] && idx > 0) {
        const nextCells = [...otpCells];
        nextCells[idx - 1] = '';
        setOtpCells(nextCells);
        const prevInput = document.getElementById(`${step}-otp-${idx - 1}`);
        if (prevInput) {
          (prevInput as HTMLInputElement).focus();
        }
      } else {
        const nextCells = [...otpCells];
        nextCells[idx] = '';
        setOtpCells(nextCells);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData.length > 0) {
      const nextCells = [...otpCells];
      for (let i = 0; i < 6 && i < pasteData.length; i++) {
        nextCells[i] = pasteData[i];
      }
      setOtpCells(nextCells);
      // Poner foco en el último insertado o en el último índice
      const focusIdx = Math.min(pasteData.length, 5);
      const targetInput = document.getElementById(`${step}-otp-${focusIdx}`);
      if (targetInput) (targetInput as HTMLInputElement).focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    if (isRegisterMode) {
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (isRegisterMode) {
        const res = await onRegister(email, password);
        if (res.success) {
          // Generar secreto 2FA en el cliente para la configuración inicial
          const secret = new OTPAuth.Secret({ size: 20 });
          const b32 = secret.base32;
          setTotpSecret(b32);
          
          const label = encodeURIComponent(`Keyder:${email}`);
          const issuer = encodeURIComponent('Keyder');
          const otpauthUri = `otpauth://totp/${label}?secret=${b32}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
          setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUri)}`);
          
          setStep('otp_setup');
        } else {
          setError(res.error || 'Error al crear la cuenta.');
          shakeContainer();
        }
      } else {
        const res = await onLogin(email, password);
        if (res.success) {
          if (res.requires2FA) {
            setStep('otp_verification');
          }
          // Si no requiere 2FA, App.tsx ya maneja el cambio de estado de bloqueo.
        } else {
          setError(res.error || 'Credenciales incorrectas.');
          shakeContainer();
        }
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
      shakeContainer();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpCells.join('');
    if (code.length < 6) {
      setError('Por favor ingresa el código completo de 6 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await onVerify2FA(email, password, code);
      if (!res.success) {
        setError(res.error || 'Código 2FA incorrecto.');
        setOtpCells(Array(6).fill(''));
        const firstInput = document.getElementById(`${step}-otp-0`);
        if (firstInput) (firstInput as HTMLInputElement).focus();
        shakeContainer();
      }
    } catch (err) {
      setError('Error al procesar la verificación 2FA.');
      shakeContainer();
    } finally {
      setLoading(false);
    }
  };

  const handleSetupOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpCells.join('');
    if (code.length < 6) {
      setError('Por favor ingresa el código completo para confirmar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await onSetup2FA(email, password, totpSecret, code);
      if (!res.success) {
        setError(res.error || 'El código ingresado es incorrecto.');
        setOtpCells(Array(6).fill(''));
        const firstInput = document.getElementById(`${step}-otp-0`);
        if (firstInput) (firstInput as HTMLInputElement).focus();
        shakeContainer();
      }
    } catch (err) {
      setError('Error al enviar la configuración de 2FA.');
      shakeContainer();
    } finally {
      setLoading(false);
    }
  };

  const shakeContainer = () => {
    const el = document.getElementById('auth-box');
    if (el) {
      el.classList.add('animate-shake');
      setTimeout(() => el.classList.remove('animate-shake'), 500);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div
        id="auth-box"
        className="w-full max-w-md bg-white rounded-[32px] p-8 md:p-10 border border-[#D2D2D7]/60 shadow-sm text-center relative overflow-hidden transition-all duration-300"
      >
        {/* Apple Style Gradient Line */}
        <div className="absolute top-0 left-0 w-full h-[5px] bg-[#007AFF]"></div>

        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md relative group">
            {step === 'credentials' ? <Key className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <Lock className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F] font-sans">
          Keyder
        </h1>
        <p className="text-xs font-mono text-[#8E8E93] uppercase tracking-wider mt-1">
          by JHNder Secure Vault
        </p>

        {step === 'credentials' && (
          <>
            <p className="text-sm text-[#8E8E93] mt-3 max-w-xs mx-auto leading-relaxed">
              {isRegisterMode 
                ? 'Crea una cuenta personal protegida con criptografía AES-256 de extremo a extremo.' 
                : 'Inicia sesión para descargar tu llavero criptográfico firmado.'
              }
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
              {/* Correo Electrónico */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#8E8E93] ml-1 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E8E93]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#F2F2F7] text-[#1D1D1F] rounded-2xl border border-transparent focus:border-[#007AFF]/30 focus:bg-white outline-none font-sans transition-all placeholder-[#8E8E93] text-sm"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#8E8E93] ml-1 uppercase tracking-wider">
                  {isRegisterMode ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E8E93]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    placeholder="Contraseña personal"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#F2F2F7] text-[#1D1D1F] rounded-2xl border border-transparent focus:border-[#007AFF]/30 focus:bg-white outline-none font-sans transition-all placeholder-[#8E8E93] text-sm"
                  />
                </div>
              </div>

              {/* Confirmar Contraseña (Solo Registro) */}
              {isRegisterMode && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[12px] font-medium text-[#8E8E93] uppercase tracking-wider">
                      Confirmar Contraseña
                    </label>
                    {password && confirmPassword && (
                      <span className={`text-[10px] font-semibold ${password === confirmPassword ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {password === confirmPassword ? 'Coinciden' : 'No coinciden'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E8E93]">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      placeholder="Repite tu contraseña exactamente"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#F2F2F7] text-[#1D1D1F] rounded-2xl border border-transparent focus:border-[#007AFF]/30 focus:bg-white outline-none font-sans transition-all placeholder-[#8E8E93] text-sm"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100 mt-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3.5 px-4 bg-[#1D1D1F] hover:bg-[#2D2D2F] active:bg-black text-white font-medium rounded-2xl shadow-sm text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{isRegisterMode ? 'Crear mi Cuenta' : 'Acceder al Llavero'}</span>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#F2F2F7] text-center">
              <button
                onClick={toggleMode}
                disabled={loading}
                className="text-xs text-[#007AFF] hover:underline font-medium focus:outline-none"
              >
                {isRegisterMode 
                  ? '¿Ya tienes cuenta? Inicia sesión aquí' 
                  : '¿No tienes cuenta? Registrate aquí (No mixta)'
                }
              </button>
            </div>
          </>
        )}

        {step === 'otp_verification' && (
          <>
            <p className="text-sm font-semibold text-[#007AFF] mt-2 flex items-center justify-center gap-1.5 bg-[#007AFF]/10 py-1 px-3 rounded-full w-fit mx-auto">
              🔑 Llave de acceso cifrada detectada
            </p>
            <p className="text-sm text-[#8E8E93] mt-3 leading-relaxed">
              Tu cuenta está protegida con verificación de dos pasos. Abre tu app autenticadora e ingresa el código de 6 dígitos.
            </p>

            <form onSubmit={handleVerifyOtpSubmit} className="mt-8 space-y-6">
              {/* Células OTP */}
              <div className="flex justify-between gap-2.5 max-w-sm mx-auto">
                {otpCells.map((val, idx) => (
                  <input
                    key={idx}
                    id={`otp_verification-otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    disabled={loading}
                    className="w-12 h-14 text-center text-2xl font-bold font-mono bg-[#F2F2F7] border border-transparent focus:border-[#007AFF]/40 focus:bg-white rounded-xl outline-none transition-all"
                  />
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || otpCells.join('').length < 6}
                  className="w-full py-3.5 px-4 bg-[#1D1D1F] hover:bg-[#2D2D2F] active:bg-black text-white font-medium rounded-2xl shadow-sm text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Desbloquear Llave'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  disabled={loading}
                  className="w-full py-2.5 text-xs text-[#007AFF] hover:underline font-medium focus:outline-none"
                >
                  Atrás / Cambiar cuenta
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'otp_setup' && (
          <>
            <p className="text-sm text-[#8E8E93] mt-3 leading-relaxed">
              Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.) o copia la llave secreta manualmente.
            </p>

            <div className="my-6 bg-white p-3 rounded-2xl inline-block border border-[#D2D2D7]/40 shadow-inner">
              <img src={qrCodeUrl} alt="QR de Configuración 2FA" className="w-[160px] h-[160px] select-none" />
            </div>

            <div className="mb-6 space-y-2">
              <p className="text-[11px] text-[#8E8E93] uppercase font-bold tracking-wider">Llave manual</p>
              <div className="flex items-center gap-2 bg-[#F2F2F7] rounded-xl py-2 px-3 justify-between font-mono text-xs text-[#1D1D1F] max-w-xs mx-auto border border-[#D2D2D7]/30">
                <span className="truncate">{totpSecret}</span>
                <button 
                  type="button" 
                  onClick={copySecret}
                  className="p-1 rounded-md hover:bg-white active:bg-gray-200 transition-colors text-[#007AFF]"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <form onSubmit={handleSetupOtpSubmit} className="space-y-6 text-left">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#8E8E93] ml-1 uppercase tracking-wider block text-center">
                  Ingresa el código generado para confirmar
                </label>
                <div className="flex justify-between gap-2.5 max-w-sm mx-auto my-2">
                  {otpCells.map((val, idx) => (
                    <input
                      key={idx}
                      id={`otp_setup-otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      onPaste={idx === 0 ? handleOtpPaste : undefined}
                      disabled={loading}
                      className="w-12 h-14 text-center text-2xl font-bold font-mono bg-[#F2F2F7] border border-transparent focus:border-[#007AFF]/40 focus:bg-white rounded-xl outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || otpCells.join('').length < 6}
                  className="w-full py-3.5 px-4 bg-[#007AFF] hover:bg-blue-600 text-white font-medium rounded-2xl shadow-sm text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirmar y Activar 2FA'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  disabled={loading}
                  className="w-full py-2.5 text-xs text-rose-500 hover:underline font-medium focus:outline-none text-center block"
                >
                  Cancelar registro
                </button>
              </div>
            </form>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#A2A2A8]">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Firma digital dinámica AES-256</span>
        </div>
      </div>

      <div className="mt-6 text-center max-w-xs text-xs text-[#8E8E93] leading-relaxed select-none">
        <p>Tus claves de descifrado nunca se transmiten ni almacenan en texto plano en la nube.</p>
      </div>

      {/* Shake Keyframe animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
