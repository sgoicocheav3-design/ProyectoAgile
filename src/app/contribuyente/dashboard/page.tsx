import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  Building2, Clock, CheckCircle2, XCircle, AlertTriangle,
  Plus, FileText, Calendar, ArrowRight
} from 'lucide-react';
import { EstadoTramite } from '@prisma/client';

function EstadoBadge({ estado }: { estado: EstadoTramite }) {
  const configs: Record<EstadoTramite, { label: string; cls: string; icon: React.ReactNode }> = {
    INICIADO:              { label: 'Iniciado',             cls: 'badge-iniciado',    icon: <FileText className="w-3 h-3" /> },
    DOCUMENTOS_PENDIENTES: { label: 'Docs. Pendientes',     cls: 'badge-documentos',  icon: <FileText className="w-3 h-3" /> },
    PAGADO:                { label: 'Pagado',               cls: 'badge-pagado',      icon: <CheckCircle2 className="w-3 h-3" /> },
    EN_INSPECCION:         { label: 'En Inspección',        cls: 'badge-inspeccion',  icon: <Calendar className="w-3 h-3" /> },
    OBSERVADO:             { label: 'Observado',            cls: 'badge-observado',   icon: <AlertTriangle className="w-3 h-3" /> },
    SEGUNDA_INSPECCION:    { label: '2da Inspección',       cls: 'badge-segunda',     icon: <Calendar className="w-3 h-3" /> },
    APROBADO:              { label: 'Aprobado ✓',           cls: 'badge-aprobado',    icon: <CheckCircle2 className="w-3 h-3" /> },
    NEGADO:                { label: 'Negado',               cls: 'badge-negado',      icon: <XCircle className="w-3 h-3" /> },
  };
  const cfg = configs[estado];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default async function DashboardContribuyente() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.rol !== 'CONTRIBUYENTE') redirect('/login');

  const tramites = await prisma.tramite.findMany({
    where: { negocio: { usuarioId: session.user.id } },
    include: {
      negocio: true,
      pagos: { orderBy: { createdAt: 'desc' }, take: 1 },
      inspecciones: { orderBy: { numeroVisita: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const tramiteActivo = tramites.find(
    (t) => !['APROBADO', 'NEGADO'].includes(t.estado)
  );
  const tramitesAprobados = tramites.filter((t) => t.estado === 'APROBADO');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-xs uppercase tracking-wider">Municipalidad de Trujillo</p>
            <h1 className="font-bold text-lg">Portal del Contribuyente</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">Bienvenido, <strong className="text-white">{session.user.nombre}</strong></span>
            <Link href="/api/auth/signout" className="text-xs bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition">
              Salir
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Trámites', value: tramites.length, icon: <FileText className="w-5 h-5 text-blue-600" />, color: 'bg-blue-50 border-blue-200' },
            { label: 'Licencias Activas', value: tramitesAprobados.length, icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, color: 'bg-green-50 border-green-200' },
            { label: 'En Proceso', value: tramiteActivo ? 1 : 0, icon: <Clock className="w-5 h-5 text-orange-500" />, color: 'bg-orange-50 border-orange-200' },
          ].map((s, i) => (
            <div key={i} className={`card border ${s.color}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">{s.icon}</div>
                <div>
                  <p className="text-2xl font-black text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA nuevo trámite */}
        {!tramiteActivo && (
          <div className="card border-2 border-dashed border-blue-300 bg-blue-50 text-center py-8">
            <Building2 className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h2 className="font-bold text-gray-800 text-lg mb-1">Inicia tu Trámite de Licencia</h2>
            <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
              Solicita tu Licencia de Funcionamiento en minutos. Solo necesitas tu RUC, el plano de tu local y el pago de S/. 180.
            </p>
            <Link href="/contribuyente/nuevo-tramite" id="btn-nuevo-tramite" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Iniciar Nuevo Trámite
            </Link>
          </div>
        )}

        {tramiteActivo && (
          <div className="card border-l-4 border-l-blue-600 bg-blue-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Trámite en Curso</p>
                <h3 className="font-bold text-gray-800 text-lg">{tramiteActivo.negocio.razonSocial}</h3>
                <p className="text-sm text-gray-500">RUC: {tramiteActivo.negocio.ruc}</p>
                <div className="mt-2"><EstadoBadge estado={tramiteActivo.estado} /></div>
              </div>
              <Link
                href={`/contribuyente/tramite/${tramiteActivo.id}`}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Ver Detalle <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Lista de trámites */}
        <div>
          <h2 className="font-bold text-gray-800 text-lg mb-3">Historial de Trámites</h2>
          {tramites.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              <p>No tiene trámites registrados aún.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tramites.map((t) => (
                <div key={t.id} className="card flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{t.negocio.razonSocial}</p>
                      <p className="text-xs text-gray-400">RUC {t.negocio.ruc} — {new Date(t.createdAt).toLocaleDateString('es-PE')}</p>
                      {t.estado === 'APROBADO' && t.licenciaVigenteHasta && (
                        <p className="text-xs text-green-600">Vence: {new Date(t.licenciaVigenteHasta).toLocaleDateString('es-PE')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <EstadoBadge estado={t.estado} />
                    <Link href={`/contribuyente/tramite/${t.id}`} className="text-blue-600 hover:text-blue-800 transition">
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
