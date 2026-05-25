import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import FormResultadoInspeccion from '@/components/inspector/form-resultado';
import ComentariosSection from '@/components/inspector/comentarios-section';
import {
  ArrowLeft,
  Building2,
  MapPin,
  FileText,
  ClipboardCheck,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default async function DetalleInspeccionPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.rol !== 'INSPECTOR' && session.user.rol !== 'ADMINISTRADOR') {
    redirect('/login');
  }

  const inspeccion = await prisma.inspeccion.findUnique({
    where: { id: params.id },
    include: {
      tramite: {
        include: {
          negocio: true,
          documentos: {
            where: { tipo: 'PLANO_LOCAL', vigente: true },
            select: { url: true, nombre: true, createdAt: true },
          },
        },
      },
      inspector: {
        select: { nombre: true, email: true },
      },
    },
  });

  if (!inspeccion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Inspección no encontrada</h2>
          <Link href="/inspector/agenda" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Volver a la agenda
          </Link>
        </div>
      </div>
    );
  }

  const { tramite } = inspeccion;
  const badgeEstado = (() => {
    switch (tramite.estado) {
      case 'EN_INSPECCION': return { label: '1ra Visita', color: 'bg-blue-100 text-blue-700' };
      case 'SEGUNDA_INSPECCION': return { label: '2da Visita', color: 'bg-orange-100 text-orange-700' };
      case 'APROBADO': return { label: 'Aprobado', color: 'bg-green-100 text-green-700' };
      case 'OBSERVADO': return { label: 'Observado', color: 'bg-yellow-100 text-yellow-700' };
      case 'NEGADO': return { label: 'Rechazado', color: 'bg-red-100 text-red-700' };
      default: return { label: tramite.estado, color: 'bg-gray-100 text-gray-700' };
    }
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/inspector/agenda" className="text-blue-300 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-blue-300 text-xs uppercase tracking-wider">Inspección Municipal</p>
              <h1 className="font-bold text-lg">Detalle de Visita</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-200">{session.user.nombre}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeEstado.color}`}>
              {badgeEstado.label}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Datos del negocio */}
        <div className="card">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-600" />
            Datos del Contribuyente
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Razón Social:</span>
              <p className="font-semibold text-gray-800">{tramite.negocio.razonSocial}</p>
            </div>
            <div>
              <span className="text-gray-500">RUC:</span>
              <p className="font-semibold text-gray-800">{tramite.negocio.ruc}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Dirección del Local:</span>
              <p className="font-semibold text-gray-800 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-400" />
                {tramite.negocio.domicilioFiscal}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Distrito:</span>
              <p className="font-semibold text-gray-800">{tramite.negocio.distrito || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Provincia / Dpto:</span>
              <p className="font-semibold text-gray-800">{tramite.negocio.provincia} / {tramite.negocio.departamento}</p>
            </div>
          </div>
        </div>

        {/* Info de la inspección */}
        <div className="card">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            Información de la Visita
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Visita N°:</span>
              <p className="font-semibold text-gray-800">{inspeccion.numeroVisita}</p>
            </div>
            <div>
              <span className="text-gray-500">Inspector Asignado:</span>
              <p className="font-semibold text-gray-800">{inspeccion.inspector.nombre}</p>
            </div>
            <div>
              <span className="text-gray-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Fecha Programada:
              </span>
              <p className="font-semibold text-gray-800">
                {inspeccion.fechaProgramada.toLocaleDateString('es-PE', {
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                  timeZone: 'America/Lima',
                })}
              </p>
            </div>
            <div>
              <span className="text-gray-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Estado:
              </span>
              <p className="font-semibold text-gray-800">
                {inspeccion.completada ? 'Completada' : 'Pendiente'}
              </p>
            </div>
            {inspeccion.fechaLimite && (
              <div className="col-span-2">
                <span className="text-gray-500 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  Fecha Límite (2da visita):
                </span>
                <p className="font-semibold text-orange-700">
                  {inspeccion.fechaLimite.toLocaleDateString('es-PE', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                    timeZone: 'America/Lima',
                  })}
                </p>
              </div>
            )}
            {inspeccion.resultado && (
              <div className="col-span-2">
                <span className="text-gray-500">Resultado:</span>
                <p className="font-semibold flex items-center gap-1 mt-0.5">
                  {inspeccion.resultado === 'CONFORME' ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-600" /> <span className="text-green-700">Conforme</span></>
                  ) : inspeccion.resultado === 'OBSERVADO' ? (
                    <><AlertTriangle className="w-4 h-4 text-orange-600" /> <span className="text-orange-700">Observado</span></>
                  ) : (
                    <><XCircle className="w-4 h-4 text-red-600" /> <span className="text-red-700">Rechazado</span></>
                  )}
                </p>
              </div>
            )}
          </div>

          {inspeccion.observaciones && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observaciones</span>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{inspeccion.observaciones}</p>
            </div>
          )}
        </div>

        {/* Documentos del trámite */}
        {tramite.documentos.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              Documentos del Trámite
            </h2>
            <div className="space-y-2">
              {tramite.documentos.map((doc) => (
                <div key={doc.url} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">{doc.nombre}</span>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ver
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario de resultado (solo si no está completada) */}
        {!inspeccion.completada && (
          <div className="card border-2 border-blue-100">
            <FormResultadoInspeccion inspeccionId={inspeccion.id} />
          </div>
        )}

        {/* Resultado ya registrado + acciones */}
        {inspeccion.completada && inspeccion.resultado === 'CONFORME' && tramite.estado === 'APROBADO' && (
          <div className="card bg-gradient-to-br from-green-50 to-white border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-green-800">Licencia Aprobada</h3>
                <p className="text-sm text-green-700">Código: <strong>{tramite.codigoLicencia}</strong></p>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href={`/api/licencia/${tramite.id}/pdf`}
                target="_blank"
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                Descargar PDF de Licencia
              </a>
              {tramite.qrData && (
                <a
                  href={tramite.qrData}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver QR de Verificación
                </a>
              )}
            </div>
          </div>
        )}

        {inspeccion.completada && inspeccion.resultado === 'OBSERVADO' && inspeccion.numeroVisita === 1 && (
          <div className="card bg-gradient-to-br from-orange-50 to-white border border-orange-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-orange-800">Visita #1 Observada</h3>
                <p className="text-sm text-orange-700">
                  Se ha agendado una segunda visita. El contribuyente tiene plazo máximo de 30 días hábiles para corregir las observaciones.
                </p>
              </div>
            </div>
          </div>
        )}

        {inspeccion.completada && inspeccion.resultado === 'RECHAZADO' && (
          <div className="card bg-gradient-to-br from-red-50 to-white border border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-800">Solicitud Rechazada</h3>
                <p className="text-sm text-red-700">
                  La solicitud ha sido rechazada. El contribuyente puede iniciar un nuevo trámite.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sección de comentarios */}
        <div className="card">
          <ComentariosSection inspeccionId={inspeccion.id} />
        </div>
      </main>
    </div>
  );
}
