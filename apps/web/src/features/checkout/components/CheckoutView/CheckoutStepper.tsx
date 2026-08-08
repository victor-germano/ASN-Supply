import { Text } from '@asn/ui';
import type { CheckoutStep } from './steps';
import { CHECKOUT_STEPS } from './steps';

export function CheckoutStepper({ currentStep }: { currentStep: CheckoutStep }) {
  const currentIndex = CHECKOUT_STEPS.findIndex((step) => step.id === currentStep);

  return (
    <ol className="mb-10 flex items-center gap-3" aria-label="Etapas do checkout">
      {CHECKOUT_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-3">
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                isDone || isCurrent ? 'bg-ink text-white' : 'bg-bone-200 text-ink-muted'
              }`}
            >
              {index + 1}
            </span>
            <Text
              size="sm"
              weight={isCurrent ? 'semibold' : 'regular'}
              tone={isCurrent ? 'default' : 'muted'}
              className="hidden sm:inline"
            >
              {step.label}
            </Text>
            {index < CHECKOUT_STEPS.length - 1 && (
              <span className="h-px w-6 bg-ink/15 sm:w-10" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
