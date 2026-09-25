import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';

interface UserRegisterRequest {
  name: string;
  lastName: string;
  birthdate: string;
  profile: string;
  username: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  token: string | null;
  message: string;
  state: 'SUCCESS' | 'FAILED' | string;
  user?: unknown;
}

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly billingInvoice = signal(this.route.snapshot.queryParamMap.get('invoice') ?? '');
  protected readonly fromBilling = signal(this.route.snapshot.queryParamMap.get('source') === 'billing');

  name = signal('');
  lastName = signal('');
  birthdate = signal('');
  username = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  message = signal('');
  isSuccess = signal(false);
  isLoading = signal(false);

  onSubmit(): void {
    if (
      !this.name().trim() ||
      !this.lastName().trim() ||
      !this.username().trim() ||
      !this.email().trim() ||
      !this.password()
    ) {
      this.setError('Completa todos los campos obligatorios.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.setError('Las contraseñas no coinciden.');
      return;
    }

    const request: UserRegisterRequest = {
      name: this.name().trim(),
      lastName: this.lastName().trim(),
      birthdate: this.birthdate(),
      profile: 'USER',
      username: this.username().trim(),
      email: this.email().trim(),
      password: this.password(),
    };

    this.isLoading.set(true);
    this.message.set('');

    this.http
      .post<RegisterResponse>('/home/register', request)
      .pipe(
        timeout(10000),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (response.state === 'SUCCESS') {
            this.isSuccess.set(true);
            this.message.set(response.message || 'Usuario registrado exitosamente.');
            this.clearForm();
            this.router.navigate(['/login']);
            return;
          }

          this.setError(response.message || 'No se pudo registrar el usuario.');
        },
        error: (error: HttpErrorResponse) => {
          const message =
            error instanceof TimeoutError
              ? 'El servidor tardó demasiado en responder. Intenta nuevamente.'
              : error.status === 0
                ? 'No se pudo conectar con el servidor. Verifica que el backend esté iniciado.'
                : error.error?.message || 'No se pudo registrar el usuario.';

          this.setError(message);
        },
      });
  }

  private setError(message: string): void {
    this.isSuccess.set(false);
    this.message.set(message);
  }

  private clearForm(): void {
    this.name.set('');
    this.lastName.set('');
    this.birthdate.set('');
    this.username.set('');
    this.email.set('');
    this.password.set('');
    this.confirmPassword.set('');
  }
}
