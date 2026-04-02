import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function RoleGuard(expectedRoles: string[]): CanActivateFn {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const userRoles = authService.getRoles();
    if (userRoles.length && userRoles.some(r => expectedRoles.includes(r))) {
      return true;
    } else {
      router.navigate(['/login']);
      return false;
    }
  };
}
