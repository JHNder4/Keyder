import React, { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff, Calendar, Clipboard, ListPlus, Trash2, AlertCircle, RefreshCw, Sparkles, Check } from 'lucide-react';
import { Account, AccountCategory } from '../types';

interface AddEditAccountModalProps {
  account: Account | null; // null si es creación
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDeleteHistory: (accountId: string, historyId: string) => Promise<void>;
}

const CATEGORIES: { value: AccountCategory; label: string; color: string }[] = [
  { value: 'email', label: 'E-mail', color: 'bg-blue-100 text-blue-700' },
  { value: 'online-shop', label: 'Online Shop', color: 'bg-orange-100 text-orange-700' },
  { value: 'messenger', label: 'Messenger', color: 'bg-amber-100 text-amber-700' },
  { value: 'social-media', label: 'Social Media', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'online-banking', label: 'Online Banking', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'streaming', label: 'Streaming', color: 'bg-purple-100 text-purple-700' },
  { value: 'dating-app', label: 'Dating App', color: 'bg-rose-100 text-rose-700' },
  { value: 'software-license', label: 'Software License', color: 'bg-stone-200 text-stone-700' },
  { value: 'online-games', label: 'Online Games', color: 'bg-fuchsia-100 text-fuchsia-700' },
  { value: 'other', label: 'Otros', color: 'bg-slate-100 text-slate-700' }
];

