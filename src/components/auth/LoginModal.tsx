import { useState } from 'react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/state/AuthProvider';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: Props) {
  const { signIn, cloudEnabled } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    if (!email.trim()) return;
    setStatus('sending');
    setError(null);
    const result = await signIn(email);
    if (result.error) {
      setStatus('error');
      setError(result.error);
    } else {
      setStatus('sent');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Sign in to sync your games"
      subtitle="A magic link will be emailed. Click it to finish signing in."
      size="md"
      footer={
        status === 'sent' ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!email.trim() || status === 'sending' || !cloudEnabled}
              onClick={submit}
            >
              {status === 'sending' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send magic link
                </>
              )}
            </Button>
          </>
        )
      }
    >
      {!cloudEnabled ? (
        <div className="text-sm text-danger">
          Cloud sync is not configured on this build. Check your environment
          variables.
        </div>
      ) : status === 'sent' ? (
        <div className="flex items-start gap-3 text-fg">
          <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Check your email.</div>
            <div className="text-sm text-muted-fg mt-1">
              We sent a sign-in link to <strong>{email}</strong>. Click it on
              this same device and you'll be signed in automatically.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="block text-sm text-muted-fg mb-1.5">Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="you@example.com"
              autoFocus
              className="h-14 w-full rounded-2xl bg-surface-hi border border-border px-4 text-lg"
            />
          </label>
          <div className="text-xs text-muted-fg leading-relaxed">
            Signing in syncs your games across devices and backs them up in the
            cloud. You can keep using the app without signing in — local games
            work offline and will upload the next time you do.
          </div>
          {error && <div className="text-sm text-danger">{error}</div>}
        </div>
      )}
    </Modal>
  );
}
