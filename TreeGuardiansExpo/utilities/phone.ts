// Optional phone validation, removes any white space inbetween the numbers, special characters like (), - but keeps the trailing + if present
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
    return true; // optional field
  }

  return /^\+?\d{7,15}$/.test(phone);
}