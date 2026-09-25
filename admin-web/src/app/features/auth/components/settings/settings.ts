import { Component, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

type SettingsTab = 'company' | 'users' | 'profiles' | 'appearance';
type Theme = 'official' | 'dark' | 'light';

interface UserRecord {
  name: string;
  email: string;
  profile: string;
  status: 'Activo' | 'Pendiente';
}

interface ProfileRecord {
  name: string;
  description: string;
  modules: string[];
}

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly formBuilder = new FormBuilder();
  readonly theme = input.required<Theme>();
  readonly themeChange = output<Theme>();
  protected readonly activeTab = signal<SettingsTab>('company');
  protected readonly message = signal('');
  protected readonly users = signal<UserRecord[]>([
    { name: 'Administrador principal', email: 'admin@optima.local', profile: 'Administrador', status: 'Activo' },
    { name: 'Ana Martínez', email: 'ana@optima.local', profile: 'Ventas', status: 'Activo' },
  ]);
  protected readonly profiles = signal<ProfileRecord[]>([
    { name: 'Administrador', description: 'Acceso completo al negocio.', modules: ['Dashboard', 'Operaciones', 'Inventario', 'Clientes', 'Reportes', 'Configuración'] },
    { name: 'Ventas', description: 'Registra ventas y consulta inventario.', modules: ['Dashboard', 'Operaciones', 'Inventario'] },
  ]);
  protected readonly companyForm = this.formBuilder.nonNullable.group({
    name: this.formBuilder.nonNullable.control('Abarrotes La Esquina', Validators.required),
    taxId: this.formBuilder.nonNullable.control('XAXX010101000'),
    phone: this.formBuilder.nonNullable.control('555 000 0000'),
    email: this.formBuilder.nonNullable.control('contacto@laesquina.local', [Validators.required, Validators.email]),
    address: this.formBuilder.nonNullable.control('Av. Principal 123, Centro'),
  });
  protected readonly userForm = this.formBuilder.nonNullable.group({
    name: this.formBuilder.nonNullable.control('', Validators.required),
    email: this.formBuilder.nonNullable.control('', [Validators.required, Validators.email]),
    profile: this.formBuilder.nonNullable.control('Ventas', Validators.required),
  });
  protected readonly profileForm = this.formBuilder.nonNullable.group({
    name: this.formBuilder.nonNullable.control('', Validators.required),
    description: this.formBuilder.nonNullable.control('', Validators.required),
  });
  protected readonly modules = ['Dashboard', 'Operaciones', 'Inventario', 'Clientes', 'Reportes', 'Configuración'];
  protected readonly selectedModules = signal<string[]>(['Dashboard', 'Operaciones', 'Inventario']);

  protected selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.message.set('');
  }

  protected saveCompany(): void {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      this.message.set('Completa los datos obligatorios de la empresa.');
      return;
    }
    this.message.set('Datos de la empresa guardados.');
  }

  protected addUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.message.set('Completa los datos del usuario.');
      return;
    }
    this.users.update((users) => [...users, { ...this.userForm.getRawValue(), status: 'Pendiente' }]);
    this.userForm.reset({ name: '', email: '', profile: 'Ventas' });
    this.message.set('Usuario agregado. Recibirá una invitación para acceder.');
  }

  protected addProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.message.set('Completa el nombre y la descripción del perfil.');
      return;
    }
    this.profiles.update((profiles) => [...profiles, { ...this.profileForm.getRawValue(), modules: this.selectedModules() }]);
    this.profileForm.reset({ name: '', description: '' });
    this.message.set('Perfil creado con sus permisos actuales.');
  }

  protected toggleModule(module: string): void {
    this.selectedModules.update((modules) => modules.includes(module) ? modules.filter((item) => item !== module) : [...modules, module]);
  }

  protected changeTheme(theme: Theme): void {
    this.themeChange.emit(theme);
    this.message.set('Tema actualizado.');
  }
}
