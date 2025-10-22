import { Component, Input } from '@angular/core';
import { EntityFormComponent } from 'src/app/services/entities/service.interface';

@Component({
  selector: 'app-window-toolbar',
  templateUrl: './window-toolbar.component.html',
  styleUrl: './window-toolbar.component.css'
})
export class WindowToolbarComponent {
  @Input() name: string;
  @Input() disabled: boolean;
  @Input() parent: any;
  @Input() lockable? = false;
}
