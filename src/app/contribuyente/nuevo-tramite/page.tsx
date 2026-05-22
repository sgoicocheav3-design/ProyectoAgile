'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle2, AlertCircle, Upload, CreditCard, Loader2, ArrowRight } from 'lucide-react';

type Step = 1 | 2 | 3;

interface NegocioData {
  ruc: string;
  razonSocial: string;
  domicilioFiscal: string;
  provincia: string;
  departamento: string;
  distrito: string;
}

export default function NuevoTramitePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [ruc, setRuc] = useState('');
  const [negocio, setNegocio] = useState<NegocioData | null>(null);
  const [negocioId, setNegocioId] = useState('');
  const [tramiteId, setTramiteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planoFile, setPlanoFile] = useState<File | null>(null);
  const [paymentUrl, setPaymentUrl] = useState('');

  // ─────────────────────────────────────────
  // PASO 1: Validar RUC
  // ─────────────────────────────────────────
  const validarRUC = async () => {
    if (ruc.length !== 11) {
      setError('El RUC debe tener exactamente 11 dígitos.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await fetch(`/api/sunat/ruc?ruc=${ruc}`);
    const data = await res.json();

    if (!res.ok || !data.valido) {
      setError(data.error || 'RUC no válido.');
      setLoading(false);
      return;
    }

    setNegocio(data.data);

    // Registrar negocio en BD
    const regRes = await fetch('/api/sunat/ruc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruc }),
    });
    const regData = await regRes.json();

    if (!regRes.ok) {
      setError(regData.error || 'Error al registrar el negocio.');
      setLoading(false);
      return;
    }

    setNegocioId(regData.negocio.id);

    // Crear trámite
    const tramRes = await fetch('/api/tramites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ negocioId: regData.negocio.id }),
    });
    const tramData = await tramRes.json();

    if (!tramRes.ok) {
      if (tramRes.status === 409 && tramData.tramiteId) {
        // Ya tiene un trámite activo
        router.push(`/contribuyente/tramite/${tramData.tramiteId}`);
        return;
      }
      setError(tramData.error || 'Error al crear el trámite.');
      setLoading(false);
      return;
    }

    setTramiteId(tramData.tramite.id);
    setStep(2);
    setLoading(false);
  };

  // ─────────────────────────────────────────
  // PASO 2: Subir plano y avanzar a pago
  // ─────────────────────────────────────────
  const subirPlano = async () => {
    if (!planoFile) {
      setError('Debe seleccionar el plano del local (PDF o imagen).');
      return;
    }
    setLoading(true);
    setError('');

    // Subir archivo a Supabase Storage via API
    const formData = new FormData();
    formData.append('file', planoFile);
    formData.append('tramiteId', tramiteId);
    formData.append('tipo', 'PLANO_LOCAL');

    const res = await fetch('/api/documentos/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Error al subir el plano.');
      setLoading(false);
      return;
    }

    setStep(3);
    setLoading(false);
  };

  // ─────────────────────────────────────────
  // PASO 3: Generar pago en MercadoPago
  // ─────────────────────────────────────────
  const iniciarPago = async () => {
    setLoading(true);
    setError('');

    const res = await fetch('/api/pagos/crear-preferencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tramiteId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Error al crear el pago.');
      setLoading(false);
      return;
    }

    // En sandbox usar sandboxInitPoint, en producción usar initPoint
    window.location.href = data.sandboxInitPoint || data.initPoint;
  };

  const steps = [
    { n: 1, label: 'Validar RUC' },
    { n: 2, label: 'Documentos' },
    { n: 3, label: 'Pago' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-blue-300 text-xs uppercase tracking-wider">Municipalidad de Trujillo</p>
          <h1 className="font-bold text-lg">Nueva Solicitud de Licencia Municipal</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Stepper */}
        <div className="flex items-center mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className={`flex items-center gap-2 ${step >= s.n ? 'text-blue-700' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  step > s.n ? 'bg-blue-700 border-blue-700 text-white' :
                  step === s.n ? 'border-blue-700 text-blue-700' :
                  'border-gray-300 text-gray-400'
                }`}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${step >= s.n ? 'text-gray-800' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 ${step > s.n ? 'bg-blue-700' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card animate-fade-in">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* STEP 1: RUC */}
          {step === 1 && (
            <div>
              <h2 className="font-bold text-xl text-gray-800 mb-1">Paso 1: Validar RUC</h2>
              <p className="text-gray-500 text-sm mb-6">
                Ingrese el RUC de su negocio. Verificaremos en tiempo real que esté activo, habido y con domicilio fiscal en la provincia de Trujillo.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="Ej: 20600000000"
                  maxLength={11}
                  className="input-base flex-1 font-mono text-lg tracking-wider"
                  id="input-ruc"
                />
                <button onClick={validarRUC} disabled={loading || ruc.length !== 11} id="btn-validar-ruc" className="btn-primary flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Validar
                </button>
              </div>

              {negocio && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">RUC Válido — Negocio Verificado</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div><span className="text-gray-500">Razón Social:</span> <strong className="text-gray-800">{negocio.razonSocial}</strong></div>
                    <div><span className="text-gray-500">RUC:</span> <strong className="text-gray-800">{negocio.ruc}</strong></div>
                    <div className="col-span-2"><span className="text-gray-500">Domicilio Fiscal:</span> <strong className="text-gray-800">{negocio.domicilioFiscal}</strong></div>
                    <div><span className="text-gray-500">Provincia:</span> <strong className="text-gray-800">{negocio.provincia}</strong></div>
                    <div><span className="text-gray-500">Departamento:</span> <strong className="text-gray-800">{negocio.departamento}</strong></div>
                  </div>
                  <button onClick={() => setStep(2)} id="btn-continuar-paso2" className="btn-primary mt-4 flex items-center gap-2">
                    Continuar <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Plano */}
          {step === 2 && (
            <div>
              <h2 className="font-bold text-xl text-gray-800 mb-1">Paso 2: Subir Plano del Local</h2>
              <p className="text-gray-500 text-sm mb-6">
                Suba el plano a escala de su local en formato PDF o imagen (PNG/JPG). El documento debe ser legible y estar vigente (no borradores ni en trámite).
              </p>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  planoFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
                onClick={() => document.getElementById('input-plano')?.click()}
              >
                <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                {planoFile ? (
                  <div>
                    <p className="font-semibold text-blue-700">{planoFile.name}</p>
                    <p className="text-sm text-gray-500">{(planoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-gray-700">Haga clic para seleccionar el plano</p>
                    <p className="text-sm text-gray-400 mt-1">PDF, PNG, JPG — Máximo 10 MB</p>
                  </div>
                )}
                <input
                  id="input-plano"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => setPlanoFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="btn-secondary">← Atrás</button>
                <button onClick={subirPlano} disabled={loading || !planoFile} id="btn-subir-plano" className="btn-primary flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Subir y Continuar
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Pago */}
          {step === 3 && (
            <div>
              <h2 className="font-bold text-xl text-gray-800 mb-1">Paso 3: Realizar Pago</h2>
              <p className="text-gray-500 text-sm mb-6">
                El costo de la Licencia Municipal de Funcionamiento es de <strong className="text-gray-800">S/. 180.00</strong> (ciento ochenta soles). 
                Al hacer clic en "Pagar", será redirigido a la plataforma segura de pago.
              </p>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-6 mb-6">
                <p className="text-blue-200 text-sm mb-1">Monto a pagar</p>
                <p className="text-5xl font-black mb-1">S/. 180.00</p>
                <p className="text-blue-200 text-sm">Tasa de Licencia Municipal de Funcionamiento</p>
                <hr className="border-blue-500 my-4" />
                <div className="text-sm space-y-1">
                  <p><span className="text-blue-300">Negocio:</span> {negocio?.razonSocial}</p>
                  <p><span className="text-blue-300">RUC:</span> {negocio?.ruc}</p>
                  <p><span className="text-blue-300">Vigencia:</span> 1 año desde la aprobación</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-sm text-yellow-800">
                <strong>⚠ Entorno Sandbox:</strong> Use la tarjeta de prueba <code className="bg-yellow-100 px-1 rounded">4509 9535 6623 3704</code> — Vencimiento: cualquier fecha futura — CVV: cualquier 3 dígitos.
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary">← Atrás</button>
                <button onClick={iniciarPago} disabled={loading} id="btn-pagar" className="btn-primary flex items-center gap-2 flex-1 justify-center">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Pagar S/. 180.00 con MercadoPago
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
