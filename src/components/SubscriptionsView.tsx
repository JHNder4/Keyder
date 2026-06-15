import { useState } from 'react';
import { CreditCard, ExternalLink, Eye, EyeOff, Clipboard, Check, CheckSquare, ChevronDown, PlusCircle } from 'lucide-react';
import { Account } from '../types';

interface SubscriptionsViewProps {
  accounts: Account[];
  onOpenWithId: (id: string) => void;
  onToggleChecklistItem: (accountId: string, taskName: string) => Promise<void>;
  onOpenAddModal: () => void;
}

export default function SubscriptionsView({ accounts, onOpenWithId, onToggleChecklistItem, onOpenAddModal }: SubscriptionsViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  
  // Estado para saber qué checklist de fila está abierto
  const [openChecklistRowId, setOpenChecklistRowId] = useState<string | null>(null);

  // Filtramos las cuentas que pertenecen al módulo de suscripciones pagadas (o tienen costo o categoría suscripción)
  const paidAccounts = accounts.filter(
    acc => (acc.costPerMonth || 0) > 0 || acc.category === 'streaming' || acc.category === 'software-license' || acc.category === 'online-shop'
  );

  // Calcular la suma total dinámicamente como en el screenshot: "Suma €78,20"
  const totalSum = paidAccounts.reduce((acc, current) => acc + (current.costPerMonth || 0), 0);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'email':
        return 'bg-blue-100 text-blue-700';
      case 'online-shop':
        return 'bg-orange-100 text-orange-700';
      case 'messenger':
        return 'bg-amber-100 text-amber-700';
      case 'social-media':
        return 'bg-indigo-100 text-indigo-700';
      case 'online-banking':
        return 'bg-emerald-100 text-emerald-700';
      case 'streaming':
        return 'bg-purple-100 text-purple-700';
      case 'dating-app':
        return 'bg-rose-100 text-rose-700';
      case 'software-license':
        return 'bg-stone-200 text-stone-700';
      case 'online-games':
        return 'bg-fuchsia-100 text-fuchsia-700';
      default:
        return 'bg-slate-100 text-slate-705';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'email': return 'e-mail';
      case 'online-shop': return 'online shop';
      case 'messenger': return 'messenger';
      case 'social-media': return 'social media';
      case 'online-banking': return 'online banking';
      case 'streaming': return 'streaming';
      case 'dating-app': return 'dating app';
      case 'software-license': return 'software license';
      case 'online-games': return 'online games';
      default: return 'other';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro con el mismo estilo */}
      <div className="bg-white border border-[#D2D2D7] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500 rounded-lg text-white">
              <CreditCard className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-semibold text-[#1D1D1F]">Módulo de Suscripciones Pagadas</h3>
          </div>
          <p className="text-sm text-[#8E8E93] max-w-xl">
            Control exacto sobre los abonos periódicos, enlaces directos de cancelación/gestión y checklists de revisión de cuentas.
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="py-2.5 px-4 bg-[#007AFF] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Añadir Suscripción
        </button>
      </div>

      {/* TABLA HIGH FIDELITY ESTILO EXCEL / SCREENSHOT */}
      <div className="bg-white border border-[#D2D2D7] rounded-3xl overflow-hidden shadow-sm relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F5F5F7] text-[#8E8E93] font-medium border-b border-[#D2D2D7]">
                <th className="px-5 py-3 border-r border-[#D2D2D7] w-6"></th>
                <th className="px-5 py-3 border-r border-[#D2D2D7] w-48 font-semibold">Account</th>
                <th className="px-5 py-3 border-r border-[#D2D2D7] w-36 font-semibold">Category</th>
                <th className="px-5 py-3 border-r border-[#D2D2D7] font-semibold">Login page</th>
                <th className="px-5 py-3 border-r border-[#D2D2D7] font-semibold">User name</th>
                <th className="px-5 py-3 border-r border-[#D2D2D7] font-semibold">Password</th>
                <th className="px-5 py-3 border-r border-[#D2D2D7] w-36 font-semibold">Cost per month</th>
                <th className="px-5 py-3 w-40 font-semibold">What to do?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F7] text-[#1D1D1F]">
              {paidAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 italic">No tienes suscripciones registradas. Revisa o añade costos mensuales a tus llaves.</td>
                </tr>
              ) : (
                paidAccounts.map((acc, index) => {
                  const completedCount = acc.completedTasks?.length || 0;
                  const totalTasks = acc.checklist?.length || 0;
                  const showPassword = showPasswordMap[acc.id] || false;
                  const isChecklistOpen = openChecklistRowId === acc.id;

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/50 group">
                      {/* Index index */}
                      <td className="px-5 py-3 text-center text-[#8E8E93] font-mono border-r border-[#D2D2D7] text-[10px]">
                        {index + 1}
                      </td>

                      {/* Account Name */}
                      <td className="px-5 py-3 font-semibold border-r border-[#D2D2D7]">
                        <button
                          onClick={() => onOpenWithId(acc.id)}
                          className="text-[#007AFF] hover:underline font-bold text-left cursor-pointer"
                        >
                          {acc.accountName}
                        </button>
                      </td>

                      {/* Category Pillow */}
                      <td className="px-5 py-3 border-r border-[#D2D2D7]">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap capitalize ${getCategoryBadgeColor(acc.category)}`}>
                          {getCategoryLabel(acc.category)}
                        </span>
                      </td>

                      {/* Login Page clickable */}
                      <td className="px-5 py-3 border-r border-[#D2D2D7] font-mono truncate max-w-[180px] text-blue-500 hover:text-blue-700 font-bold">
                        {acc.loginPage ? (
                          <a
                            href={acc.loginPage}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            className="flex items-center gap-1 hover:underline text-[11px]"
                            title={acc.loginPage}
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{acc.loginPage}</span>
                          </a>
                        ) : (
                          <span className="text-slate-350 italic text-[10px] select-none">-</span>
                        )}
                      </td>

                      {/* Username */}
                      <td className="px-5 py-3 border-r border-[#D2D2D7] font-mono text-[11px] truncate max-w-[180px]" title={acc.username}>
                        {acc.username}
                      </td>

                      {/* Password revealing */}
                      <td className="px-5 py-3 border-r border-[#D2D2D7] font-mono">
                        <div className="flex items-center justify-between gap-1">
                          <span className="tracking-wider font-semibold text-[11px]">
                            {showPassword ? acc.password : '••••••••'}
                          </span>
                          
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => togglePasswordVisibility(acc.id)}
                              className="p-0.5 text-slate-400 hover:text-slate-600"
                            >
                              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => handleCopy(acc.password, acc.id)}
                              className="p-0.5 text-slate-400 hover:text-slate-600 ml-0.5"
                            >
                              {copiedId === acc.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Clipboard className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Cost per Month */}
                      <td className="px-5 py-3 border-r border-[#D2D2D7] font-semibold text-[11px] font-mono text-right pr-6">
                        {acc.costPerMonth ? `€${acc.costPerMonth.toFixed(2).replace('.', ',')}` : ''}
                      </td>

                      {/* Checklist Col interactiva */}
                      <td className="px-5 py-3 relative">
                        {totalTasks > 0 ? (
                          <div className="relative">
                            {/* Botón selector de checklist exacto */}
                            <button
                              onClick={() => setOpenChecklistRowId(isChecklistOpen ? null : acc.id)}
                              className="flex items-center justify-between gap-1 px-2.5 py-1 bg-slate-100 border border-[#D1D1D6] hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer min-w-[56px] select-none"
                            >
                              <span className="flex items-center gap-1.5">
                                <CheckSquare className={`w-3.5 h-3.5 ${completedCount === totalTasks ? 'text-emerald-500' : 'text-[#8E8E93]'}`} />
                                {completedCount}/{totalTasks}
                              </span>
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            </button>

                            {/* Menú flotante del checklist para esta fila */}
                            {isChecklistOpen && (
                              <div className="absolute top-8 left-0 mt-1 w-56 bg-white border border-[#E5E5EA] rounded-xl shadow-lg p-3 z-30 space-y-2 text-left">
                                <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-1.5 mb-1.5">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8E8E93]">Checklist Tareas</span>
                                  <button 
                                    onClick={() => setOpenChecklistRowId(null)}
                                    className="text-[9px] hover:underline text-blue-500"
                                  >
                                    Listo
                                  </button>
                                </div>
                                <div className="space-y-2 max-h-36 overflow-y-auto">
                                  {acc.checklist.map(task => {
                                    const completed = acc.completedTasks?.includes(task);
                                    return (
                                      <label
                                        key={task}
                                        className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer select-none"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={completed}
                                          onChange={() => onToggleChecklistItem(acc.id, task)}
                                          className="rounded border-[#D1D1D6] text-blue-500 focus:ring-0"
                                        />
                                        <span className={completed ? 'line-through text-slate-400' : ''}>
                                          {task}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => onOpenWithId(acc.id)}
                            className="hover:underline text-[10px] text-blue-500 font-semibold"
                          >
                            + Añadir tareas
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER TOTAL SUMA */}
        <div className="bg-[#F5F5F7] px-6 py-4 flex items-center justify-between border-t border-[#E5E5EA] font-sans">
          <div className="text-[11px] text-[#8E8E93] font-bold uppercase tracking-wider">
            {paidAccounts.length} registros
          </div>
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#1D1D1F]">
            <span className="text-slate-400 font-medium">Suma</span>
            <span className="font-mono text-sm bg-indigo-500/10 text-indigo-600 px-2.5 py-1 rounded-lg">
              €{totalSum.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
