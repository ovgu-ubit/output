import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Config, GroupedConfig } from '../../../../../../output-interfaces/Config';
import { ConfigService } from '../../services/config.service';
import { MatChipEditedEvent, MatChipInputEvent } from '@angular/material/chips';
import {COMMA, ENTER} from '@angular/cdk/keycodes';

interface EditableConfig extends GroupedConfig {
  editedValue: string[];
}

@Component({
    selector: 'app-config',
    templateUrl: './config.component.html',
    styleUrls: ['./config.component.css'],
    standalone: false
})
export class ConfigComponent implements OnInit {

  displayedColumns = ['key', 'value'];
  configs: EditableConfig[] = [];
  loading = false;
  busy = false;
  separatorKeys = [ENTER, COMMA]

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
          editedValue: config.values ?? []
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
    return (config.values ?? []) !== config.editedValue;
  }

  save(config: EditableConfig) {
    if (!this.isDirty(config) || this.busy) {
      return;
    }
    this.busy = true;
    const payload = config.editedValue;
    this.configService.set(config.key, payload).subscribe({
      next: (updated) => {
        config.values = updated.values ?? null;
        config.editedValue = updated.values ?? [];
        this.busy = false;
        this.snackBar.open('Konfiguration gespeichert.', 'Schließen', {
          duration: 3000,
          panelClass: ['success-snackbar'],
          verticalPosition: 'top'
        });
      },
      error: () => {
        this.busy = false;
        this.snackBar.open('Konfiguration konnte nicht gespeichert werden.', 'Schließen', {
          duration: 5000,
          panelClass: ['error-snackbar'],
          verticalPosition: 'top'
        });
      }
    });
  }

  isArray(config: EditableConfig) {
    return ["test"].some(e => config.key === e)
  }

  add(config: EditableConfig, event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      config.editedValue.push(value)
    }
    // Clear the input value
    event.chipInput!.clear();
  }

  remove(config: EditableConfig, value:string): void {
    config.editedValue = config.editedValue.filter(e => e !== value)
  }

  edit(config: EditableConfig, origValue:string, event: MatChipEditedEvent) {
    const value = event.value.trim();
    if (!value) return this.remove(config, origValue);
    config.editedValue = config.editedValue.map(e => e === origValue? value : e)
  }

  reset(config: EditableConfig) {
    config.editedValue = config.values ?? [];
  }

  getLink() {
    return '/administration/config';
  }

  getLabel() {
    return '/Verwaltung/Konfiguration';
  }
}
