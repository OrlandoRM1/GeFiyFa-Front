import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the operation register section', () => {
    const operationsButton = fixture.nativeElement.querySelectorAll('.nav-item')[1] as HTMLButtonElement;
    operationsButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-operation-register')).toBeTruthy();
  });
});
