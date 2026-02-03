import { Component, OnInit, ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { ImportWorkflow } from '../../../../../../output-interfaces/Workflow';
import { WorkflowService } from '../../workflow.service';
import { ImportWorkflowFormComponent } from '../../dialogs/import-workflow-form/import-workflow-form.component';
import { TableComponent } from 'src/app/table/table-component/table.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-publication-import',
  templateUrl: './publication-import.component.html',
  styleUrl: './publication-import.component.css',
  standalone: false
})
export class PublicationImportComponent implements TableParent<ImportWorkflow>, OnInit {
  formComponent = ImportWorkflowFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'version', colTitle: 'Version', type: 'number' },
    { colName: 'modified_at', colTitle: 'Zuletzt geändert', type: 'datetime' },
    { colName: 'published_at', colTitle: 'Veröffentlicht', type: 'datetime' },
    { colName: 'deleted_at', colTitle: 'Archiviert', type: 'datetime' },
  ];

  indexOptions = {
    type: 'draft'
  }

  @ViewChild(TableComponent) table: TableComponent<ImportWorkflow, ImportWorkflow>;

  constructor(public workflowService: WorkflowService, private snackBar: MatSnackBar, private router:Router) { }

  publishedButtons: TableButton[] =[{ title: 'Neue Entwurfsversion erstellen', action_function: this.fork.bind(this) }]
  draftButtons: TableButton[] = [{ title: 'Veröffentlichen', action_function: this.publish.bind(this) }]
  
  buttons: TableButton[] = this.draftButtons;

  ngOnInit(): void {
  }

  getName() {
    let res = 'Import-Workflows'
    if (this.indexOptions.type === 'draft') res +=' (Entwürfe)'
    else if (this.indexOptions.type === 'published') res +=' (Aktiv)'
    else if (this.indexOptions.type === 'archived') res +=' (Archiviert)'
    return res;
  }

  edit(workflow: ImportWorkflow) {
   this.router.navigate(["/workflow/publication_import/"+workflow.id]); 
  }

  getLink() {
    return '/workflow/publication_import'
  }

  getLabel() {
    return '/Workflows/Publikationsimport'
  }

  change(event:any) {
    this.indexOptions = {
      type: event.value
    }
    if (event.value === 'draft') this.buttons = this.draftButtons;
    else if (event.value === 'published') this.buttons = this.publishedButtons;
    else this.buttons = [];
    this.table.updateData().subscribe();
  }

  fork() {
    if (this.table.selection.selected.length !== 1) {
      this.snackBar.open('Bitte wählen Sie genau ein Element aus.', 'Alles klar!', {
          duration: 5000,
          panelClass: ['error-snackbar'],
          verticalPosition: 'top'
        });
      return;
    }
    //create new workflow from selected version and edit it
    let nextVersion:ImportWorkflow = {...this.table.selection.selected[0]}
    nextVersion.id = undefined;
    nextVersion.version = nextVersion.version + 1;
    nextVersion.deleted_at = null;
    nextVersion.published_at = null;
    nextVersion.created_at = null;
    nextVersion.modified_at = null;

    this.table.edit(nextVersion);
  }

  publish() {
    if (this.table.selection.selected.length !== 1) {
      this.snackBar.open('Bitte wählen Sie genau ein Element aus.', 'Alles klar!', {
          duration: 5000,
          panelClass: ['error-snackbar'],
          verticalPosition: 'top'
        });
      return;
    }
    let elem = this.table.selection.selected[0];
    elem.published_at = new Date();

    this.workflowService.update(elem).subscribe({
      next: data => {
        this.table.updateData().subscribe();
      }
    });
  }
}
