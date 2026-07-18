import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DecodedToken, UserPayload, TempTokenPayload, DecodedTempToken } from '../interfaces';
import { JwksService } from './jwks.service';

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly tempTokenExpiresIn: string;

  constructor(private readonly jwks: JwksService) {
    this.secret =
      process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.tempTokenExpiresIn = process.env.JWT_TEMP_EXPIRES_IN || '5m';
  }

  /**
   * Verify and decode a JWT token.
   *
   * - RS256 header → look up public key from JWKS cache by kid; if not found → reject.
   * - Otherwise → verify with HS256 + this.secret (fallback / legacy path).
   *
   * Algorithms are pinned per branch to prevent alg-confusion attacks.
   */
  verify(token: string): DecodedToken {
    // Peek at the header without verifying to determine the algorithm
    const decoded = jwt.decode(token, { complete: true });

    const alg = decoded?.header?.alg;
    const kid = decoded?.header?.kid as string | undefined;

    if (alg === 'RS256') {
      return this._verifyRS256(token, kid);
    }

    return this._verifyHS256(token);
  }

  private _verifyRS256(token: string, kid: string | undefined): DecodedToken {
    const pem = kid ? this.jwks.getKey(kid) : undefined;
    if (!pem) {
      // Unknown kid or no JWKS key → reject (do NOT fall back to HS256)
      throw new Error('Token không hợp lệ');
    }
    try {
      // Pin algorithm to RS256 only — prevents alg-confusion
      return jwt.verify(token, pem, { algorithms: ['RS256'] }) as DecodedToken;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token đã hết hạn');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Token không hợp lệ');
      }
      throw new Error(`Xác thực token thất bại: ${(error as Error).message}`);
    }
  }

  private _verifyHS256(token: string): DecodedToken {
    try {
      // Pin algorithm to HS256 only — prevents alg-confusion
      // IMPORTANT: uses this.secret, NOT a public key
      return jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as DecodedToken;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token đã hết hạn');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Token không hợp lệ');
      }
      throw new Error(`Xác thực token thất bại: ${(error as Error).message}`);
    }
  }

  /**
   * Sign a payload and create a JWT token (HS256 — master-seo internal use)
   */
  sign(payload: UserPayload, expiresIn?: string): string {
    const tokenPayload = {
      sub: payload.id,
      email: payload.email,
      tenantId: payload.tenantId,
      vaiTro: payload.vaiTro,
      permissions: payload.permissions,
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: expiresIn || this.expiresIn,
    });
  }

  /**
   * Sign a temporary token for tenant selection (no tenantId)
   */
  signTempToken(payload: TempTokenPayload): string {
    const tokenPayload = {
      sub: payload.id,
      email: payload.email,
      type: 'temp',
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: this.tempTokenExpiresIn,
    });
  }

  /**
   * Verify and decode a temporary token
   */
  verifyTempToken(token: string): DecodedTempToken {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as DecodedTempToken;
      if (decoded.type !== 'temp') {
        throw new Error('Loại token không hợp lệ');
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token tạm thời đã hết hạn');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Token tạm thời không hợp lệ');
      }
      throw new Error(`Xác thực token tạm thời thất bại: ${(error as Error).message}`);
    }
  }

  /**
   * Decode a JWT token without verification
   */
  decode(token: string): DecodedToken | null {
    try {
      return jwt.decode(token) as DecodedToken;
    } catch {
      return null;
    }
  }

  /**
   * Alias for verify() — used by guards
   */
  verifyToken(token: string): DecodedToken {
    return this.verify(token);
  }

  /**
   * Check if decoded token is a temp token (no tenantId)
   */
  isTempToken(decoded: DecodedToken | DecodedTempToken): boolean {
    return 'type' in decoded && decoded.type === 'temp';
  }
}
