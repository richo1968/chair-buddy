import { useMemo, useState, useRef } from 'react';
import { ClipboardPaste, FileUp, AlertCircle, Camera, Check, Image as ImageIcon } from 'lucide-react';
import { isIOS, scanTeamSheet } from '@/lib/native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { newId } from '@/lib/game';
import {
  classifyRows,
  parseRoster,
  type RowStatus
} from '@/lib/playerParser';
import type { Player } from '@/types';
import { contrastText } from '@/lib/colours';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  existingPlayers: readonly Player[];
  accent: string;
  onAdd: (players: Player[]) => void;
  /** Pre-filled roster text, e.g. from a scanned team sheet. */
  initialText?: string;
}

export function BulkAddPlayersModal({
  open,
  onClose,
  existingPlayers,
  accent,
  onAdd,
  initialText = ''
}: Props) {
  const [text, setText] = useState(initialText);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);

  const scan = async (source: 'camera' | 'library') => {
    setScanNote(null);
    try {
      const found = await scanTeamSheet(source);
      if (found === null) return;
      if (!found) {
        setScanNote("Couldn't find any player numbers in that photo — try closer, flat and well lit.");
        return;
      }
      setText(prev => (prev.trim() ? `${prev.trim()}\n${found}` : found));
      setScanNote(`Read ${found.split('\n').length} players from the photo — check them below, then Add.`);
    } catch (e) {
      setScanNote(e instanceof Error ? e.message : String(e));
    }
  };

  const existingNumbers = useMemo(
    () => new Set(existingPlayers.map(p => p.number.trim())),
    [existingPlayers]
  );

  const { rows, errors } = useMemo(() => parseRoster(text), [text]);
  const classified = useMemo(
    () => classifyRows(rows, existingNumbers),
    [rows, existingNumbers]
  );

  if (!open) return null;

  const okCount = classified.filter(r => r.status === 'ok').length;
  const dupExisting = classified.filter(
    r => r.status === 'duplicate-existing'
  ).length;
  const dupPaste = classified.filter(r => r.status === 'duplicate-paste')
    .length;

  const onPickFile = async (file: File) => {
    const content = await file.text();
    setText(content);
  };

  const commit = () => {
    const newPlayers: Player[] = classified
      .filter(r => r.status === 'ok')
      .map(r => ({
        id: newId(),
        number: r.number.trim(),
        name: r.name?.trim() || undefined
      }));
    onAdd(newPlayers);
    setText('');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Bulk add players"
      subtitle="Paste a roster — one player per line, in the format “number, name” (commas, tabs, or spaces all work)."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={okCount === 0}
            onClick={commit}
            style={{ backgroundColor: accent, color: contrastText(accent) }}
          >
            <ClipboardPaste className="w-4 h-4" />
            Add {okCount} {okCount === 1 ? 'player' : 'players'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={'3, Lilli Heijkoop\n6, Anneka Tziavas\n7, Charlotte Southam-Clark\n…'}
            rows={10}
            spellCheck={false}
            autoCapitalize="off"
            className="flex-1 rounded-2xl bg-surface-hi border border-border p-3 font-mono text-sm resize-none"
          />
          {isIOS && (
            <div className="shrink-0 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void scan('camera')}
                className="rounded-xl border-2 border-accent bg-accent/15 px-3 py-3 text-xs font-semibold flex flex-col items-center gap-1 active:brightness-125 transition-none"
                title="Photograph a team sheet"
              >
                <Camera className="w-6 h-6" />
                <span>Scan sheet</span>
              </button>
              <button
                type="button"
                onClick={() => void scan('library')}
                className="rounded-xl border border-border bg-muted px-3 py-2 text-xs flex flex-col items-center gap-1 active:brightness-125 transition-none"
                title="Read a team sheet from a photo"
              >
                <ImageIcon className="w-4 h-4" />
                <span>From photo</span>
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-xl border border-border bg-muted px-3 py-2 text-xs flex flex-col items-center gap-1 active:brightness-125 transition-none"
            title="Upload a CSV/TXT file"
          >
            <FileUp className="w-4 h-4" />
            <span>Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
              e.target.value = '';
            }}
          />
        </div>

        {scanNote && <div className="text-sm text-accent">{scanNote}</div>}

        {(rows.length > 0 || errors.length > 0) && (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between text-xs">
              <span className="text-muted-fg uppercase tracking-wider">
                Preview
              </span>
              <span className="font-mono">
                <span className="text-success">{okCount} ok</span>
                {dupExisting + dupPaste > 0 && (
                  <span className="text-warn ml-2">
                    {dupExisting + dupPaste} duplicate
                  </span>
                )}
                {errors.length > 0 && (
                  <span className="text-danger ml-2">
                    {errors.length} error
                  </span>
                )}
              </span>
            </div>
            <ul className="max-h-56 overflow-auto divide-y divide-border/60 text-sm">
              {classified.map((r, i) => (
                <li key={i} className="px-3 py-1.5 flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="font-mono font-bold w-12">#{r.number}</span>
                  <span className="flex-1 truncate text-muted-fg">
                    {r.name || <span className="italic">(no name)</span>}
                  </span>
                  {r.status !== 'ok' && (
                    <span className="text-[11px] text-warn">
                      {r.status === 'duplicate-existing'
                        ? 'already on team'
                        : 'duplicated in paste'}
                    </span>
                  )}
                </li>
              ))}
              {errors.map((e, i) => (
                <li
                  key={`e-${i}`}
                  className="px-3 py-1.5 flex items-center gap-2 bg-danger/5"
                >
                  <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                  <span className="text-xs text-muted-fg w-12">
                    line {e.sourceLine + 1}
                  </span>
                  <span className="flex-1 truncate font-mono text-xs">
                    {e.raw || '(empty)'}
                  </span>
                  <span className="text-[11px] text-danger">{e.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  if (status === 'ok') {
    return (
      <span className="w-5 h-5 rounded-md bg-success/20 text-success flex items-center justify-center shrink-0">
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
        'bg-warn/20 text-warn'
      )}
    >
      <AlertCircle className="w-3 h-3" />
    </span>
  );
}
