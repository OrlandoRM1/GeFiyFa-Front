import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import QRCode from 'qrcode';

interface Invoice {
  folio: string;
  client: string;
  date: string;
  status: 'Pagada' | 'Pendiente' | 'Cancelada';
  subtotal: number;
  tax: number;
  total: number;
}

@Component({
  selector: 'app-billing',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './billing.html',
  styleUrl: './billing.css',
})
export class Billing {
  private readonly formBuilder = new FormBuilder();
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly showForm = signal(false);
  protected readonly showQr = signal(false);
  protected readonly qrDataUrl = signal('');
  protected readonly qrLink = signal('');
  protected readonly qrInvoice = signal<Invoice | null>(null);
  protected readonly qrMessage = signal('');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<'Todas' | Invoice['status']>('Todas');
  protected readonly message = signal('');
  protected readonly invoices = signal<Invoice[]>([
    { folio: 'FAC-0003', client: 'Comercializadora Norte', date: '24 sep 2026, 09:42', status: 'Pagada', subtotal: 2450, tax: 392, total: 2842 },
    { folio: 'FAC-0002', client: 'Abarrotes La Esquina', date: '23 sep 2026, 16:18', status: 'Pendiente', subtotal: 8120, tax: 1299.2, total: 9419.2 },
    { folio: 'FAC-0001', client: 'Servicios del Centro', date: '22 sep 2026, 11:05', status: 'Cancelada', subtotal: 1200, tax: 192, total: 1392 },
  ]);
  protected readonly invoiceForm = this.formBuilder.nonNullable.group({
    client: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    subtotal: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(0.01)]),
    status: this.formBuilder.nonNullable.control<Invoice['status']>('Pendiente'),
  });
  protected readonly filteredInvoices = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.invoices().filter((invoice) => {
      const matchesSearch = !query || invoice.folio.toLowerCase().includes(query) || invoice.client.toLowerCase().includes(query);
      return matchesSearch && (status === 'Todas' || invoice.status === status);
    });
  });
  protected readonly pendingTotal = computed(() => this.invoices().filter((invoice) => invoice.status === 'Pendiente').reduce((sum, invoice) => sum + invoice.total, 0));

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as 'Todas' | Invoice['status']);
  }

  protected toggleForm(): void {
    this.showForm.update((visible) => !visible);
    this.message.set('');
  }

  protected async showCustomerQr(invoice: Invoice = this.invoices()[0]): Promise<void> {
    if (!invoice) {
      this.qrMessage.set('Crea una factura antes de generar un QR.');
      return;
    }

    const link = this.buildCustomerLink(invoice);
    this.qrInvoice.set(invoice);
    this.qrLink.set(link);
    this.qrDataUrl.set('');
    this.qrMessage.set('');
    this.showQr.set(true);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.qrDataUrl.set(
      await QRCode.toDataURL(link, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 240,
        color: { dark: '#172033', light: '#ffffff' },
      }),
    );
  }

  protected closeCustomerQr(): void {
    this.showQr.set(false);
    this.qrMessage.set('');
  }

  protected async copyCustomerLink(): Promise<void> {
    if (!this.qrLink() || !navigator.clipboard) {
      this.qrMessage.set('No fue posible copiar el enlace en este navegador.');
      return;
    }

    await navigator.clipboard.writeText(this.qrLink());
    this.qrMessage.set('Enlace copiado. Compártelo con tu cliente.');
  }

  protected downloadCustomerQr(): void {
    if (!this.qrDataUrl() || !this.qrInvoice()) {
      return;
    }

    const downloadLink = document.createElement('a');
    downloadLink.href = this.qrDataUrl();
    downloadLink.download = `${this.qrInvoice()?.folio}-registro-cliente.png`;
    downloadLink.click();
  }

  private buildCustomerLink(invoice: Invoice): string {
    const baseUrl = isPlatformBrowser(this.platformId) ? window.location.origin : '';
    const link = new URL('/register', baseUrl || 'http://localhost');
    link.searchParams.set('source', 'billing');
    link.searchParams.set('invoice', invoice.folio);
    link.searchParams.set('total', invoice.total.toFixed(2));
    return baseUrl ? link.toString() : `${link.pathname}${link.search}`;
  }

  protected createInvoice(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      this.message.set('Completa el cliente y el subtotal para crear la factura.');
      return;
    }

    const values = this.invoiceForm.getRawValue();
    const subtotal = values.subtotal;
    const tax = subtotal * 0.16;
    const folioNumber = this.invoices().length + 1;
    const invoice: Invoice = {
      folio: `FAC-${String(folioNumber).padStart(4, '0')}`,
      client: values.client.trim(),
      date: new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }),
      status: values.status,
      subtotal,
      tax,
      total: subtotal + tax,
    };

    this.invoices.update((invoices) => [invoice, ...invoices]);
    this.invoiceForm.reset({ client: '', subtotal: 0, status: 'Pendiente' });
    this.showForm.set(false);
    this.message.set(`${invoice.folio} creada correctamente.`);
    void this.showCustomerQr(invoice);
  }
}
