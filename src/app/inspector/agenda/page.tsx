import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Calendar, CheckCircle2, AlertTriangle, ClipboardList } from 'lucide-react';
import FormResultadoInspeccion from '@/components/inspector/form-resultado';

export default async function AgendaInspectorPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.rol !== 'INSPECTOR' && session.user.rol !== 'ADMINISTRADOR') {
    redirect('/login');
  }

  const inspecciones = await prisma.inspeccion.findMany({
    where: {
      inspectorId: session.user.id,
    },
    include: {
      tramite: {
        include: {
          negocio: true,
        },
      },
    },
    orderBy: { fechaProgramada: 'asc' },
  });

  const pendientes = inspecciones.filter((i) => !i.completada);
  const completadas = inspecciones.filter((i) => i.completada);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-xs uppercase tracking-wider">Inspector Municipal</p>
            <h1 className="font-bold text-lg">Agenda de Inspecciones</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">{session.user.nombre}</span>
            <Link href="/api/auth/signout" className="text-xs bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition">
              Salir
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card border border-blue-100">
            <p className="text-2xl font-black text-gray-800">{pendientes.length}</p>
            <p className="text-sm text-gray-500">Visitas Pendientes</p>
          </div>
          <div className="card border border-green-100">
            <p className="text-2xl font-black text-gray-800">
              {completadas.filter(i => i.resultado === 'CONFORME').length}
            </p>
            <p className="text-sm text-gray-500">Aprobadas</p>
          </div>
          <div className="card border border-orange-100">
            <p className="text-2xl font-black text-gray-800">
              {completadas.filter(i => i.resultado !== 'CONFORME').length}
            </p>
            <p className="text-sm text-gray-500">Observadas/Rechazadas</p>
          </div>
        </div>

        {/* Pendientes */}
        <div>
          <h2 className="font-bold text-gray-800 text-lg mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Visitas Pendientes ({pendientes.length})
          </h2>
          {pendientes.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No tiene visitas pendientes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendientes.map((insp) => (
                <div key={insp.id} className="card border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${insp.numeroVisita === 1 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          Visita #{insp.numeroVisita}
                        </span>
                        {insp.numeroVisita === 2 && insp.fechaLimite && (
                          <span className="text-xs text-red-500 font-medium">
                            ⚠ Límite: {new Date(insp.fechaLimite).toLocaleDateString('es-PE')}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-800">{insp.tramite.negocio.razonSocial}</h3>
                      <p className="text-sm text-gray-500">RUC: {insp.tramite.negocio.ruc}</p>
                      <p className="text-sm text-gray-500">{insp.tramite.negocio.domicilioFiscal}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600">
                        {new Date(insp.fechaProgramada).toLocaleDateString('es-PE', {
                          weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Lima'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Formulario de resultado */}
                  <FormResultadoInspeccion inspeccionId={insp.id} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completadas */}
        {completadas.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 text-lg mb-3">
              Historial de Visitas Completadas ({completadas.length})
            </h2>
            <div className="space-y-3">
              {completadas.map((insp) => (
                <div key={insp.id} className={`card flex items-center justify-between ${
                  insp.resultado === 'CONFORME' ? 'bg-green-50 border border-green-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div>
                    <p className="font-semibold text-gray-800">{insp.tramite.negocio.razonSocial}</p>
                    <p className="text-xs text-gray-500">
                      Visita #{insp.numeroVisita} — {insp.fechaRealizada ? new Date(insp.fechaRealizada).toLocaleDateString('es-PE') : '—'}
                    </p>
                    {insp.observaciones && (
                      <p className="text-xs text-gray-600 mt-1 italic">"{insp.observaciones}"</p>
                    )}
                  </div>
                  <div>
                    {insp.resultado === 'CONFORME' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-orange-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
