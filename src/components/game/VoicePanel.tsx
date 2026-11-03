import { useEffect, useRef, useState } from 'react';
import { Check, Mic, MicOff, Sparkles, X } from 'lucide-react';
import type { Game, Side } from '@/types';
import { Button } from '@/components/ui/Button';
import { Voice, interpretInstructions, voiceSupported } from '@/lib/voice/voice';
import {
  describeAction,
  looksLikeCommand,
  normalise,
  parseCommand,
  recognitionHints,
  teamLabel,
  type VoiceAction
} from '@/lib/voice/parse';
import { cn } from '@/lib/utils';

interface Pending {
  id: number;
  transcript: string;
  actions: VoiceAction[];
  problems: string[];
  viaAI: boolean;
}

interface Props {
  game: Game;
  /** Called as soon as a timeout is heard, so the 1-minute timer starts immediately. */
  onTimeoutHeard: (side: Side) => void;
  /** Called when a heard timeout is cancelled in the pop-up. */
  onTimeoutCancelled: () => void;
  onConfirm: (actions: VoiceAction[], transcript: string) => void;
  onLog: (transcript: string, proposed: string[], outcome: 'confirmed' | 'cancelled' | 'not-understood') => void;
}

const YES = /^(yes|yep|yeah|confirm|confirmed|correct|ok|okay|good|that s right|thats right)\b/;
const NO = /^(no|nope|cancel|wrong|scratch that|delete that|undo)\b/;

/**
 * Chair Buddy Pro voice entry: a big listen toggle, the live transcript, and
 * a confirmation card for every spoken command. Nothing is written to the
 * game until the chair confirms (by tapping, or by saying "yes").
 */
