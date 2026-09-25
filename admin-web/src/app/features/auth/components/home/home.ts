import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Inventory } from '../inventory/inventory';
import { OperationRegister } from '../operation-register/operation-register';
import { Settings } from '../settings/settings';
import { Billing } from '../billing/billing';
import { Clients } from '../clients/clients';

type HomeSection = 'dashboard' | 'operations' | 'inventory' | 'clients' | 'billing' | 'settings';
type Theme = 'official' | 'dark' | 'light';

@Component({
  selector: 'app-home',
  imports: [Billing, Clients, Inventory, OperationRegister, Settings],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly document = inject(DOCUMENT);
  protected readonly activeSection = signal<HomeSection>('dashboard');
  protected readonly sidebarCollapsed = signal(false);
  protected readonly theme = signal<Theme>(this.getStoredTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  protected showSection(section: HomeSection): void {
    this.activeSection.set(section);
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  protected selectTheme(theme: Theme): void {
    this.theme.set(theme);
    this.applyTheme(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('admin-web-theme', theme);
    }
  }

  private getStoredTheme(): Theme {
    if (typeof localStorage === 'undefined') return 'official';
    const storedTheme = localStorage.getItem('admin-web-theme');
    return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'official';
  }

  private applyTheme(theme: Theme): void {
    this.document.body.classList.remove('theme-official', 'theme-dark', 'theme-light');
    this.document.body.classList.add(`theme-${theme}`);
  }
}
