import Link from 'next/link';

export default function ModalAccesoInspector() {
  return (
    <Link
      href="/inspector/acceso"
      className="px-4 py-2 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-white/10 transition text-sm font-medium"
    >
      Soy Inspector / Admin
    </Link>
  );
}
