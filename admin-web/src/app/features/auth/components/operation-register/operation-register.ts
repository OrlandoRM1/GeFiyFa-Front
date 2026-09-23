import { DecimalPipe } from '@angular/common';
import { Component, computed, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

interface OperationLine {
  product: string;
  characteristics: string;
  price: number;
  units: number;
  total: number;
  code?: string;
}

interface RegisteredOperation {
  type: 'Venta' | 'Compra';
  lines: OperationLine[];
  subtotal: number;
  tax: number;
  total: number;
  evidenceName?: string;
}

interface InventoryProduct {
  code: string;
  name: string;
  characteristics: string;
  price: number;
  stock: number;
}

@Component({
  selector: 'app-operation-register',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './operation-register.html',
  styleUrl: './operation-register.css',
})
export class OperationRegister {
  private readonly taxRate = 0.16;
  private readonly formBuilder = new FormBuilder();
  private readonly inventory: InventoryProduct[] = [
    { code: 'TEC-001', name: 'Laptop empresarial', characteristics: 'Laptop 14 pulgadas, 16 GB RAM, SSD 512 GB', price: 18500, stock: 8 },
    { code: 'OFI-014', name: 'Silla ergonómica', characteristics: 'Respaldo alto, soporte lumbar y ajuste de altura', price: 3290, stock: 15 },
    { code: 'CON-032', name: 'Papel bond carta', characteristics: 'Resma de 500 hojas, papel blanco de 75 g', price: 125, stock: 42 },
  ];
  readonly back = output<void>();
  protected readonly registeredOperations = signal<RegisteredOperation[]>([]);
  protected readonly savedMessage = signal('');
  protected readonly productSearch = signal('');
  protected readonly selectedProduct = signal<InventoryProduct | null>(null);
  protected readonly matchingProducts = computed(() => {
    const query = this.productSearch().trim().toLowerCase();
    if (query.length < 2) return [];
    return this.inventory.filter((product) =>
      product.name.toLowerCase().includes(query) || product.code.toLowerCase().includes(query),
    );
  });
  protected readonly operationLines = signal<OperationLine[]>([]);
  protected readonly subtotal = computed(() =>
    this.operationLines().reduce((total, line) => total + line.total, 0),
  );
  protected readonly tax = computed(() => this.subtotal() * this.taxRate);
  protected readonly operationTotal = computed(() => this.subtotal() + this.tax());
  protected readonly availableStockMessage = signal('');
  protected readonly form = this.formBuilder.nonNullable.group({
    type: this.formBuilder.nonNullable.control<'Venta' | 'Compra'>('Venta'),
    product: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    characteristics: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(500)]),
    price: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(0.01)]),
    units: this.formBuilder.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    evidence: this.formBuilder.control<File | null>(null),
  });

  protected onEvidenceSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.controls.evidence.setValue(input.files?.[0] ?? null);
  }

  protected searchProducts(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.productSearch.set(input.value);
    this.selectedProduct.set(null);
  }

  protected selectProduct(product: InventoryProduct): void {
    this.selectedProduct.set(product);
    this.productSearch.set(product.name);
    this.form.controls.product.setValue(product.name);
    this.form.controls.characteristics.setValue(product.characteristics);
    this.form.controls.price.setValue(product.price);
  }

  protected addProduct(): void {
    if (this.form.controls.product.invalid || this.form.controls.characteristics.invalid || this.form.controls.price.invalid || this.form.controls.units.invalid) {
      this.form.controls.product.markAsTouched();
      this.form.controls.characteristics.markAsTouched();
      this.form.controls.price.markAsTouched();
      this.form.controls.units.markAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    if (values.type === 'Venta' && this.selectedProduct() && values.units > this.selectedProduct()!.stock) {
      this.availableStockMessage.set(`Solo hay ${this.selectedProduct()!.stock} unidades disponibles.`);
      return;
    }

    this.operationLines.update((lines) => [
      ...lines,
      {
        product: values.product.trim(),
        characteristics: values.characteristics.trim(),
        price: values.price,
        units: values.units,
        total: values.price * values.units,
        code: this.selectedProduct()?.code,
      },
    ]);
    this.availableStockMessage.set('');
    this.productSearch.set('');
    this.selectedProduct.set(null);
    this.form.patchValue({ product: '', characteristics: '', price: 0, units: 1 });
    this.form.markAsPristine();
  }

  protected removeProduct(index: number): void {
    this.operationLines.update((lines) => lines.filter((_, lineIndex) => lineIndex !== index));
  }

  protected saveOperation(): void {
    if (this.operationLines().length === 0) {
      this.savedMessage.set('Agrega al menos un producto antes de registrar la operación.');
      return;
    }

    const values = this.form.getRawValue();
    const operation: RegisteredOperation = {
      type: values.type,
      lines: this.operationLines(),
      subtotal: this.subtotal(),
      tax: this.tax(),
      total: this.operationTotal(),
      evidenceName: values.evidence?.name,
    };

    this.registeredOperations.update((operations) => [operation, ...operations]);
    this.savedMessage.set(`${operation.type} registrada correctamente.`);
    this.operationLines.set([]);
    this.productSearch.set('');
    this.selectedProduct.set(null);
    this.form.reset({ type: 'Venta', product: '', characteristics: '', price: 0, units: 1, evidence: null });
  }
}