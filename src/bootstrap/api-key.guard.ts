import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const expected = this.config.get<string>('BOOTSTRAP_API_KEY');

    if (!expected) {
      throw new UnauthorizedException('BOOTSTRAP_API_KEY no configurado en el servidor');
    }

    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token || token !== expected) {
      throw new UnauthorizedException('API key inválida');
    }

    return true;
  }
}
