import { Matches, ValidationOptions } from 'class-validator';

/** Exactly 10 numeric digits (Indian mobile style). */
export const PHONE_10_DIGITS_RE = /^\d{10}$/;

export const PHONE_10_DIGITS_MESSAGE = 'Phone must be exactly 10 digits';

export function MatchesPhone10Digits(validationOptions?: ValidationOptions) {
  return Matches(PHONE_10_DIGITS_RE, {
    message: PHONE_10_DIGITS_MESSAGE,
    ...validationOptions,
  });
}

/** Keep digits only; empty input becomes undefined for optional fields. */
export function normalizeOptionalPhone(
  value: unknown,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : undefined;
}

export function normalizeRequiredPhone(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\D/g, '');
}
