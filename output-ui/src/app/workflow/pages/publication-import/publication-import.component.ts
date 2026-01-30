import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { ImportWorkflow } from '../../../../../../output-interfaces/Workflow';
import { WorkflowService } from '../../workflow.service';
import { ImportWorkflowFormComponent } from '../../dialogs/import-workflow-form/import-workflow-form.component';

@Component({
  selector: 'app-publication-import',
  templateUrl: './publication-import.component.html',
  styleUrl: './publication-import.component.css',
  standalone: false
})
export class PublicationImportComponent implements TableParent<ImportWorkflow>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = ImportWorkflowFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'version', colTitle: 'Version', type: 'number' },
    { colName: 'modified_at', colTitle: 'Zuletzt geändert', type: 'datetime' },
    { colName: 'published_at', colTitle: 'Veröffentlicht', type: 'datetime' },
    { colName: 'deleted_at', colTitle: 'Archiviert', type: 'datetime' },
  ];

  constructor(public workflowService: WorkflowService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Import-Workflows';
  }

  getLink() {
    return '/workflow/publication_import'
  }

  getLabel() {
    return '/Workflows/Publikationsimport'
  }
}
