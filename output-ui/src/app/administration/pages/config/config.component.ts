import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, OnInit } from '@angular/core';
import { MatChipEditedEvent, MatChipInputEvent } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Config } from '../../../../../../output-interfaces/Config';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ConfigService } from '../../services/config.service';

interface EditableConfig extends Config {
  editedValue: any;
}

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css'],
  standalone: false
})
export class ConfigComponent implements OnInit {
  displayedColumns = ['key', 'description', 'value', 'actions'];
  configs: EditableConfig[] = [];
  loading = false;
  busy = false;
  separatorKeys = [ENTER, COMMA];

  constructor(
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private errorPresentation: ErrorPresentationService,
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.configService.list().subscribe({
      next: (configs) => {
        this.configs = configs.map(config => ({
          ...config,
          editedValue: JSON.parse(JSON.stringify(config.value))
        }));
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorPresentation.present(error, { action: 'load', entity: 'Konfiguration' });
      }
    });
  }

  isDirty(config: EditableConfig) {
    return JSON.stringify(config.value ?? '') !== JSON.stringify(config.editedValue);
  }

  save(config: EditableConfig) {
    if (!this.isDirty(config) || this.busy) {
      return;
    }
    this.busy = true;
    const payload = config.editedValue;
    this.configService.set(config.key, payload).subscribe({
      next: (updated) => {
        config.value = updated.value;
        config.editedValue = updated.value;
        this.busy = false;
        this.snackBar.open('Konfiguration gespeichert.', 'Super!', {
          duration: 3000,
          panelClass: ['success-snackbar'],
          verticalPosition: 'top'
        });
      },
      error: (error) => {
        this.busy = false;
        this.errorPresentation.present(error, { action: 'save', entity: 'Konfiguration' });
      }
    });
  }

  getType(config: EditableConfig) {
    if (Array.isArray(config.value)) return 'array';
    return typeof config.value;
  }

  getKeys(obj: any) {
    return Object.keys(obj);
  }

  flipKey(event: { selected: boolean }, config: EditableConfig, key: string) {
    config.editedValue[key] = event.selected;
  }

  add(config: EditableConfig, event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value) {
      config.editedValue.push(value);
    }

    event.chipInput!.clear();
  }

  remove(config: EditableConfig, value: string): void {
    config.editedValue = config.editedValue.filter(e => e !== value);
  }

  edit(config: EditableConfig, origValue: string, event: MatChipEditedEvent) {
    const value = event.value.trim();
    if (!value) return this.remove(config, origValue);
    config.editedValue = config.editedValue.map(e => e === origValue ? value : e);
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
