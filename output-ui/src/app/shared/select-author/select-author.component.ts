import { Component, OnChanges } from '@angular/core';
import { Author } from '../../../../../output-interfaces/Publication';
import { SelectEntityComponent } from '../../shared/select-entity/select-entity.component';

@Component({
  selector: 'app-select-author',
  templateUrl: './select-author.component.html',
  styleUrl: './select-author.component.css'
})
export class SelectAuthorComponent extends SelectEntityComponent<Author> {

  override getValue(ent?: Author) {
    if (ent) return ent['last_name'] + ', ' + ent['first_name']
    return this.ent['last_name'] + ', ' + this.ent['first_name']
  }
  override setValue(ent: any, value: string) {
    let split = value.split(', ')
    if (split.length !== 2) split = [value, '']
    ent.last_name = split[0]
    ent.first_name = split[1]
  }
}
