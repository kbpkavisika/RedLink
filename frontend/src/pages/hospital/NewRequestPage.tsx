import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useAuth } from '../../auth/useAuth';
import {
  BloodGroupPicker,
  Button,
  FormAlert,
  Input,
  LinkButton,
  Panel,
  StateView,
} from '../../components/ui';
import { useCreateRequest } from '../../hooks/useRequests';
import { CITIES } from '../../lib/cities';
import { applyFieldErrors } from '../../lib/formErrors';
import { formatBloodGroup } from '../../lib/format';
import { msg, translateMessage } from '../../lib/messages';
import { BLOOD_GROUPS, type ApiError, type PostedRequestResponse, type Urgency } from '../../types';

const URGENCIES: Urgency[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Same rules as the backend (CreateBloodRequestRequest), so most mistakes never leave the browser
const schema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS, { error: msg('chooseBloodGroupNeeded') }),
  unitsNeeded: z
    .string()
    .min(1, msg('enterUnits'))
    .transform(Number)
    .pipe(
      z
        .number({ error: msg('enterNumber') })
        .int(msg('wholeNumber'))
        .min(1, msg('minUnits'))
        .max(20, msg('maxUnits')),
    ),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], { error: msg('chooseUrgency') }),
  city: z.string().trim().min(1, msg('enterNeededCity')).max(100, msg('tooLong', 100)),
  neededBy: z
    .string()
    .min(1, msg('chooseNeededBy'))
    // datetime-local has no time zone, so new Date() reads it as the viewer's local time
    .refine((value) => new Date(value).getTime() > Date.now(), msg('futureTime'))
    .transform((value) => new Date(value).toISOString()),
});

type NewRequestForm = z.input<typeof schema>;
type NewRequestValues = z.output<typeof schema>;

const FIELDS = ['bloodGroup', 'unitsNeeded', 'urgency', 'city', 'neededBy'] as const;

// "YYYY-MM-DDTHH:mm" in local time, the format a datetime-local input reads and writes
function toDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Default deadline: this time tomorrow, rounded up to the next full hour
function defaultNeededBy(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(60, 0, 0);
  return toDateTimeInput(date);
}

/**
 * /hospital/requests/new (H3, H4). Only reached once the hospital is APPROVED (HospitalApprovalGate).
 * Posting saves the request and notifies the top matches in one call; the success screen says how many.
 */
export function NewRequestPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const createRequest = useCreateRequest();
  const [posted, setPosted] = useState<PostedRequestResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const defaults: NewRequestForm = {
    unitsNeeded: '1',
    city: user?.hospitalCity ?? '',
    neededBy: defaultNeededBy(),
  } as NewRequestForm;

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewRequestForm, unknown, NewRequestValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      setPosted(await createRequest.mutateAsync(values));
    } catch (error) {
      const apiError = error as ApiError;
      if (!applyFieldErrors(apiError, setError, FIELDS)) {
        setFormError(apiError.message);
      }
    }
  });

  if (posted) {
    return (
      <Panel className="mx-auto max-w-[720px]">
        <PostedState
          posted={posted}
          onPostAnother={() => {
            reset({ ...defaults, neededBy: defaultNeededBy() });
            setPosted(null);
          }}
        />
      </Panel>
    );
  }

  return (
    <Panel className="mx-auto max-w-[720px]">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 p-5 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-display-sm text-ink">{t('hospital.new.title')}</h2>
          <p className="text-body text-text-muted">{t('hospital.new.subtitle')}</p>
        </div>

        <FormAlert>{formError}</FormAlert>

        <BloodGroupPicker
          legend={t('hospital.new.bloodGroup')}
          hint={t('hospital.new.bloodGroupHint')}
          error={errors.bloodGroup?.message}
          registration={register('bloodGroup')}
        />

        <UrgencyPicker
          error={errors.urgency?.message}
          hint={t('hospital.new.urgencyHint')}
          registration={register('urgency')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label={t('hospital.new.units')}
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            error={errors.unitsNeeded?.message}
            {...register('unitsNeeded')}
          />
          <Input
            label={t('common.neededBy')}
            type="datetime-local"
            min={toDateTimeInput(new Date())}
            error={errors.neededBy?.message}
            {...register('neededBy')}
          />
        </div>

        <Input
          label={t('common.city')}
          list="request-city-suggestions"
          autoComplete="off"
          hint={t('hospital.new.cityHint')}
          error={errors.city?.message}
          {...register('city')}
        />
        <datalist id="request-city-suggestions">
          {CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
          <LinkButton to="/hospital/requests" variant="outline">
            {t('common.cancel')}
          </LinkButton>
          <Button type="submit" size="lg" loading={isSubmitting}>
            {t('hospital.new.post')}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

interface UrgencyPickerProps {
  error?: string;
  hint?: string;
  registration: UseFormRegisterReturn;
}

// The four urgencies as one radio group of tiles, like BloodGroupPicker. Red is kept for Critical.
function UrgencyPicker({ error, hint, registration }: UrgencyPickerProps) {
  const { t } = useTranslation();
  const messageId = useId();
  const message = translateMessage(t, error) ?? hint;

  return (
    <fieldset aria-describedby={message ? messageId : undefined} className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-label font-medium text-ink">{t('common.urgency')}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {URGENCIES.map((value) => (
          <label key={value} className="cursor-pointer">
            <input type="radio" value={value} className="peer sr-only" {...registration} />
            <span
              className={clsx(
                'flex h-11 items-center justify-center rounded-lg border bg-surface text-body font-semibold text-ink',
                'transition-colors duration-150 hover:border-primary peer-focus-visible:shadow-focus',
                value === 'CRITICAL'
                  ? 'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white'
                  : 'peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary-hover',
                error ? 'border-primary' : 'border-border-strong',
              )}
            >
              {t(`status.urgency.${value}`)}
            </span>
          </label>
        ))}
      </div>
      {message && (
        <p id={messageId} className={clsx('text-caption', error ? 'text-primary-hover' : 'text-text-subtle')}>
          {message}
        </p>
      )}
    </fieldset>
  );
}

// H4: "Request #RQ-1043 is live", how many donors were notified, and the way to the request page
function PostedState({ posted, onPostAnother }: { posted: PostedRequestResponse; onPostAnother: () => void }) {
  const { t } = useTranslation();
  const { request, matchCount, notifiedCount } = posted;
  const group = formatBloodGroup(request.bloodGroup);
  const units = t('common.unitsOf', { count: request.unitsNeeded, group });
  const bold = { b: <strong className="text-ink" /> };

  const description =
    matchCount === 0 ? (
      t('hospital.new.noMatches', { group })
    ) : notifiedCount === matchCount ? (
      <Trans i18nKey="hospital.new.notifiedAll" count={matchCount} values={{ units }} components={bold} />
    ) : (
      <Trans
        i18nKey="hospital.new.notifiedTop"
        values={{ notified: notifiedCount, matches: matchCount, units }}
        components={bold}
      />
    );

  return (
    <StateView
      state="success"
      title={t('hospital.new.live', { ref: request.reference })}
      description={description}
      secondaryAction={
        <Button variant="outline" onClick={onPostAnother}>
          {t('hospital.new.postAnother')}
        </Button>
      }
      action={
        <LinkButton
          to={`/hospital/requests/${request.id}`}
          leftIcon={<ArrowRight size={16} className="stroke-2" aria-hidden="true" />}
        >
          {t('hospital.new.track')}
        </LinkButton>
      }
    />
  );
}
