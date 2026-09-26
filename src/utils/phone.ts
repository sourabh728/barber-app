/** Exactly 10 numeric digits. */
export const PHONE_10_DIGITS_RE = /^\d{10}$/;

export const PHONE_10_DIGITS_MESSAGE =
  "Phone number must be exactly 10 digits.";

/** Strip non-digits and cap at 10 for controlled inputs. */
export function sanitizePhoneInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

/**
 * Empty is allowed when required=false.
 * Non-empty values must be exactly 10 digits.
 */
export function isValidPhone10(
  value: string | null | undefined,
  options?: { required?: boolean },
) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) {
    return !options?.required;
  }
  return PHONE_10_DIGITS_RE.test(digits);
}

export function phoneValidationError(
  value: string | null | undefined,
  options?: { required?: boolean; label?: string },
) {
  const label = options?.label ?? "Phone number";
  const digits = (value ?? "").replace(/\D/g, "");

  if (!digits) {
    return options?.required ? `${label} is required.` : null;
  }

  if (!PHONE_10_DIGITS_RE.test(digits)) {
    return `${label} must be exactly 10 digits.`;
  }

  return null;
}
