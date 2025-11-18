import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
    private config?: any;
    private renderer: Renderer2;

    constructor(private http: HttpClient, private rendererFactory: RendererFactory2) {
        this.renderer = this.rendererFactory.createRenderer(null, null);
    }

    load(): Promise<void> {
        return this.http
            .get(environment.runtimeConfig)
            .toPromise()
            .then(cfg => {
                this.config = cfg;
            });
    }

    getValue(key: string): string {
        if (!this.config) {
            throw new Error('RuntimeConfig not loaded yet');
        }
        return this.config[key];
    }

    applyThemeFromConfig() {
        const theme = this.getValue("theme"); // "ovgu" | "azure" | "red"
        const classMap: Record<string, string> = {
            ovgu: 'theme-ovgu',
            red: 'theme-red',
            green: 'theme-green',
            blue: 'theme-blue',
            yellow: 'theme-yellow',
            cyan: 'theme-cyan',
            magenta: 'theme-magenta',
            orange: 'theme-orange',
            chartreuse: 'theme-chartreuse',
            spring_green: 'theme-spring_green',
            azure: 'theme-azure',
            violet: 'theme-violet',
            rose: 'theme-rose',
        };

        const html = document.documentElement;

        // alle bekannten Theme-Klassen entfernen
        Object.values(classMap).forEach(cls => this.renderer.removeClass(html, cls));

        // passende Klasse hinzufügen
        const cssClass = classMap[theme] ?? classMap['ovgu'];
        this.renderer.addClass(html, cssClass);
    }
}