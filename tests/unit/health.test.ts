import { describe, it, expect } from 'vitest';
import { GET as healthGET } from '@/app/api/health/route';

describe('API Health Route', () => {
  it('should return status ok and nodeVersion without exposing secrets', async () => {
    const res = await healthGET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.nodeVersion).toBe(process.version);
    expect(data.timestamp).toBeDefined();
    // Ensure no secrets or sensitive env values leaked
    expect(data.adminPasscode).toBeUndefined();
    expect(data.firebasePrivateKey).toBeUndefined();
    expect(data.adminSessionSecret).toBeUndefined();
  });
});
