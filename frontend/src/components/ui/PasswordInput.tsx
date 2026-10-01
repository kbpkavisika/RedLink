import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { Button } from './Button';
import { Input } from './Input';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'rightSlot'>;

// An Input with a show/hide toggle. Works with React Hook Form like Input: {...register('password')}
export function PasswordInput(props: PasswordInputProps) {
  const [shown, setShown] = useState(false);

  return (
    <Input
      {...props}
      type={shown ? 'text' : 'password'}
      rightSlot={
        <Button
          variant="icon"
          size="sm"
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          onClick={() => setShown((value) => !value)}
        >
          {shown ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
        </Button>
      }
    />
  );
}
