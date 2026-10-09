export const MAX_ATOMS = 999999999999999999n;
export function normalizeQuantity(value: string): string {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,6})?$/.test(value)) throw new Error('Quantity must be a positive decimal string with at most 12 integer and 6 fractional digits');
  const [whole, fraction = ''] = value.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  if (BigInt(whole + fraction) === 0n) throw new Error('Quantity must be greater than zero');
  return whole + (trimmed ? '.' + trimmed : '');
}
export function quantityAtoms(value: string, precision: number): bigint {
  const [whole, fraction = ''] = normalizeQuantity(value).split('.');
  if (!Number.isInteger(precision) || precision < 0 || precision > 6 || fraction.length > precision) throw new Error('Quantity exceeds the SKU precision');
  return BigInt(whole + fraction.padEnd(precision, '0'));
}
export function decimal(atoms: bigint, precision: number): string {
  const negative = atoms < 0n, digits = (negative ? -atoms : atoms).toString().padStart(precision + 1, '0');
  return (negative ? '-' : '') + (precision ? digits.slice(0, -precision) + '.' + digits.slice(-precision) : digits);
}
