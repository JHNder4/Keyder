import { useState } from 'react';
import { Shield, CreditCard, CheckCircle, AlertTriangle, Smartphone, ChevronRight, ArrowRight, Sparkles, Copy, Check } from 'lucide-react';
import { Account, PasskeyRequest } from '../types';

interface DashboardViewProps {
  accounts: Account[];
  passkeyRequests: PasskeyRequest[];
  onTriggerPasskeySimulation: (service: string, username: string) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
  onOpenWithId: (id: string) => void;
}

export default function DashboardView({ accounts, passkeyRequests, onTriggerPasskeySimulation, onNavigateToTab, onOpenWithId }: DashboardViewProps) {
  const [genLength, setGenLength] = useState(14);
  const [genUpper, setGenUpper] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedPass, setGeneratedPass] = useState('');
  const [copied, setCopied] = useState(false);

  // Calcular métricas
  const totalAccounts = accounts.length;
  
  // Cuenta suscripciones
  const paidAccounts = accounts.filter(acc => (acc.costPerMonth || 0) > 0);
  const totalCost = accounts.reduce((acc, current) => acc + (current.costPerMonth || 0), 0);
  
  // Filtrar contraseñas vulnerables (cortas, débiles o repetidas)
  const weakPasswords = accounts.filter(acc => acc.password.length < 8);
  
  // Contraseñas repetidas
  const passwordMap = new Map<string, number>();
  accounts.forEach(acc => {
    passwordMap.set(acc.password, (passwordMap.get(acc.password) || 0) + 1);
  });
  const reusedCount = accounts.filter(acc => (passwordMap.get(acc.password) || 0) > 1).length;

  const score = totalAccounts === 0 
    ? 100 
    : Math.max(30, Math.round(100 - (weakPasswords.length * 15) - (reusedCount * 8)));

  const handleGenerate = () => {
    let charset = 'abcdefghijklmnopqrstuvwxyz';
    if (genUpper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (genNumbers) charset += '0123456789';
    if (genSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let result = '';
    for (let i = 0; i < genLength; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setGeneratedPass(result);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!generatedPass) return;
    navigator.clipboard.writeText(generatedPass);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD 1: ESTADO DE SEGURIDAD GENERAL */}
        <div className="bg-white border border-[#D2D2D7] rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Canal de Seguridad</span>
              <Shield className={`w-5 h-5 ${score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'}`} />
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-[#1D1D1F]">{score}%</span>
              <span className="text-xs font-medium text-[#8E8E93]">Puntuación</span>
            </div>
            
            <div className="w-full bg-[#F2F2F7] h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#F2F2F7] text-xs">
            <div className="flex justify-between text-[#1D1D1F]">
              <span className="flex items-center gap-1.5 font-medium text-[#8E8E93]">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Cuentas Totales
              </span>
              <span className="font-semibold">{totalAccounts}</span>
            </div>
            <div className="flex justify-between text-[#1D1D1F]">
              <span className="flex items-center gap-1.5 font-medium text-[#8E8E93]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Débiles (&lt;8 cap)
              </span>
              <span className="font-semibold text-amber-600">{weakPasswords.length}</span>
            </div>
            <div className="flex justify-between text-[#1D1D1F]">
              <span className="flex items-center gap-1.5 font-medium text-[#8E8E93]">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Reutilizadas
              </span>
              <span className="font-semibold text-orange-600">{reusedCount}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: GASTO MENSUAL SUSCRIPCIONES */}
        <div className="bg-white border border-[#D2D2D7] rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Suscripciones Pagadas</span>
              <CreditCard className="w-5 h-5 text-indigo-500" />
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-xs text-[#8E8E93] font-medium mr-1">Suma Total</span>
              <span className="text-4xl font-extrabold tracking-tight text-[#1D1D1F]">
                €{totalCost.toFixed(2)}
              </span>
              <span className="text-xs font-medium text-[#8E8E93]">/mes</span>
            </div>
            
            <p className="text-xs text-[#8E8E93] leading-snug">
              Calculado en base a tus {paidAccounts.length} licencias y plataformas con coste mensual configurado.
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('subscriptions')}
            className="w-full py-2 px-3 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            Ver tabla de suscripciones
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* CARD 3: PETICIÓN DE DISPOSITIVO PASSKEY EN COLA */}
        <div className="bg-white border border-[#D2D2D7] rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Terminal de Llave</span>
              <Smartphone className="w-5 h-5 text-emerald-500" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#1D1D1F]">Firma de Llave Móvil (Passkey)</h4>
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Utiliza la autenticación biométrica de Keyder en lugar de passwords. Tu bóveda recibe solicitudes Push y firma accesos automáticos.
              </p>
            </div>
          </div>

          {passkeyRequests.length > 0 && passkeyRequests.some(r => r.status === 'pending') ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between animate-pulse">
              <div className="text-[11px] text-red-700 font-medium font-sans">
                ⚠️ Solicitud pendiente de firma
              </div>
              <button
                onClick={() => onNavigateToTab('passkeys')}
                className="text-[11px] bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                Atender
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onTriggerPasskeySimulation('PayPal', 'martin.gans@example.com');
                onNavigateToTab('passkeys');
              }}
              className="w-full py-2 px-3 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              Simular petición Passkey
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

      </div>

      {/* SECCIÓN ABAJO: GENERADOR AVANZADO APPLE Y CUENTAS RECIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WIDGET 1: GENERADOR DE CONTRASEÑAS COHERENTE */}
        <div className="bg-white border border-[#D2D2D7] rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F2F2F7]">
            <h3 className="font-bold text-sm text-[#1D1D1F] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Generador de Contraseñas Fuertes de Apple
            </h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold uppercase px-2.5 py-0.5 rounded-full">
              Sugerencia de llavero
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Controles */}
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-[#8E8E93]">
                  <span>Longitud</span>
                  <span className="text-[#1D1D1F] font-mono">{genLength} caracteres</span>
                </div>
                <input 
                  type="range" 
                  min="8" 
                  max="32" 
                  value={genLength}
                  onChange={(e) => setGenLength(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#F2F2F7] rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-medium text-[#1D1D1F] cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={genUpper} 
                    onChange={(e) => setGenUpper(e.target.checked)}
                    className="rounded text-blue-500 focus:ring-0 focus:ring-offset-0" 
                  />
                  Mayúsculas (A-Z)
                </label>
                <label className="flex items-center gap-2.5 text-xs font-medium text-[#1D1D1F] cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={genNumbers} 
                    onChange={(e) => setGenNumbers(e.target.checked)}
                    className="rounded text-blue-500 focus:ring-0 focus:ring-offset-0" 
                  />
                  Números (0-9)
                </label>
                <label className="flex items-center gap-2.5 text-xs font-medium text-[#1D1D1F] cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={genSymbols} 
                    onChange={(e) => setGenSymbols(e.target.checked)}
                    className="rounded text-blue-500 focus:ring-0 focus:ring-offset-0" 
                  />
                  Símbolos (!@#$)
                </label>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer transition-colors"
              >
                Generar Contraseña Segura
              </button>
            </div>

            {/* Resultado */}
            <div className="bg-[#F2F2F7] rounded-xl p-4 flex flex-col justify-between border border-[#E5E5EA]">
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">Contraseña Sugerida:</span>
                {generatedPass ? (
                  <p className="font-mono text-sm break-all font-bold tracking-wider text-[#1D1D1F] select-all p-2 bg-white rounded-lg border border-[#E5E5EA]">
                    {generatedPass}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic p-2 border border-dashed border-[#D1D1D6] rounded-lg bg-white">
                    Pulsa generar para crear...
                  </p>
                )}
              </div>

              {generatedPass && (
                <div className="pt-4 flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-50 text-[#1D1D1F] border border-[#D1D1D6] rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* WIDGET 2: LISTADO DE ACCESOS RÁPIDOS */}
        <div className="bg-white border border-[#D2D2D7] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F2F2F7]">
            <h3 className="font-bold text-sm text-[#1D1D1F]">Últimos Registros</h3>
            <span className="text-[10px] text-[#8E8E93] font-medium">Bóveda</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto divide-y divide-[#F2F2F7]">
            {accounts.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">La bóveda de credenciales está vacía.</p>
            ) : (
              accounts.slice(0, 5).map(acc => (
                <div 
                  key={acc.id} 
                  onClick={() => onOpenWithId(acc.id)}
                  className="flex items-center justify-between py-2 hover:bg-[#F2F2F7] px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-[#1D1D1F] capitalize">{acc.accountName}</h4>
                    <p className="text-[10px] font-mono text-[#8E8E93] truncate max-w-[150px]">{acc.username}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] bg-[#E5E5EA] text-slate-700 px-2 py-0.5 rounded font-mono uppercase">
                      {acc.category}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
