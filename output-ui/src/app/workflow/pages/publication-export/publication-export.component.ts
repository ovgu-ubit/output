import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from 'src/app/administration/services/config.service';
import { TableComponent } from 'src/app/table/table-component/table.component';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { ExportWorkflow } from '../../../../../../output-interfaces/Workflow';
import { ExportWorkflowFormComponent } from '../../dialogs/export-workflow-form/export-workflow-form.component';
import { ExportWorkflowService } from '../../export-workflow.service';

@Component({
  selector: 'app-publication-export',
  templateUrl: './publication-export.component.html',
  styleUrl: './publication-export.component.css',
  standalone: false
})
export class PublicationExportComponent implements TableParent<ExportWorkflow>, OnInit {
  formComponent = ExportWorkflowFormComponent;
  buttons: TableButton[] = [
    { title: 'Export aus Datei hinzufügen', action_function: this.import.bind(this) }
  ];
  not_selectable?: boolean = true;

  common_headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'version', colTitle: 'Version', type: 'number' },
  ];

  draft_headers: TableHeader[] = [
    { colName: 'modified_at', colTitle: 'Zuletzt geändert', type: 'datetime' },
  ];

  published_headers: TableHeader[] = [
    { colName: 'last_run_status', colTitle: 'Letzter Lauf Status' },
    { colName: 'last_run_finished_at', colTitle: 'Letzter Lauf beendet', type: 'datetime' },
    { colName: 'last_run_log_link', colTitle: 'Letzter Lauf Log', type: 'route-link' },
    { colName: 'published_at', colTitle: 'Veröffentlicht', type: 'datetime' },
  ];

  archived_headers: TableHeader[] = [
    { colName: 'deleted_at', colTitle: 'Archiviert', type: 'datetime' },
  ];

  headers: TableHeader[] = this.common_headers.concat(this.published_headers);

  indexOptions = {
    type: 'published'
  };

  @ViewChild(TableComponent) table: TableComponent<ExportWorkflow, ExportWorkflow>;
  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;

  constructor(
    public exportWorkflowService: ExportWorkflowService,
    private snackBar: MatSnackBar,
    private router: Router,
    private configService: ConfigService
  ) { }

  ngOnInit(): void {
    void this.configService;
  }

  getName() {
    let res = 'Export-Workflows';
    if (this.indexOptions.type === 'draft') res += ' (Entwürfe)';
    else if (this.indexOptions.type === 'published') res += ' (Aktiv)';
    else if (this.indexOptions.type === 'archived') res += ' (Archiviert)';
    return res;
  }

  async edit(workflow: ExportWorkflow) {
    if (await firstValueFrom(this.exportWorkflowService.isLocked(workflow.id!))) {
      this.snackBar.open('Workflow wird gerade bearbeitet, bitte warten.', 'Na gut...', {
        duration: 5000,
        panelClass: ['danger-snackbar'],
        verticalPosition: 'top'
      });
      return;
    }
    if (this.indexOptions.type === 'published') this.router.navigate(['/workflow/publication_export/' + workflow.id + '/action']);
    else this.router.navigate(['/workflow/publication_export/' + workflow.id + '/general']);
  }

  add() {
    this.router.navigate(['/workflow/publication_export/new/overview']);
  }

  getLink() {
    return '/workflow/publication_export';
  }

  getLabel() {
    return '/Workflows/Publikationsexport';
  }

  change(event: any) {
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

  import() {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      this.snackBar.open('Bitte eine JSON-Datei auswaehlen.', 'Nagut...', {
        duration: 5000,
        panelClass: ['danger-snackbar'],
        verticalPosition: 'top'
      });
      return;
    }
    this.exportWorkflowService.importWorkflow(file).subscribe({
      next: () => {
        this.snackBar.open('Export-Workflow wurde hinzugefuegt.', 'Super!', {
          duration: 5000,
          panelClass: ['success-snackbar'],
          verticalPosition: 'top'
        });
        this.table.updateData().subscribe();
      },
      error: () => {
        this.snackBar.open('Import fehlgeschlagen.', 'Ok...', {
          duration: 5000,
          panelClass: ['danger-snackbar'],
          verticalPosition: 'top'
        });
      }
    });
  }
}
