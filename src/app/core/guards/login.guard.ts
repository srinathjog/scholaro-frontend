import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Prevents authenticated users from seeing the login page.
 * Redirects them to their role-based dashboard instead.
 */
export const loginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true; // Not logged in — allow access to login page
  }

  const roles = authService.getRoles();
  if (roles.includes('SUPER_ADMIN')) {
    router.navigate(['/super-admin']);
  } else if (roles.includes('TEACHER')) {
    router.navigate(['/teacher/history']);
  } else if (roles.includes('PARENT')) {
    router.navigate(['/parent']);
  } else if (roles.includes('SCHOOL_ADMIN')) {
    router.navigate(['/admin']);
  } else {
    return true; // Unknown role — let them see login
  }
  return false;
};
