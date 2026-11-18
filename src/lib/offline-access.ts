import { parseIngredients } from './recipes';
export type Profile = { id: string; username: string; name: string; salt: string; hash: string };
export type AccessData = { profiles: Profile[]; roles: Record<string, 'admin' | 'user'> };
export const ACCESS_KEY = 'biz:access';
export const SESSION_KEY = 'biz:session';
export function restoreSession(access: AccessData | null, profileId: string | null): Profile | null {
  if (!access || !profileId || !['admin', 'user'].includes(access.roles[profileId] ?? '')) return null;
  return access.profiles.find(profile => profile.id === profileId) ?? null;
}
export const TABLE_KEYS = ['products', 'staff', 'materials', 'taxes', 'daily', 'sales', 'stock', 'suppliers', 'customers'] as const;
export const STAFF_FIELDS: Record<string, string[]> = { products: ['id', 'name', 'price'], stock: ['id', 'name', 'unit', 'qty', 'min'] };
export function staffProjection(key: string, rows: Record<string, string | number>[]) {
  const fields = STAFF_FIELDS[key] ?? [];
  return rows.map(row => Object.fromEntries(Object.entries(row).filter(([field]) => fields.includes(field))));
}
export async function passwordHash(password: string, salt: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 210000, hash: 'SHA-256' }, material, 256);
  return Array.from(new Uint8Array(bits), v => v.toString(16).padStart(2, '0')).join('');
}
export async function makeProfile(username: string, name: string, password: string): Promise<Profile> {
  const salt = crypto.randomUUID();
  return { id: crypto.randomUUID(), username: username.trim().toLowerCase(), name: name.trim(), salt, hash: await passwordHash(password, salt) };
}
export function parseBackup(text: string) {
  const value = JSON.parse(text);
  if (value?.app !== 'food-margin-manager' || value.version !== 1 || !value.tables || typeof value.tables !== 'object') throw new Error('Backup မမှန်ပါ');
  for (const key of TABLE_KEYS) {
    const rows = value.tables[key];
    if (!Array.isArray(rows) || rows.some((r: unknown) => !r || typeof r !== 'object' || typeof (r as { id?: unknown }).id !== 'string' || Object.values(r).some(v => !['string', 'number'].includes(typeof v)))) throw new Error('စာရင်းဒေတာ မမှန်ပါ');
    if (rows.some((r: Record<string, unknown>) => Object.values(r).some(v => typeof v === 'number' && !Number.isFinite(v)))) throw new Error('စာရင်းဒေတာ မမှန်ပါ');
    for (const row of rows) {
      if (key === 'products' && row.recipe) parseIngredients(String(row.recipe));
      if (key === 'sales' && row.usage) parseIngredients(String(row.usage));
      if (key === 'stock' && row.unitCost !== undefined && (!Number.isFinite(Number(row.unitCost)) || Number(row.unitCost) < 0)) throw new Error('ကုန်ကြမ်းဈေး မမှန်ပါ');
    }
  }
  return value.tables as Record<typeof TABLE_KEYS[number], Record<string, string | number>[]>;
}
