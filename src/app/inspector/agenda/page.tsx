import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, ClipboardList } from 'lucide-react';
import CalendarioInspecciones, {
  type InspeccionCalendario,
} from '@/components/inspector/calendario-inspecciones';

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

  // Serialize for the client calendar component
  const inspeccionesCalendario: InspeccionCalendario[] = inspecciones.map((i) => ({
    id: i.id,
    fechaProgramada: i.fechaProgramada.toISOString(),
    completada: i.completada,
    resultado: i.resultado,
    numeroVisita: i.numeroVisita,
    fechaLimite: i.fechaLimite ? i.fechaLimite.toISOString() : null,
    negocioRazonSocial: i.tramite.negocio.razonSocial,
    negocioRuc: i.tramite.negocio.ruc,
    negocioDomicilio: i.tramite.negocio.domicilioFiscal,
  }));

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
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-lg">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-800">{pendientes.length}</p>
                <p className="text-sm text-gray-500">Visitas Pendientes</p>
              </div>
            </div>
          </div>
          <div className="card border border-green-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-800">
                  {completadas.filter((i) => i.resultado === 'CONFORME').length}
                </p>
                <p className="text-sm text-gray-500">Aprobadas</p>
              </div>
            </div>
          </div>
          <div className="card border border-orange-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-800">
                  {completadas.filter((i) => i.resultado !== 'CONFORME').length}
                </p>
                <p className="text-sm text-gray-500">Observadas / Rechazadas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar + day list */}
        <CalendarioInspecciones inspecciones={inspeccionesCalendario} />
      </main>
    </div>
  );
}
