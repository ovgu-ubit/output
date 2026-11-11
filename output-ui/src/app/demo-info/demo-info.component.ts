import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-demo-info',
  templateUrl: './demo-info.component.html',
  styleUrls: ['./demo-info.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class DemoInfoComponent {}
