import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Config } from '../../../../../../output-interfaces/Config';
import { ConfigService } from '../../services/config.service';

interface EditableConfig extends Config {
  editedValue: string;
  busy?: boolean;
}

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css']
})
export class ConfigComponent implements OnInit {

  displayedColumns = ['key', 'value', 'actions'];
  configs: EditableConfig[] = [];
  loading = false;

  constructor(private configService: ConfigService, private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.configService.list().subscribe({
      next: (configs) => {
        this.configs = configs.map(config => ({
          ...config,
          editedValue: config.value ?? ''
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Konfiguration konnte nicht geladen werden.', 'Schließen', {
          duration: 5000,
          panelClass: ['error-snackbar'],
          verticalPosition: 'top'
        });
      }
    });
  }

  isDirty(config: EditableConfig) {
    return (config.value ?? '') !== config.editedValue;
  }

  save(config: EditableConfig) {
    if (!this.isDirty(config) || config.busy) {
      return;
    }
    config.busy = true;
    const payload = config.editedValue === '' ? null : config.editedValue;
    this.configService.set(config.key, payload).subscribe({
      next: (updated) => {
        config.value = updated.value ?? null;
        config.editedValue = updated.value ?? '';
        config.busy = false;
        this.snackBar.open('Konfiguration gespeichert.', 'Schließen', {
          duration: 3000,
          panelClass: ['success-snackbar'],
          verticalPosition: 'top'
        });
      },
      error: () => {
        config.busy = false;
        this.snackBar.open('Konfiguration konnte nicht gespeichert werden.', 'Schließen', {
          duration: 5000,
          panelClass: ['error-snackbar'],
          verticalPosition: 'top'
        });
      }
    });
  }

  reset(config: EditableConfig) {
    config.editedValue = config.value ?? '';
  }

  getLink() {
    return '/administration/config';
  }

  getLabel() {
    return '/Verwaltung/Konfiguration';
  }
}
