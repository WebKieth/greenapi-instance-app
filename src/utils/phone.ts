/** Оставляет только цифры и приводит российский номер 8XXX... к 7XXX... */
export function normalizePhone(raw: string): string {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }
  return digits;
}

/** Короткое отображение номера: +7 999 123-45-67 */
export function formatPhone(digits: string): string {
  if (!digits) return '';
  if (digits.length === 11) {
    return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return `+${digits}`;
}