export default function AddEditAccountModal({ account, onClose, onSave, onDeleteHistory }: AddEditAccountModalProps) {
  const isEdit = !!account;

  const [accountName, setAccountName] = useState('');
  const [category, setCategory] = useState<AccountCategory>('other');
  const [loginPage, setLoginPage] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpSecret, setOtpSecret] = useState('');
  const [costPerMonth, setCostPerMonth] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  
  // Razón de cambio de contraseña obligatoria
  const [changeReason, setChangeReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revealHistoryId, setRevealHistoryId] = useState<string | null>(null);

  // Copiado temporal
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setAccountName(account.accountName);
      setCategory(account.category);
      setLoginPage(account.loginPage);
      setUsername(account.username);
      setPassword(account.password);
      setOtpSecret(account.otpSecret || '');
      setCostPerMonth(account.costPerMonth ? account.costPerMonth.toString() : '');
      setChecklist(account.checklist || []);
      setCompletedTasks(account.completedTasks || []);
      setChangeReason('');
    } else {
      setAccountName('');
      setCategory('other');
      setLoginPage('');
      setUsername('');
      setPassword('');
      setOtpSecret('');
      setCostPerMonth('');
      setChecklist([]);
      setCompletedTasks([]);
      setChangeReason('');
    }
  }, [account]);

  // Chequeo si la contraseña difiere de la actual para habilitar campo razón
  const hasPasswordChanged = isEdit && account && password !== account.password;

  const handleCopy = (text: string, labelId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(labelId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAddTask = () => {
    const trimmed = checklistText.trim();
    if (trimmed && !checklist.includes(trimmed)) {
      setChecklist([...checklist, trimmed]);
      setChecklistText('');
    }
  };

  const handleRemoveTask = (task: string) => {
    setChecklist(checklist.filter(t => t !== task));
    setCompletedTasks(completedTasks.filter(t => t !== task));
  };

  const handleGeneratePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+=-{}[]|:;<>?,./';
    let newPass = '';
    const length = 14;
    for (let i = 0; i < length; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPass);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !username || !password) return;

    if (hasPasswordChanged && (!changeReason || changeReason.trim().length < 3)) {
      // Evitar guardar si no hay justificación de cambio
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        accountName,
        category,
        loginPage,
        username,
        password,
        costPerMonth: costPerMonth ? parseFloat(costPerMonth) : 0,
        checklist,
        completedTasks,
        otpSecret: otpSecret || ''
      };

      if (isEdit) {
        payload.id = account.id;
        if (hasPasswordChanged) {
          payload.changeReason = changeReason;
        }
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-50 transition-opacity">
      <div className="w-full max-w-xl bg-[#F5F5F7] h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left border-l border-[#D2D2D7]">
        {/* Header Drawer */}
        <div className="bg-white px-6 py-5 border-b border-[#D2D2D7] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1D1D1F] font-sans">
              {isEdit ? `Editar cuenta: ${account.accountName}` : 'Nueva Cuenta de Credenciales'}
            </h2>
            <p className="text-xs text-[#8E8E93] mt-0.5 font-sans">
              {isEdit ? 'Modifica detalles y consulta el historial de auditoría' : 'Crea una contraseña fuertemente encriptada con AES-256'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-slate-500 hover:text-slate-850 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body can overflow */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="drawer-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Account Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">Nombre del Sitio / Cuenta</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Google, Netflix, Amazon Prime..."
                className="w-full px-4 py-2.5 bg-white text-[#1D1D1F] rounded-xl border border-[#D1D1D6] focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium transition-all focus:border-blue-500"
              />
            </div>

            {/* Grid 2 Columns: Category & Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">Categoría de servicio</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AccountCategory)}
                  className="w-full h-[41px] px-3 bg-white text-[#1D1D1F] rounded-xl border border-[#D1D1D6] focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium transition-all focus:border-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">Costo mensual (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={costPerMonth}
                  onChange={(e) => setCostPerMonth(e.target.value)}
                  placeholder="0.00 (opcional)"
                  className="w-full px-4 py-2.5 bg-white text-[#1D1D1F] rounded-xl border border-[#D1D1D6] focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium transition-all focus:border-blue-500"
                />
              </div>
            </div>

            {/* Login URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">Enlace de Inicio de Sesión</label>
              <input
                type="url"
                value={loginPage}
                onChange={(e) => setLoginPage(e.target.value)}
                placeholder="https://accounts.google.com/..."
                className="w-full px-4 py-2.5 bg-white text-[#1D1D1F] rounded-xl border border-[#D1D1D6] focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all focus:border-blue-500 text-blue-600 font-mono"
              />
            </div>

            {/* Username / Identifier */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">Nombre de Usuario / Correo</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: m.gans75@gmail.com, martin.gans@example.com"
                className="w-full px-4 py-2.5 bg-white text-[#1D1D1F] rounded-xl border border-[#D1D1D6] focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all focus:border-blue-500 font-mono"
              />
            </div>

            {/* Password Section with interactive Generator */}
            <div className="space-y-1.5 relative">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">Contraseña</label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Auto-Generar Segura Apple
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minh&399!X"
                  className="w-full pl-4 pr-20 py-2.5 bg-white text-[#1D1D1F] rounded-xl border border-[#D1D1D6] focus:ring-1 focus:ring-blue-500 outline-none text-sm tracking-wide font-mono focus:border-blue-500"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(password, 'form-pass')}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  >
                    {copiedId === 'form-pass' ? <Check className="w-4 h-4 text-emerald-500" /> : <Clipboard className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* 2FA Secret Key (Clave Secreta TOTP) */}
            <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">Clave Secreta 2FA (Secret Key)</label>
              <input
                type="text"
                value={otpSecret}
                onChange={(e) => setOtpSecret(e.target.value.replace(/\s/g, '').toUpperCase())}
                placeholder="EJ: JBSWY3DPEHPK3PXP (Opcional)"
                className="w-full px-4 py-2 bg-white text-[#1D1D1F] rounded-xl border border-[#D1D1D6] focus:border-blue-500 outline-none text-xs transition-all placeholder-[#AEAEB2] font-mono tracking-wide uppercase"
              />
              <p className="text-[11px] text-[#8E8E93] leading-normal mt-1">
                Añade la clave secreta Base32 del servicio para que Keyder genere códigos de 6 dígitos que cambian cada 30 segundos (estilo Google Authenticator o llavero iCloud).
              </p>
            </div>

            {/* CHANGE REASON (Obligatorio solo si la contraseña cambió y estamos editando) */}
            {hasPasswordChanged && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Razón de Cambio Requerida (Seguimiento de Auditoría)</span>
                </div>
                <p className="text-xs text-amber-600 leading-snug">
                  Estás modificando una contraseña existente. Por motivos de auditoría de seguridad preventiva en Keyder, debes documentar por qué la cambias.
                </p>
                <input
                  type="text"
                  required
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Ej: Cambio mensual obligatorio, detectada fuga en base de datos externa, aumento de robustez..."
                  className="w-full px-3 py-2 bg-white text-[#1D1D1F] rounded-xl border border-amber-300 outline-none text-xs font-medium placeholder-[#AEAEB2] focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            {/* Checklist Builder Section */}
            <div className="bg-white p-4 rounded-2xl border border-[#D2D2D7] space-y-3">
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">Listado de Tareas Pendientes Asociadas</label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={checklistText}
                  onChange={(e) => setChecklistText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                  placeholder="Nueva tarea (ej. Cancelar prueba, Revisar cobro)"
                  className="flex-1 px-3 py-2 bg-[#F2F2F7] text-[#1D1D1F] rounded-lg border border-[#D1D1D6] outline-none text-xs font-medium focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>

              {checklist.length > 0 && (
                <div className="space-y-1.5 pt-2 max-h-36 overflow-y-auto divide-y divide-[#F2F2F7]">
                  {checklist.map((task) => {
                    const isCompleted = completedTasks.includes(task);
                    return (
                      <div key={task} className="flex items-center justify-between py-1.5 text-xs text-[#1D1D1F]">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                          <span className={isCompleted ? 'line-through text-slate-400' : ''}>{task}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(task)}
                          className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </form>

          {/* HISTORIAL CRONOLÓGICO CON BORRADO SELECTIVO */}
          {isEdit && account && account.history && account.history.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-[#D2D2D7] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#F2F2F7]">
                <h4 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  Historial de Cambios / Auditoría ({account.history.length})
                </h4>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-mono">
                  No sobreescrito
                </span>
              </div>
              
              <div className="relative border-l border-[#F2F2F7] ml-2.5 pl-4 space-y-4 max-h-56 overflow-y-auto">
                {account.history.map((hist) => {
                  const isRevealed = revealHistoryId === hist.id;
                  return (
                    <div key={hist.id} className="relative group text-xs text-[#1D1D1F] space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white shadow-sm"></span>
                      
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-400">{hist.dateTime}</span>
                        
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setRevealHistoryId(isRevealed ? null : hist.id)}
                            className="p-1 hover:text-blue-500 cursor-pointer"
                            title="Revelar vieja contraseña"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(hist.password, hist.id)}
                            className="p-1 hover:text-blue-500 cursor-pointer"
                            title="Copiar contraseña antigua"
                          >
                            {copiedId === hist.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('¿Estás seguro de que deseas eliminar este registro del historial de auditoría?')) {
                                onDeleteHistory(account.id, hist.id);
                              }
                            }}
                            className="p-1 hover:text-red-500 cursor-pointer"
                            title="Borrar este registro del historial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[#1D1D1F]">
                        <span className="text-slate-400 font-medium">Razón: </span>
                        "{hist.changeReason || 'Sin razón especificada'}"
                      </div>
                      
                      {isRevealed && (
                        <div className="py-1 px-2.5 bg-slate-50 border border-[#E5E5EA] rounded-lg mt-1 font-mono text-xs text-[#1D1D1F] select-all max-w-[200px] truncate">
                          {hist.password}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions Drawer */}
        <div className="bg-white px-6 py-4 border-t border-[#D2D2D7] flex items-center justify-between">
          <p className="text-[11px] text-[#8E8E93] max-w-[200px] font-sans">
            Los datos se encriptarán inmediatamente al pulsar Guardar.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#1D1D1F] font-medium text-xs rounded-xl border border-[#D1D1D6] transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              form="drawer-form"
              type="submit"
              disabled={loading || (hasPasswordChanged && (!changeReason || changeReason.trim().length < 3))}
              className="py-2.5 px-6 bg-[#007AFF] hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-[#007AFF] text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Sliding and Anim rules */}
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-left {
          animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
