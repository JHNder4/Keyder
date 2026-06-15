import React, { useState, useEffect } from 'react';
import { Search, Globe, MessageSquare, ShieldCheck, Gamepad2, Layers, PlusCircle, Clipboard, Check, Eye, EyeOff, ExternalLink, Trash2, ChevronRight, ShieldAlert, Timer, Copy } from 'lucide-react';
import { Account, AccountCategory } from '../types';
import { getTOTPCode } from '../totp';

// Subcomponente de alto rendimiento para el Ticker TOTP (evita renders de toda la lista cada segundo)
function TotpLoader({ secret, accountId }: { secret: string; accountId: string }) {
  const [totpData, setTotpData] = useState(() => getTOTPCode(secret));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Actualizar cada 200ms para una animación ultra fluida y matemática exacta
    const timer = setInterval(() => {
      setTotpData(getTOTPCode(secret));
    }, 200);

    return () => clearInterval(timer);
  }, [secret]);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rawCode = totpData.code.replace(/\s/g, '');
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const percentage = (totpData.secondsLeft / 30) * 100;

  return (
    <div className="mt-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-2 font-sans">
      <div className="flex justify-between items-center select-none">
        <span className="text-[9px] text-[#8E8E93] font-sans font-bold uppercase tracking-wider flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
          Seguridad 2FA Real
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-500 font-mono tracking-tight flex items-center gap-0.5">
            <Timer className="w-3 h-3 text-slate-400 shrink-0" />
            {Math.ceil(totpData.secondsLeft)}s
          </span>
        </div>
      </div>
      
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200/50 shadow-sm">
        <span className="font-mono font-bold text-sm sm:text-base text-[#1D1D1F] tracking-[0.25em] pl-1 select-all">
          {totpData.code}
        </span>
        <button
          onClick={handleCopyCode}
          className="p-1 px-2.5 hover:bg-[#F2F2F7] rounded-lg border border-slate-100 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[9px] font-sans font-bold text-emerald-500">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#007AFF]" />
              <span className="text-[9px] font-sans font-semibold text-slate-500">Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Barra de progreso fina estilo Apple (#E5E5EA) */}
      <div className="space-y-1">
        <div className="w-full h-1 bg-[#E5E5EA] rounded-full overflow-hidden relative">
          <div 
            style={{ width: `${percentage}%` }}
            className={`h-full rounded-full transition-all duration-200 ease-linear ${
              totpData.secondsLeft <= 5 ? 'bg-rose-500' : 'bg-[#007AFF]'
            }`}
          />
        </div>
        <div className="flex justify-between text-[8px] text-[#8E8E93] font-bold tracking-wider uppercase">
          <span>{totpData.secondsLeft <= 5 ? 'Expirando pronto' : 'Sincronizado'}</span>
          <span>Google Authenticator</span>
        </div>
      </div>
    </div>
  );
}

interface OtherAccountsViewProps {
  accounts: Account[];
  onOpenWithId: (id: string) => void;
  onOpenAddModal: () => void;
  onDeleteAccount: (id: string) => Promise<void>;
}

const SECTION_CAT: { value: string; label: string; icon: any; types: AccountCategory[] }[] = [
  { value: 'all', label: 'Todos', icon: Layers, types: ['social-media', 'messenger', 'online-banking', 'dating-app', 'software-license', 'online-games', 'other'] },
  { value: 'social', label: 'Redes Sociales', icon: Globe, types: ['social-media'] },
  { value: 'chat', label: 'Mensajería', icon: MessageSquare, types: ['messenger'] },
  { value: 'banks', label: 'Banca y Finanzas', icon: ShieldCheck, types: ['online-banking'] },
  { value: 'games', label: 'Videojuegos', icon: Gamepad2, types: ['online-games'] },
  { value: 'work', label: 'Trabajo y Software', icon: Layers, types: ['software-license', 'other'] }
];

