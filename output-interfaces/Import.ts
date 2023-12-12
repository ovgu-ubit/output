import { Publication } from "./Publication";

export interface ImportReport {
    id?: number;
    label: string;
    status?: string;
    timestamp?: Date;
    num_import?: number;
    num_update?: number;
    by_user?: string;
    report_items?: ImportReportItem[];
}

export interface ImportReportItem {
    id?: number;
    type: string;
    timestamp: Date;
    origin: string;
    publication?: Publication
    publication_doi?: string;
    publication_title?: string;
    report?: ImportReport
}