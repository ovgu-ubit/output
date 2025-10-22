import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BreadcrumpComponent } from './breadcrump.component';

describe('BreadcrumpComponent', () => {
  let component: BreadcrumpComponent;
  let fixture: ComponentFixture<BreadcrumpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BreadcrumpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BreadcrumpComponent);
    component = fixture.componentInstance;
    component.path = "/bla/blub/blablub";
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create four labels', () => {
    expect(component.labels.length).toBe(4);
  });

  it('should create four links', () => {
    expect(component.links.length).toBe(4);
  });

  it('should create correct links and labels', () => {
    expect(component.links[0]).toBe('/');
    expect(component.labels[0]).toBe('home');
    expect(component.links[1]).toBe('/bla/');
    expect(component.labels[1]).toBe('bla');
    expect(component.links[2]).toBe('/bla/blub/');
    expect(component.labels[2]).toBe('blub');
    expect(component.links[3]).toBe('/bla/blub/blablub/');
    expect(component.labels[3]).toBe('blablub');
  });
});
