'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === 'CredentialsSignin'
        ? 'Email o contraseña incorrectos.'
        : result.error
      );
      setLoading(false);
      return;
    }

    // Redirigir según rol (la sesión ya tiene el rol)
    const sessionRes = await fetch('/api/auth/session');
    const session = await sessionRes.json();
    const rol = session?.user?.rol;

    if (rol === 'INSPECTOR') router.push('/inspector/agenda');
    else if (rol === 'ADMINISTRADOR') router.push('/admin/dashboard');
    else router.push('/contribuyente/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-blue-900" />
          </div>
          <h1 className="text-white font-black text-2xl">Municipalidad de Trujillo</h1>
          <p className="text-blue-300 text-sm mt-1">Sistema de Licencias Municipales</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-gray-800 font-bold text-xl mb-6">Iniciar Sesión</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="input-base"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              id="btn-login"
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tiene una cuenta?{' '}
            <Link href="/registro" className="text-blue-700 font-semibold hover:underline">
              Regístrese aquí
            </Link>
          </p>
        </div>

        {/* Demo credentials notice */}
        <div className="mt-4 bg-blue-800/50 border border-blue-600/50 rounded-xl p-4 text-sm text-blue-200">
          <p className="font-semibold text-yellow-300 mb-2">👤 Cuentas de demostración:</p>
          <div className="space-y-1 font-mono text-xs">
            <p>Contribuyente: <span className="text-white">contribuyente@demo.pe</span> / <span className="text-white">Demo1234!</span></p>
            <p>Inspector: <span className="text-white">inspector@demo.pe</span> / <span className="text-white">Demo1234!</span></p>
            <p>Admin: <span className="text-white">admin@demo.pe</span> / <span className="text-white">Demo1234!</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
