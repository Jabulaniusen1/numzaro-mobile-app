import { supabase } from './supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

async function getBearerHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function apiFetch(path: string, options?: RequestInit) {
  const headers = await getBearerHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data;
}

// ── Balance with currency conversion (uses EXCHANGE_RATE_API_KEY) ──
export const fetchBalanceConverted = () => apiFetch('/api/user/balance');

// ── SMSPool (uses SMSPOOL_API_KEY) ──
export const fetchSmsPoolServices = (mode: string, page: number) =>
  apiFetch(`/api/smspool/services?mode=${mode}&page=${page}&limit=24`);

export const fetchSmsPoolCountries = () => apiFetch('/api/smspool/countries');

export const fetchPricing = (params: string) =>
  apiFetch(`/api/smspool/pricing?${params}`);

// ── Number purchase + actions (calls SMSPool API server-side) ──
export const purchaseNumber = (body: object) =>
  apiFetch('/api/numbers/purchase', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateNumber = (id: string, action: string) =>
  apiFetch(`/api/numbers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });

export const fetchUserNumbers = () => apiFetch('/api/numbers');

export const cancelNumber = (id: string) =>
  apiFetch(`/api/numbers/${id}`, { method: 'DELETE' });

export const fetchRentalPricing = (rentalId: string | number) =>
  apiFetch(`/api/smspool/pricing?mode=rental&rentalId=${rentalId}`);

// ── Social media order creation (calls SMM panel API server-side) ──
export const createOrder = (body: object) =>
  apiFetch('/api/orders/create', { method: 'POST', body: JSON.stringify(body) });

// ── Wallet funding (uses Paystack secret key) ──
export const initWalletFund = (amount: number, currency: string) =>
  apiFetch('/api/wallet/fund', {
    method: 'POST',
    body: JSON.stringify({ amount, currency }),
  });

export const verifyPayment = (reference: string) =>
  apiFetch('/api/payments/verify-popup', {
    method: 'POST',
    body: JSON.stringify({ reference, type: 'wallet' }),
  });
