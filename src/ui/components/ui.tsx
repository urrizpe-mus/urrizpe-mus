/**
 * Componentes base (estilo shadcn/ui: propios, sin dependencias extra).
 * Se han escrito a mano en lugar de usar la CLI de shadcn para no añadir
 * Radix y una docena de paquetes para cinco componentes sencillos.
 */
import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-bottle-800 text-cream-50 hover:bg-bottle-700 active:bg-bottle-900 shadow-sm',
  gold: 'bg-gold-500 text-bottle-950 hover:bg-gold-400 active:bg-gold-600 shadow-sm',
  outline: 'border border-bottle-800/25 bg-cream-50 text-bottle-900 hover:border-bottle-800/50 hover:bg-white',
  ghost: 'text-bottle-900 hover:bg-bottle-800/8',
  danger: 'bg-wine-600 text-white hover:bg-wine-700',
  subtle: 'bg-bottle-800/8 text-bottle-900 hover:bg-bottle-800/14',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-13 px-5 text-base gap-2.5 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export function Card({ className, children, as: As = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' | 'li' }) {
  return <As className={cn('min-w-0 rounded-2xl border border-bottle-900/10 bg-cream-50 shadow-[var(--shadow-card)]', className)}>{children}</As>;
}

type Tone = 'neutral' | 'green' | 'gold' | 'wine' | 'dark';
const tones: Record<Tone, string> = {
  neutral: 'bg-ink-800/7 text-ink-700',
  green: 'bg-bottle-500/14 text-bottle-800',
  gold: 'bg-gold-500/20 text-gold-700',
  wine: 'bg-wine-600/12 text-wine-700',
  dark: 'bg-bottle-900 text-gold-300',
};
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide whitespace-nowrap', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && <p className="text-xs font-semibold text-wine-600">{error}</p>}
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-bottle-900/15 bg-white px-3.5 text-[16px] text-ink-900 placeholder:text-ink-400 transition focus:border-bottle-600 focus:ring-2 focus:ring-bottle-500/20 focus:outline-none';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputClass, 'h-11', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputClass, 'py-2.5 leading-relaxed', className)} {...rest} />;
});

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span className="text-[15px] text-ink-800">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-bottle-700' : 'bg-ink-400/50')}
      >
        <span className={cn('absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
    </label>
  );
}

/**
 * Diálogo modal accesible. En móvil aparece como hoja inferior; en
 * pantallas grandes, centrado. Escape y el fondo lo cierran.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select');
      (first ?? panel.current)?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade bg-bottle-950/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'safe-bottom relative flex max-h-[92dvh] w-full animate-deal flex-col rounded-t-3xl bg-cream-50 shadow-2xl outline-none sm:rounded-3xl',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-bottle-900/10 px-5 pt-5 pb-4">
          <h2 id={titleId} className="text-xl leading-tight font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="-m-1.5 rounded-full p-1.5 text-ink-500 hover:bg-bottle-800/8">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-bottle-900/10 px-5 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-bottle-900/20 bg-cream-50/60 px-6 py-12 text-center">
      {icon && <div className="text-gold-600">{icon}</div>}
      <p className="font-display text-lg text-bottle-900">{title}</p>
      {text && <p className="max-w-md text-sm text-ink-500">{text}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-bold tracking-[0.14em] text-gold-600 uppercase">{eyebrow}</p>}
        <h1 className="text-[28px] leading-tight font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Notice({ tone = 'gold', icon, children }: { tone?: 'gold' | 'green' | 'wine'; icon?: ReactNode; children: ReactNode }) {
  const t = { gold: 'border-gold-500/40 bg-gold-100/60 text-gold-700', green: 'border-bottle-500/30 bg-bottle-50 text-bottle-800', wine: 'border-wine-600/30 bg-wine-50 text-wine-700' }[tone];
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-snug', t)} role="note">
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}
