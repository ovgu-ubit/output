import { UntypedFormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { TableComponent } from './table.component';

describe('TableComponent', () => {
  function createComponent(dialogResult: unknown, serviceUpdate = jasmine.createSpy('update').and.returnValue(of({}))) {
    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.returnValue({
      afterClosed: () => of(dialogResult)
    });

    const component = new TableComponent(
      new UntypedFormBuilder(),
      jasmine.createSpyObj('MatSnackBar', ['open']),
      dialog,
      jasmine.createSpyObj('AuthorizationService', ['hasRole']),
      jasmine.createSpyObj('Location', ['replaceState']),
      { url: '/status' } as never,
      {} as never,
      {} as never,
      {} as never,
      jasmine.createSpyObj('ErrorPresentationService', ['present'])
    );

    component.serviceClass = {
      update: serviceUpdate
    } as never;
    component.formComponent = {} as never;
    component.nameSingle = 'Status';

    return { component, serviceUpdate };
  }

  it('sends unlock updates for dialog results with id 0', () => {
    const unlockResult = { id: 0, locked_at: null };
    const { component, serviceUpdate } = createComponent(unlockResult);

    component.edit({ id: 0 });

    expect(serviceUpdate).toHaveBeenCalledWith(unlockResult);
  });
});
