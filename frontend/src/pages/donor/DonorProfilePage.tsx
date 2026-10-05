import { zodResolver } from '@hookform/resolvers/zod';
import { RefreshCw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useAuth } from '../../auth/useAuth';
import { BloodGroupBadge, Button, FormAlert, Input, Panel, StateView } from '../../components/ui';
import { useMyProfile, useUpdateProfile } from '../../hooks/useDonorSelf';
import { CITIES } from '../../lib/cities';
import { applyFieldErrors } from '../../lib/formErrors';
import { formatDate } from '../../lib/format';
import { cityField, fullNameField, phoneField } from '../../lib/validation';
import type { ApiError, DonorProfile } from '../../types';

const schema = z.object({ fullName: fullNameField, phone: phoneField, city: cityField });
type ProfileForm = z.input<typeof schema>;
type ProfileValues = z.output<typeof schema>;
const FIELDS = ['fullName', 'phone', 'city'] as const;

/**
 * /donor/profile (D2): the donor's details. Name, phone and city can be changed here; email, blood group
 * and date of birth can't (the blood group decides who they're matched to, so an admin corrects it).
 */
export function DonorProfilePage() {
  const profile = useMyProfile();

  if (profile.isPending) {
    return (
      <Panel>
        <StateView state="loading" rows={4} />
      </Panel>
    );
  }
  if (profile.isError) {
    return (
      <Panel>
        <StateView
          state="error"
          title="We couldn't load your profile"
          error={profile.error}
          action={
            <Button
              loading={profile.isRefetching}
              onClick={() => void profile.refetch()}
              leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}
            >
              Try again
            </Button>
          }
        />
      </Panel>
    );
  }

  // key: a fresh form whenever the saved profile changes, so its defaults are the saved values
  return (
    <div className="mx-auto grid w-full max-w-[960px] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <ProfileForm key={`${profile.data.fullName}|${profile.data.phone}|${profile.data.city}`} me={profile.data} />
      <FixedDetails me={profile.data} />
    </div>
  );
}

function ProfileForm({ me }: { me: DonorProfile }) {
  const { refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm, unknown, ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: me.fullName, phone: me.phone ?? '', city: me.city },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateProfile.mutateAsync(values);
      await refreshUser(); // the name in the top bar
      toast.success('Profile saved.');
    } catch (error) {
      const apiError = error as ApiError;
      if (!applyFieldErrors(apiError, setError, FIELDS)) {
        setFormError(apiError.message);
      }
    }
  });

  return (
    <Panel title="Your details">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 p-5">
        <FormAlert>{formError}</FormAlert>
        <Input label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
        <Input
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint="Hospitals call this number when you accept a request"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="City"
          list="profile-city-suggestions"
          autoComplete="address-level2"
          hint="Requests in your city are shown first"
          error={errors.city?.message}
          {...register('city')}
        />
        <datalist id="profile-city-suggestions">
          {CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="outline" disabled={!isDirty || isSubmitting} onClick={() => reset()}>
            Undo changes
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function FixedDetails({ me }: { me: DonorProfile }) {
  return (
    <Panel padded>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <BloodGroupBadge group={me.bloodGroup} size="lg" />
          <div>
            <p className="text-caption text-text-subtle">Blood group</p>
            <p className="text-body font-medium text-ink">Decides which requests you're matched to</p>
          </div>
        </div>
        <dl className="flex flex-col gap-4">
          <Fact label="Email">{me.email}</Fact>
          <Fact label="Date of birth">{formatDate(me.dateOfBirth)}</Fact>
          <Fact label="Last donation">
            {me.lastDonationDate ? formatDate(me.lastDonationDate) : 'Not yet through RedLink'}
          </Fact>
        </dl>
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-3 text-caption text-text-muted">
          To correct your email, blood group or date of birth, contact{' '}
          <a href="mailto:admin@redlink.lk">admin@redlink.lk</a>.
        </p>
      </div>
    </Panel>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-text-subtle">{label}</dt>
      <dd className="text-body break-all text-ink">{children}</dd>
    </div>
  );
}
