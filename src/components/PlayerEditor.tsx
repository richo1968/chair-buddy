import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Player } from '@/types';
import { newId } from '@/lib/game';

interface Props {
  players: Player[];
  onChange: (players: Player[]) => void;
  accent: string;
}

export function PlayerEditor({ players, onChange, accent }: Props) {
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNum, setEditNum] = useState('');
  const [editName, setEditName] = useState('');

  const add = () => {
    const cleanNum = num.trim();
    if (!cleanNum) return;
    onChange([
      ...players,
      {
        id: newId(),
        number: cleanNum,
        name: name.trim() || undefined
      }
    ]);
    setNum('');
    setName('');
  };

  const remove = (id: string) => {
    onChange(players.filter(p => p.id !== id));
  };

  const startEdit = (p: Player) => {
    setEditingId(p.id);
    setEditNum(p.number);
    setEditName(p.name ?? '');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const cleanNum = editNum.trim();
    if (!cleanNum) return;
    onChange(
      players.map(p =>
        p.id === editingId
          ? { ...p, number: cleanNum, name: editName.trim() || undefined }
          : p
      )
    );
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end">
        <div className="w-24">
          <label className="block text-xs text-muted-fg mb-1">Jersey #</label>
          <input
            type="text"
            inputMode="numeric"
            value={num}
            onChange={e => setNum(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="00"
            maxLength={3}
            className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3 font-mono text-lg text-center"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-muted-fg mb-1">Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="e.g. Jones"
            className="h-12 w-full rounded-xl bg-surface-hi border border-border px-3"
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!num.trim()}
          aria-label="Add player"
          className={cn(
            'h-12 w-12 rounded-xl flex items-center justify-center text-bg font-bold',
            'active:brightness-110 transition-none disabled:opacity-40'
          )}
          style={{ backgroundColor: accent }}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {players.length === 0 ? (
        <div className="text-sm text-muted-fg italic py-2">
          No players yet — add mid-game if you like.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {players.map(p =>
            editingId === p.id ? (
              <div
                key={p.id}
                className="flex items-center gap-1 rounded-xl bg-surface-hi border border-accent p-1"
              >
                <input
                  type="text"
                  value={editNum}
                  onChange={e => setEditNum(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  className="h-10 w-14 rounded-lg bg-bg border border-border px-2 font-mono text-center"
                  autoFocus
                  maxLength={3}
                />
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  placeholder="Name"
                  className="h-10 w-32 rounded-lg bg-bg border border-border px-2"
                />
                <button
                  type="button"
                  onClick={saveEdit}
                  aria-label="Save"
                  className="h-10 w-10 rounded-lg bg-success text-bg flex items-center justify-center active:brightness-110 transition-none"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  aria-label="Cancel"
                  className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center active:brightness-125 transition-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-xl bg-surface-hi border border-border pl-3 pr-1 py-1 min-h-[44px]"
              >
                <span className="font-mono font-bold">#{p.number}</span>
                {p.name && <span className="text-muted-fg">{p.name}</span>}
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  aria-label={`Edit #${p.number}`}
                  className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center active:brightness-125 transition-none"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={`Remove #${p.number}`}
                  className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center active:bg-danger active:text-white transition-none"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
