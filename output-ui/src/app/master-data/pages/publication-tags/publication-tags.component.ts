import { PublicationTagFormComponent } from '../../../form/publication-tag-form/publication-tag-form.component';
import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PublicationTag, PublicationTagIndex } from '@output/interfaces';
import { SharedModule } from '../../../shared/shared.module';
import { TableModule } from '../../../table/table.module';
import { TableComponent } from '../../../table/table-component/table.component';
import { TableHeader, TableParent } from '../../../table/table.interface';
import { PublicationTagService } from '../../../services/entities/publication-tag.service';
import { ErrorPresentationService } from '../../../core/errors/error-presentation.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  standalone: true,
  imports: [SharedModule, TableModule],
  template: `<app-breadcrump path="/master-data/publication-tags" label="/Stammdaten/Publikations-Tags" />
    <appTable name="Publikations-Tags" nameSingle="Publikations-Tag" [headers]="headers" [parent]="this" [serviceClass]="service" [formComponent]="formComponent" [deleteable]="false" />`,
})
export class PublicationTagsComponent implements TableParent<PublicationTagIndex> {
  @ViewChild(TableComponent) table: TableComponent<PublicationTagIndex, PublicationTag>;
  formComponent = PublicationTagFormComponent;
  saving = false;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' }, { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'description', colTitle: 'Beschreibung' }, { colName: 'color', colTitle: 'Farbe' },
    { colName: 'usage_count', colTitle: 'Zuordnungen', type: 'number' },
  ];
  buttons = [{ title: 'Ausgewählte Tags löschen', action_function: () => this.remove(), roles: ['admin'] }];
  constructor(public service: PublicationTagService, private dialog: MatDialog, private errors: ErrorPresentationService) { }
  remove() {
    const selected = [...this.table.selection.selected];
    if (!selected.length || this.saving) return;
    const count = selected.reduce((sum, tag) => sum + Number(tag.usage_count), 0);
    this.dialog.open(ConfirmDialogComponent, { data: new ConfirmDialogModel('Tags löschen',
      `${selected.length} Tag(s) mit ${count} Zuordnung(en) endgültig löschen? Bestehende Zuordnungen werden entfernt.`) })
      .afterClosed().subscribe(confirmed => {
        if (!confirmed) return;
        this.saving = true;
        this.service.delete(selected.map(tag => tag.id!)).subscribe({
          next: () => { this.saving = false; this.table.selection.clear(); this.table.updateData().subscribe(); },
          error: error => { this.saving = false; this.errors.present(error, { action: 'delete', entity: 'Publikations-Tags' }); },
        });
      });
  }
}
