import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, FormAlert, Input, Panel, Select } from '../../components/ui';
import { useHospitals } from '../../hooks/useAdminHospitals';
import { useAddStaff } from '../../hooks/useAdminUsers';
import { applyFieldErrors } from '../../lib/formErrors';
import { msg } from '../../lib/messages';
import { generateTemporaryPassword } from '../../lib/password';
import { emailField, fullNameField, newPasswordField, phoneField } from '../../lib/validation';
import type { ApiError, UserSummary } from '../../types';
import { TemporaryPasswordNotice } from './TemporaryPasswordNotice';

// Same rules as the backend (AddStaffRequest)
const schema = z.object({
  hospitalId: z.string().min(1, msg('chooseHospital')).transform(Number),
  fullName: fullNameField,
  email: emailField,
  phone: phoneField,
  temporaryPassword: newPasswordField,
});

type AddStaffForm = z.input<typeof schema>;
type AddStaffValues = z.output<typeof schema>;

const FIELDS = ['hospitalId', 'fullName', 'email', 'phone', 'temporaryPassword'] as const;

/**
 * Decision 3: the admin adds a colleague to an approved hospital, with a temporary password they pass on.
 * Only APPROVED hospitals are offered; the backend refuses any other.
 */
export function AddStaffPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { data: hospitals, isPending: hospitalsLoading } = useHospitals();
  const addStaff = useAddStaff();
  const [added, setAdded] = useState<{ user: UserSummary; password: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddStaffForm, unknown, AddStaffValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      hospitalId: '',
      fullName: '',
      email: '',
      phone: '',
      temporaryPassword: generateTemporaryPassword(),
    },
  });

  const approved = (hospitals ?? [])
    .filter((hospital) => hospital.status === 'APPROVED')
    .sort((a, b) => a.name.localeCompare(b.name));

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await addStaff.mutateAsync(values);
      setAdded({ user, password: values.temporaryPassword });
    } catch (error) {
      const apiError = error as ApiError;
      if (!applyFieldErrors(apiError, setError, FIELDS)) {
        setFormError(apiError.message);
      }
    }
  });

  const addAnother = () => {
    reset({
      hospitalId: added ? String(added.user.hospitalId ?? '') : '',
      fullName: '',
      email: '',
      phone: '',
      temporaryPassword: generateTemporaryPassword(),
    });
    setAdded(null);
  };

  const closeButton = (
    <Button variant="icon" size="sm" aria-label={t('common.close')} onClick={onClose}>
      <X size={18} aria-hidden="true" />
    </Button>
  );

  if (added) {
    return (
      <Panel title={t('admin.addStaff.title')} actions={closeButton}>
        <TemporaryPasswordNotice
          title={t('admin.addStaff.addedTitle', { name: added.user.fullName, hospital: added.user.hospitalName })}
          fullName={added.user.fullName}
          email={added.user.email}
          password={added.password}
        >
          <Button variant="outline" onClick={addAnother}>
            {t('admin.addStaff.addAnother')}
          </Button>
        </TemporaryPasswordNotice>
      </Panel>
    );
  }

  return (
    <Panel title={t('admin.addStaff.title')} actions={closeButton}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 p-5">
        <p className="text-body text-text-muted">{t('admin.addStaff.intro')}</p>
        <FormAlert>{formError}</FormAlert>

        <Select
          label={t('common.hospital')}
          disabled={hospitalsLoading}
          error={errors.hospitalId?.message}
          hint={!hospitalsLoading && approved.length === 0 ? t('admin.addStaff.noApproved') : undefined}
          {...register('hospitalId')}
        >
          <option value="">{hospitalsLoading ? t('admin.addStaff.loadingHospitals') : t('admin.addStaff.choose')}</option>
          {approved.map((hospital) => (
            <option key={hospital.id} value={hospital.id}>
              {hospital.name} · {hospital.city}
            </option>
          ))}
        </Select>

        <Input label={t('common.fullName')} autoComplete="off" error={errors.fullName?.message} {...register('fullName')} />
        <Input
          label={t('auth.registerHospital.workEmail')}
          type="email"
          autoComplete="off"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label={t('common.mobileNumber')}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="0771234567"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label={t('auth.changePassword.temporary')}
          autoComplete="off"
          spellCheck={false}
          className="[&_input]:font-mono"
          hint={t('admin.addStaff.tempHint')}
          labelAction={
            <button
              type="button"
              className="hit-target relative text-primary hover:text-primary-hover"
              onClick={() => setValue('temporaryPassword', generateTemporaryPassword(), { shouldValidate: true })}
            >
              {t('admin.addStaff.generate')}
            </button>
          }
          error={errors.temporaryPassword?.message}
          {...register('temporaryPassword')}
        />

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {t('admin.addStaff.title')}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
