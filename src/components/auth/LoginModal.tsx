import { useEffect, useState } from 'react';
import { Mail, Loader2, ChevronLeft, KeyRound } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/state/AuthProvider';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'email' | 'code';
type Action = 'idle' | 'sending' | 'verifying';

export function LoginModal({ open, onClose }: Props) {
  const { signIn, verifyCode, cloudEnabled, session } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [action, setAction] = useState<Action>('idle');
  const [error, setError] = useState<string | null>(null);

  // Close automatically once the session lands in storage.
  useEffect(() => {
    if (session && open) onClose();
  }, [session, open, onClose]);

  if (!open) return null;

  const sendCode = async () => {
    if (!email.trim()) return;
    setAction('sending');
    setError(null);
    const result = await signIn(email);
    setAction('idle');
    if (result.error) {
      setError(result.error);
    } else {
      setStep('code');
    }
  };

  const submitCode = async () => {
    if (code.replace(/\D/g, '').length < 4) return;
    setAction('verifying');
    setError(null);
    const result = await verifyCode(email, code);
    setAction('idle');
    if (result.error) {
      setError(result.error);
    }
    // Success will close via the effect above when the session arrives.
  };

  const back = () => {
    setStep('email');
    setCode('');
    setError(null);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={step === 'email' ? 'Sign in to sync your games' : 'Enter the sign-in code'}
      subtitle={
        step === 'email'
          ? 'A sign-in code will be emailed to you.'
          : `We sent a code to ${email}. It expires in a few minutes.`
      }
      size="md"
      footer={
        step === 'email' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={
                !email.trim() || action === 'sending' || !cloudEnabled
              }
              onClick={sendCode}
            >
              {action === 'sending' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send code
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={back}>
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              onClick={sendCode}
              disabled={action !== 'idle'}
            >
              Resend
            </Button>
            <Button
              disabled={
                code.replace(/\D/g, '').length < 4 ||
                action === 'verifying'
              }
              onClick={submitCode}
            >
              {action === 'verifying' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Verify
                </>
              )}
            </Button>
          </>
        )
      }
    >
      {!cloudEnabled ? (
        <div className="text-sm text-danger">
          Cloud sync is not configured on this build.
        </div>
      ) : step === 'email' ? (
        <div className="space-y-3">
          <label className="block">
            <span className="block text-sm text-muted-fg mb-1.5">Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendCode()}
              placeholder="you@example.com"
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-lg"
            />
          </label>
          <div className="text-xs text-muted-fg leading-relaxed">
            Use the 6-digit code from the email — works inside this PWA.
            (You'll also see a magic link in the email; ignore it on iPad
            because it opens Safari outside this app.)
          </div>
          {error && <div className="text-sm text-danger">{error}</div>}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="block text-sm text-muted-fg mb-1.5">
              Sign-in code
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 12))
              }
              onKeyDown={e => e.key === 'Enter' && submitCode()}
              placeholder="••••••••"
              autoFocus
              maxLength={12}
              className="h-16 w-full rounded-2xl bg-surface-hi border border-border px-4 text-center text-3xl font-mono font-bold tracking-[0.3em]"
            />
          </label>
          <div className="text-xs text-muted-fg">
            Open the sign-in email and copy the numeric code at the top of the
            message — it'll be 6 to 10 digits depending on your Supabase
            settings.
          </div>
          {error && <div className="text-sm text-danger">{error}</div>}
        </div>
      )}
    </Modal>
  );
}
