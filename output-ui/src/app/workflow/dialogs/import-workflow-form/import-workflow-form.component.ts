import { AfterViewInit, Component, OnInit } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { filter, map, Observable, shareReplay, startWith, switchMap } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportWorkflow } from '../../../../../../output-interfaces/Workflow';
import { WorkflowService } from '../../workflow.service';
import { ImportFormFacade } from './import-form-facade.service';

@Component({
  selector: 'app-import-workflow-form',
  templateUrl: './import-workflow-form.component.html',
  styleUrl: './import-workflow-form.component.css',
  standalone: true,
  imports: [
    SharedModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule
  ], providers: [
    ImportFormFacade
  ]
})
export class ImportWorkflowFormComponent implements OnInit, AfterViewInit {

  constructor(protected facade: ImportFormFacade, private route: ActivatedRoute) { }

  id: string;
  entity: ImportWorkflow;
  opened = true;

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(pm => Number(pm.get('id'))),
      filter(id => !Number.isNaN(id))
    ).subscribe(id => this.facade.load(id));
  }

  ngAfterViewInit(): void {

  }

  abort() {
    console.log(this.entity)
  }

  action() {

  }

  toggle() {
    this.opened = !this.opened;
  }

  getLink() {
    return "/workflow/publication_import/" + (this.id ?? "neu");
  }
}
