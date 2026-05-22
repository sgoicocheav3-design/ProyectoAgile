import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import Link from 'next/link';
import { Building2, Shield, Users, BarChart3 } from 'lucide-react';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Redirigir según rol si ya tiene sesión
  if (session) {
    if (session.user.rol === 'INSPECTOR') redirect('/inspector/agenda');
    if (session.user.rol === 'ADMINISTRADOR') redirect('/admin/dashboard');
    redirect('/contribuyente/dashboard');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      {/* Header */}
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
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition text-sm font-medium"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/registro"
              className="px-4 py-2 bg-yellow-400 text-blue-900 rounded-lg hover:bg-yellow-300 transition text-sm font-bold"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
          <span className="text-yellow-300 text-sm font-medium">Sistema 100% Digital y Automatizado</span>
        </div>
        <h2 className="text-5xl font-black text-white mb-6 leading-tight">
          Obtén tu Licencia Municipal<br />
          <span className="text-yellow-400">desde cualquier lugar</span>
        </h2>
        <p className="text-blue-200 text-xl max-w-2xl mx-auto mb-10">
          Tramita tu Licencia de Funcionamiento de forma 100% digital.
          Validación SUNAT en tiempo real, pago seguro y seguimiento en línea.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/registro"
            className="px-8 py-4 bg-yellow-400 text-blue-900 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all shadow-lg hover:shadow-yellow-400/30 hover:-translate-y-0.5"
          >
            Iniciar Trámite →
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-white/10 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all border border-white/20"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Building2 className="w-8 h-8" />,
              title: 'Validación SUNAT Real',
              desc: 'Tu RUC se verifica en tiempo real contra la base de datos de SUNAT. Solo negocios activos y habidos en Trujillo.',
              color: 'from-blue-500 to-blue-600',
            },
            {
              icon: <Shield className="w-8 h-8" />,
              title: 'Pago Seguro Integrado',
              desc: 'Pasarela de pago certificada por S/. 180.00. Recibe confirmación instantánea y agenda tu inspección automáticamente.',
              color: 'from-emerald-500 to-emerald-600',
            },
            {
              icon: <BarChart3 className="w-8 h-8" />,
              title: 'Licencia PDF con QR',
              desc: 'Una vez aprobado, descarga tu licencia oficial en PDF con código QR único verificable. Vigencia de 1 año.',
              color: 'from-purple-500 to-purple-600',
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4`}>
                {f.icon}
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-blue-200 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Proceso */}
      <section className="bg-blue-950/40 border-t border-blue-700/30 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h3 className="text-white font-black text-3xl text-center mb-12">
            ¿Cómo funciona el proceso?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { n: '1', label: 'Valida tu RUC' },
              { n: '2', label: 'Sube tu plano' },
              { n: '3', label: 'Paga S/. 180' },
              { n: '4', label: 'Inspección técnica' },
              { n: '5', label: 'Descarga licencia' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-yellow-400 text-blue-900 font-black text-xl flex items-center justify-center mx-auto mb-2">
                  {step.n}
                </div>
                <p className="text-blue-200 text-sm font-medium">{step.label}</p>
                {i < 4 && (
                  <div className="hidden md:block absolute mt-[-28px] ml-[64px] text-yellow-400 font-bold text-xl">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-blue-950 py-6 text-center text-blue-400 text-sm">
        © 2025 Municipalidad Provincial de Trujillo — Gerencia de Desarrollo Económico
      </footer>
    </main>
  );
}
