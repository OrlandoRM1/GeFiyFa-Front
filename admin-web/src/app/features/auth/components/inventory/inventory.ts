import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

type InventoryKind = 'Producto' | 'Materia prima';

interface InventoryItem {
  code: string;
  name: string;
  kind: InventoryKind;
  category: string;
  unit: string;
  stock: number;
  minimumStock: number;
  price: number;
}

@Component({
  selector: 'app-inventory',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class Inventory {
  private readonly formBuilder = new FormBuilder();
  protected readonly showForm = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly selectedKind = signal<'Todos' | InventoryKind>('Todos');
  protected readonly message = signal('');
  protected readonly items = signal<InventoryItem[]>([
    { code: 'ABR-001', name: 'Arroz blanco', kind: 'Producto', category: 'Abarrotes', unit: 'kg', stock: 38, minimumStock: 10, price: 32 },
    { code: 'ABR-002', name: 'Frijol negro', kind: 'Producto', category: 'Abarrotes', unit: 'kg', stock: 7, minimumStock: 12, price: 42 },
    { code: 'MP-001', name: 'Harina de trigo', kind: 'Materia prima', category: 'Insumos', unit: 'kg', stock: 65, minimumStock: 20, price: 18.5 },
    { code: 'BEB-004', name: 'Refresco de cola', kind: 'Producto', category: 'Bebidas', unit: 'pieza', stock: 96, minimumStock: 24, price: 19 },
  ]);
  protected readonly inventoryForm = this.formBuilder.nonNullable.group({
    code: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(20)]),
    name: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    kind: this.formBuilder.nonNullable.control<InventoryKind>('Producto'),
    category: this.formBuilder.nonNullable.control('', Validators.required),
    unit: this.formBuilder.nonNullable.control('pieza', Validators.required),
    stock: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    minimumStock: this.formBuilder.nonNullable.control(1, [Validators.required, Validators.min(0)]),
    price: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(0.01)]),
  });
  protected readonly filteredItems = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const kind = this.selectedKind();
    return this.items().filter((item) => {
      const matchesQuery = !query || item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query);
      const matchesKind = kind === 'Todos' || item.kind === kind;
      return matchesQuery && matchesKind;
    });
  });
  protected readonly lowStockCount = computed(() => this.items().filter((item) => item.stock <= item.minimumStock).length);

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateKind(event: Event): void {
    this.selectedKind.set((event.target as HTMLSelectElement).value as 'Todos' | InventoryKind);
  }

  protected toggleForm(): void {
    this.showForm.update((visible) => !visible);
    this.message.set('');
  }

  protected saveItem(): void {
    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      this.message.set('Completa los campos obligatorios para agregar el registro.');
      return;
    }

    const value = this.inventoryForm.getRawValue();
    const exists = this.items().some((item) => item.code.toLowerCase() === value.code.trim().toLowerCase());
    if (exists) {
      this.message.set('El código ya existe en el inventario.');
      return;
    }

    this.items.update((items) => [
      {
        ...value,
        code: value.code.trim().toUpperCase(),
        name: value.name.trim(),
        category: value.category.trim(),
      },
      ...items,
    ]);
    this.inventoryForm.reset({ code: '', name: '', kind: 'Producto', category: '', unit: 'pieza', stock: 0, minimumStock: 1, price: 0 });
    this.showForm.set(false);
    this.message.set('Registro agregado al inventario.');
  }
}
