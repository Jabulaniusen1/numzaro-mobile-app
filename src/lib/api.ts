import { supabase } from './supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function isApiErrorWithStatus(error: unknown, status: number) {
  return error instanceof ApiError && error.status === status;
}

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

async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new Error('Missing EXPO_PUBLIC_API_BASE_URL');

  const headers = await getBearerHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(data?.error ?? data?.message ?? `Request failed: ${res.status}`, res.status, data);
  }

  return data as T;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  return query.toString();
}

export type ReservationType = 'renewable' | 'nonrenewable';

export interface OneTimePurchasePayload {
  serviceCode: string;
  serviceName: string;
  country: string;
  countryName: string;
  countryShortCode?: string;
}

export interface ActiveNumberForRepurchase {
  id?: string;
  product?: string;
  product_code?: string;
  serviceName?: string;
  serviceCode?: string;
  country_name?: string;
  country_code?: string;
  [key: string]: unknown;
}

export interface RentalPurchasePayload {
  serviceName: string;
  areaCode: string;
  isRenewable: boolean;
  duration:
    | 'oneDay'
    | 'threeDay'
    | 'sevenDay'
    | 'fourteenDay'
    | 'thirtyDay'
    | 'ninetyDay'
    | 'oneYear';
}

export interface EsimCountry {
  code: string;
  name: string;
  flag?: string;
  startingPriceUsd?: number;
  startingChargedUsd?: number;
}

export interface EsimPackage {
  packageCode: string;
  slug?: string;
  name: string;
  price: number;
  currencyCode: string;
  volume?: number;
  duration?: number;
  durationUnit?: string;
  location?: string;
  priceUsd?: number;
  chargedUsd: number;
  dataFormatted?: string;
}

export interface PurchaseEsimPayload {
  packageCode: string;
  packageName: string;
  location: string;
  duration: string;
  dataVolume: string;
  providerPrice: number;
}

export interface EsimOrder {
  id: string;
  package_name?: string;
  location?: string;
  duration?: string;
  data_volume?: string;
  order_no?: string | null;
  esim_tran_no?: string | null;
  iccid?: string | null;
  qr_code_url?: string | null;
  ac?: string | null;
  smdp_address?: string | null;
  status?: string;
  esim_status?: string;
  provider_cost?: number;
  charged_amount?: number;
  [key: string]: unknown;
}

export interface EsimUsagePayload {
  orderId?: string;
  esimTranNo?: string;
}

export interface EsimUsage {
  esimTranNo?: string;
  dataUsedBytes?: number;
  totalDataBytes?: number;
  dataUsedFormatted?: string;
  totalDataFormatted?: string;
  remainingBytes?: number;
  remainingFormatted?: string;
  percentUsed?: number;
  lastUpdateTime?: string;
}

export interface PlatfoneService {
  id?: string | number;
  serviceId?: string | number;
  name?: string;
  [key: string]: unknown;
}

export interface PlatfoneCountry {
  id?: string | number;
  countryId?: string | number;
  name?: string;
  [key: string]: unknown;
}

// Balance and FX
export const fetchConvertedBalance = () => apiFetch<{ balance?: string; currency?: string }>('/api/user/balance');

export const fetchBalanceConverted = fetchConvertedBalance;

export const fetchFxRate = (from: string, to: string) => {
  const query = buildQuery({ from, to });
  return apiFetch<{ rate?: number; from?: string; to?: string }>(`/api/currency/rate?${query}`);
};

// One-time (SMSPool activation)
export const fetchSmsPoolServices = (page = 1, limit = 24) => {
  const query = buildQuery({ page, limit, mode: 'activation' });
  return apiFetch(`/api/smspool/services?${query}`);
};

export const fetchSmsPoolCountries = () => apiFetch('/api/smspool/countries');

export const fetchSmsPoolPricing = (service: string, country: string) => {
  const query = buildQuery({ service, country, mode: 'activation' });
  return apiFetch(`/api/smspool/pricing?${query}`);
};