export default function OtherAccountsView({ accounts, onOpenWithId, onOpenAddModal, onDeleteAccount }: OtherAccountsViewProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});

  // Filtrar según el selector lateral de categorías secundaria
  const selectedTypes = SECTION_CAT.find(tab => tab.value === activeTab)?.types || [];
  
  const filtered = accounts.filter(acc => {
    const matchesCategory = selectedTypes.includes(acc.category);
    const matchesSearch = searchQuery 
      ? acc.accountName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        acc.username.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const togglePassword = (id: string) => {
    setShowPassMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Category bar */}
      <div className="bg-white border border-[#D2D2D7] rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Categories slider */}
        <div className="flex gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {SECTION_CAT.map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`py-1.5 px-3 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'hover:bg-[#F2F2F7] text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Local Search and Add button */}
        <div className="flex gap-3 w-full md:w-auto self-stretch md:self-auto shrink-0">
          <div className="relative flex-1 md:flex-none">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-48 pl-8 pr-3 py-1.5 bg-[#F2F2F7] text-xs font-medium text-[#1D1D1F] rounded-lg border border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
          
          <button
            onClick={onOpenAddModal}
            className="py-1.5 px-3 bg-[#007AFF] hover:bg-blue-600 active:bg-[#0051A8] text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Nueva Llave
          </button>
        </div>
      </div>

      {/* CARDS GRID LAYOUT */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-[#D2D2D7] rounded-3xl p-16 text-center text-[#8E8E93] italic">
          No se encontraron cuentas registradas en este bloque.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(acc => {
            const showP = showPassMap[acc.id] || false;
            return (
              <div
                key={acc.id}
                className="bg-white border border-[#D2D2D7] rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
              >
                {/* Header Card */}
                <div className="p-5 border-b border-[#F2F2F7] space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-[#1D1D1F] capitalize truncate max-w-[130px]">{acc.accountName}</h4>
                      <span className="text-[9px] bg-slate-100 text-slate-500 font-semibold uppercase px-1.5 py-0.5 rounded font-mono block mt-1 w-max">
                        {acc.category}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => onOpenWithId(acc.id)}
                        className="py-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-[#D1D1D6] rounded-lg text-[10px] font-bold text-slate-600 transition-all cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Estás seguro de que deseas eliminar esta cuenta de manera irreversible de la base de datos de Supabase?')) {
                            onDeleteAccount(acc.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {acc.loginPage && (
                    <a
                      href={acc.loginPage}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="text-[10px] font-mono text-blue-500 hover:underline flex items-center gap-0.5 truncate"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      {acc.loginPage}
                    </a>
                  )}
                </div>

                {/* Details Section */}
                <div className="p-5 bg-slate-50/50 space-y-3 font-mono text-xs text-[#1D1D1F]">
                  
                  {/* Account username handle */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-[#8E8E93] font-sans font-bold uppercase tracking-wider block">Username</span>
                    <p className="truncate font-semibold text-[11px] select-all bg-[#F2F2F7] p-1.5 rounded-lg border border-[#E5E5EA]">
                      {acc.username}
                    </p>
                  </div>

                  {/* Password block */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-[#8E8E93] font-sans font-bold uppercase tracking-wider block">Password</span>
                    <div className="relative">
                      <div className="w-full pr-16 pl-3 py-1.5 bg-[#F2F2F7] rounded-lg border border-[#E5E5EA] font-bold text-[11px] truncate">
                        {showP ? acc.password : '••••••••'}
                      </div>
                      <div className="absolute right-1 top-0.5 flex gap-0.5">
                        <button
                          onClick={() => togglePassword(acc.id)}
                          className="p-1 text-slate-400 hover:text-slate-605"
                        >
                          {showP ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                        <button
                          onClick={() => handleCopy(acc.password, acc.id)}
                          className="p-1 text-slate-400 hover:text-blue-500"
                        >
                          {copiedId === acc.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Copy Credentials Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(`Usuario: ${acc.username}\nContraseña: ${acc.password}`, `quick-${acc.id}`);
                    }}
                    className="w-full mt-2 py-1.5 px-3 bg-white hover:bg-[#F2F2F7] active:bg-[#E5E5EA] text-[#1D1D1F] font-semibold text-[11px] rounded-xl border border-[#D2D2D7] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                  >
                    {copiedId === `quick-${acc.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600">¡Credenciales Copiadas!</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5 text-[#8E8E93]" />
                        <span>Copiar Credenciales Rápido</span>
                      </>
                    )}
                  </button>

                  {/* 2FA TOTP block if secret exists */}
                  {acc.otpSecret && (
                    <TotpLoader secret={acc.otpSecret} accountId={acc.id} />
                  )}

                </div>

                {/* Checklist brief if available */}
                {acc.checklist && acc.checklist.length > 0 && (
                  <div className="px-5 py-3.5 border-t border-[#F2F2F7] flex items-center justify-between text-[11px] text-[#8E8E93] font-medium">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Estado Checklist:</span>
                    <span className="font-semibold text-slate-800">
                      {acc.completedTasks?.length || 0} de {acc.checklist.length} tareas hechas
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
