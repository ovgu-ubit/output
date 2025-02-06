import { Observable } from "rxjs";

export interface EntityService<T, E> {
    getAll():Observable<T[]>;

    index(reporting_year: number, options?:any):Observable<E[]>;

    getOne(id:number):Observable<T>;
    
    add(obj:T):Observable<T>;

    update(obj:T):Observable<T>;

    delete(ids:number[],soft?:boolean):Observable<T[]>;
    
    combine?(id1: number, ids: number[], options?: any):any;
}

export interface EntityFormComponent<T> {
}