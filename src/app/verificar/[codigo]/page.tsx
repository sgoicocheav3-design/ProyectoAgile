import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CheckCircle2, Shield, ExternalLink } from 'lucide-react';

/**
 * Página pública de verificación de licencia via QR
 * URL: /verificar/[codigoLicencia]
 */
export default async function VerificarLicenciaPage({
  params,
}: {
  params: { codigo: string };
}) {
  const tramite = await prisma.tramite.findFirst({
    where: { codigoLicencia: params.codigo },
    include: { negocio: true },
  });

  if (!tramite || tramite.estado !== 'APROBADO') {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-red-800 mb-2">Licencia No Válida</h1>
          <p className="text-red-600">
            El código <code className="bg-red-100 px-1 rounded">{params.codigo}</code> no corresponde a ninguna licencia vigente en nuestros registros.
          </p>
          <p className="text-sm text-red-400 mt-4">
            Si cree que esto es un error, contacte a la Municipalidad Provincial de Trujillo.
          </p>
        </div>
      </div>
    );
  }

  const vigente =
    tramite.licenciaVigenteHasta &&
    new Date(tramite.licenciaVigenteHasta) > new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="bg-blue-900 text-white rounded-t-2xl p-6 text-center">
          <Shield className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-blue-300 text-xs uppercase tracking-widest">Municipalidad Provincial de Trujillo</p>
          <h1 className="font-black text-xl">Verificación de Licencia</h1>
        </div>

        {/* Resultado */}
        <div className="bg-white rounded-b-2xl shadow-xl p-6">
          {vigente ? (
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-green-700">Licencia VÁLIDA</h2>
              <p className="text-green-600 text-sm">Esta licencia es auténtica y se encuentra vigente</p>
            </div>
          ) : (
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-9 h-9 text-orange-500" />
              </div>
              <h2 className="text-2xl font-black text-orange-700">Licencia VENCIDA</h2>
              <p className="text-orange-600 text-sm">Esta licencia venció y no está vigente</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Código de Licencia:</span>
              <code className="font-bold text-gray-800 text-xs">{tramite.codigoLicencia}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Razón Social:</span>
              <span className="font-semibold text-gray-800 text-right max-w-[200px]">{tramite.negocio.razonSocial}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">RUC:</span>
              <span className="font-mono font-semibold text-gray-800">{tramite.negocio.ruc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dirección:</span>
              <span className="font-semibold text-gray-800 text-right max-w-[200px] text-xs">{tramite.negocio.domicilioFiscal}</span>
            </div>
            <hr />
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha de Emisión:</span>
              <span className="font-semibold text-gray-800">
                {tramite.licenciaVigenteDesde
                  ? new Date(tramite.licenciaVigenteDesde).toLocaleDateString('es-PE')
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha de Vencimiento:</span>
              <span className={`font-semibold ${vigente ? 'text-green-700' : 'text-red-600'}`}>
                {tramite.licenciaVigenteHasta
                  ? new Date(tramite.licenciaVigenteHasta).toLocaleDateString('es-PE')
                  : '—'}
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Verificado el {new Date().toLocaleDateString('es-PE', { dateStyle: 'full', timeZone: 'America/Lima' })}
          </p>

          <div className="mt-4 text-center">
            <a
              href="/"
              className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Municipalidad Provincial de Trujillo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
