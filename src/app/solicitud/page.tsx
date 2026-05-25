'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, CheckCircle2, AlertCircle, Upload,
  Loader2, ArrowLeft, Shield, UserPlus, Mail, Smartphone, RefreshCw
} from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

interface NegocioData {
  ruc: string;
  razonSocial: string;
  domicilioFiscal: string;
  provincia: string;
  departamento: string;
  distrito: string;
}

export default function SolicitudPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [ruc, setRuc] = useState('');
  const [negocio, setNegocio] = useState<NegocioData | null>(null);
  const [negocioId, setNegocioId] = useState('');
  const [tramiteId, setTramiteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planoFile, setPlanoFile] = useState<File | null>(null);

  // Paso 4: datos de cuenta
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [cuentaCreada, setCuentaCreada] = useState(false);

  // Track si el negocio ya tiene usuario
  const [negocioYaTieneCuenta, setNegocioYaTieneCuenta] = useState(false);

  // Anti-spam / concurrencia
  const processingRef = useRef(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [yapeQr, setYapeQr] = useState<{
    qrCodeBase64: string;
    paymentId: number;
    ticketUrl: string;
  } | null>(null);
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(300);

  const VALID_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'];
  const VALID_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const MIN_FILE_SIZE = 10 * 1024; // 10 KB — evitar archivos vacíos

  const validarPlano = (file: File | null): string | null => {
    if (!file) return 'Debe seleccionar un archivo.';

    if (file.size < MIN_FILE_SIZE) return 'El archivo está vacío o es demasiado pequeño.';
    if (file.size > MAX_FILE_SIZE) return 'El archivo no debe superar 10 MB.';

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !VALID_EXTENSIONS.includes(ext)) return 'Extensión de archivo no válida. Use PDF, PNG o JPG.';
    if (!VALID_MIME_TYPES.includes(file.type)) return 'Tipo de archivo no válido. Use PDF, PNG o JPG.';

    // Placeholder para validación con IA
    // TODO: Conectar con API de IA para verificar que el archivo es un plano arquitectónico real
    // Ej: enviar file a endpoint /api/validar-plano-ia que devuelva { valido: boolean, confianza: number }
    // const esPlano = await validarConIA(file);
    // if (!esPlano) return 'El archivo no parece ser un plano arquitectónico válido.';

    return null;
  };

  // ─────────────────────────────────────────
  // PASO 1: Validar RUC (público, sin auth)
  // ─────────────────────────────────────────
  const validarRUC = async () => {
    if (ruc.length !== 11) {
      setError('El RUC debe tener exactamente 11 dígitos.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/solicitud/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruc }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'RUC no válido.');
        setLoading(false);
        return;
      }

      setNegocio(data.sunatData || data.negocio);
      setNegocioId(data.negocio?.id || '');
      setTramiteId(data.tramiteId);

      if (data.tramiteExistente) {
        setError(`Ya existe un trámite activo para este RUC (Estado: ${data.estado}). Consulte su estado en la página de consulta.`);
        setLoading(false);
        return;
      }

      setStep(2);
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    }
    setLoading(false);
  };

  // ─────────────────────────────────────────
  // PASO 2: Subir plano (sin auth, usa tramiteId)
  // ─────────────────────────────────────────
  const subirPlano = async () => {
    const validacion = validarPlano(planoFile);
    if (validacion) {
      setError(validacion);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', planoFile!);
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
    } catch {
      setError('Error de conexión al subir el archivo.');
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // PASO 3: Pago Yape con QR dinámico
  // ─────────────────────────────────────────
  const iniciarPago = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/pagos/crear-pago-yape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tramiteId, emailContacto: email || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al generar el pago Yape.');
        setLoading(false);
        processingRef.current = false;
        return;
      }

      setYapeQr({
        qrCodeBase64: data.qrCodeBase64,
        paymentId: data.paymentId,
        ticketUrl: data.ticketUrl,
      });
      setSegundosRestantes(300);
      setLoading(false);
      processingRef.current = false;
    } catch {
      setError('Error de conexión. Intente nuevamente.');
      setLoading(false);
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (!yapeQr || pagoConfirmado) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagos/estado/${tramiteId}`);
        const data = await res.json();
        if (data.pagado) {
          setPagoConfirmado(true);
          if (pollingRef.current) clearInterval(pollingRef.current);
          setTimeout(() => setStep(4), 1500);
        }
      } catch {
        // silently retry
      }
      setSegundosRestantes((prev) => (prev > 0 ? prev - 5 : 0));
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [yapeQr, pagoConfirmado, tramiteId]);

  // ─────────────────────────────────────────
  // PASO 4: Crear cuenta post-pago
  // ─────────────────────────────────────────
  const crearCuenta = async () => {
    if (!email || !password || !nombre) {
      setError('Complete todos los campos.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/crear-cuenta-post-pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nombre, tramiteId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Error al crear la cuenta.');
      setLoading(false);
      return;
    }

    setCuentaCreada(true);
    setLoading(false);
  };

  const steps = [
    { n: 1, label: 'Validar RUC' },
    { n: 2, label: 'Documentos' },
    { n: 3, label: 'Pago' },
    { n: 4, label: 'Crear Cuenta' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-blue-300 text-xs hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Inicio
            </Link>
            <h1 className="font-bold text-lg">Nueva Solicitud de Licencia Municipal</h1>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            <span className="text-blue-200 text-xs">MPT</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Stepper */}
        <div className="flex items-center mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${step >= s.n ? 'text-blue-700' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  step > s.n ? 'bg-blue-700 border-blue-700 text-white' :
                  step === s.n ? 'border-blue-700 text-blue-700' :
                  'border-gray-300 text-gray-400'
                }`}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step >= s.n ? 'text-gray-800' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${step > s.n ? 'bg-blue-700' : 'bg-gray-200'}`} />
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
                Ingrese el RUC de su negocio. Verificaremos en SUNAT que esté activo, habido y con domicilio en Trujillo.
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
                  onKeyDown={(e) => e.key === 'Enter' && validarRUC()}
                />
                <button onClick={validarRUC} disabled={loading || ruc.length !== 11} id="btn-validar-ruc" className="btn-primary flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Validar
                </button>
              </div>

              {negocio && !error && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">RUC Válido — Negocio Verificado</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div><span className="text-gray-500">Razón Social:</span> <strong className="text-gray-800">{negocio.razonSocial}</strong></div>
                    <div><span className="text-gray-500">RUC:</span> <strong className="text-gray-800">{negocio.ruc || ruc}</strong></div>
                    <div className="col-span-2"><span className="text-gray-500">Domicilio:</span> <strong className="text-gray-800">{negocio.domicilioFiscal}</strong></div>
                    <div><span className="text-gray-500">Provincia:</span> <strong className="text-gray-800">{negocio.provincia}</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Plano */}
          {step === 2 && (
            <div>
              <h2 className="font-bold text-xl text-gray-800 mb-1">Paso 2: Subir Plano del Local</h2>
              <p className="text-gray-500 text-sm mb-6">
                Suba el plano a escala de su local en formato PDF o imagen. Debe ser legible y vigente.
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

          {/* STEP 3: Pago con Yape QR */}
          {step === 3 && !yapeQr && !pagoConfirmado && (
            <div>
              <h2 className="font-bold text-xl text-gray-800 mb-1">Paso 3: Realizar Pago</h2>
              <p className="text-gray-500 text-sm mb-6">
                El costo de la Licencia Municipal es de <strong className="text-gray-800">S/. 1.80</strong>.
                Pague con Yape escaneando el código QR desde su celular.
              </p>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-6 mb-6">
                <p className="text-blue-200 text-sm mb-1">Monto a pagar</p>
                <p className="text-5xl font-black mb-1">S/. 1.80</p>
                <p className="text-blue-200 text-sm">Tasa de Licencia Municipal de Funcionamiento</p>
                <hr className="border-blue-500 my-4" />
                <div className="text-sm space-y-1">
                  <p><span className="text-blue-300">Negocio:</span> {negocio?.razonSocial}</p>
                  <p><span className="text-blue-300">RUC:</span> {ruc}</p>
                  <p><span className="text-blue-300">Vigencia:</span> 1 año desde la aprobación</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary">← Atrás</button>
                <button onClick={iniciarPago} disabled={loading} id="btn-pagar" className="btn-primary flex items-center gap-2 flex-1 justify-center">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generando código QR...</>
                  ) : (
                    <><Smartphone className="w-4 h-4" /> Pagar S/. 1.80 con Yape</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* QR generado — esperando pago */}
          {step === 3 && yapeQr && !pagoConfirmado && (
            <div className="text-center">
              <h2 className="font-bold text-xl text-gray-800 mb-1">Escane el código QR</h2>
              <p className="text-gray-500 text-sm mb-6">
                Abra la aplicación <strong>Yape</strong>, presione <strong>&quot;Pagar con QR&quot;</strong> y escanee este código.
              </p>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-6 mb-4 max-w-sm mx-auto">
                <p className="text-blue-200 text-sm mb-1">Monto fijo</p>
                <p className="text-4xl font-black">S/. 1.80</p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-4 inline-block mb-4 shadow-lg">
                {yapeQr.qrCodeBase64 ? (
                  <img
                    src={`data:image/png;base64,${yapeQr.qrCodeBase64}`}
                    alt="Código QR Yape"
                    className="w-56 h-56"
                  />
                ) : (
                  <div className="w-56 h-56 bg-gray-100 flex items-center justify-center text-gray-400">
                    Cargando QR...
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Esperando confirmación... ({Math.floor(segundosRestantes / 60)}:{(segundosRestantes % 60).toString().padStart(2, '0')})
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 text-left mb-4">
                <p className="font-semibold mb-1">📱 Pasos para pagar:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Abra Yape en su celular</li>
                  <li>Presione &quot;Pagar con QR&quot;</li>
                  <li>Escanee el código QR de esta pantalla</li>
                  <li>Verifique que el monto sea <strong>S/. 1.80</strong></li>
                  <li>Presione &quot;Yapear&quot; y confirme</li>
                </ol>
              </div>

              <button
                onClick={() => { setYapeQr(null); setError(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Cancelar y volver
              </button>
            </div>
          )}

          {/* Pago confirmado exitosamente */}
          {step === 3 && pagoConfirmado && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="font-bold text-2xl text-gray-800 mb-2">¡Pago Confirmado!</h2>
              <p className="text-gray-500 mb-2">El pago de <strong>S/. 1.80</strong> ha sido procesado correctamente.</p>
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-gray-400 mt-2">Avanzando al siguiente paso...</p>
            </div>
          )}

          {/* STEP 4: Crear cuenta */}
          {step === 4 && !cuentaCreada && (
            <div>
              <h2 className="font-bold text-xl text-gray-800 mb-1">Paso 4: Crear su Cuenta</h2>
              <p className="text-gray-500 text-sm mb-6">
                Ingrese un correo electrónico y una contraseña para poder recibir notificaciones sobre el estado de su trámite
                y acceder a su licencia cuando esté aprobada.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Juan Pérez García"
                    className="input-base"
                    id="input-nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="input-base"
                    id="input-email"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    A este correo llegarán las notificaciones de su trámite.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="input-base"
                    id="input-password"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Si pierde su contraseña, podrá recuperarla por este correo.
                    Si pierde acceso al correo, contacte a soporte de la municipalidad.
                  </p>
                </div>

                <button
                  onClick={crearCuenta}
                  disabled={loading || !email || !password || !nombre}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  id="btn-crear-cuenta"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Crear Cuenta y Finalizar
                </button>
              </div>
            </div>
          )}

          {/* Cuenta creada exitosamente */}
          {step === 4 && cuentaCreada && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="font-bold text-2xl text-gray-800 mb-2">¡Solicitud Completa!</h2>
              <p className="text-gray-500 mb-6">
                Su trámite ha sido registrado exitosamente. Recibirá notificaciones en <strong>{email}</strong> sobre el progreso de su solicitud.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 mb-6">
                <p><strong>📧 Email:</strong> {email}</p>
                <p className="mt-1"><strong>🔑 Contraseña:</strong> La que acaba de registrar</p>
                <p className="mt-2 text-xs text-blue-600">
                  Use estas credenciales para iniciar sesión y ver los detalles completos de su trámite.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link href="/consulta" className="btn-primary flex items-center justify-center gap-2">
                  <Search className="w-4 h-4" />
                  Consultar Estado de mi Trámite
                </Link>
                <Link href="/" className="text-blue-600 hover:underline text-sm">
                  Volver al inicio
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
