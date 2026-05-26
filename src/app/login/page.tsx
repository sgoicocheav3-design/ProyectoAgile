'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Loader2, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Email o contraseña incorrectos.');
      setLoading(false);
      return;
    }

    // Obtener la sesión para redirigir según el rol
    const { getSession } = await import('next-auth/react');
    const session = await getSession();
    const rol = (session?.user as { rol?: string })?.rol;

    if (rol === 'INSPECTOR') {
      router.push('/inspector/agenda');
    } else if (rol === 'ADMINISTRADOR') {
      router.push('/admin/dashboard');
    } else {
      router.push('/contribuyente/dashboard');
    }
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-900" />
          </div>
          <h1 className="text-white font-black text-2xl">Iniciar Sesión</h1>
          <p className="text-blue-300 text-sm mt-2">
            Portal para Inspectores, Administradores y Contribuyentes con cuenta
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="input-base"
                id="input-email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-base"
                id="input-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              id="btn-login"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Ingresar
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 space-y-3 text-center">
            <p className="text-xs text-gray-400">
              ¿Olvidó su contraseña? Puede recuperarla desde el correo que registró al crear su cuenta.
              Si perdió acceso al correo, contacte a soporte de la Municipalidad.
            </p>
          </div>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-blue-200 text-sm">
            ¿Necesita una licencia?{' '}
            <Link href="/solicitud" className="text-yellow-400 hover:text-yellow-300 font-semibold">
              Iniciar Solicitud →
            </Link>
          </p>
          <p className="text-blue-300 text-sm">
            ¿Ya tiene un trámite?{' '}
            <Link href="/consulta" className="text-white hover:underline">
              Consultar estado con RUC
            </Link>
          </p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-xs">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
