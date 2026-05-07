import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tableDoi',
  standalone: false
})
export class TableDoiPipe implements PipeTransform {
  transform(doi: string): string {
    if (!doi) return '';
    return `<a class="link-secondary" href="https://dx.doi.org/${doi}" target="_blank">${doi}</a>`;
  }
}

@Pipe({
  name: 'tableOrcid',
  standalone: false
})
export class TableOrcidPipe implements PipeTransform {
  transform(orcid: string): string {
    if (!orcid) return '';
    return `<a class="link-secondary" href="https://orcid.org/${orcid}" target="_blank">${orcid}</a>`;
  }
}

@Pipe({
  name: 'tableGnd',
  standalone: false
})
export class TableGndPipe implements PipeTransform {
  transform(gnd: string): string {
    if (!gnd) return '';
    return `<a class="link-secondary" href="https://explore.gnd.network/gnd/${gnd}" target="_blank">${gnd}</a>`;
  }
}

@Pipe({
  name: 'tableEuro',
  standalone: false
})
export class TableEuroPipe implements PipeTransform {
  transform(value: any): string {
    if (value === null || value === undefined) return '';
    return Number(value).toLocaleString('de-DE') + ' €';
  }
}

@Pipe({
  name: 'tableAuthors',
  standalone: false
})
export class TableAuthorsPipe implements PipeTransform {
  transform(pub: any): string {
    if (!pub) return '';
    let all_authors = pub.authors_inst?.split('; ') || [];
    let corrs = pub.corr_author?.split('; ') || [];
    
    if (corrs.length > 0) {
      for (let corr of corrs) {
        let i = all_authors.indexOf(corr);
        if (i !== -1) all_authors.splice(i, 1);
      }
      
      if (all_authors.length > 0) {
        return `<u>${pub.corr_author}</u>; ${all_authors.join('; ')}`;
      } else {
        return `<u>${pub.corr_author}</u>`;
      }
    }
    
    return pub.authors_inst || '';
  }
}

@Pipe({
  name: 'tableFormatNumber',
  standalone: false
})
export class TableFormatNumberPipe implements PipeTransform {
  transform(value: any): string {
    if (value === null || value === undefined) return '';
    return Number(value).toLocaleString('de-DE');
  }
}

@Pipe({
  name: 'tableTruncate',
  standalone: false
})
export class TableTruncatePipe implements PipeTransform {
  transform(text: string, max_char: number): string {
    if (!text) return '';
    if (text.length > max_char) return text.substring(0, max_char) + '...';
    return text;
  }
}
