import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { environment } from '../environments/environment';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromHeader(environment.tokenHeaderKey),
      ignoreExpiration: false,
      secretOrKey: environment.jwtSecret!,
    });
  }

  validate(payload: { sub?: string; username?: string; tenantId?: string }) {
    return {
      sub: payload.sub,
      id: payload.sub,
      username: payload.username,
      tenantId: payload.tenantId,
    };
  }
}
