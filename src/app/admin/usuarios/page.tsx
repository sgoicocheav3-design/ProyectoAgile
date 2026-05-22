import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Users, Shield, Plus, UserCheck, Loader2 } from 'lucide-react';
import { RolUsuario } from '@prisma/client';

export default async function AdminUsuariosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.rol !== 'ADMINISTRADOR') redirect('/login');

  const usuarios = await prisma.usuario.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { inspecciones: true },
      },
    },
  });

  const rolColor: Record<RolUsuario, string> = {
    ADMINISTRADOR: 'bg-purple-100 text-purple-800',
    INSPECTOR: 'bg-blue-100 text-blue-800',
    CONTRIBUYENTE: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/admin/dashboard" className="text-blue-300 text-xs hover:text-white">← Dashboard</Link>
            <h1 className="font-bold text-lg">Gestión de Usuarios</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Todos los Usuarios ({usuarios.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Nombre</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">DNI</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Rol</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Activo</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Registro</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-800">{u.nombre}</td>
                    <td className="py-3 px-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="py-3 px-3 text-gray-400 font-mono text-xs">{u.dni || '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${rolColor[u.rol]}`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('es-PE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
