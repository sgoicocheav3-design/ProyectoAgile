import Link from 'next/link';
import {
  Shield, Search, FileText, CreditCard, ClipboardCheck, LogIn
} from 'lucide-react';
import ModalAccesoInspector from '@/components/inspector/modal-acceso-inspector';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <header className="bg-blue-950/50 backdrop-blur-sm border-b border-blue-700/30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-900" />
            </div>
            <div>
              <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">
                Municipalidad Provincial de Trujillo
              </p>
              <h1 className="text-white font-bold text-lg leading-tight">
                Sistema de Licencias Municipales
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-white bg-blue-700/50 border border-blue-400/30 rounded-lg hover:bg-blue-700/70 transition text-sm font-medium flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
            </Link>
            <ModalAccesoInspector />
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
          <span className="text-yellow-300 text-sm font-medium">Sistema 100% Digital y Automatizado</span>
        </div>
        <h2 className="text-5xl font-black text-white mb-6 leading-tight">
          Licencia de Funcionamiento<br />
          <span className="text-yellow-400">Municipal de Trujillo</span>
        </h2>
        <p className="text-blue-200 text-xl max-w-2xl mx-auto mb-10">
          Solicita tu Licencia de Funcionamiento de forma 100% digital.
          Sin colas, sin papeleos innecesarios.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/solicitud"
            className="px-10 py-5 bg-yellow-400 text-blue-900 rounded-2xl font-black text-xl hover:bg-yellow-300 transition-all shadow-lg hover:shadow-yellow-400/30 hover:-translate-y-1 flex items-center justify-center gap-3"
            id="btn-iniciar-solicitud"
          >
            <FileText className="w-6 h-6" />
            Iniciar Solicitud de Licencia
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h3 className="text-white font-black text-3xl text-center mb-12">
          ¿Cómo funciona?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: <Search className="w-8 h-8" />, n: '1', label: 'Valida tu RUC', desc: 'Verificamos en SUNAT que tu negocio esté activo y habido en Trujillo.', color: 'from-blue-500 to-blue-600' },
            { icon: <FileText className="w-8 h-8" />, n: '2', label: 'Sube documentos', desc: 'Adjunta el plano de tu local en PDF o imagen.', color: 'from-emerald-500 to-emerald-600' },
            { icon: <CreditCard className="w-8 h-8" />, n: '3', label: 'Paga S/. 180', desc: 'Pago seguro por MercadoPago. Inspección se agenda automáticamente.', color: 'from-purple-500 to-purple-600' },
            { icon: <ClipboardCheck className="w-8 h-8" />, n: '4', label: 'Recibe tu licencia', desc: 'Tras la inspección aprobada, descarga tu licencia PDF con QR.', color: 'from-orange-500 to-orange-600' },
          ].map((step, i) => (
            <div
              key={i}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-center animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white mx-auto mb-4`}>
                {step.icon}
              </div>
              <div className="w-8 h-8 rounded-full bg-yellow-400 text-blue-900 font-black text-lg flex items-center justify-center mx-auto mb-3">
                {step.n}
              </div>
              <h4 className="text-white font-bold text-lg mb-2">{step.label}</h4>
              <p className="text-blue-200 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-blue-950/40 border-t border-blue-700/30 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-white font-bold text-xl mb-4">¿Ya tienes una solicitud en proceso?</h3>
          <p className="text-blue-200 mb-6">
            Ingresa tu número de RUC en la sección de consulta para ver el estado actual de tu trámite.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/consulta"
              className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition border border-white/20 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Consultar con mi RUC
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-blue-950 py-6 text-center text-blue-400 text-sm">
        © 2025 Municipalidad Provincial de Trujillo — Gerencia de Desarrollo Económico
      </footer>
    </main>
  );
}
