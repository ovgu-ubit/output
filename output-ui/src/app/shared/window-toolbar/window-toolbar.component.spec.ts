import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { WindowToolbarComponent } from './window-toolbar.component';

describe('WindowToolbarComponent', () => {
  let component: WindowToolbarComponent;
  let fixture: ComponentFixture<WindowToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatIconModule,
        MatToolbarModule
      ],
      declarations: [ WindowToolbarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WindowToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
