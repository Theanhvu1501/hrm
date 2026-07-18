import { DecodedToken } from '../interfaces';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tenantId?: string;
        vaiTro?: string;
        permissions?: string[];
        membershipRole?: 'admin' | 'member';
        apps?: string[];
      };
    }
  }
}

export {};
