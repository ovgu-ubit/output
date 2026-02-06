import { Component, OnInit, ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { ImportWorkflow } from '../../../../../../output-interfaces/Workflow';
import { WorkflowService } from '../../workflow.service';
import { ImportWorkflowFormComponent } from '../../dialogs/import-workflow-form/import-workflow-form.component';
import { TableComponent } from 'src/app/table/table-component/table.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ConfigService } from 'src/app/administration/services/config.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-publication-import',
  templateUrl: './publication-import.component.html',
  styleUrl: './publication-import.component.css',
  standalone: false
})
export class PublicationImportComponent implements TableParent<ImportWorkflow>, OnInit {
  formComponent = ImportWorkflowFormComponent;
  buttons = [];
  not_selectable?: boolean = true;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'version', colTitle: 'Version', type: 'number' },
    { colName: 'modified_at', colTitle: 'Zuletzt geändert', type: 'datetime' },
    { colName: 'published_at', colTitle: 'Veröffentlicht', type: 'datetime' },
    { colName: 'deleted_at', colTitle: 'Archiviert', type: 'datetime' },
  ];

  indexOptions = {
    type: 'published'
  }

  @ViewChild(TableComponent) table: TableComponent<ImportWorkflow, ImportWorkflow>;

  constructor(public workflowService: WorkflowService, private _snackBar: MatSnackBar, private router: Router, private configService:ConfigService) { }

  ngOnInit(): void {
  }

  getName() {
    let res = 'Import-Workflows'
    if (this.indexOptions.type === 'draft') res += ' (Entwürfe)'
    else if (this.indexOptions.type === 'published') res += ' (Aktiv)'
    else if (this.indexOptions.type === 'archived') res += ' (Archiviert)'
    return res;
  }

  async edit(workflow: ImportWorkflow) {
    if (await firstValueFrom(this.workflowService.isLocked(workflow.id))) {
      this._snackBar.open('Workflow wird gerade bearbeitet, bitte warten.', 'Nagut', {
        duration: 5000,
        panelClass: ['danger-snackbar'],
        verticalPosition: 'top'
      })
      return;
    }
    this.router.navigate(["/workflow/publication_import/" + workflow.id + "/overview"]);
  }

  getLink() {
    return '/workflow/publication_import'
  }

  getLabel() {
    return '/Workflows/Publikationsimport'
  }

  change(event: any) {
    this.indexOptions = {
      type: event.value
    }
    this.table.updateData().subscribe();
  }
}
