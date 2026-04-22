import { cn } from '@/lib/utils';

interface Props {
  jerseyColour: string;
  numberColour: string;
  number?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-10 h-10 text-lg rounded-lg',
  md: 'w-16 h-16 text-3xl rounded-xl',
  lg: 'w-24 h-24 text-5xl rounded-2xl'
};

export function JerseyPreview({
  jerseyColour,
  numberColour,
  number = '7',
  size = 'md',
  className
}: Props) {
  return (
    <div
      className={cn(
        'flex items-center justify-center font-mono font-black border-2 border-border shadow-inner',
        sizes[size],
        className
      )}
      style={{ backgroundColor: jerseyColour, color: numberColour }}
      aria-label={`Jersey preview ${number}`}
    >
      {number}
    </div>
  );
}
