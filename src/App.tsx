import { useState, useEffect } from 'react';
import { 
  Fingerprint, Shield, Lock, Unlock, Search, LayoutDashboard, Mail, 
  CreditCard, ShieldCheck, Key, Plus, LogOut, Sun, Moon, Info, Sparkles 
} from 'lucide-react';

import { Account, PasskeyRequest } from './types';
import LockScreen from './components/LockScreen';
import DashboardView from './components/DashboardView';
import EmailView from './components/EmailView';
import SubscriptionsView from './components/SubscriptionsView';
import OtherAccountsView from './components/OtherAccountsView';
import PasskeySimulator from './components/PasskeySimulator';
import AddEditAccountModal from './components/AddEditAccountModal';

export default function App() {
  const [user, setUser] = useState<{ id: string; email: string; token: string } | null>(() => {
    const saved = localStorage.getItem('keyder_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [masterPassword, setMasterPassword] = useState(() => {
    return sessionStorage.getItem('keyder_master_password') || '';
  });
  const [isLocked, setIsLocked] = useState(() => {
    return !sessionStorage.getItem('keyder_master_password');
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [passkeyRequests, setPasskeyRequests] = useState<PasskeyRequest[]>([]);
  const [supabaseActive, setSupabaseActive] = useState(false);
  
  // Navegación
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modales
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Helper para armar cabeceras de autenticación unificadas
  const getAuthHeaders = (altPassword?: string, altUser?: any) => {
    const key = altPassword || masterPassword;
    const activeUser = altUser || user;
    const headersInit: HeadersInit = {
      'Content-Type': 'application/json',
      'x-master-password': key,
      'x-user-id': activeUser?.id || '',
      'x-user-email': activeUser?.email || ''
    };
    if (activeUser?.token) {
      headersInit['Authorization'] = `Bearer ${activeUser.token}`;
    }
    return headersInit;
  };

  // Cargar datos
  const loadData = async (password: string, currentUser?: any) => {
    const activeUser = currentUser || user;
    if (!activeUser || !password) return false;

    try {
      const resp = await fetch('/api/accounts', {
        headers: getAuthHeaders(password, activeUser)
      });
      if (resp.status === 200) {
        const body = await resp.json();
        setAccounts(body.accounts || []);
        setIsLocked(false);
        if (body.supabaseActive !== undefined) {
          setSupabaseActive(body.supabaseActive);
        }
        
        // Cargar passkeys
        const pkResp = await fetch('/api/passkeys', {
          headers: getAuthHeaders(password, activeUser)
        });
        if (pkResp.ok) {
          const pkList = await pkResp.json();
          setPasskeyRequests(pkList);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error fetching data:', err);
      return false;
    }
  };

  // Desbloquear / Iniciar Sesión (Login)
  const handleLogin = async (email: string, passwordOrder: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwordOrder })
      });

      if (resp.ok) {
        const body = await resp.json();
        setUser(body.user);
        setMasterPassword(passwordOrder);
        setIsLocked(false);
        localStorage.setItem('keyder_user', JSON.stringify(body.user));
        sessionStorage.setItem('keyder_master_password', passwordOrder);
        await loadData(passwordOrder, body.user);
        return { success: true };
      } else {
        const err = await resp.json();
        return { success: false, error: err.error || 'Credenciales incorrectas' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: 'No se pudo conectar al servidor de autenticación' };
    }
  };

  // Crear Cuenta (Sign Up)
  const handleRegister = async (email: string, passwordOrder: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwordOrder })
      });

      if (resp.ok) {
        const body = await resp.json();
        setUser(body.user);
        setMasterPassword(passwordOrder);
        setIsLocked(false);
        localStorage.setItem('keyder_user', JSON.stringify(body.user));
        sessionStorage.setItem('keyder_master_password', passwordOrder);
        await loadData(passwordOrder, body.user);
        return { success: true };
      } else {
        const err = await resp.json();
        return { success: false, error: err.error || 'Error al registrar el usuario' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: 'No se pudo conectar al servidor de autenticación' };
    }
  };

  // Guardar cuenta (Agregar o Editar)
  const handleSaveAccount = async (payload: any) => {
    const isEdit = !!payload.id;
    const url = isEdit ? `/api/accounts/${payload.id}` : '/api/accounts';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const resp = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        // Recargar bóveda descifrada
        await loadData(masterPassword);
      } else {
        const errBody = await resp.json();
        alert(errBody.error || 'Error al guardar la clave.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Eliminar cuenta
  const handleDeleteAccount = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar permanentemente esta cuenta de tu llavero Keyder? Esta acción es irreversible.')) {
      return;
    }
    try {
      const resp = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (resp.ok) {
        await loadData(masterPassword);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Eliminar un elemento particular de historial de contraseña
  const handleDeleteHistory = async (accountId: string, historyId: string) => {
    if (!confirm('¿Desea borrar permanentemente este registro antiguo de contraseña?')) {
      return;
    }
    try {
      const resp = await fetch(`/api/accounts/${accountId}/history/${historyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (resp.ok) {
        await loadData(masterPassword);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Marcar/Desmarcar elemento de checklist directamente
  const handleToggleChecklistItem = async (accountId: string, taskName: string) => {
    try {
      const resp = await fetch(`/api/accounts/${accountId}/checklist/toggle`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ taskName })
      });
      if (resp.ok) {
        await loadData(masterPassword);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Simular envío de solicitud de Passkeys
  const handleTriggerPasskeySimulation = async (service: string, username: string) => {
    try {
      const resp = await fetch('/api/passkeys/simulate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ service, username })
      });
      if (resp.ok) {
        // Recargar passkeys
        const pkResp = await fetch('/api/passkeys', {
          headers: getAuthHeaders()
        });
        if (pkResp.ok) {
          const pkList = await pkResp.json();
          setPasskeyRequests(pkList);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Responder a Passkey con aprobación o denegación
  const handleRespondPasskey = async (id: string, status: 'approved' | 'denied') => {
    try {
      const resp = await fetch(`/api/passkeys/${id}/respond`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (resp.ok) {
        // Recargar
        const pkResp = await fetch('/api/passkeys', {
          headers: getAuthHeaders()
        });
        if (pkResp.ok) {
          const pkList = await pkResp.json();
          setPasskeyRequests(pkList);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Volver a bloquear (Logout)
  const handleLock = () => {
    localStorage.removeItem('keyder_user');
    sessionStorage.removeItem('keyder_master_password');
    setUser(null);
    setMasterPassword('');
    setAccounts([]);
    setPasskeyRequests([]);
    setIsLocked(true);
    setActiveTab('dashboard');
  };

  // Activar tema oscuro manual (Desactivado para diseño estrictamente MODO CLARO de Apple)
  const toggleTheme = () => {
    setTheme('light');
    const root = document.documentElement;
    root.classList.remove('dark');
  };

  // Filtrado global inteligente para búsquedas rápidas (arriba en cabecera)
  const globallyFiltered = accounts.filter(acc => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      acc.accountName.toLowerCase().includes(query) ||
      acc.username.toLowerCase().includes(query) ||
      acc.category.toLowerCase().includes(query)
    );
  });

  // Efecto pooling para solicitudes Passkeys entrantes (cada 5 segundos)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark'); // Asegurar modo claro en carga inicial
    
    // Auto-cargar si el usuario ya está autenticado
    if (user && masterPassword) {
      loadData(masterPassword, user);
    }

    if (isLocked || !user) return;
    const interval = setInterval(async () => {
      const pkResp = await fetch('/api/passkeys', {
        headers: getAuthHeaders()
      });
      if (pkResp.ok) {
        const pkList = await pkResp.json();
        setPasskeyRequests(pkList);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isLocked, user, masterPassword]);

  if (isLocked || !user) {
    return <LockScreen onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col md:flex-row transition-colors duration-300">
      
      {/* SIDEBAR PANEL IZQUIERDO ESTILO MACOS CLIENT */}
      <aside className="w-full md:w-64 bg-[#E8E8ED]/90 border-r border-[#D2D2D7] flex flex-col shrink-0 transition-colors">
        
        {/* macOS Window Controls Decor and Branding */}
        <div className="p-5 pb-4 space-y-4">
          <div className="flex items-center">
            <div className="flex space-x-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-inner"></div>
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-inner"></div>
              <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-inner"></div>
            </div>
            <span className="ml-4 font-extrabold text-lg tracking-tight text-[#007AFF]">
              Keyder
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] bg-[#D1D1D6]/40 py-1 px-2.5 rounded-md border border-[#D2D2D7]/50">
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold shrink-0">
              <Unlock className="w-3 h-3" /> Descifrada
            </span>
            <span className="text-[#8E8E93] font-mono">AES-256</span>
          </div>

          {/* Perfil del Usuario Activo */}
          {user && (
            <div className="flex items-center gap-2.5 py-2 px-3 bg-white/50 border border-[#D2D2D7]/40 rounded-2xl shadow-sm">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] text-white font-black uppercase tracking-wider shrink-0 select-none">
                {user.email.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-[#8E8E93] font-bold uppercase tracking-wider leading-none mb-0.5">Bóveda Privada</p>
                <p className="text-xs text-[#1D1D1F] font-semibold truncate leading-none" title={user.email}>
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Buscador Universal integrado */}
        <div className="px-4 py-2 border-b border-[#D2D2D7]/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar llaves..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium pl-8 pr-3 py-1.5 bg-[#D1D1D6]/30 focus:bg-white text-[#1D1D1F] rounded-lg border border-transparent focus:border-[#007AFF] outline-none transition-all placeholder-[#86868B]"
            />
            <Search className="w-3 h-3 text-[#86868B] absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Listado Pestañas de Navegación */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          
          {/* Dashboard */}
          <button
            onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                : 'hover:bg-[#D1D1D6]/40 text-[#424245]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* Correos */}
          <button
            onClick={() => { setActiveTab('emails'); setSearchQuery(''); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'emails'
                ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                : 'hover:bg-[#D1D1D6]/40 text-[#424245]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 shrink-[#007AFF]" />
              <span>Correo Módulo</span>
            </div>
          </button>

          {/* Suscripciones Pagadas */}
          <button
            onClick={() => { setActiveTab('subscriptions'); setSearchQuery(''); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'subscriptions'
                ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                : 'hover:bg-[#D1D1D6]/40 text-[#424245]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Suscripciones</span>
            </div>
          </button>

          {/* Otras Plataformas */}
          <button
            onClick={() => { setActiveTab('other'); setSearchQuery(''); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'other'
                ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                : 'hover:bg-[#D1D1D6]/40 text-[#424245]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Vault Seguro</span>
          </button>

          {/* Llaves de Acceso (Passkey) */}
          <button
            onClick={() => { setActiveTab('passkeys'); setSearchQuery(''); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'passkeys'
                ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                : 'hover:bg-[#D1D1D6]/40 text-[#424245]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 shrink-0" />
              <span>Passkey Ready</span>
            </div>
            {passkeyRequests.some(r => r.status === 'pending') && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            )}
          </button>

        </nav>

        {/* Supabase Status Card matching design instruction */}
        <div className="p-3 mx-2 mb-2 bg-white/50 border border-[#D2D2D7] rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase text-[#86868B]">Supabase DB Status</span>
            <div className={`w-1.5 h-1.5 rounded-full ${supabaseActive ? 'bg-[#28C840]' : 'bg-[#FF9500]'}`}></div>
          </div>
          <p className="text-[11px] text-[#424245] font-semibold">
            {supabaseActive ? 'AES-256 E2EE Activo' : 'Local Sandbox Activo'}
          </p>
          {!supabaseActive && (
            <p className="text-[9px] text-[#8E8E93] mt-0.5 leading-tight">
              Configura SUPABASE_URL / SUPABASE_ANON_KEY en Secrets para guardar en la nube.
            </p>
          )}
        </div>

        {/* Footer Sidebar (Herramientas y Cerrar) */}
        <div className="p-3 border-t border-[#D2D2D7] space-y-0.5">
          
          <button
            onClick={toggleTheme}
            className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold text-[#424245] hover:bg-[#D1D1D6]/40 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            Modo Claro Activo
          </button>

          <button
            onClick={handleLock}
            className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            Cerrar Bóveda
          </button>

        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL FLUIDO Y ELEGANTE */}
      <main className="flex-1 flex flex-col p-6 md:p-8 space-y-6 overflow-hidden">
        
        {/* Cabecera Superior con Acciones Rápidas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5EA]">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1D1D1F] capitalize">
              {activeTab === 'dashboard' && 'Dashboard Central'}
              {activeTab === 'emails' && 'Cuentas de Correo'}
              {activeTab === 'subscriptions' && 'Suscripciones Pagadas'}
              {activeTab === 'other' && 'Llaves de Redes y Equipos'}
              {activeTab === 'passkeys' && 'Llaves de Acceso Biométrico'}
            </h1>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              Administra todas las credenciales de JHNder de manera centralizada.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingAccount(null);
                setIsAddOpen(true);
              }}
              className="py-2 px-4 bg-[#007AFF] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nueva Llave
            </button>
          </div>
        </div>

        {/* ALERTA DE BÚSQUEDA GLOBAL ACTIVA */}
        {searchQuery ? (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-800 font-medium">
                🔍 Búsqueda global activa para <code className="bg-white px-1 py-0.5 rounded font-bold font-mono">"{searchQuery}"</code>. Se encontraron {globallyFiltered.length} resultados en la bóveda completa.
              </p>
            </div>
            
            {/* Lista especial de búsqueda rápida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {globallyFiltered.map(acc => (
                <div 
                  key={acc.id}
                  className="bg-white border border-[#D2D2D7] rounded-3xl p-5 shadow-sm space-y-3 cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => {
                    setEditingAccount(acc);
                    setIsAddOpen(true);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-[#1D1D1F] capitalize truncate">{acc.accountName}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase font-mono font-bold">
                      {acc.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#8E8E93] truncate font-mono">{acc.username}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Vistas principales */
          <div className="flex-1">
            {activeTab === 'dashboard' && (
              <DashboardView 
                accounts={accounts}
                passkeyRequests={passkeyRequests}
                onTriggerPasskeySimulation={handleTriggerPasskeySimulation}
                onNavigateToTab={setActiveTab}
                onOpenWithId={(id) => {
                  const target = accounts.find(a => a.id === id);
                  if (target) {
                    setEditingAccount(target);
                    setIsAddOpen(true);
                  }
                }}
              />
            )}

            {activeTab === 'emails' && (
              <EmailView 
                accounts={accounts}
                onOpenWithId={(id) => {
                  const target = accounts.find(a => a.id === id);
                  if (target) {
                    setEditingAccount(target);
                    setIsAddOpen(true);
                  }
                }}
              />
            )}

            {activeTab === 'subscriptions' && (
              <SubscriptionsView 
                accounts={accounts}
                onOpenWithId={(id) => {
                  const target = accounts.find(a => a.id === id);
                  if (target) {
                    setEditingAccount(target);
                    setIsAddOpen(true);
                  }
                }}
                onToggleChecklistItem={handleToggleChecklistItem}
                onOpenAddModal={() => {
                  setEditingAccount(null);
                  setIsAddOpen(true);
                }}
              />
            )}

            {activeTab === 'other' && (
              <OtherAccountsView 
                accounts={accounts}
                onOpenWithId={(id) => {
                  const target = accounts.find(a => a.id === id);
                  if (target) {
                    setEditingAccount(target);
                    setIsAddOpen(true);
                  }
                }}
                onOpenAddModal={() => {
                  setEditingAccount(null);
                  setIsAddOpen(true);
                }}
                onDeleteAccount={handleDeleteAccount}
              />
            )}

            {activeTab === 'passkeys' && (
              <PasskeySimulator 
                requests={passkeyRequests}
                onRespond={handleRespondPasskey}
                onSimulateNew={handleTriggerPasskeySimulation}
              />
            )}
          </div>
        )}

      </main>

      {/* DRAWER AGREGAR/EDITAR COMPONENTE DETALLADO */}
      {isAddOpen && (
        <AddEditAccountModal 
          account={editingAccount}
          onClose={() => {
            setIsAddOpen(false);
            setEditingAccount(null);
          }}
          onSave={handleSaveAccount}
          onDeleteHistory={handleDeleteHistory}
        />
      )}

      {/* FOOTER DESKTOP APP DECOR */}
      <div className="fixed bottom-3 right-4 z-40 bg-white/80 backdrop-blur-md border border-[#D2D2D7] px-3.5 py-1.5 rounded-full text-[10px] text-slate-500 font-mono shadow-md flex items-center gap-2 select-none">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        <span>Keyder Engine Active | Supabase Cloud Integration</span>
      </div>

    </div>
  );
}
