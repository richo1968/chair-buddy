import { Delete, Eraser, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DEFAULT_CLOCK = '10:00';
export const ZERO_CLOCK = '00:00';

export function isValidGameClock(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [mm, ss] = value.split(':').map(Number);
  return mm >= 0 && mm <= 12 && ss >= 0 && ss <= 59;
}

function toBuffer(value: string): string {
  const match = /^(\d{0,2}):?(\d{0,2})$/.exec(value);
  if (!match) return '0000';
  const mm = (match[1] ?? '').padStart(2, '0').slice(-2);
  const ss = (match[2] ?? '').padStart(2, '0').slice(-2);
  return `${mm}${ss}`;
}

function fromBuffer(buf: string): string {
  const padded = buf.padStart(4, '0').slice(-4);
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
}

interface GameClockInputProps {
  value: string;
  onChange: (value: string) => void;
  size?: 'md' | 'lg';
  className?: string;
}

export function GameClockInput({
  value,
  onChange,
  size = 'lg',
  className
}: GameClockInputProps) {
  const buffer = toBuffer(value);
  const valid = isValidGameClock(value);

  const pushDigit = (digit: string) => {
    const next = (buffer + digit).slice(-4);
    onChange(fromBuffer(next));
  };
  const backspace = () => {
    const next = ('0' + buffer).slice(0, 4);
    onChange(fromBuffer(next));
  };
  const clear = () => onChange(ZERO_CLOCK);
  const quickReset = () => onChange(DEFAULT_CLOCK);

  const displaySizeCls =
    size === 'lg'
      ? 'text-[72px] py-3 leading-none'
      : 'text-5xl py-2 leading-none';

  return (
    <div className={cn('flex flex-col gap-3 select-none', className)}>
      <div
        aria-live="polite"
        className={cn(
          'rounded-2xl border-2 flex items-center justify-center',
          'font-mono font-bold tracking-wider tabular-nums',
          displaySizeCls,
          valid
            ? 'bg-surface-hi border-border text-fg'
            : 'bg-surface-hi border-danger text-danger'
        )}
      >
        {fromBuffer(buffer)}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <KeypadButton key={d} onClick={() => pushDigit(d)} label={d}>
            {d}
          </KeypadButton>
        ))}
        <KeypadButton onClick={backspace} label="Backspace" tone="muted">
          <Delete className="w-7 h-7" strokeWidth={2.25} />
        </KeypadButton>
        <KeypadButton onClick={() => pushDigit('0')} label="0">
          0
        </KeypadButton>
        <KeypadButton onClick={clear} label="Clear to 00:00" tone="muted">
          <Eraser className="w-6 h-6" strokeWidth={2.25} />
        </KeypadButton>
      </div>

      <button
        type="button"
        onClick={quickReset}
        className={cn(
          'tap-target rounded-2xl border border-border bg-surface',
          'flex items-center justify-center gap-2 text-lg font-semibold',
          'active:bg-surface-hi active:brightness-110',
          'transition-none'
        )}
      >
        <RotateCcw className="w-5 h-5" strokeWidth={2.25} />
        Reset to 10:00
      </button>
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  label,
  tone = 'primary'
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tone?: 'primary' | 'muted';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'tap-target h-[72px] rounded-2xl border flex items-center justify-center',
        'text-3xl font-semibold font-mono tabular-nums',
        'active:brightness-125 transition-none',
        tone === 'primary'
          ? 'bg-surface-hi border-border text-fg'
          : 'bg-muted border-border text-muted-fg'
      )}
    >
      {children}
    </button>
  );
}
