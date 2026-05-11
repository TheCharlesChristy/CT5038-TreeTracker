export function normalizePhone(phone: string): string {
  const trimmedPhone = phone.trim();

  if (!trimmedPhone) {
    return '';
  }

  return trimmedPhone.startsWith('+')
    ? '+' + trimmedPhone.slice(1).replace(/\D/g, '')
    : trimmedPhone.replace(/\D/g, '');
}

export function isValidPhone(phone: string): boolean {
  if (!phone) {
    return true;
  }

  return /^\+?\d{7,15}$/.test(phone);
}
