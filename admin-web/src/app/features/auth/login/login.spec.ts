import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, tick, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => httpTesting.verify({ ignoreCancelled: true }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading while submitting', () => {
    component.username.set('usuario');
    component.password.set('secreto');

    component.onSubmit();

    expect(component.isLoading()).toBe(true);
    expect(fixture.nativeElement.querySelector('.loading-indicator')).toBeTruthy();
    httpTesting.expectOne('/home/login').flush({
      state: 'SUCCESS',
      message: 'OK',
      token: 'token',
    });
  });

  it('should show the server error and clear credentials when login fails', () => {
    component.username.set('usuario');
    component.password.set('secreto');

    component.onSubmit();

    httpTesting.expectOne('/home/login').flush({
      state: 'FAILED',
      message: 'Usuario o contraseña incorrectos',
      token: null,
    });

    expect(component.message()).toBe('Usuario o contraseña incorrectos');
    expect(component.username()).toBe('');
    expect(component.password()).toBe('');
    expect(component.isLoading()).toBe(false);
  });

  it('should show a fallback error and clear credentials on HTTP errors', () => {
    component.username.set('usuario');
    component.password.set('secreto');

    component.onSubmit();

    httpTesting.expectOne('/home/login').flush(
      { message: 'Servidor no disponible' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(component.message()).toBe('Servidor no disponible');
    expect(component.username()).toBe('');
    expect(component.password()).toBe('');
    expect(component.isLoading()).toBe(false);
  });

  it('should show a connection error when the backend is unavailable', () => {
    component.username.set('usuario');
    component.password.set('secreto');

    component.onSubmit();

    httpTesting.expectOne('/home/login').error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Unknown Error',
    });

    expect(component.message()).toBe(
      'No se pudo conectar con el servidor. Verifica que el backend esté iniciado e intenta nuevamente.',
    );
    expect(component.username()).toBe('');
    expect(component.password()).toBe('');
    expect(component.isLoading()).toBe(false);
  });

  it('should fail after 10 seconds without a response', fakeAsync(() => {
    component.username.set('usuario');
    component.password.set('secreto');

    component.onSubmit();
    httpTesting.expectOne('/home/login');

    tick(9999);
    expect(component.isLoading()).toBe(true);

    tick(1);

    expect(component.message()).toBe('El servidor tardó demasiado en responder. Intenta nuevamente.');
    expect(component.username()).toBe('');
    expect(component.password()).toBe('');
    expect(component.isLoading()).toBe(false);
  }));
});
