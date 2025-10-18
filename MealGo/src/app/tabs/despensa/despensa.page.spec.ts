import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DespensaPage } from './despensa.page';

describe('DespensaPage', () => {
  let component: DespensaPage;
  let fixture: ComponentFixture<DespensaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DespensaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});