import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import bcrypt from 'bcryptjs';
import { RolUsuario } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      nombre: string;
      rol: RolUsuario;
    };
  }
  interface User {
    id: string;
    email: string;
    nombre: string;
    rol: RolUsuario;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    rol: RolUsuario;
    nombre: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credenciales-contribuyente',
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos.');
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!usuario || !usuario.activo) {
          throw new Error('Credenciales inválidas o cuenta desactivada.');
        }

        const passwordOk = await bcrypt.compare(
          credentials.password,
          usuario.passwordHash
        );

        if (!passwordOk) {
          throw new Error('Credenciales inválidas.');
        }

        return {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
        };
      },
    }),
    CredentialsProvider({
      id: 'credencial-inspector',
      name: 'Código de Credencial',
      credentials: {
        codigo: { label: 'Código de Credencial', type: 'text', placeholder: 'Ej. INS-001' },
      },
      async authorize(credentials) {
        if (!credentials?.codigo) {
          throw new Error('El código de credencial es requerido.');
        }

        const usuario = await prisma.usuario.findUnique({
          where: { codigoCredencial: credentials.codigo.trim() },
        });

        if (!usuario || !usuario.activo || usuario.rol !== 'INSPECTOR') {
          throw new Error('Credencial inválida o cuenta desactivada.');
        }

        return {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.rol = user.rol;
        token.nombre = user.nombre;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.rol = token.rol;
      session.user.nombre = token.nombre;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: env.NEXTAUTH_SECRET,
};
