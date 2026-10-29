import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-start',
    templateUrl: './start.component.html',
    styleUrls: ['./start.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class StartComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
