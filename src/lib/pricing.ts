// Centralized Abeni Express pricing. All amounts in ETB.
// Plan: drivers earn 25 ETB/km (min 50 ETB delivery fee).
// Platform takes 10% commission from product subtotal (deducted from seller payout, NOT added on top of customer).

export const DRIVER_RATE_PER_KM = 25;
export const MIN_DELIVERY_FEE = 50;
export const PLATFORM_COMMISSION_RATE = 0.10;

export interface CartLine { price_etb: number; quantity: number }

export function productSubtotal(items: CartLine[]): number {
  return items.reduce((s, i) => s + (Number(i.price_etb) || 0) * (Number(i.quantity) || 0), 0);
}

export function deliveryFee(distanceKm: number | null | undefined): number {
  const d = Number(distanceKm) || 0;
  return Math.max(MIN_DELIVERY_FEE, Math.round(d * DRIVER_RATE_PER_KM));
}

export function customerTotal(items: CartLine[], distanceKm: number | null | undefined): number {
  return productSubtotal(items) + deliveryFee(distanceKm);
}

export function platformCommission(subtotal: number): number {
  return Math.round(subtotal * PLATFORM_COMMISSION_RATE);
}

export function sellerPayout(subtotal: number): number {
  return subtotal - platformCommission(subtotal);
}

export function driverPayout(distanceKm: number | null | undefined): number {
  const d = Number(distanceKm) || 0;
  return Math.round(d * DRIVER_RATE_PER_KM);
}
