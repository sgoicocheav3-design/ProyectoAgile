import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Users, Building2, BarChart3, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { EstadoTramite } from '@prisma/client';

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.rol !== 'ADMINISTRADOR') redirect('/login');

  // Métricas del sistema
  const [
    totalTramites,
    tramitesPorEstado,
    totalUsuarios,
    totalInspectores,
    inspeccionesPendientes,
    recaudacion,
  ] = await Promise.all([
    prisma.tramite.count(),
    prisma.tramite.groupBy({ by: ['estado'], _count: { estado: true } }),
    prisma.usuario.count({ where: { rol: 'CONTRIBUYENTE' } }),
    prisma.usuario.count({ where: { rol: 'INSPECTOR' } }),
    prisma.inspeccion.count({ where: { completada: false } }),
    prisma.pago.aggregate({
      _sum: { monto: true },
      where: { estadoPago: 'APROBADO' },
    }),
  ]);

  const estadosMap = Object.fromEntries(
    tramitesPorEstado.map((t) => [t.estado, t._count.estado])
  ) as Record<EstadoTramite, number>;

  // Últimos trámites
  const ultimosTramites = await prisma.tramite.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      negocio: { select: { razonSocial: true, ruc: true } },
    },
  });

  const estadoColor: Record<EstadoTramite, string> = {
    INICIADO: 'badge-iniciado',
    DOCUMENTOS_PENDIENTES: 'badge-documentos',
    PAGADO: 'badge-pagado',
    EN_INSPECCION: 'badge-inspeccion',
    OBSERVADO: 'badge-observado',
    SEGUNDA_INSPECCION: 'badge-segunda',
    APROBADO: 'badge-aprobado',
    NEGADO: 'badge-negado',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-xs uppercase tracking-wider">Panel de Administración</p>
            <h1 className="font-bold text-xl">Sistema de Licencias Municipales — MPT</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/usuarios" className="text-sm bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Usuarios
            </Link>
            <Link href="/api/auth/signout" className="text-xs bg-red-800 hover:bg-red-700 px-3 py-1.5 rounded-lg transition">Salir</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Trámites', value: totalTramites, icon: <Building2 className="w-5 h-5 text-blue-500" />, color: 'border-blue-200 bg-blue-50' },
            { label: 'Licencias Aprobadas', value: estadosMap['APROBADO'] || 0, icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, color: 'border-green-200 bg-green-50' },
            { label: 'Visitas Pendientes', value: inspeccionesPendientes, icon: <Clock className="w-5 h-5 text-orange-500" />, color: 'border-orange-200 bg-orange-50' },
            {
              label: 'Recaudación Total',
              value: `S/. ${(recaudacion._sum.monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
              icon: <BarChart3 className="w-5 h-5 text-purple-500" />,
              color: 'border-purple-200 bg-purple-50',
            },
          ].map((kpi, i) => (
            <div key={i} className={`card border ${kpi.color}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">{kpi.icon}</div>
                <div>
                  <p className="text-2xl font-black text-gray-800">{kpi.value}</p>
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Estado de trámites */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-4">Trámites por Estado</h2>
            <div className="space-y-2">
              {(Object.entries(estadosMap) as [EstadoTramite, number][]).map(([estado, count]) => (
                <div key={estado} className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${estadoColor[estado]}`}>
                    {estado.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${totalTramites > 0 ? (count / totalTramites) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold text-gray-800 mb-4">Usuarios del Sistema</h2>
            <div className="space-y-3">
              {[
                { label: 'Contribuyentes registrados', value: totalUsuarios, icon: <Users className="w-4 h-4 text-blue-500" /> },
                { label: 'Inspectores activos', value: totalInspectores, icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
                { label: 'Trámites NEGADOS', value: estadosMap['NEGADO'] || 0, icon: <XCircle className="w-4 h-4 text-red-500" /> },
                { label: 'Trámites observados activos', value: (estadosMap['OBSERVADO'] || 0) + (estadosMap['SEGUNDA_INSPECCION'] || 0), icon: <AlertTriangle className="w-4 h-4 text-orange-500" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {item.icon} {item.label}
                  </div>
                  <span className="font-bold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Últimos trámites */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4">Últimos 10 Trámites</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Razón Social</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">RUC</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Estado</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ultimosTramites.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-800">{t.negocio.razonSocial}</td>
                    <td className="py-2 px-3 font-mono text-gray-500 text-xs">{t.negocio.ruc}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoColor[t.estado]}`}>
                        {t.estado}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-400 text-xs">
                      {new Date(t.createdAt).toLocaleDateString('es-PE')}
                    </td>
                    <td className="py-2 px-3">
                      <Link href={`/contribuyente/tramite/${t.id}`} className="text-blue-600 hover:underline text-xs">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
