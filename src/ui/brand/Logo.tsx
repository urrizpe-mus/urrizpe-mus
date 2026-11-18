import { useId, useMemo } from 'react';
import { cardSvg } from './emblem';
import { cn } from '../components/ui';

/**
 * El naipe del logo (proporción de carta real). Por debajo de 72 px de alto
 * se usa la versión simplificada, que se lee bien en tamaños pequeños.
 */
export function Emblem({ size = 40, className, tilt = -6 }: { size?: number; className?: string; tilt?: number }) {
  // Cada copia necesita ids propios: si dos SVG comparten ids y uno está oculto, el otro pierde los degradados.
  const uid = useId();
  const small = size < 72;
  const svg = useMemo(() => cardSvg({ prefix: `um${uid}`, small, tilt }), [uid, small, tilt]);
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 [&>svg]:h-full [&>svg]:w-full', className)}
      style={{ width: Math.round(size * 0.7), height: size }}
      // SVG propio y constante, generado en emblem.ts (no contiene datos del usuario).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function Logo({ size = 40, light = false, className }: { size?: number; light?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} aria-label="URRIZPE MUS">
      <Emblem size={Math.round(size * 1.2)} />
      <span className="flex flex-col leading-none" aria-hidden>
        <span className={cn('font-display font-semibold tracking-[0.16em]', light ? 'text-cream-50' : 'text-bottle-900')} style={{ fontSize: size * 0.42 }}>
          URRIZPE
        </span>
        <span className="mt-1 flex items-center gap-1.5 font-sans font-extrabold tracking-[0.42em] text-gold-500" style={{ fontSize: size * 0.27 }}>
          <span className="h-px w-3 bg-gold-500/70" />
          MUS
        </span>
      </span>
    </span>
  );
}
