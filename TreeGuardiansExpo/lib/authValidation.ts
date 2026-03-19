const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getEmailError(value: string): string {
  if (!value) {
    return 'Email is required.';
  }

  if (!EMAIL_REGEX.test(value)) {
    return 'Enter a valid email address.';
  }

  return '';
}

export function getPasswordError(value: string): string {
  if (!value) {
    return 'Password is required.';
  }

  if (value.length < 8) {
    return 'Use at least 8 characters.';
  }

  return '';
}
