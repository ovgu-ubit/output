import { ComponentType } from "@angular/cdk/portal";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { Observable } from "rxjs";
import { AuthorizationService } from "../security/authorization.service";
import { FormBuilder } from "@angular/forms";
import { AuthorService } from "../services/entities/author.service";
import { InstituteService } from "../services/entities/institute.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Component, Inject } from "@angular/core";

export interface EntityService<T, E> {
    getAll():Observable<T[]>;

    index(reporting_year: number):Observable<E[]>;

    getOne(id:number):Observable<T>;
    
    add(obj:T):Observable<T>;

    update(obj:T):Observable<T>;

    delete(ids:number[]):Observable<T[]>;
    
    combine(id1: number, ids: number[], options?: any):any;
}

export interface EntityFormComponent<T> {
    action();
    close();
    abort();
}