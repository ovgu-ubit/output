import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImportService } from 'src/app/administration/services/import.service';
import { EnrichService } from 'src/app/administration/services/enrich.service';
import { UpdateMapping, UpdateOptions } from '../../../../../../output-interfaces/Config';
import { SharedModule } from 'src/app/shared/shared.module';
import { WorkflowService } from 'src/app/workflow/workflow.service';

@Component({
  selector: 'app-import-config',
  templateUrl: './import-config.component.html',
  styleUrls: ['./import-config.component.css'],
  standalone: true,
  imports: [SharedModule]
})
export class ImportConfigComponent implements OnInit {
  constructor(public dialogRef: MatDialogRef<ImportConfigComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private importService: ImportService, private enrichService: EnrichService,
    private workflowService: WorkflowService) { }

  import;
  enrich;
  workflow;
  mapping: UpdateMapping;
  keys;

  ngOnInit(): void {
    this.import = this.data.import;
    this.enrich = this.data.enrich;
    this.workflow = this.data.workflow;
    let ob$;
    if (this.import) ob$ = this.importService.getConfig(this.import.path)
    else if (this.enrich) ob$ = this.enrichService.getConfig(this.enrich.path);
    else ob$ = this.workflowService.getConfig(this.workflow.id);
    ob$.subscribe({
      next: data => {
        this.mapping = data;
        this.keys = Object.keys(this.mapping);
      }
    })
  }

  getValue(key) {
    return UpdateOptions[this.mapping[key]];
  }

  getOptions() {
    let res = [];
    for (let op in UpdateOptions) if (Number(op) >= 0) res.push(UpdateOptions[op])
    return res;
  }

  abort() {
    this.dialogRef.close(null)
  }

  action() {
    let ob$;
    if (this.import) ob$ = this.importService.setConfig(this.import.path, this.mapping)
    else if (this.enrich) ob$ = this.enrichService.setConfig(this.enrich.path, this.mapping)
    else ob$ = this.workflowService.setConfig(this.workflow.id, this.mapping)

    ob$.subscribe({
      next: data => {
        this.dialogRef.close(true)
      }
    })
  }

  getText(option) {
    if (option == 'IGNORE') return 'Ignorieren';
    else if (option == 'REPLACE') return 'Ersetzen';
    else if (option == 'REPLACE_IF_EMPTY') return 'Ersetzen wenn leer';
    else if (option == 'APPEND') return 'Hinzufügen';
    return '';
  }

}
