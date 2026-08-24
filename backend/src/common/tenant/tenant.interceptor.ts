import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context';

/**
 * Runs every request handler inside a TenantContext derived from the
 * authenticated JWT payload (req.user, set by JwtAuthGuard which runs
 * before this interceptor in the pipeline).
 *
 * This is the single place tenant scoping is wired up — individual
 * controllers/services never see or set orgId themselves.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // Unauthenticated route (e.g. /auth/login) — nothing to scope.
      return next.handle();
    }

    return new Observable((subscriber) => {
      TenantContext.run(
        { orgId: user.orgId, userId: user.userId, role: user.role },
        () => {
          next.handle().subscribe(subscriber);
        },
      );
    });
  }
}
