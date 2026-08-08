import { Text } from '@asn/ui';
import type { FieldError } from 'react-hook-form';

export function FieldErrorText({ error }: { error?: FieldError }) {
  if (!error) return null;
  return (
    <Text size="xs" className="mt-1 text-error" role="alert">
      {error.message}
    </Text>
  );
}
