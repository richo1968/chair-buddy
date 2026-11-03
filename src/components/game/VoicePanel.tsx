import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Check, Clock, Mic, MicOff, Sparkles, X } from 'lucide-react';
import { isValidGameClock } from '@/components/GameClockInput';
import type { FoulType, Game, Side } from '@/types';
import { Button } from '@/components/ui/Button';
import { Voice, interpretInstructions, voiceSupported } from '@/lib/voice/voice';
import {
  describeAction,
  looksLikeCommand,
  normalise,
  parseCommand,
  recognitionHints,
  teamKeywords,
  extractClock,
  extractFreeThrows,
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

type FoulAction = Extract<VoiceAction, { kind: 'foul' }>;
const isAlt = (a: VoiceAction): a is FoulAction => a.kind === 'foul' && !!a.alternative;

const YES = /^(yes|yep|yeah|confirm|confirmed|correct|ok|okay|good|that s right|thats right)\b/;
const NO = /^(no|nope|cancel|wrong|scratch that|delete that|undo)\b/;
/** "no, black 5" / "actually white 12" — a spoken correction of the pop-up. */
const CORRECTION = /^(?:no|nope|wrong|actually|sorry|correction|i mean|i meant|make that|make it|change (?:that|it) to)\b[\s,]*(.+)$/;

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

  /** Swap the pop-up's actions for corrected ones, keeping what was heard. */
  const replaceHead = (p: Pending, actions: VoiceAction[], said: string) => {
    const hadTimeout = p.actions.find(a => a.kind === 'timeout');
    const hasTimeout = actions.find(a => a.kind === 'timeout');
    if (hadTimeout && !hasTimeout) propsRef.current.onTimeoutCancelled();
    if (hasTimeout && hasTimeout.kind === 'timeout' && (!hadTimeout || hadTimeout.kind !== 'timeout' || hadTimeout.side !== hasTimeout.side)) {
      propsRef.current.onTimeoutHeard(hasTimeout.side);
    }
    setQueue(q =>
      q.map(x =>
        x.id === p.id
          ? { ...x, actions, problems: [], transcript: said ? `${x.transcript} → ${said}` : x.transcript }
          : x
      )
    );
  };

  /** Tap-edit one line of the pop-up. */
  const editAction = (p: Pending, index: number, next: VoiceAction) => {
    const list: VoiceAction[] = p.actions.filter(a => !isAlt(a));
    list[index] = next;
    replaceHead(p, list, '');
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
    const said = text.toLowerCase().replace(/[^a-z0-9:\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const head = queueRef.current[0];
    if (head) {
      if (YES.test(said) && head.actions.length && !head.actions.some(isAlt)) return confirm(head);
      const fix = CORRECTION.exec(said);
      if (fix) {
        const corrected = correctPending(head, fix[1], gameRef.current, 'correct');
        if (corrected) {
          replaceHead(head, corrected, text);
          return;
        }
      }
      if (NO.test(said)) return cancel(head);
      // Add-on in context: "at 3:12", "two shots", "number 5", "black".
      const amended = correctPending(head, text, gameRef.current, 'amend');
      if (amended) {
        replaceHead(head, amended, text);
        return;
      }
    }
    // Ordinary chatter (no command words) is ignored entirely.
    const g = gameRef.current;
    if (!looksLikeCommand(text, g)) return;

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
              {head.actions.filter(a => !isAlt(a)).map((a, i) => (
                <div key={i}>
                  <div className="flex items-start gap-2 text-lg font-semibold">
                    <Check className="w-5 h-5 mt-1 text-accent shrink-0" />
                    {describeAction(a, game)}
                  </div>
                  <QuickFix action={a} onChange={next => editAction(head, i, next)} />
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
            {head.actions.some(isAlt) && (
              <div className="px-5 pb-3">
                <div className="text-sm text-warn mb-2">Which team?</div>
                <div className="flex gap-3">
                  {head.actions.filter(isAlt).map((a, i) => {
                    const team = a.side === 'A' ? game.teamA : game.teamB;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => confirm({ ...head, actions: [...head.actions.filter(x => !isAlt(x)), { ...a, alternative: false } as VoiceAction] })}
                        className="flex-1 rounded-2xl border-4 border-white/70 px-3 py-3 text-lg font-bold active:brightness-110 transition-none"
                        style={{ backgroundColor: team.jerseyColour, color: team.numberColour }}
                      >
                        {describeAction({ ...a, alternative: false } as VoiceAction, game)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="px-5 pb-4 flex gap-3">
              <Button variant="ghost" size="xl" className="flex-1" onClick={() => cancel(head)}>
                <X className="w-5 h-5" />
                {head.actions.length ? 'Cancel' : 'Dismiss'}
              </Button>
              {head.actions.length > 0 && !head.actions.some(isAlt) && (
                <Button size="xl" className="flex-[2]" onClick={() => confirm(head)}>
                  <Check className="w-5 h-5" />
                  Confirm
                </Button>
              )}
            </div>
            {listening && head.actions.length > 0 && (
              <div className="px-5 pb-3 -mt-2 text-[11px] text-muted-fg text-center">
                Say “yes” to confirm · “no” to cancel · add details like “at 3:12” or “two shots” · “no, black 5” to fix
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Applies a spoken correction or add-on to the pending pop-up.
 * - amend (no "no"/"actually"): a pure add-on with no action word, e.g.
 *   "at 3:12", "two shots", "number 5", "black". It fills in or fixes just
 *   that part. Returns null when the phrase has an action word, so a new
 *   command is queued instead.
 * - correct ("no, …"): a different kind of command replaces the pop-up;
 *   the same kind ("no, foul black 5") or a fragment patches it.
 */
export function correctPending(p: Pending, fragment: string, game: Game, mode: 'amend' | 'correct'): VoiceAction[] | null {
  const current: VoiceAction[] = p.actions.filter(a => !isAlt(a));
  const alts = p.actions.filter(isAlt);
  const f = normalise(fragment);
  const actionWord = /\b(foul|technical|unsportsmanlike|disqualifying|timeout|warning|arrow|possession|points?|pointer|free throw|score|protest|jump ball|held ball)\b/.test(f);
  if (mode === 'amend' && actionWord) return null;
  const full = parseCommand(fragment, game);
  const base: VoiceAction | undefined = current[0] ?? (alts[0] && { ...alts[0], alternative: false });
  if (!base) return full.actions.length ? full.actions : null;
  if (mode === 'correct' && full.actions.length && full.actions[0].kind !== base.kind) return full.actions;
  if (current.length > 1) return mode === 'correct' && full.actions.length ? full.actions : null;

  const next = { ...base } as VoiceAction;
  let changed = false;
  const { clock, rest: noClock } = extractClock(f);
  const { fts, rest } = extractFreeThrows(noClock);
  if (clock && 'clock' in next) { (next as { clock: string }).clock = clock; changed = true; }
  const kw = teamKeywords(game);
  const side: Side | null = kw.A.some(k => new RegExp(`\\b${k}\\b`).test(rest)) ? 'A'
    : kw.B.some(k => new RegExp(`\\b${k}\\b`).test(rest)) ? 'B' : null;
  if (side && 'side' in next) { (next as { side: Side }).side = side; changed = true; }
  if (next.kind === 'foul') {
    if (fts !== undefined) { next.freeThrows = fts; changed = true; }
    const t = /\btechnical\b/.test(rest) ? 'technical' : /\bunsportsmanlike\b/.test(rest) ? 'unsportsmanlike'
      : /\bdisqualifying\b/.test(rest) ? 'disqualifying' : /\bpersonal\b/.test(rest) ? 'personal' : null;
    if (t) { next.type = t; changed = true; }
    if (/\bcoach\b/.test(rest)) { next.subject = 'coach'; next.number = undefined; changed = true; }
    if (/\bbench\b/.test(rest)) { next.subject = 'bench'; next.number = undefined; changed = true; }
  }
  if (next.kind === 'score') {
    const pm = /\b([123]) (?:points?|pointer)\b/.exec(rest) ?? (/\bfree throw\b/.test(rest) ? ['', '1'] : null);
    if (pm) { next.points = +pm[1] as 1 | 2 | 3; changed = true; }
  }
  if (next.kind === 'warning') {
    if (/\b(time delay|delay)\b/.test(rest)) { next.warningType = 'time-delay'; changed = true; }
    else if (/\bflop/.test(rest)) { next.warningType = 'flop'; changed = true; }
  }
  const numRest = rest.replace(/\b[123] (?:points?|pointer)\b/g, ' ');
  const num = /\b(\d{1,2})\b/.exec(numRest)?.[1];
  if (num && (next.kind === 'score' || (next.kind === 'foul' && next.subject === 'player'))) {
    next.number = String(+num);
    changed = true;
  }
  if (changed) return [next];
  return mode === 'correct' && full.actions.length ? full.actions : null;
}


const FOUL_TYPES: { t: FoulType; label: string }[] = [
  { t: 'personal', label: 'P' },
  { t: 'technical', label: 'T' },
  { t: 'unsportsmanlike', label: 'U' },
  { t: 'disqualifying', label: 'D' }
];

/** One-tap fixes under a pop-up line: other team, number, foul type, points. */
function QuickFix({ action, onChange }: { action: VoiceAction; onChange: (a: VoiceAction) => void }) {
  const [editingNumber, setEditingNumber] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingClock, setEditingClock] = useState(false);
  const [clockDraft, setClockDraft] = useState('');
  const clockText = clockDraft.padStart(4, '0').replace(/^(\d\d)(\d\d)$/, '$1:$2');
  if (action.kind === 'quarterScore') return null;
  const chip = 'px-3 py-1.5 rounded-lg border border-border bg-surface-hi text-sm font-semibold active:brightness-125 transition-none';
  const on = 'border-accent bg-accent/20';
  const hasNumber = (action.kind === 'foul' && action.subject === 'player') || action.kind === 'score';
  return (
    <div className="ml-7 mt-1 flex flex-wrap items-center gap-1.5">
      <button type="button" className={chip} onClick={() => onChange({ ...action, side: action.side === 'A' ? 'B' : 'A' } as VoiceAction)}>
        <ArrowLeftRight className="inline w-3.5 h-3.5 mr-1" />Other team
      </button>
      {hasNumber && (editingNumber ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            inputMode="numeric"
            value={draft}
            onChange={e => setDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
            className="w-16 h-9 rounded-lg bg-surface-hi border border-accent px-2 font-mono text-lg text-center"
          />
          <button
            type="button"
            className={`${chip} ${on}`}
            disabled={!draft}
            onClick={() => {
              onChange({ ...action, number: String(+draft) } as VoiceAction);
              setEditingNumber(false);
            }}
          >
            OK
          </button>
        </span>
      ) : (
        <button type="button" className={chip} onClick={() => { setDraft(''); setEditingNumber(true); }}>
          #{action.kind === 'foul' || action.kind === 'score' ? action.number : ''} change
        </button>
      ))}
      {'clock' in action && (editingClock ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            inputMode="numeric"
            placeholder="mmss"
            value={clockDraft}
            onChange={e => setClockDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            className="w-20 h-9 rounded-lg bg-surface-hi border border-accent px-2 font-mono text-lg text-center"
          />
          <span className="font-mono text-sm text-muted-fg">{clockText}</span>
          <button
            type="button"
            className={`${chip} ${on}`}
            disabled={!clockDraft || !isValidGameClock(clockText)}
            onClick={() => {
              onChange({ ...action, clock: clockText } as VoiceAction);
              setEditingClock(false);
            }}
          >
            OK
          </button>
        </span>
      ) : (
        <button type="button" className={chip} onClick={() => { setClockDraft(''); setEditingClock(true); }}>
          <Clock className="inline w-3.5 h-3.5 mr-1" />{action.clock}
        </button>
      ))}
      {action.kind === 'foul' && FOUL_TYPES.map(f => (
        <button key={f.t} type="button" className={`${chip} ${action.type === f.t ? on : ''}`} onClick={() => onChange({ ...action, type: f.t })}>
          {f.label}
        </button>
      ))}
      {action.kind === 'foul' && (
        <span className="flex items-center gap-1 ml-1">
          <span className="text-[11px] text-muted-fg uppercase tracking-wider">Shots</span>
          {[0, 1, 2, 3].map(n => (
            <button
              key={n}
              type="button"
              className={`${chip} ${(action.freeThrows ?? 0) === n ? on : ''}`}
              onClick={() => onChange({ ...action, freeThrows: n || undefined })}
            >
              {n === 0 ? '–' : `${FOUL_TYPES.find(f => f.t === action.type)?.label ?? 'P'}${n}`}
            </button>
          ))}
        </span>
      )}
      {action.kind === 'score' && ([1, 2, 3] as const).map(n => (
        <button key={n} type="button" className={`${chip} ${action.points === n ? on : ''}`} onClick={() => onChange({ ...action, points: n })}>
          {n}pt
        </button>
      ))}
    </div>
  );
}
