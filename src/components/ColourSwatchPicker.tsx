import { useState } from 'react';
import { Check, Pipette } from 'lucide-react';
import { TEAM_SWATCHES, normaliseHex } from '@/lib/colours';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export function ColourSwatchPicker({ value, onChange }: Props) {
  const [custom, setCustom] = useState('');
  const [error, setError] = useState(false);

  const tryCustom = (raw: string) => {
    setCustom(raw);
    const hex = normaliseHex(raw);
    if (hex) {
      onChange(hex);
      setError(false);
    } else if (raw.length > 0) {
      setError(true);
    } else {
      setError(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-2">
        {TEAM_SWATCHES.map(hex => {
          const active = hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              aria-label={hex}
              style={{ backgroundColor: hex }}
              className={cn(
                'h-14 rounded-xl border-2 flex items-center justify-center',
                'active:brightness-125 transition-none',
                active ? 'border-fg' : 'border-transparent'
              )}
            >
              {active && (
                <Check
                  className="w-6 h-6"
                  style={{
                    color: hex === '#ffffff' ? '#000' : '#fff',
                    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))'
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#888888'}
          onChange={e => onChange(e.target.value.toLowerCase())}
          className="w-14 h-14 rounded-xl bg-surface-hi border border-border cursor-pointer p-1"
          aria-label="Custom colour"
        />
        <div className="flex-1 relative">
          <Pipette className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
          <input
            type="text"
            placeholder="#RRGGBB"
            value={custom}
            onChange={e => tryCustom(e.target.value)}
            className={cn(
              'h-14 w-full rounded-xl bg-surface-hi border pl-9 pr-3 font-mono',
              error ? 'border-danger' : 'border-border'
            )}
          />
        </div>
      </div>
    </div>
  );
}
