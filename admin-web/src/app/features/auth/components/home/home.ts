import { Component, signal } from '@angular/core';
import { Inventory } from '../inventory/inventory';
import { OperationRegister } from '../operation-register/operation-register';

type HomeSection = 'dashboard' | 'operations' | 'inventory';

@Component({
  selector: 'app-home',
  imports: [Inventory, OperationRegister],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly activeSection = signal<HomeSection>('dashboard');
  protected readonly sidebarCollapsed = signal(false);

  protected showSection(section: HomeSection): void {
    this.activeSection.set(section);
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }
}
