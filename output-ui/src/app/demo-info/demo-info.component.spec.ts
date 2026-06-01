import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '../shared/shared.module';
import { DemoInfoComponent } from './demo-info.component';

describe('DemoInfoComponent', () => {
  let fixture: ComponentFixture<DemoInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DemoInfoComponent],
      imports: [SharedModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoInfoComponent);
    fixture.detectChanges();
  });

  it('shows the demo legal information sections', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Impressum');
    expect(text).toContain('Datenschutz');
    expect(text).toContain('Lizenz');
  });
});
