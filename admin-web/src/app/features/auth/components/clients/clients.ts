import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

type ClientStatus = 'Activo' | 'Inactivo';

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  purchases: number;
  status: ClientStatus;
}

@Component({
  selector: 'app-clients',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './clients.html',
  styleUrl: './clients.css',
})
export class Clients {
  private readonly formBuilder = new FormBuilder();
  protected readonly showForm = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<'Todos' | ClientStatus>('Todos');
  protected readonly message = signal('');
  protected readonly selectedClient = signal<Client | null>(null);
  protected readonly editingClientId = signal<string | null>(null);
  protected readonly clients = signal<Client[]>([
    { id: 'CLI-004', name: 'Mariana López', company: 'Comercializadora Norte', email: 'mariana@comercializadora.mx', phone: '55 2480 1184', purchases: 28420, status: 'Activo' },
    { id: 'CLI-003', name: 'Carlos Méndez', company: 'Abarrotes La Esquina', email: 'carlos@laesquina.mx', phone: '55 6012 4430', purchases: 18750, status: 'Activo' },
    { id: 'CLI-002', name: 'Sofía Ramírez', company: 'Servicios del Centro', email: 'sofia@servicioscentro.mx', phone: '55 9340 2271', purchases: 9360, status: 'Activo' },
    { id: 'CLI-001', name: 'Jorge Torres', company: 'Distribuciones JT', email: 'jorge@distribucionesjt.mx', phone: '55 7721 9055', purchases: 4120, status: 'Inactivo' },
  ]);
  protected readonly clientForm = this.formBuilder.nonNullable.group({
    name: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    company: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    email: this.formBuilder.nonNullable.control('', [Validators.required, Validators.email]),
    phone: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(25)]),
    status: this.formBuilder.nonNullable.control<ClientStatus>('Activo'),
  });
  protected readonly filteredClients = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.clients().filter((client) => {
      const matchesSearch = !query || [client.id, client.name, client.company, client.email].some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (status === 'Todos' || client.status === status);
    });
  });
  protected readonly activeClients = computed(() => this.clients().filter((client) => client.status === 'Activo').length);
  protected readonly totalPurchases = computed(() => this.clients().reduce((total, client) => total + client.purchases, 0));

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as 'Todos' | ClientStatus);
  }

  protected toggleForm(): void {
    this.showForm.update((visible) => !visible);
    this.editingClientId.set(null);
    this.clientForm.reset({ name: '', company: '', email: '', phone: '', status: 'Activo' });
    this.message.set('');
  }

  protected openClient(client: Client): void {
    this.selectedClient.set(client);
    this.message.set('');
  }

  protected closeClient(): void {
    this.selectedClient.set(null);
    this.editingClientId.set(null);
  }

  protected editClient(client: Client = this.selectedClient()!): void {
    this.selectedClient.set(client);
    this.editingClientId.set(client.id);
    this.clientForm.patchValue({
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      status: client.status,
    });
    this.showForm.set(true);
    this.message.set('');
  }

  protected saveClient(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      this.message.set('Completa los datos obligatorios para agregar al cliente.');
      return;
    }

    const value = this.clientForm.getRawValue();
    const editingId = this.editingClientId();

    if (editingId) {
      this.clients.update((clients) => clients.map((client) => client.id === editingId ? { ...client, name: value.name.trim(), company: value.company.trim(), email: value.email.trim().toLowerCase(), phone: value.phone.trim(), status: value.status } : client));
      this.selectedClient.set(this.clients().find((client) => client.id === editingId) ?? null);
      this.clientForm.reset({ name: '', company: '', email: '', phone: '', status: 'Activo' });
      this.editingClientId.set(null);
      this.showForm.set(false);
      this.message.set('Datos del cliente actualizados correctamente.');
      return;
    }

    const client: Client = {
      id: `CLI-${String(this.clients().length + 1).padStart(3, '0')}`,
      name: value.name.trim(),
      company: value.company.trim(),
      email: value.email.trim().toLowerCase(),
      phone: value.phone.trim(),
      purchases: 0,
      status: value.status,
    };

    this.clients.update((clients) => [client, ...clients]);
    this.clientForm.reset({ name: '', company: '', email: '', phone: '', status: 'Activo' });
    this.showForm.set(false);
    this.message.set(`${client.name} se agregó correctamente.`);
  }
}
