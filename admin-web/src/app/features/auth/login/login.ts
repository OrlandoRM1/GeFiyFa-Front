import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  message: string;
  state: 'SUCCESS' | 'FAILED' | string;
  token: string | null;
}

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private http = inject(HttpClient);
  private router = inject(Router);

  username = signal('');
  password = signal('');
  message = signal('');
  isLoading = signal(false);

  onSubmit(): void {
    const request: LoginRequest = {
      username: this.username().trim(),
      password: this.password(),
    };

    if (!request.username || !request.password) {
      this.message.set('Completa usuario y contraseña.');
      return;
    }

    this.isLoading.set(true);
    this.message.set('');

    this.http
      .post<LoginResponse>('/home/login', request)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.state === 'SUCCESS') {
            if (response.token) {
              localStorage.setItem('auth_token', response.token);
            }

            this.router.navigate(['/home']);
            return;
          }

          this.message.set(
            response?.message || 'Credenciales inválidas (correo o contraseña incorrectos)',
          );
          this.clearCredentials();
        },
        error: (error: HttpErrorResponse) => {
          const message =
            error instanceof TimeoutError
              ? 'El servidor tardó demasiado en responder. Intenta nuevamente.'
              : error.status === 0
                ? 'No se pudo conectar con el servidor. Verifica que el servicio esté iniciado e intenta nuevamente.'
                  : error.error?.message ||
                    'Ocurrió un error al iniciar sesión. Intenta nuevamente.';

          this.message.set(message);
          this.clearCredentials();
        },
      });
  }

  private clearCredentials(): void {
    this.username.set('');
    this.password.set('');
  }
}
