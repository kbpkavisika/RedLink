import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
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
import { BLOOD_GROUPS, type ApiError, type PostedRequestResponse, type Urgency } from '../../types';

const URGENCIES: { value: Urgency; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

// Same rules as the backend (CreateBloodRequestRequest), so most mistakes never leave the browser
const schema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS, { error: 'Choose the blood group needed' }),
  unitsNeeded: z
    .string()
    .min(1, 'Enter how many units')
    .transform(Number)
    .pipe(
      z
        .number({ error: 'Enter a number' })
        .int('Use a whole number')
        .min(1, 'At least 1 unit')
        .max(20, 'At most 20 units. Post a second request for more.'),
    ),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], { error: 'Choose how urgent it is' }),
  city: z.string().trim().min(1, 'Enter the city where it is needed').max(100, 'Use at most 100 characters'),
  neededBy: z
    .string()
    .min(1, 'Choose when it is needed by')
    // datetime-local has no time zone, so new Date() reads it as the viewer's local time
    .refine((value) => new Date(value).getTime() > Date.now(), 'Choose a time in the future')
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
          <h2 className="font-display text-display-sm text-ink">Request blood</h2>
          <p className="text-body text-text-muted">
            RedLink ranks every compatible, eligible donor and notifies the best matches as soon as you post.
          </p>
        </div>

        <FormAlert>{formError}</FormAlert>

        <BloodGroupPicker
          legend="Blood group needed"
          hint="Donors of compatible groups are matched too, after exact matches"
          error={errors.bloodGroup?.message}
          registration={register('bloodGroup')}
        />

        <UrgencyPicker
          error={errors.urgency?.message}
          hint="More urgent requests notify more donors per unit"
          registration={register('urgency')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Units needed"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            error={errors.unitsNeeded?.message}
            {...register('unitsNeeded')}
          />
          <Input
            label="Needed by"
            type="datetime-local"
            min={toDateTimeInput(new Date())}
            error={errors.neededBy?.message}
            {...register('neededBy')}
          />
        </div>

        <Input
          label="City"
          list="request-city-suggestions"
          autoComplete="off"
          hint="Donors in this city are ranked first"
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
            Cancel
          </LinkButton>
          <Button type="submit" size="lg" loading={isSubmitting}>
            Post request
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
  const messageId = useId();
  const message = error ?? hint;

  return (
    <fieldset aria-describedby={message ? messageId : undefined} className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-label font-medium text-ink">Urgency</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {URGENCIES.map(({ value, label }) => (
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
              {label}
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
  const { request, matchCount, notifiedCount } = posted;
  const units = `${request.unitsNeeded} ${request.unitsNeeded === 1 ? 'unit' : 'units'} of ${formatBloodGroup(request.bloodGroup)}`;

  const description =
    matchCount === 0 ? (
      <>
        No donors can give {formatBloodGroup(request.bloodGroup)} right now. The request stays open, and its page shows
        matches as donors become available.
      </>
    ) : notifiedCount === matchCount ? (
      <>
        We notified all <strong className="text-ink">{matchCount}</strong> matching{' '}
        {matchCount === 1 ? 'donor' : 'donors'} for {units}. You'll see their replies on the request page.
      </>
    ) : (
      <>
        We notified the top <strong className="text-ink">{notifiedCount}</strong> of {matchCount} matching donors for{' '}
        {units}. The rest are listed on the request page if you need to call them.
      </>
    );

  return (
    <StateView
      state="success"
      title={`Request #${request.reference} is live`}
      description={description}
      secondaryAction={
        <Button variant="outline" onClick={onPostAnother}>
          Post another
        </Button>
      }
      action={
        <LinkButton
          to={`/hospital/requests/${request.id}`}
          leftIcon={<ArrowRight size={16} className="stroke-2" aria-hidden="true" />}
        >
          Track responses
        </LinkButton>
      }
    />
  );
}
