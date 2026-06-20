import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
 
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth    = inject(AuthService);
  const router  = inject(Router);
  const allowed = route.data['roles'] as string[];
 
  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }
 
  const role = auth.getRole();
  if (role && allowed.includes(role)) return true;
 
  router.navigate(['/unauthorized']);
  return false;
};