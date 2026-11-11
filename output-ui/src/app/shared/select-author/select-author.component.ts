import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Author } from '@output/interfaces';
import { SelectEntityComponent } from '../../shared/select-entity/select-entity.component';

@Component({
    selector: 'app-select-author',
    templateUrl: './select-author.component.html',
    styleUrl: './select-author.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class SelectAuthorComponent extends SelectEntityComponent<Author> {

  override getValue(ent: Author = this.ent): string {
    return ent ? `${ent.last_name}, ${ent.first_name}` : '';
  }

  displayAuthor = (value: string | number | null): string => {
    if (typeof value !== 'number') return value ?? '';
    const author = this.ents?.find(author => author.id === value);
    return author ? this.getValue(author) : '';
  };

  override test(value: string | number) {
    // Autocomplete writes the selected ID before the text filtering runs.
    return super.test(this.displayAuthor(value));
  }

  override selectedEnt(event: MatAutocompleteSelectedEvent): void {
    if (this.disabled) return;
    const author = this.ents.find(author => author.id === event.option.value);
    if (!author) return;
    this.ent = author;
    this.form.get('input').setValue(this.resetOnSelect ? '' : this.getValue(author));
    this.selected.next(author);
  }

  override setValue(ent: any, value: string) {
    let split = value.split(', ')
    if (split.length !== 2) split = [value, '']
    ent.last_name = split[0]
    ent.first_name = split[1]
  }
}
