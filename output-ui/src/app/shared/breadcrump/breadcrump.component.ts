import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'app-breadcrump',
    templateUrl: './breadcrump.component.html',
    styleUrls: ['./breadcrump.component.css'],
    standalone: false
})

export class BreadcrumpComponent implements OnInit {

  @Input() path: string;
  @Input() label: string;

  labels: string[];
  links: string[];

  constructor() { }

  ngOnInit(): void {
    if (!this.label) {
      if (this.path === '/') {
        this.labels = ['home'];
        this.links = ['/'];
      } else {
        this.labels = this.path.split('/');
        this.labels[0] = 'home';
        this.links = [...this.labels];
        this.links[0] = '/';
        let tmplink: string = '/';
        for (let i = 1; i < this.labels.length; i++) {
          this.links[i] = `${tmplink}${this.labels[i].replace(/[^a-zA-Z0-9-_]/g, '')}/`;

          tmplink = this.links[i];
        }
      }
    } else {
      if (this.path === '/') {
        this.labels = ['Home'];
        this.links = ['/'];
      } else {
        this.labels = this.label.split('/');
        this.labels[0] = 'Home';
        this.links = this.path.split('/');
        this.links[0] = '/';
        let tmplink: string = '/';
        for (let i = 1; i < this.labels.length; i++) {
          this.links[i] = `${tmplink}${this.links[i].replace(/[^a-zA-Z0-9-_]/g, '')}/`;

          tmplink = this.links[i];
        }
      }
    }
  }

}