export function VoicePanel({ game, onTimeoutHeard, onTimeoutCancelled, onConfirm, onLog }: Props) {
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Pending[]>([]);
  const nextId = useRef(1);

  // Listener callbacks are registered once; read live values through refs.
  const gameRef = useRef(game);
  gameRef.current = game;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const propsRef = useRef({ onTimeoutHeard, onTimeoutCancelled, onConfirm, onLog });
  propsRef.current = { onTimeoutHeard, onTimeoutCancelled, onConfirm, onLog };

  const confirm = (p: Pending) => {
    setQueue(q => q.filter(x => x.id !== p.id));
    if (p.actions.length) {
      propsRef.current.onConfirm(p.actions, p.transcript);
      propsRef.current.onLog(p.transcript, p.actions.map(a => describeAction(a, gameRef.current)), 'confirmed');
    }
  };

  const cancel = (p: Pending) => {
    setQueue(q => q.filter(x => x.id !== p.id));
    if (p.actions.some(a => a.kind === 'timeout')) propsRef.current.onTimeoutCancelled();
    propsRef.current.onLog(
      p.transcript,
      p.actions.map(a => describeAction(a, gameRef.current)),
      p.actions.length ? 'cancelled' : 'not-understood'
    );
  };

  const handleUtterance = async (text: string) => {
    setPartial('');
    const said = normalise(text);
    const head = queueRef.current[0];
    if (head) {
      if (YES.test(said) && head.actions.length) return confirm(head);
      if (NO.test(said)) return cancel(head);
    }
    // Ordinary chatter (no command words) is ignored entirely.
    if (!looksLikeCommand(text)) return;

    const g = gameRef.current;
    let result = parseCommand(text, g);
    let viaAI = false;
    if (result.actions.length === 0) {
      // Fall back to Apple Intelligence to tidy the phrasing, where available.
      try {
        const ai = await Voice.interpret({
          text,
          context: interpretInstructions(teamLabel(g, 'A'), teamLabel(g, 'B'))
        });
        if (ai.available && ai.text && !/^none\b/i.test(ai.text.trim())) {
          const retry = parseCommand(ai.text.replace(/\n/g, '. '), g);
          if (retry.actions.length) {
            result = retry;
            viaAI = true;
          }
        }
      } catch {
        // No Apple Intelligence — keep the rule-based result.
      }
    }
    for (const a of result.actions) {
      if (a.kind === 'timeout') propsRef.current.onTimeoutHeard(a.side);
    }
    setQueue(q => [
      ...q,
      { id: nextId.current++, transcript: text, actions: result.actions, problems: result.problems, viaAI }
    ]);
  };
  const handleRef = useRef(handleUtterance);
  handleRef.current = handleUtterance;

  useEffect(() => {
    if (!voiceSupported) return;
    const handles = [
      Voice.addListener('partial', d => setPartial(d.text)),
      Voice.addListener('utterance', d => void handleRef.current(d.text)),
      Voice.addListener('error', d => setError(d.message))
    ];
    return () => {
      handles.forEach(h => void h.then(x => x.remove()));
      void Voice.stop();
    };
  }, []);

  const toggle = async () => {
    setError(null);
    if (listening) {
      setListening(false);
      setPartial('');
      await Voice.stop();
      return;
    }
    setStarting(true);
    try {
      const access = await Voice.requestAccess();
      if (!access.granted) {
        setError(
          access.reason === 'microphone'
            ? 'Microphone access is off. Turn it on in Settings › Chair Buddy.'
            : 'Speech recognition is off. Turn it on in Settings › Chair Buddy.'
        );
        return;
      }
      await Voice.start({ hints: recognitionHints(gameRef.current) });
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  };

  const head = queue[0];

  if (!voiceSupported) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted-fg">
        Voice entry (Pro) works in the Chair Buddy iPad app.
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={starting}
        className={cn(
          'w-full rounded-2xl border-2 flex-1 min-h-[96px] flex flex-col items-center justify-center gap-1 px-4 py-3',
          'active:brightness-110 transition-none',
          listening
            ? 'bg-danger/20 border-danger text-fg'
            : 'bg-surface-hi border-border text-fg'
        )}
        aria-pressed={listening}
      >
        <div className="flex items-center gap-3">
          {listening ? (
            <span className="relative flex w-9 h-9 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-danger/40 animate-ping" />
              <Mic className="relative w-7 h-7 text-danger" strokeWidth={2.5} />
            </span>
          ) : (
            <MicOff className="w-7 h-7 text-muted-fg" strokeWidth={2.25} />
          )}
          <span className="text-2xl font-bold">
            {starting ? 'Starting…' : listening ? 'Listening — tap to stop' : 'Tap to listen'}
          </span>
          <span className="ml-1 px-2 py-0.5 rounded-md bg-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest">
            Pro
          </span>
        </div>
        <div className="text-xs text-muted-fg min-h-[1rem] truncate max-w-full">
          {error ? (
            <span className="text-danger">{error}</span>
          ) : listening ? (
            partial ? `“${partial}”` : 'Say e.g. “foul white 4 at 3:12” · “timeout black” · “arrow white”'
          ) : (
            'Voice entry for fouls, timeouts, arrow, warnings and scores'
          )}
        </div>
      </button>

      {head && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pointer-events-none">
          <div className="pointer-events-auto w-[640px] max-w-[95vw] rounded-3xl border-2 border-accent bg-surface shadow-2xl">
            <div className="px-5 pt-4 pb-2 flex items-center gap-2 text-xs text-muted-fg uppercase tracking-widest">
              <Mic className="w-3.5 h-3.5 text-accent" />
              Heard
              {head.viaAI && (
                <span className="flex items-center gap-1 normal-case tracking-normal text-accent">
                  <Sparkles className="w-3 h-3" /> Apple Intelligence
                </span>
              )}
              {queue.length > 1 && <span className="ml-auto">+{queue.length - 1} more waiting</span>}
            </div>
            <div className="px-5 text-base italic text-muted-fg">“{head.transcript}”</div>
            <div className="px-5 py-3 space-y-2">
              {head.actions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-lg font-semibold">
                  <Check className="w-5 h-5 mt-1 text-accent shrink-0" />
                  {describeAction(a, game)}
                </div>
              ))}
              {head.problems.map((p, i) => (
                <div key={`p${i}`} className="text-sm text-warn">
                  {p}
                </div>
              ))}
              {head.actions.length === 0 && head.problems.length === 0 && (
                <div className="text-sm text-warn">Didn't catch a command in that.</div>
              )}
            </div>
            <div className="px-5 pb-4 flex gap-3">
              <Button variant="ghost" size="xl" className="flex-1" onClick={() => cancel(head)}>
                <X className="w-5 h-5" />
                {head.actions.length ? 'Cancel' : 'Dismiss'}
              </Button>
              {head.actions.length > 0 && (
                <Button size="xl" className="flex-[2]" onClick={() => confirm(head)}>
                  <Check className="w-5 h-5" />
                  Confirm
                </Button>
              )}
            </div>
            {listening && head.actions.length > 0 && (
              <div className="px-5 pb-3 -mt-2 text-[11px] text-muted-fg text-center">
                Or say “yes” to confirm, “no” to cancel
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
