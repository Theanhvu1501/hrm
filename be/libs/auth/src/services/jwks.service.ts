import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class JwksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JwksService.name);
  private readonly cache = new Map<string, string>();
  private intervalId?: ReturnType<typeof setInterval>;
  private readonly jwksUrl: string | undefined;

  constructor() {
    const raw = process.env.IDENTITY_JWKS_URL;
    this.jwksUrl = raw?.trim() || undefined;
  }

  async onModuleInit(): Promise<void> {
    if (!this.jwksUrl) return;
    try {
      await this.refresh();
    } catch {
      // swallow — already handled inside refresh
    }
    // Refresh keys every hour to pick up rotations
    this.intervalId = setInterval(() => {
      this.refresh().catch(() => {
        /* already logged inside refresh */
      });
    }, 60 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  async refresh(): Promise<void> {
    if (!this.jwksUrl) return;
    try {
      const res = await fetch(this.jwksUrl);
      if (!res.ok) {
        this.logger.warn(
          `JWKS fetch returned ${res.status} ${res.statusText} — skipping refresh`,
        );
        return;
      }

      const data = (await res.json()) as { keys?: unknown[] };
      const keys: unknown[] = Array.isArray(data?.keys) ? data.keys : [];

      const next = new Map<string, string>();
      for (const raw of keys) {
        const jwk = raw as Record<string, unknown>;
        if (!jwk.kid || typeof jwk.kid !== 'string') continue;
        if (jwk.kty !== 'RSA') continue;
        try {
          const pem = crypto
            .createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' })
            .export({ type: 'spki', format: 'pem' }) as string;
          next.set(jwk.kid, pem);
        } catch (e) {
          this.logger.warn(
            `Failed to import JWK kid=${jwk.kid}: ${(e as Error).message}`,
          );
        }
      }

      // Atomic replace
      this.cache.clear();
      for (const [k, v] of next) this.cache.set(k, v);
      this.logger.log(`JWKS refreshed — ${this.cache.size} key(s) loaded`);
    } catch (err) {
      this.logger.warn(
        `JWKS refresh failed (falling back to HS256): ${(err as Error).message}`,
      );
    }
  }

  /**
   * Synchronous cache read — called from JwtService.verify().
   * Returns the PEM-encoded RSA public key for the given kid, or undefined if not cached.
   */
  getKey(kid: string): string | undefined {
    return this.cache.get(kid);
  }
}
