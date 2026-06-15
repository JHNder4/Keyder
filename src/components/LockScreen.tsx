import React, { useState } from 'react';
import { Lock, Shield, RefreshCw, KeyRound, Mail, ArrowRight, Key } from 'lucide-react';

interface LockScreenProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export default function LockScreen({ onLogin, onRegister }: LockScreenProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        if (!res.success) {
          setError(res.error || 'Error al crear la cuenta.');
          shakeContainer();
        }
      } else {
        const res = await onLogin(email, password);
        if (!res.success) {
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
            <Key className="w-7 h-7" />
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
