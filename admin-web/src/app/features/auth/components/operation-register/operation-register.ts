import { DecimalPipe } from '@angular/common';
import { Component, computed, ElementRef, effect, OnDestroy, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

interface OperationLine {
  product: string;
  kind: 'Producto' | 'Materia prima';
  category: string;
  characteristics: string;
  price: number;
  units: number;
  total: number;
  code?: string;
}

interface RegisteredOperation {
  type: 'Venta' | 'Compra';
  createdAt: string;
  lines: OperationLine[];
  subtotal: number;
  tax: number;
  total: number;
  evidenceName?: string;
}

interface InventoryProduct {
  code: string;
  name: string;
  kind: 'Producto' | 'Materia prima';
  category: string;
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
export class OperationRegister implements OnDestroy {
  private readonly taxRate = 0.16;
  private readonly formBuilder = new FormBuilder();
  private readonly inventory: InventoryProduct[] = [
    { code: 'TEC-001', name: 'Laptop empresarial', kind: 'Producto', category: 'Tecnología', characteristics: 'Laptop 14 pulgadas, 16 GB RAM, SSD 512 GB', price: 18500, stock: 8 },
    { code: 'OFI-014', name: 'Silla ergonómica', kind: 'Producto', category: 'Oficina', characteristics: 'Respaldo alto, soporte lumbar y ajuste de altura', price: 3290, stock: 15 },
    { code: 'CON-032', name: 'Papel bond carta', kind: 'Materia prima', category: 'Papelería', characteristics: 'Resma de 500 hojas, papel blanco de 75 g', price: 125, stock: 42 },
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
  protected readonly expandedOperationIndex = signal<number | null>(null);
  protected readonly subtotal = computed(() =>
    this.operationLines().reduce((total, line) => total + line.total, 0),
  );
  protected readonly tax = computed(() => this.subtotal() * this.taxRate);
  protected readonly operationTotal = computed(() => this.subtotal() + this.tax());
  protected readonly availableStockMessage = signal('');
  protected readonly cameraOpen = signal(false);
  protected readonly cameraError = signal('');
  protected readonly capturedEvidence = signal<File | null>(null);
  protected readonly evidenceMessage = signal('');
  protected readonly evidencePreviewUrl = signal('');
  private cameraStream: MediaStream | null = null;
  private readonly cameraVideo = viewChild<ElementRef<HTMLVideoElement>>('cameraVideo');

  constructor() {
    effect(() => {
      const video = this.cameraVideo();
      const stream = this.cameraStream;
      if (!this.cameraOpen() || !video || !stream) return;

      video.nativeElement.srcObject = stream;
      void video.nativeElement.play().catch(() => {
        this.cameraError.set('La cámara está activa, pero el navegador no pudo reproducir la vista previa.');
      });
    });
  }
  protected readonly form = this.formBuilder.nonNullable.group({
    type: this.formBuilder.nonNullable.control<'Venta' | 'Compra'>('Venta'),
    product: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    code: this.formBuilder.nonNullable.control('', Validators.maxLength(20)),
    kind: this.formBuilder.nonNullable.control<'Producto' | 'Materia prima'>('Producto'),
    category: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    characteristics: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(500)]),
    price: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(0.01)]),
    units: this.formBuilder.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    evidence: this.formBuilder.control<File | null>(null),
  });

  protected onEvidenceSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.form.controls.evidence.setValue(file);
    this.capturedEvidence.set(null);
    this.setEvidencePreview(file);
    this.evidenceMessage.set(file ? `Archivo seleccionado: ${file.name}` : '');
  }

  protected async openCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Este navegador no permite usar la cámara. Usa un sitio HTTPS o localhost.');
      return;
    }

    try {
      this.cameraError.set('');
      this.closeCamera();
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      this.cameraOpen.set(true);
    } catch {
      this.cameraStream?.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
      this.cameraOpen.set(false);
      this.cameraError.set('No se pudo abrir la cámara. Revisa el permiso del navegador y vuelve a intentar.');
    }
  }

  protected takePhoto(): void {
    const video = this.cameraVideo()?.nativeElement;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.closeCamera();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `evidencia-${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.capturedEvidence.set(file);
      this.form.controls.evidence.setValue(file);
      this.setEvidencePreview(file);
      this.evidenceMessage.set(`Foto capturada: ${file.name}`);
    }, 'image/jpeg', 0.9);
  }

  protected closeCamera(): void {
    const video = this.cameraVideo()?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = null;
    this.cameraOpen.set(false);
  }

  ngOnDestroy(): void {
    this.closeCamera();
    const previewUrl = this.evidencePreviewUrl();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }

  private setEvidencePreview(file: File | null): void {
    const currentUrl = this.evidencePreviewUrl();
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    this.evidencePreviewUrl.set(file?.type.startsWith('image/') ? URL.createObjectURL(file) : '');
  }

  protected searchProducts(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.productSearch.set(input.value);
    this.selectedProduct.set(null);
  }

  protected searchProductsByCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.productSearch.set(input.value);
    this.selectedProduct.set(null);
  }

  protected selectProduct(product: InventoryProduct): void {
    this.selectedProduct.set(product);
    this.productSearch.set(product.name);
    this.form.controls.product.setValue(product.name);
    this.form.controls.code.setValue(product.code);
    this.form.controls.kind.setValue(product.kind);
    this.form.controls.category.setValue(product.category);
    this.form.controls.characteristics.setValue(product.characteristics);
    this.form.controls.price.setValue(product.price);
  }

  protected addProduct(): void {
    if ((!this.form.controls.product.value.trim() && !this.form.controls.code.value.trim()) || this.form.controls.kind.invalid || this.form.controls.category.invalid || this.form.controls.characteristics.invalid || this.form.controls.price.invalid || this.form.controls.units.invalid) {
      this.form.controls.product.markAsTouched();
      this.form.controls.code.markAsTouched();
      this.form.controls.kind.markAsTouched();
      this.form.controls.category.markAsTouched();
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
        product: values.product.trim() || values.code.trim(),
        kind: values.kind,
        category: values.category.trim(),
        characteristics: values.characteristics.trim(),
        price: values.price,
        units: values.units,
        total: values.price * values.units,
        code: values.code.trim() || this.selectedProduct()?.code,
      },
    ]);
    this.availableStockMessage.set('');
    this.productSearch.set('');
    this.selectedProduct.set(null);
    this.evidenceMessage.set('');
    this.setEvidencePreview(null);
    this.form.patchValue({ product: '', code: '', kind: 'Producto', category: '', characteristics: '', price: 0, units: 1 });
    this.form.markAsPristine();
  }

  protected removeProduct(index: number): void {
    this.operationLines.update((lines) => lines.filter((_, lineIndex) => lineIndex !== index));
  }

  protected toggleOperationDetails(index: number): void {
    this.expandedOperationIndex.update((currentIndex) => currentIndex === index ? null : index);
  }

  protected editOperation(index: number): void {
    const operation = this.registeredOperations()[index];
    if (!operation) return;

    this.operationLines.set(operation.lines.map((line) => ({ ...line })));
    this.form.patchValue({ type: operation.type, product: '', code: '', kind: 'Producto', category: '', characteristics: '', price: 0, units: 1 });
    this.registeredOperations.update((operations) => operations.filter((_, operationIndex) => operationIndex !== index));
    this.expandedOperationIndex.set(null);
    this.savedMessage.set(`Editando la operación con ${operation.lines.length} producto(s).`);
  }

  protected deleteOperation(index: number): void {
    this.registeredOperations.update((operations) => operations.filter((_, operationIndex) => operationIndex !== index));
    this.expandedOperationIndex.set(null);
    this.savedMessage.set('Operación eliminada del historial de esta sesión.');
  }

  protected saveOperation(): void {
    if (this.operationLines().length === 0) {
      this.savedMessage.set('Agrega al menos un producto antes de registrar la operación.');
      return;
    }

    const values = this.form.getRawValue();
    const lines = this.operationLines().map((line) => ({ ...line }));
    const operation: RegisteredOperation = {
      type: values.type,
      createdAt: new Date().toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      lines,
      subtotal: lines.reduce((total, line) => total + line.total, 0),
      tax: lines.reduce((total, line) => total + line.total, 0) * this.taxRate,
      total: lines.reduce((total, line) => total + line.total, 0) * (1 + this.taxRate),
      evidenceName: values.evidence?.name,
    };

    this.registeredOperations.update((operations) => [operation, ...operations]);
    this.savedMessage.set(`${operation.type} con ${operation.lines.length} producto(s) registrada correctamente.`);
    this.operationLines.set([]);
    this.expandedOperationIndex.set(null);
    this.productSearch.set('');
    this.selectedProduct.set(null);
    this.form.reset({ type: 'Venta', product: '', code: '', kind: 'Producto', category: '', characteristics: '', price: 0, units: 1, evidence: null });
  }
}