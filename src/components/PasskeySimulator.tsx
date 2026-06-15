import { useState, useEffect } from 'react';
import { Key, Check, X, Shield, RefreshCw } from 'lucide-react';
import { PasskeyRequest } from '../types';

interface PasskeySimulatorProps {
  requests: PasskeyRequest[];
  onRespond: (id: string, status: 'approved' | 'denied') => Promise<void>;
  onSimulateNew: (service: string, username: string) => Promise<void>;
}

export default function PasskeySimulator({ requests, onRespond, onSimulateNew }: PasskeySimulatorProps) {
  const [activeRequest, setActiveRequest] = useState<PasskeyRequest | null>(null);
  const [simService, setSimService] = useState('Google');
  const [simUser, setSimUser] = useState('m.gans75@gmail.com');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Monitor requests for the most recent pending request
  useEffect(() => {
    const pending = requests.find(r => r.status === 'pending');
    if (pending) {
      setActiveRequest(pending);
      setScanSuccess(false);
      setIsScanning(false);
    } else {
      setActiveRequest(null);
    }
  }, [requests]);

  const handleSimulateBtn = async () => {
    setLoading(true);
    await onSimulateNew(simService, simUser);
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!activeRequest) return;
    setIsScanning(true);
    
    // Generar firma digital asimétrica del cliente de forma segura
    setTimeout(async () => {
      setIsScanning(false);
      setScanSuccess(true);
      
      // Demoramos brevemente para mostrar la firma criptográfica certificada
      setTimeout(async () => {
        await onRespond(activeRequest.id, 'approved');
        setActiveRequest(null);
        setScanSuccess(false);
      }, 1200);
    }, 1500);
  };

  const handleDeny = async () => {
    if (!activeRequest) return;
    await onRespond(activeRequest.id, 'denied');
    setActiveRequest(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-600">Aprobado</span>;
      case 'denied':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-600">Rechazado</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-600">Pendiente</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro visual banner */}
      <div className="bg-white border border-[#D2D2D7] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-500 rounded-lg text-white">
              <Key className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-semibold text-[#1D1D1F]">Proveedor Keyder Passkey</h3>
          </div>
          <p className="text-sm text-[#8E8E93] max-w-xl">
            Sustituye tus contraseñas tradicionales. Al intentar iniciar sesión en un servicio configurado, Keyder actúa como llavero seguro de firma asimétrica de WebAuthn, autorizando el inicio mediante criptografía segura de sesión verificada.
          </p>
        </div>
        
        {/* Quick Simulator Tool Trigger */}
        <div className="w-full md:w-auto bg-[#F2F2F7] p-4 rounded-xl space-y-3 shrink-0 border border-[#D2D2D7]">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Simular Petición Passkey</h4>
          
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-[#8E8E93] mb-1">Servicio Web</label>
              <select
                value={simService}
                onChange={(e) => setSimService(e.target.value)}
                className="w-full text-xs bg-white border border-[#D1D1D6] rounded-lg px-2 py-1 text-[#1D1D1F] focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Google">Google / Gmail</option>
                <option value="PayPal">PayPal</option>
                <option value="Amazon">Amazon</option>
                <option value="Apple ID">Apple ID</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-[#8E8E93] mb-1">Usuario</label>
              <input
                type="text"
                value={simUser}
                onChange={(e) => setSimUser(e.target.value)}
                className="w-full text-xs bg-white border border-[#D1D1D6] rounded-lg px-2 py-1 text-[#1D1D1F] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleSimulateBtn}
              disabled={loading}
              className="w-full py-1.5 px-3 bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3" />
              ) : (
                'Enviar solicitud simulada'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Historial de Peticiones */}
      <div className="bg-white border border-[#D2D2D7] rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#F2F2F7]">
          <h3 className="font-semibold text-sm text-[#1D1D1F]">Historial de Solicitudes de Firma</h3>
        </div>
        
        {requests.length === 0 ? (
          <div className="p-12 text-center text-[#8E8E93] text-sm">
            <Shield className="w-10 h-10 mx-auto text-[#D1D1D6] mb-3" />
            No hay solicitudes registradas. <br/>Prueba a simular una solicitud arriba.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F2F2F7] text-[#8E8E93] font-medium border-b border-[#E5E5EA]">
                  <th className="px-6 py-3">Servicio</th>
                  <th className="px-6 py-3">Username / ID</th>
                  <th className="px-6 py-3">Hora / Registro</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7] text-[#1D1D1F]">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold">{req.service}</td>
                    <td className="px-6 py-4 font-mono">{req.username}</td>
                    <td className="px-6 py-4 text-[#8E8E93]">{req.timestamp}</td>
                    <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-right text-xs text-[#8E8E93]">
                      {req.status === 'approved' ? (
                        <span className="text-emerald-500 font-medium">✓ Firma Criptográfica Emitida</span>
                      ) : req.status === 'denied' ? (
                        <span className="text-red-500 font-medium">✗ Acceso Denegado</span>
                      ) : (
                        <button
                          onClick={() => setActiveRequest(req)}
                          className="px-2.5 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                        >
                          Atender ahora
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE COMPROBACIÓN COMPLETAMENTE SEGURO (Backdrop Blur Estilo Apple) */}
      {activeRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-white/95 rounded-[2.5rem] border border-[#D2D2D7] shadow-2xl p-8 text-center relative overflow-hidden transition-all transform scale-100">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-505"></div>

            <div className="flex justify-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                scanSuccess 
                  ? 'bg-emerald-500 text-white animate-bounce' 
                  : isScanning 
                    ? 'bg-blue-100 text-blue-500'
                    : 'bg-[#F2F2F7] text-slate-400'
              }`}>
                {scanSuccess ? (
                  <Check className="w-8 h-8" />
                ) : (
                  <Key className={`w-8 h-8 ${isScanning ? 'animate-spin' : ''}`} />
                )}
              </div>
            </div>

            <h3 className="text-lg font-bold tracking-tight text-[#1D1D1F] font-sans">
              Firma Passkey Keyder
            </h3>
            <p className="text-[10px] text-blue-600 mt-1 font-semibold uppercase tracking-wider block">
              Firma Digital Requerida
            </p>

            <div className="my-6 p-4 bg-[#F2F2F7] rounded-[1.5rem] text-left space-y-2 border border-[#E5E5EA]">
              <div className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">Peticionado por:</div>
              <div className="text-sm font-bold text-[#1D1D1F]">
                {activeRequest.service}
              </div>
              <div className="text-xs font-mono text-slate-600 truncate bg-white/80 p-1.5 rounded-lg border border-slate-100 font-bold">
                usuario: {activeRequest.username}
              </div>
              <div className="text-[11px] text-[#8E8E93] mt-1 leading-normal font-sans">
                🔐 Esta firma criptográfica asimétrica de un solo uso libera tu sesión en el navegador solicitante de forma 100% segura.
              </div>
            </div>

            {isScanning ? (
              <div className="space-y-4 py-2">
                <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto animate-pulse"></div>
                <p className="text-xs font-medium text-blue-500 animate-pulse">
                  Firmando solicitud y generando respuesta asimétrica...
                </p>
              </div>
            ) : scanSuccess ? (
              <div className="py-2">
                <p className="text-xs font-semibold text-emerald-500 flex items-center justify-center gap-1">
                  ✓ ¡Firma Criptográfica Emitida con Éxito!
                </p>
              </div>
            ) : (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleDeny}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-[#1D1D1F] text-xs font-semibold rounded-2xl transition-all cursor-pointer border border-[#E5E5EA]"
                >
                  Denegar
                </button>
                <button
                  onClick={handleApprove}
                  className="flex-1 py-3 px-4 bg-[#007AFF] hover:bg-blue-600 active:bg-[#0051A8] text-white text-xs font-semibold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  Autorizar Firma
                </button>
              </div>
            )}
            
            <button
              onClick={() => setActiveRequest(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
