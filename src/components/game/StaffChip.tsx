import { cn } from '@/lib/utils';

interface Props {
  label: 'COACH' | 'BENCH';
  techs: number;
  ejected?: boolean;
  warning?: boolean;
  jerseyColour: string;
  numberColour: string;
  onClick: () => void;
}

export function StaffChip({
  label,
  techs,
  ejected = false,
  warning = false,
  jerseyColour,
  numberColour,
  onClick
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-2xl px-3 py-2 text-left min-h-tap',
        'active:brightness-110 transition-none',
        ejected
          ? 'border-4 border-danger'
          : warning
            ? 'border-4 border-warn'
            : 'border-2 border-border'
      )}
      style={{ backgroundColor: jerseyColour, color: numberColour }}
    >
      <div className="text-[10px] uppercase tracking-widest font-semibold opacity-75">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono font-black text-xl leading-none">
          {techs}T
        </span>
        {ejected && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger text-white"
          >
            EJECTED
          </span>
        )}
      </div>
    </button>
  );
}
