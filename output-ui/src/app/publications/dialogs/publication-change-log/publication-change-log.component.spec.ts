import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { PublicationChangeLogComponent } from './publication-change-log.component';

describe('PublicationChangeLogComponent', () => {
  let component: PublicationChangeLogComponent;
  let fixture: ComponentFixture<PublicationChangeLogComponent>;
  let publicationService: jasmine.SpyObj<PublicationService>;

  beforeEach(async () => {
    publicationService = jasmine.createSpyObj<PublicationService>('PublicationService', ['getChanges']);
    publicationService.getChanges.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [PublicationChangeLogComponent],
      imports: [SharedModule],
      providers: [
        { provide: PublicationService, useValue: publicationService }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PublicationChangeLogComponent);
    component = fixture.componentInstance;
  });

  it('loads publication changes when a publication id is provided', () => {
    component.publicationId = 42;

    component.ngOnChanges({
      publicationId: {
        currentValue: 42,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(publicationService.getChanges).toHaveBeenCalledWith(42);
  });
});
