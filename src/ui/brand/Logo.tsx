import { useId, useMemo } from 'react';
import { emblemSvg } from './emblem';
import { cn } from '../components/ui';

export function Emblem({ size = 40, className }: { size?: number; className?: string }) {
  // Cada copia necesita ids propios: si dos SVG comparten ids y uno está oculto, el otro pierde los degradados.
  const uid = useId();
  const svg = useMemo(() => emblemSvg({ prefix: `um${uid}` }), [uid]);
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 drop-shadow-sm [&>svg]:h-full [&>svg]:w-full', className)}
      style={{ width: size, height: size }}
      // SVG propio y constante, generado en emblem.ts (no contiene datos del usuario).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function Logo({ size = 40, light = false, className }: { size?: number; light?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} aria-label="URRIZPE MUS">
      <Emblem size={size} />
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
