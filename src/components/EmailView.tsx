import { useState } from 'react';
import { Mail, ShieldAlert, Key, ChevronRight, ExternalLink } from 'lucide-react';
import { Account } from '../types';

interface EmailViewProps {
  accounts: Account[];
  onOpenWithId: (id: string) => void;
}

export default function EmailView({ accounts, onOpenWithId }: EmailViewProps) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Consideramos "cuentas de correo" a las que tienen la categoría 'email' o tienen emails en el username
  const emailAccounts = accounts.filter(
    acc => acc.category === 'email' || acc.username.includes('@')
  );

  // Obtener direcciones de email únicas en uso para relacionar cuentas inteligentes
  const uniqueEmails = Array.from(
    new Set(
      accounts
        .map(acc => acc.username)
        .filter(u => u.includes('@') && u.includes('.'))
    )
  );

  // Si no hay correo seleccionado por defecto, seleccionamos el primero disponible
  const activeEmailAddress = selectedEmail || uniqueEmails[0] || null;

  // Cuentas dependientes ligadas a la dirección de correo activa
  const linkedAccounts = activeEmailAddress
    ? accounts.filter(acc => acc.username === activeEmailAddress && acc.category !== 'email')
    : [];

  // Proveedores de buzón reales (ej: Google, Outlook, iCloud)
  const mailboxAccounts = accounts.filter(
    acc => acc.category === 'email' && uniqueEmails.includes(acc.username)
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      
      {/* Intro inteligente */}
      <div className="bg-white border border-[#D2D2D7] rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 bg-blue-500 rounded-lg text-white">
            <Mail className="w-5 h-5" />
          </span>
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Analizador de Cuentas de Correo</h3>
        </div>
        <p className="text-sm text-[#8E8E93] max-w-2xl">
          Visualiza tus casillas de correo base y comprende qué plataformas secundarias dependen de ti. Si tu buzón se viera comprometido, todas las cuentas asociadas (con el mismo email) estarían vulneradas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLUMNA IZQUIERDA: INDICE DE DIRECCIONES DE EMAIL DETECTADAS */}
        <div className="bg-white border border-[#D2D2D7] rounded-3xl p-4 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">Emails en tu base de datos ({uniqueEmails.length})</h4>
          
          {uniqueEmails.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No se detectaron correos electrónicos en los nombres de usuario.</p>
          ) : (
            <div className="space-y-1">
              {uniqueEmails.map(email => {
                const isSelected = activeEmailAddress === email;
                const totalMAPPED = accounts.filter(acc => acc.username === email).length;
                const isMailboxInDb = mailboxAccounts.some(acc => acc.username === email);

                return (
                  <button
                    key={email}
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-500 text-white shadow-sm' 
                        : 'hover:bg-[#F2F2F7] text-[#1D1D1F]'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className={`text-xs font-medium truncate font-mono ${isSelected ? 'text-white' : ''}`}>
                        {email}
                      </p>
                      <span className={`text-[10px] block ${isSelected ? 'text-blue-100' : 'text-[#8E8E93]'}`}>
                        {isMailboxInDb ? '✓ Buzón registrado en Bóveda' : 'Suscrito en otras plataformas'}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {totalMAPPED} {totalMAPPED === 1 ? 'cuenta' : 'cuentas'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: RELACIÓN INTELIGENTE DE CUENTAS DEPENDIENTES */}
        <div className="lg:col-span-2 space-y-6">
          {activeEmailAddress ? (
            <div className="bg-white border border-[#D2D2D7] rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Resumen del Correo Seleccionado */}
              <div className="pb-4 border-b border-[#F2F2F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-blue-500 font-mono uppercase tracking-widest block">Dirección de Auditoría</span>
                  <h3 className="text-base font-bold text-[#1D1D1F] font-mono break-all">{activeEmailAddress}</h3>
                </div>

                {/* Si la contraseña de este buzón exacto está en la bóveda, mostramos atajo */}
                {mailboxAccounts.some(acc => acc.username === activeEmailAddress) ? (
                  (() => {
                    const mailbox = mailboxAccounts.find(acc => acc.username === activeEmailAddress)!;
                    return (
                      <button
                        onClick={() => onOpenWithId(mailbox.id)}
                        className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-lg border border-blue-200/50 flex items-center gap-1 cursor-pointer transition-all self-start"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Ver Llave Buzón de Entrada
                      </button>
                    );
                  })()
                ) : (
                  <div className="py-1.5 px-3 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200 flex items-center gap-1 self-start">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Sin Credencial de buzón en Bóveda
                  </div>
                )}
              </div>

              {/* Mapeo de dependencia */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block">Cuentas Secundarias Ligadas ({linkedAccounts.length})</span>
                  <span className="text-[10px] text-[#A2A2A8]">Filtro Relacional</span>
                </div>

                {linkedAccounts.length === 0 ? (
                  <div className="p-8 text-center bg-[#F2F2F7] rounded-xl text-slate-400 text-xs border border-[#E5E5EA] italic">
                    No hay cuentas externas usando este correo como credencial de inicio de sesión.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {linkedAccounts.map(linked => (
                      <div
                        key={linked.id}
                        className="p-4 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl space-y-3 relative group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-[#1D1D1F] capitalize">{linked.accountName}</h4>
                            <span className="text-[9px] bg-slate-200 text-[#8E8E93] px-1.5 py-0.5 rounded uppercase font-mono mt-0.5 inline-block">
                              {linked.category}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => onOpenWithId(linked.id)}
                            className="p-1 rounded bg-white hover:bg-slate-100 text-slate-500 shadow-sm transition-all cursor-pointer border border-[#E5E5EA]"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-[11px] space-y-1 text-slate-500 border-t border-[#E5E5EA] pt-2">
                          {linked.loginPage && (
                            <a
                              href={linked.loginPage}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="flex items-center gap-1 text-blue-500 hover:underline overflow-hidden font-mono text-[9px]"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              Ir al Login
                            </a>
                          )}
                          
                          <div className="flex items-center justify-between font-mono text-[9px]">
                            <span>Password:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold font-sans text-slate-500">••••••••</span>
                              <button
                                onClick={() => handleCopy(linked.password, linked.id)}
                                className="text-[#007AFF] hover:underline"
                              >
                                {copiedId === linked.id ? 'Copiado✓' : 'Copiar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Auditoría preventiva de redundancia */}
              {linkedAccounts.length > 2 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed space-y-1">
                  <h5 className="font-bold flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" /> Alta dependencia de esta casilla
                  </h5>
                  <p>
                    Tienes {linkedAccounts.length} cuentas distintas ligadas a este mismo buzón de correo. Le aconsejamos diversificar mediante alias de correo de Keyder o activar el inicio de sesión passkey biométrico para bloquear inicios mediante secuestros masivos.
                  </p>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-dashed border-[#D1D1D6] rounded-2xl p-12 text-center text-[#8E8E93] italic">
              Añade una cuenta con correo o dominio en el usuario para habilitar el analizador relacional.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
