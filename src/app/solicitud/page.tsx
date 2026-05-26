'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  Search, CheckCircle2, AlertCircle, Upload,
  Loader2, ArrowLeft, Shield, UserPlus, Mail, ExternalLink, FileText
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
  const [step, setStep] = useState<Step>(1);
  const [ruc, setRuc] = useState('');
  const [negocio, setNegocio] = useState<NegocioData | null>(null);
  const [negocioId, setNegocioId] = useState('');
  const [tramiteId, setTramiteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planoFile, setPlanoFile] = useState<File | null>(null);
  const [planoPreview, setPlanoPreview] = useState<string | null>(null);
  const [isValidandoPlano, setIsValidandoPlano] = useState(false);
  const [planoValidation, setPlanoValidation] = useState<{ isPlan: boolean; confidence: number; reason: string } | null>(null);
  const [planoValidationError, setPlanoValidationError] = useState<string | null>(null);

  // Paso 3: datos del comprobante (antes del pago)
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState<'BOLETA' | 'FACTURA'>('BOLETA');
  const [comprobanteGuardado, setComprobanteGuardado] = useState(false);

  // Track si el negocio ya tiene usuario
  const [negocioYaTieneCuenta, setNegocioYaTieneCuenta] = useState(false);

  // Anti-spam / concurrencia
  const processingRef = useRef(false);

  const [pagoConfirmado, setPagoConfirmado] = useState(false);

  const VALID_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'];
  const VALID_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const MIN_FILE_SIZE = 10 * 1024; // 10 KB — evitar archivos vacíos

  const loadImageBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const validarPlanoConIA = async () => {
    if (!planoFile) return;
    setIsValidandoPlano(true);
    setPlanoValidation(null);
    setPlanoValidationError(null);

    try {
      const imageBase64 = await loadImageBase64(planoFile);

      const response = await axios({
        method: 'POST',
        url: '/api/validate-plan',
        data: { image: imageBase64 },
        headers: { 'Content-Type': 'application/json' },
      });

      const detections = response.data?.predictions;
      const MIN_CONFIDENCE = 0.70;
      const validPredictions = detections
        ? detections.filter((pred: { confidence: number }) => pred.confidence >= MIN_CONFIDENCE)
        : [];

      if (validPredictions.length > 0) {
        const top = validPredictions[0];
        setPlanoValidation({
          isPlan: true,
          confidence: Math.round(top.confidence * 100),
          reason: `Se detectaron ${validPredictions.length} elementos arquitectónicos (${top.class} con ${(top.confidence * 100).toFixed(0)}% de confianza).`,
        });
      } else {
        setPlanoValidation({
          isPlan: false,
          confidence: 0,
          reason: 'El documento no parece ser un plano válido.',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error validando con Roboflow:', message);
      setPlanoValidationError('Error de conexión al validar el plano con Roboflow.');
    } finally {
      setIsValidandoPlano(false);
    }
  };

  const validarPlano = (file: File | null): string | null => {
    if (!file) return 'Debe seleccionar un archivo.';

    if (file.size < MIN_FILE_SIZE) return 'El archivo está vacío o es demasiado pequeño.';
    if (file.size > MAX_FILE_SIZE) return 'El archivo no debe superar 10 MB.';

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !VALID_EXTENSIONS.includes(ext)) return 'Extensión de archivo no válida. Use PDF, PNG o JPG.';
    if (!VALID_MIME_TYPES.includes(file.type)) return 'Tipo de archivo no válido. Use PDF, PNG o JPG.';

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

      if (data.tramiteExistente) {
        setError(`Ya existe un trámite activo para este RUC (Estado: ${data.estado}). Consulte su estado en la página de consulta.`);
        setLoading(false);
        return;
      }
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    }
    setLoading(false);
  };

  // ─────────────────────────────────────────
  // PASO 2: Validar plano con IA
  // ─────────────────────────────────────────
  const avanzarAComprobante = () => {
    const validacion = validarPlano(planoFile);
    if (validacion) {
      setError(validacion);
      return;
    }

    if (!planoValidation?.isPlan) {
      setError('Debe validar el plano con IA antes de continuar.');
      return;
    }

    setStep(3);
  };

  // ─────────────────────────────────────────
  // PASO 3: Guardar datos del comprobante, crear trámite y subir plano
  // Luego avanza al paso 4 (pago)
  // ─────────────────────────────────────────
  const guardarComprobanteYAvanzar = async () => {
    if (!email || !nombre) {
      setError('Complete todos los campos.');
      return;
    }
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setError('');

    try {
      // 1. Crear trámite
      const tramiteRes = await fetch('/api/tramites/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negocioId }),
      });

      const tramiteData = await tramiteRes.json();
      if (!tramiteRes.ok) {
        setError(tramiteData.error || 'Error al crear el trámite.');
        setLoading(false);
        processingRef.current = false;
        return;
      }

      const nuevoTramiteId = tramiteData.tramiteId;
      setTramiteId(nuevoTramiteId);

      // 2. Subir plano al trámite
      const formData = new FormData();
      formData.append('file', planoFile!);
      formData.append('tramiteId', nuevoTramiteId);
      formData.append('tipo', 'PLANO_LOCAL');

      const uploadRes = await fetch('/api/documentos/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData.error || 'Error al subir el plano.');
        setLoading(false);
        processingRef.current = false;
        return;
      }

      // 3. Guardar datos del comprobante (boleta/factura) en el trámite
      const comprobanteRes = await fetch('/api/tramites/guardar-comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tramiteId: nuevoTramiteId,
          nombre,
          email,
          tipoComprobante,
        }),
      });

      const comprobanteData = await comprobanteRes.json();
      if (!comprobanteRes.ok) {
        setError(comprobanteData.error || 'Error al guardar datos del comprobante.');
        setLoading(false);
        processingRef.current = false;
        return;
      }

      setComprobanteGuardado(true);
      setStep(4);
      setLoading(false);
      processingRef.current = false;
    } catch {
      setError('Error de conexión. Intente nuevamente.');
      setLoading(false);
      processingRef.current = false;
    }
  };

  // ─────────────────────────────────────────
  // PASO 4: Iniciar pago con MercadoPago
  // ─────────────────────────────────────────
  const iniciarPago = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const baseUrl = window.location.origin;
      const prefRes = await fetch('/api/pagos/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tramiteId,
          backUrlBase: `${baseUrl}/solicitud`,
        }),
      });

      const prefData = await prefRes.json();
      if (!prefRes.ok) {
        setError(prefData.error || 'Error al preparar el pago.');
        setLoading(false);
        processingRef.current = false;
        return;
      }

      // Redirigir a MercadoPago
      window.location.href = prefData.initPoint;
    } catch {
      setError('Error de conexión. Intente nuevamente.');
      setLoading(false);
      processingRef.current = false;
    }
  };

  // Limpiar preview al desmontar
  useEffect(() => {
    return () => {
      if (planoPreview) URL.revokeObjectURL(planoPreview);
    };
  }, [planoPreview]);

  // Detectar retorno desde MercadoPago y verificar el pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('pago');
    const tid = params.get('tramiteId') || params.get('external_reference');
    const paymentId = params.get('payment_id');

    if (status === 'success' && tid) {
      setTramiteId(tid);
      // Verificar el pago contra la API de MercadoPago para cambiar estado y generar comprobante
      if (paymentId) {
        fetch('/api/pagos/verificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tramiteId: tid, paymentId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.pagado || data.nuevoEstado) {
              setPagoConfirmado(true);
            } else {
              setError('El pago no pudo ser verificado. Contacte a soporte.');
            }
          })
          .catch(() => setPagoConfirmado(true));
      } else {
        setPagoConfirmado(true);
      }
    }
  }, []);

  // ─────────────────────────────────────────
  // STEPPER CONFIG
  // ─────────────────────────────────────────
  const steps = [
    { n: 1, label: 'Validar RUC' },
    { n: 2, label: 'Documentos' },
    { n: 3, label: 'Datos del Comprobante' },
    { n: 4, label: 'Pago' },
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
                  <button
                    onClick={() => setStep(2)}
                    className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                    id="btn-confirmar-ruc"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ¿Este es tu RUC? — Continuar
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
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPlanoFile(file);
                    setPlanoValidation(null);
                    setPlanoValidationError(null);
                    if (planoPreview) URL.revokeObjectURL(planoPreview);
                    setPlanoPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </div>

              {/* Preview de imagen */}
              {planoPreview && planoFile?.type.startsWith('image/') && (
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
                  <img
                    src={planoPreview}
                    alt="Vista previa del plano"
                    className="w-full h-64 object-contain bg-gray-100"
                  />
                </div>
              )}

              {/* Validación con IA */}
              {planoFile && !planoValidation && !isValidandoPlano && (
                <button
                  onClick={validarPlanoConIA}
                  disabled={isValidandoPlano}
                  className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                  id="btn-validar-plano"
                >
                  <Search className="w-4 h-4" />
                  Validar Plano
                </button>
              )}

              {isValidandoPlano && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Analizando imagen con IA...</p>
                    <p className="text-sm text-blue-600">Verificando que sea un plano arquitectónico válido</p>
                  </div>
                </div>
              )}

              {planoValidation && planoValidation.isPlan && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">Plano válido</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Confianza: {planoValidation.confidence}% — {planoValidation.reason}
                  </p>
                </div>
              )}

              {planoValidation && !planoValidation.isPlan && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-red-800">No parece un plano válido</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    {planoValidation.reason} (Confianza: {planoValidation.confidence}%)
                  </p>
                  <p className="text-xs text-red-600 mt-2">Seleccione otro archivo e intente nuevamente.</p>
                </div>
              )}

              {planoValidationError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-red-800">Error de validación</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">{planoValidationError}</p>
                  <button
                    onClick={validarPlanoConIA}
                    className="mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Intentar nuevamente
                  </button>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={avanzarAComprobante}
                  disabled={!planoFile || !planoValidation?.isPlan}
                  id="btn-continuar-pago"
                  className="btn-primary flex items-center gap-2"
                >
                  Continuar — Datos del Comprobante
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Datos para Boleta/Factura (ANTES del pago) */}
          {step === 3 && !comprobanteGuardado && (
            <div>
              <h2 className="font-bold text-xl text-gray-800 mb-1">Paso 3: Datos para el Comprobante</h2>
              <p className="text-gray-500 text-sm mb-6">
                Elija el tipo de comprobante que necesita para su pago. Esta información se usará para generar la boleta o factura electrónica.
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
                    A este correo se enviarán la boleta/factura y notificaciones de su trámite.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de comprobante</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition" htmlFor="opcion-boleta">
                      <input
                        id="opcion-boleta"
                        type="radio"
                        name="comprobante"
                        value="BOLETA"
                        checked={tipoComprobante === 'BOLETA'}
                        onChange={(e) => setTipoComprobante(e.target.value as 'BOLETA' | 'FACTURA')}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium text-gray-700">Boleta de Venta</p>
                        <p className="text-xs text-gray-500">Para personas naturales</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition" htmlFor="opcion-factura">
                      <input
                        id="opcion-factura"
                        type="radio"
                        name="comprobante"
                        value="FACTURA"
                        checked={tipoComprobante === 'FACTURA'}
                        onChange={(e) => setTipoComprobante(e.target.value as 'BOLETA' | 'FACTURA')}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium text-gray-700">Factura</p>
                        <p className="text-xs text-gray-500">Para empresas (requiere RUC)</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">Importante</p>
                  <p className="text-xs">
                    Al hacer clic en &quot;Continuar al Pago&quot; se creará su trámite y se guardarán los datos del comprobante.
                    Luego podrá realizar el pago a través de MercadoPago.
                  </p>
                </div>

                <button
                  onClick={guardarComprobanteYAvanzar}
                  disabled={loading || !email || !nombre}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  id="btn-guardar-comprobante"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando datos...</>
                  ) : (
                    <><FileText className="w-4 h-4" /> Continuar al Pago</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Pago vía MercadoPago */}
          {step === 4 && !pagoConfirmado && (
            <div>
              <h2 className="font-bold text-xl text-gray-800 mb-1">Paso 4: Realizar Pago</h2>
              <p className="text-gray-500 text-sm mb-6">
                El costo de la Licencia Municipal es de <strong className="text-gray-800">S/. 1.80</strong>.
              </p>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-6 mb-6">
                <p className="text-blue-200 text-sm mb-1">Monto a pagar</p>
                <p className="text-5xl font-black mb-1">S/. 1.80</p>
                <p className="text-blue-200 text-sm">Tasa de Licencia Municipal de Funcionamiento</p>
                <hr className="border-blue-500 my-4" />
                <div className="text-sm space-y-1">
                  <p><span className="text-blue-300">Negocio:</span> {negocio?.razonSocial}</p>
                  <p><span className="text-blue-300">RUC:</span> {ruc}</p>
                  <p><span className="text-blue-300">Comprobante:</span> {tipoComprobante === 'BOLETA' ? 'Boleta de Venta' : 'Factura'}</p>
                  <p><span className="text-blue-300">Vigencia:</span> 1 año desde la aprobación</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
                <p className="font-semibold mb-1">Métodos de pago disponibles:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Tarjeta de crédito o débito</li>
                  <li>Yape</li>
                  <li>Pago en efectivo (agentes autorizados)</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button onClick={iniciarPago} disabled={loading} id="btn-pagar" className="btn-primary flex items-center gap-2 flex-1 justify-center">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo a MercadoPago...</>
                  ) : (
                    <><ExternalLink className="w-4 h-4" /> Pagar S/. 1.80</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Pago confirmado exitosamente — Pantalla final */}
          {pagoConfirmado && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="font-bold text-2xl text-gray-800 mb-2">¡Pago Confirmado!</h2>
              <p className="text-gray-500 mb-6">El pago de <strong>S/. 1.80</strong> ha sido procesado correctamente.</p>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 mb-6 text-left">
                <p className="mb-1"><strong>Negocio:</strong> {negocio?.razonSocial}</p>
                <p className="mb-1"><strong>RUC:</strong> {ruc}</p>
                <p className="mb-1"><strong>Comprobante solicitado:</strong> {tipoComprobante === 'BOLETA' ? 'Boleta de Venta' : 'Factura'}</p>
                <p className="mb-1"><strong>Email de notificación:</strong> {email}</p>
                <p className="text-xs text-blue-600 mt-2">
                  Su {tipoComprobante === 'BOLETA' ? 'boleta' : 'factura'} electrónica se generará automáticamente y estará disponible en la sección de detalle del trámite.
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

          {/* Loading intermedio mientras se procesa el pago */}
          {step === 3 && loading && comprobanteGuardado === false && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Creando su trámite y guardando datos...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
