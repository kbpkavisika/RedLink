import { X } from 'lucide-react';
import { useState } from 'react';
import { Button, FormAlert, Input, Panel } from '../../components/ui';
import { useSetTemporaryPassword } from '../../hooks/useAdminUsers';
import { generateTemporaryPassword } from '../../lib/password';
import { roleLabel } from '../../lib/roles';
import type { UserSummary } from '../../types';
import { TemporaryPasswordNotice } from './TemporaryPasswordNotice';

/**
 * Decision 5, the v1 "forgot password": the user contacts the admin, who sets a temporary password here.
 * Their old password stops working at once, and they must choose a new one at their next sign-in.
 */
export function TemporaryPasswordPanel({ user, onClose }: { user: UserSummary; onClose: () => void }) {
  const setPassword = useSetTemporaryPassword(user.id);
  const [password, setPasswordValue] = useState(generateTemporaryPassword);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  const closeButton = (
    <Button variant="icon" size="sm" aria-label="Close" onClick={onClose}>
      <X size={18} aria-hidden="true" />
    </Button>
  );

  const submit = () => {
    if (password.length < 8 || password.length > 72) {
      setError('Use 8 to 72 characters');
      return;
    }
    setError(undefined);
    setPassword.mutate({ temporaryPassword: password }, { onSuccess: () => setDone(true) });
  };

  if (done) {
    return (
      <Panel title="Temporary password" actions={closeButton}>
        <TemporaryPasswordNotice
          title="Temporary password set"
          fullName={user.fullName}
          email={user.email}
          password={password}
        >
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </TemporaryPasswordNotice>
      </Panel>
    );
  }

  const serverError = setPassword.error?.fieldErrors.find((field) => field.field === 'temporaryPassword')?.message;

  return (
    <Panel title="Temporary password" actions={closeButton}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        noValidate className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-ink">{user.fullName}</p>
          <p className="text-label text-text-muted">
            {roleLabel(user.role)} · {user.email}
          </p>
        </div>
        <p className="text-body text-text-muted">
          Use this when someone has forgotten their password. Their current password stops working straight away.
        </p>
        <FormAlert>{setPassword.error && !serverError ? setPassword.error.message : null}</FormAlert>

        <Input
          label="Temporary password"
          autoComplete="off"
          spellCheck={false}
          className="[&_input]:font-mono"
          value={password}
          onChange={(event) => setPasswordValue(event.target.value)}
          hint="Pass it on by phone or in person. They must change it at first sign-in."
          labelAction={
            <button
              type="button"
              className="text-primary hover:text-primary-hover"
              onClick={() => setPasswordValue(generateTemporaryPassword())}
            >
              Generate new
            </button>
          }
          error={error ?? (serverError && `Password ${serverError}`)}
        />

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={setPassword.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={setPassword.isPending}>
            Set temporary password
          </Button>
        </div>
      </form>
    </Panel>
  );
}
