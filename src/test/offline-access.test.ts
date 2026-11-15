import { describe, it, expect } from 'vitest';
import { staffProjection, parseBackup, TABLE_KEYS } from '@/lib/offline-access';
import { isPreviewHost } from '@/lib/pwa-registration';
describe('Staff privacy', () => {
  it('excludes product cost and profit', () => { expect(staffProjection('products', [{id:'1',name:'Tea',price:1000,cost:400,profit:600}])).toEqual([{id:'1',name:'Tea',price:1000}]); });
  it('excludes total revenue and sales records', () => { expect(staffProjection('sales', [{id:'1',totalRevenue:50000}])).toEqual([{}]); });
  it('excludes purchase records', () => { expect(staffProjection('materials', [{id:'1',price:85000,qty:2}])).toEqual([{}]); });
  it('excludes supplier contacts from stock', () => { expect(staffProjection('stock', [{id:'1',name:'Rice',supplier:'Secret',phone:'0912345'}])).toEqual([{id:'1',name:'Rice'}]); });
  it('excludes supplier directory', () => { expect(staffProjection('suppliers', [{id:'1',phone:'0912345'}])).toEqual([{}]); });
});
describe('Backup', () => {
  it('accepts complete valid table backup', () => { const tables = Object.fromEntries(TABLE_KEYS.map(k => [k,[{id:'1',qty:2}]])); expect(parseBackup(JSON.stringify({app:'food-margin-manager',version:1,tables}))).toEqual(tables); });
  it('rejects malformed tables before restore', () => { expect(() => parseBackup(JSON.stringify({app:'food-margin-manager',version:1,tables:{products:[{qty:2}]}}))).toThrow(); });
});
describe('Preview protection', () => {
  it('refuses main and draft previews', () => { expect(isPreviewHost('id-preview--abc.lovable.app')).toBe(true); expect(isPreviewHost('preview-v2--abc.lovable.app')).toBe(true); expect(isPreviewHost('project--abc-dev.lovable.app')).toBe(true); });
  it('permits published and custom domains', () => { expect(isPreviewHost('food-margin-manager.lovable.app')).toBe(false); expect(isPreviewHost('preview-v2--shop.example.com')).toBe(false); });
});