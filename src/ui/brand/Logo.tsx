import fanUrl from './generated/fan.webp';
import logoFullUrl from './generated/logo-full.webp';
import { cn } from '../components/ui';

/**
 * Identidad de URRIZPE MUS: los cuatro reyes de la baraja española (dibujo
 * propio, generado por scripts/brand). Se usan como imágenes para que cada
 * copia sea independiente y quede guardada para el uso sin conexión.
 */

/** Abanico de los cuatro reyes. `size` es el alto en píxeles. */
export function Emblem({ size = 40, className }: { size?: number; className?: string }) {
  return <img src={fanUrl} alt="" aria-hidden width={Math.round(size * 2.05)} height={size} className={cn('inline-block shrink-0 object-contain', className)} draggable={false} />;
}

/** Logo completo: los cuatro reyes y la cinta «URRIZPE MUS». `width` en píxeles. */
export function LogoFull({ width = 320, className }: { width?: number; className?: string }) {
  return <img src={logoFullUrl} alt="URRIZPE MUS" width={width} height={Math.round(width * 0.66)} className={cn('block h-auto max-w-full object-contain', className)} draggable={false} />;
}

/** Abanico + nombre, para la barra lateral y la cabecera. */
export function Logo({ size = 40, light = false, className }: { size?: number; light?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} aria-label="URRIZPE MUS">
      <Emblem size={Math.round(size * 1.05)} />
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
