import { AfterViewInit, Component, OnInit } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportWorkflow } from '../../../../../../output-interfaces/Workflow';
import { WorkflowService } from '../../workflow.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BreadcrumpComponent } from 'src/app/shared/breadcrump/breadcrump.component';
import { concat, concatMap, concatWith, distinctUntilChanged, filter, map, Observable, of, shareReplay, startWith, switchMap } from 'rxjs';

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
  ]
})
export class ImportWorkflowFormComponent implements OnInit, AfterViewInit {

  constructor(private workflowService: WorkflowService, private route: ActivatedRoute) { }

  id: string;
  entity: ImportWorkflow;
  opened = true;
  label$:Observable<string> = this.route.paramMap.pipe(
  map(pm => pm.get('id')),
    filter((id): id is string => id !== null),
    switchMap(id => this.workflowService.getOne(+id)),
    map(entity => {
        this.entity = entity;
        return `/Workflows/Publikationsimport/${entity.label} (${entity.version})`
      }
    ),
    startWith('/Workflows/Publikationsimport/'),
    shareReplay({ bufferSize: 1, refCount: true })
);

  ngOnInit(): void {
    
  }

  ngAfterViewInit(): void {

  }

  abort() {
    console.log(this.entity)
  }

  action() {

  }

  getLink() {
    return "/workflow/publication_import/" + (this.id ?? "neu");
  }
}
