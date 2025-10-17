import { Observable } from "rxjs";
import { Institute } from "./institute/Institute";

export const INSTITUTES_AFFILIATION_PORT = Symbol('INSTITUTES_AFFILIATION_PORT');
export interface InstitutesAffiliationPort {
  // vom Author-Kontext gebraucht: Affiliation-basierte Suche
  findOrSave(affiliation: string): Observable<Institute>;
}


export const INSTITUTES_FIND_SUB_FLAT = Symbol('INSTITUTES_FIND_SUB_FLAT');
export interface InstitutesFindSubFlatPort {
  // vom Author-Kontext gebraucht: Affiliation-basierte Suche
  findSubInstitutesFlat(id: number): Promise<Institute[]>;
}