export const purchaseOneTimeNumber = (payload: OneTimePurchasePayload) =>
  apiFetch('/api/numbers/purchase', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

interface ResolvedCountry {
  id: string;
  name: string;
  shortCode?: string;
}

function asArray(payload: any, keys: string[]): any[] {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeCountry(raw: any): ResolvedCountry {
  const id = String(raw?.code ?? raw?.id ?? raw?.countryId ?? raw?.country_id ?? '');
  const name = String(raw?.name ?? raw?.countryName ?? raw?.country_name ?? id);
  const shortCode = raw?.shortCode ?? raw?.short_code ?? raw?.iso2 ?? raw?.alpha2;

  return {
    id: id || name,
    name,
    shortCode: shortCode ? String(shortCode).toUpperCase() : undefined,
  };
}

export async function resolveSmsPoolCountryId(
  shortCode?: string | null,
  countryName?: string | null
): Promise<ResolvedCountry> {
  const payload = await fetchSmsPoolCountries();
  const countries = asArray(payload, ['countries', 'items']).map(normalizeCountry);

  if (!countries.length) {
    throw new Error('Unable to resolve country: SMSPool countries list is empty.');
  }

  const normalizedShortCode = shortCode?.trim().toUpperCase();
  const normalizedCountryName = countryName?.trim().toLowerCase();

  if (normalizedShortCode) {
    const byShortCode = countries.find((country) => country.shortCode?.toUpperCase() === normalizedShortCode);
    if (byShortCode) return byShortCode;
  }

  if (normalizedCountryName) {
    const byName = countries.find((country) => country.name.trim().toLowerCase() === normalizedCountryName);
    if (byName) return byName;
  }

  throw new Error('Unable to resolve SMSPool country from active number metadata.');
}

export async function purchaseAnotherFromActiveNumber(activeNumber: ActiveNumberForRepurchase) {
  const serviceCode = String(
    activeNumber.product_code ??
      activeNumber.serviceCode ??
      activeNumber.service_code ??
      ''
  ).trim();

  const serviceName = String(
    activeNumber.product ??
      activeNumber.serviceName ??
      activeNumber.service_name ??
      ''
  ).trim();

  const countryShortCode = String(
    activeNumber.country_code ??
      activeNumber.countryShortCode ??
      activeNumber.country_short_code ??
      ''
  ).trim();

  const countryName = String(
    activeNumber.country_name ??
      activeNumber.countryName ??
      activeNumber.country ??
      ''
  ).trim();

  if (!serviceCode || !serviceName || (!countryShortCode && !countryName)) {
    throw new Error('Missing active number metadata for instant re-buy.');
  }

  const resolvedCountry = await resolveSmsPoolCountryId(countryShortCode || undefined, countryName || undefined);

  return purchaseOneTimeNumber({
    serviceCode,
    serviceName,
    country: resolvedCountry.id,
    countryName: countryName || resolvedCountry.name,
    countryShortCode: countryShortCode || resolvedCountry.shortCode,
  });
}

// Rentals (Textverified/Grizzly)
export const fetchRentalServices = (
  page = 1,
  limit = 24,
  reservationType: ReservationType = 'renewable'
) => {
  const query = buildQuery({ page, limit, reservationType });
  return apiFetch(`/api/grizzly/services?${query}`);
};

export const fetchRentalCountries = () => apiFetch('/api/grizzly/countries');

export const fetchRentalPricing = (service: string, country: string, isRenewable: boolean) => {
  const query = buildQuery({ mode: 'rental', service, country, isRenewable });
  return apiFetch(`/api/grizzly/pricing?${query}`);
};

export const purchaseRental = (payload: RentalPurchasePayload) =>
  apiFetch('/api/rentals/purchase', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// eSIM (SMSPool-backed)
export const fetchEsimCountries = () =>
  apiFetch<{ countries: EsimCountry[] }>('/api/esim/countries');

export const fetchEsimPackages = (locationCode?: string) =>
  apiFetch<{ packages: EsimPackage[] }>('/api/esim/packages', {
    method: 'POST',
    body: JSON.stringify(locationCode ? { locationCode } : {}),
  });

export const purchaseEsim = (payload: PurchaseEsimPayload) =>
  apiFetch<{ success: boolean; order: EsimOrder }>('/api/esim/order', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchEsimOrders = (page = 1, limit = 20) => {
  const query = buildQuery({ page, limit });
  return apiFetch<{ orders: EsimOrder[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>(
    `/api/esim/orders?${query}`
  );
};

export const fetchEsimUsage = ({ orderId, esimTranNo }: EsimUsagePayload) =>
  apiFetch<{ usage: EsimUsage }>('/api/esim/usage', {
    method: 'POST',
    body: JSON.stringify({
      ...(orderId ? { orderId } : {}),
      ...(esimTranNo ? { esimTranNo } : {}),
    }),
  });

// Platfone
export const fetchPlatfoneServices = () =>
  apiFetch<{ services?: PlatfoneService[]; data?: PlatfoneService[] }>('/api/platfone/services');

export const fetchPlatfoneCountries = (service: string | number) => {
  const query = buildQuery({ service });
  return apiFetch<{ countries?: PlatfoneCountry[]; data?: PlatfoneCountry[] }>(`/api/platfone/countries?${query}`);
};

export const fetchPlatfonePricing = (service: string | number, country?: string | number) => {
  const query = buildQuery({ service, country });
  return apiFetch(`/api/platfone/pricing?${query}`);
};

export const fetchPlatfoneActivations = (type: 'active' | 'history', page = 1, perPage = 25) => {
  const query = buildQuery({ type, page, per_page: perPage });
  return apiFetch(`/api/platfone/activations?${query}`);
};

// Numbers actions + sync
export const updateNumber = (id: string, action: string) =>
  apiFetch(`/api/numbers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });

export const fetchNumberMessages = (id: string) => apiFetch(`/api/numbers/${id}/messages`);

export const fetchNumberOtps = (id: string) => apiFetch(`/api/numbers/${id}/otps`);

// Compatibility aliases used by older screens
export const purchaseNumber = purchaseOneTimeNumber;

export const fetchPricing = (params: string) => apiFetch(`/api/smspool/pricing?${params}`);

export const fetchUserNumbers = () => apiFetch('/api/numbers');

export const cancelNumber = (id: string) => updateNumber(id, 'cancel');

// Social order creation
export const createOrder = (body: object) =>
  apiFetch('/api/orders/create', {
    method: 'POST',
    body: JSON.stringify(body),
  });

// Wallet funding + verification
export const initWalletFund = (amount: number, currency = 'NGN') =>
  apiFetch('/api/wallet/fund', {
    method: 'POST',
    body: JSON.stringify({ amount, currency }),
  });

export const verifyPayment = (reference: string) =>
  apiFetch('/api/payments/verify-popup', {
    method: 'POST',
    body: JSON.stringify({ reference, type: 'wallet' }),
  });
