import { Component,OnInit,Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UpdateMapping, UpdateOptions } from '../../../../../output-interfaces/Config';
import { ImportService } from 'src/app/administration/services/import.service';
import { EnrichService } from 'src/app/administration/services/enrich.service';

@Component({
  selector: 'app-import-config',
  templateUrl: './import-config.component.html',
  styleUrls: ['./import-config.component.css']
})
export class ImportConfigComponent implements OnInit {
  constructor(public dialogRef: MatDialogRef<ImportConfigComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private importService:ImportService, private enrichService:EnrichService) {}

  import;
  enrich;
  mapping: UpdateMapping;
  keys;

  ngOnInit(): void {
    this.import = this.data.import;
    this.enrich = this.data.enrich;
    let ob$;
    if (this.import) ob$ = this.importService.getConfig(this.import.path)
    else ob$ = this.enrichService.getConfig(this.enrich.path);
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

  action() {let ob$;
    if (this.import) ob$ = this.importService.setConfig(this.import.path, this.mapping)
    else ob$ = this.enrichService.setConfig(this.enrich.path, this.mapping)
    
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
