'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface MpInstance {
  bricks: () => {
    create: (
      type: 'wallet',
      container: string,
      config: {
        initialization: { preferenceId: string };
        callbacks?: {
          onReady?: () => void;
          onSubmit?: () => void;
          onError?: (error: unknown) => void;
        };
      }
    ) => Promise<void>;
  };
}

interface MpConstructor {
  new (publicKey: string, options?: { locale: string }): MpInstance;
}

declare global {
  interface Window {
    MercadoPago: MpConstructor;
  }
}

interface MpWalletBrickProps {
  preferenceId: string;
  publicKey: string;
  onPaymentInit?: () => void;
  onError?: (error: string) => void;
}

export default function MpWalletBrick({
  preferenceId,
  publicKey,
  onPaymentInit,
  onError,
}: MpWalletBrickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    let mpInstance: MpInstance | null = null;

    async function initWallet() {
      try {
        if (!document.querySelector('script[src*="sdk.mercadopago"]')) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('No se pudo cargar el SDK de MercadoPago'));
            document.head.appendChild(script);
          });
        } else {
          // Esperar a que el script ya cargado esté listo
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        if (!window.MercadoPago) {
          throw new Error('SDK de MercadoPago no disponible');
        }

        mpInstance = new window.MercadoPago(publicKey, { locale: 'es-PE' });

        const bricks = mpInstance.bricks();

        await bricks.create('wallet', `wallet-brick-${preferenceId}`, {
          initialization: { preferenceId },
          callbacks: {
            onReady: () => {
              setLoading(false);
            },
            onSubmit: () => {
              onPaymentInit?.();
            },
            onError: (err) => {
              console.error('[WalletBrick] Error:', err);
              setError('Error al procesar el pago.');
              onError?.('Error al procesar el pago.');
            },
          },
        });
      } catch (err) {
        console.error('[WalletBrick] Init error:', err);
        setError(err instanceof Error ? err.message : 'Error al inicializar pago');
        onError?.(err instanceof Error ? err.message : 'Error al inicializar pago');
        setLoading(false);
      }
    }

    initWallet();

    return () => {
      mpInstance = null;
    };
  }, [preferenceId, publicKey, onPaymentInit, onError]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparando opciones de pago...
        </div>
      )}
      <div
        id={`wallet-brick-${preferenceId}`}
        ref={containerRef}
        className={loading ? 'hidden' : ''}
      />
    </div>
  );
}
