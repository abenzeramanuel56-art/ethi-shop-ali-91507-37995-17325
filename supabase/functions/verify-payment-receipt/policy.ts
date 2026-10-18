export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export function normalizeReceiptId(value: string) { return value.trim().replace(/\s/g, '').toLowerCase(); }
export function validReceipt(type: string, size: number) { return RECEIPT_TYPES.includes(type) && size > 0 && size <= MAX_RECEIPT_BYTES; }
export function paymentDecision(verified: boolean, paid: unknown, expected: string | number, recipientMatches: boolean | null) {
  const decimal = (value: unknown): string | null => {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const text = String(value).trim();
    if (!/^\d+(\.\d+)?$/.test(text)) return null;
    const [whole, fraction = ''] = text.split('.');
    return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.replace(/0+$/, '')}`;
  };
  if (!verified) return { state: 'failed', reason: 'not_found' };
  const actual = decimal(paid), total = decimal(expected);
  if (actual === null || total === null) return { state: 'pending_review', reason: 'amount_missing' };
  if (actual !== total) return { state: Number(paid) > Number(expected) ? 'pending_review' : 'failed', reason: 'amount_mismatch' };
  if (recipientMatches === false) return { state: 'failed', reason: 'recipient_mismatch' };
  if (recipientMatches === null) return { state: 'pending_review', reason: 'recipient_missing' };
  return { state: 'confirmed', reason: null };
}