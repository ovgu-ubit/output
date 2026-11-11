import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-window-toolbar',
    templateUrl: './window-toolbar.component.html',
    styleUrl: './window-toolbar.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule]
})
export class WindowToolbarComponent {
  @Input() name: string;
  @Input() disabled: boolean;
  @Input() parent: any;
  @Input() lockable? = false;
  @Input() maximizeable? = false;
}
