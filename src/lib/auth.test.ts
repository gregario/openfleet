import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';

// Test hashPassword and verifyPassword directly using bcryptjs
// (We can't import the auth module directly because it imports next/navigation)

describe('password hashing', () => {
  it('hashes a password with bcrypt', async () => {
    const password = 'openfleet123';
    const hash = await bcrypt.hash(password, 12);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$')).toBe(true);
  });

  it('verifies a correct password', async () => {
    const password = 'openfleet123';
    const hash = await bcrypt.hash(password, 12);
    const result = await bcrypt.compare(password, hash);
    expect(result).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const password = 'openfleet123';
    const hash = await bcrypt.hash(password, 12);
    const result = await bcrypt.compare('wrong-password', hash);
    expect(result).toBe(false);
  });

  it('produces different hashes for the same password', async () => {
    const password = 'openfleet123';
    const hash1 = await bcrypt.hash(password, 12);
    const hash2 = await bcrypt.hash(password, 12);
    expect(hash1).not.toBe(hash2);
    // Both should still verify
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});
