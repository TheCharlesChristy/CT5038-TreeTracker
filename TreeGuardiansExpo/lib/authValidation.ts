export function getUsernameError(value: string): string {
  if (!value) {
    return 'Username is required.';
  }

  if (value.length < 3) {
    return 'Username must be at least 3 characters.';
  }

  if (value.length > 30) {
    return 'Username must be 30 characters or fewer.';
  }

  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return 'Only letters, numbers, and underscores allowed.';
  }

  return '';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getEmailError(value: string): string {
  if (!value) {
    return '';
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
