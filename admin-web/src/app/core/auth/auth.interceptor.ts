import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url.endsWith('/home/login')) {
    return next(request);
  }

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;

  if (!token) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
