import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TableComponent } from 'src/app/table/table-component/table.component';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { ValidationWorkflow } from '../../../../../../output-interfaces/Workflow';
import { ValidationWorkflowFormComponent } from '../../dialogs/validation-workflow-form/validation-workflow-form.component';
import { ValidationWorkflowService } from '../../validation-workflow.service';

@Component({
  selector: 'app-publication-validation',
  templateUrl: './publication-validation.component.html',
  styleUrl: './publication-validation.component.css',
  standalone: false
})
export class PublicationValidationComponent implements TableParent<ValidationWorkflow>, OnInit {
  formComponent = ValidationWorkflowFormComponent;
  buttons: TableButton[] = [];
  not_selectable?: boolean = true;

  common_headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'version', colTitle: 'Version', type: 'number' },
    { colName: 'target', colTitle: 'Target' },
  ];

  draft_headers: TableHeader[] = [
    { colName: 'modified_at', colTitle: 'Zuletzt geaendert', type: 'datetime' },
  ];

  published_headers: TableHeader[] = [
    { colName: 'last_run_status', colTitle: 'Letzter Lauf Status' },
    { colName: 'last_run_finished_at', colTitle: 'Letzter Lauf beendet', type: 'datetime' },
    { colName: 'last_run_log_link', colTitle: 'Letzter Lauf Log', type: 'route-link' },
    { colName: 'published_at', colTitle: 'Veroeffentlicht', type: 'datetime' },
  ];

  archived_headers: TableHeader[] = [
    { colName: 'deleted_at', colTitle: 'Archiviert', type: 'datetime' },
  ];

  headers: TableHeader[] = this.common_headers.concat(this.published_headers);

  indexOptions = {
    type: 'published'
  };

  @ViewChild(TableComponent) table: TableComponent<ValidationWorkflow, ValidationWorkflow>;

  constructor(
    public validationWorkflowService: ValidationWorkflowService,
    private snackBar: MatSnackBar,
    private router: Router,
  ) { }

  ngOnInit(): void {
  }

  getName() {
    let res = 'Validation-Workflows';
    if (this.indexOptions.type === 'draft') res += ' (Entwuerfe)';
    else if (this.indexOptions.type === 'published') res += ' (Aktiv)';
    else if (this.indexOptions.type === 'archived') res += ' (Archiviert)';
    return res;
  }

  async edit(workflow: ValidationWorkflow) {
    if (await firstValueFrom(this.validationWorkflowService.isLocked(workflow.id!))) {
      this.snackBar.open('Workflow wird gerade bearbeitet, bitte warten.', 'OK', {
        duration: 5000,
        panelClass: ['danger-snackbar'],
        verticalPosition: 'top'
      });
      return;
    }
    if (this.indexOptions.type === 'published') this.router.navigate(['/workflow/publication_validation/' + workflow.id + '/action']);
    else this.router.navigate(['/workflow/publication_validation/' + workflow.id + '/general']);
  }

  add() {
    this.router.navigate(['/workflow/publication_validation/new/overview']);
  }

  getLink() {
    return '/workflow/publication_validation';
  }

  getLabel() {
    return '/Workflows/Publikationsvalidierung';
  }

  change(event: { value: 'draft' | 'published' | 'archived' }) {
    this.indexOptions = {
      type: event.value
    };
    switch (event.value) {
      case 'draft':
        this.headers = this.common_headers.concat(this.draft_headers);
        break;
      case 'published':
        this.headers = this.common_headers.concat(this.published_headers);
        break;
      case 'archived':
        this.headers = this.common_headers.concat(this.archived_headers);
        break;
    }

    this.table.updateData().subscribe();
  }
}
