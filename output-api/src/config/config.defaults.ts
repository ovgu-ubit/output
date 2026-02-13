import { ConfigScope } from './Config.entity';

export const CONFIG_DEFAULTS = {
    reporting_year: 2025,
    institution: "Otto-von-Guericke-Universität Magdeburg",
    institution_short_label: "OVGU",
    search_tags: [
        "magdeburg",
        "ovgu",
        "guericke"
    ],
    lock_timeout: 5,
    affiliation_tags: [
        "ovgu",
        "guericke",
        "universität magdeburg",
        "university magdeburg",
        "universitätsklinikum magdeburg",
        "uniklinikum magdeburg",
        "universitätsklinik magdeburg",
        "university of magdeburg",
        "uniklinik magdeburg",
        "universitätsfrauenklinik magdeburg",
        "unifrauenklinik magdeburg",
        "university hospital magdeburg",
        "universitätsmedizin magdeburg"
    ],
    ror_id: "https://ror.org/xxxxx",
    openalex_id: "xxxxx",
    doi_import_service: 'openalex',
    optional_fields: {
      abstract: false,
      citation: false,
      page_count: false,
      pub_date_submitted: false,
      pub_date_print: false,
      peer_reviewed: false
    },
    pub_index_columns: {
        title: true,
        doi: true,
        link: false,
        authors: true,
        authors_inst: true,
        corr_inst: true,
        greater_entity: true,
        oa_category: true,
        pub_type: true,
        contract: true,
        publisher: true,
        locked_status: false,
        status: true,
        pub_date: true,
        edit_date: true,
        import_date: false,
        data_source: false,
    },
    import_services: {
        base: true,
        bibliography_md: false,
        crossref: true,
        open_access_monitor: true,
        openalex: true,
        pubmed: true,
        scopus: true,
        jsonata: true
    },
    enrich_services: {
        crossref: true,
        doaj: true,
        open_access_monitor: true,
        openalex: true,
        openapc: true,
        scopus: true,
        unpaywall: true
    }
};

export const CONFIG_SCOPES: Record<keyof typeof CONFIG_DEFAULTS, ConfigScope> = {
    reporting_year: 'public',
    institution: 'public',
    institution_short_label: 'public',
    search_tags: 'user',
    lock_timeout: 'user',
    affiliation_tags: 'user',
    ror_id: 'user',
    openalex_id: 'user',
    doi_import_service: 'user',
    optional_fields: 'public',
    pub_index_columns: 'public',
    import_services: 'admin',
    enrich_services: 'admin'
};

export const CONFIG_DESCRIPTIONS = {
    reporting_year: "Standard-Berichtsjahr",
    institution: "Vollständiger Name der Einrichtung",
    institution_short_label: "Kurzer Anzeigename der Einrichtung",
    search_tags: "Suchbegriffe, die bei API-Zugriff verwendet werden für das Affiliationsfeld",
    lock_timeout: "Ganze Anzahl an Minuten, für die ein geöffneter Datensatz für die Bearbeitung durch andere Nutzer:innen gesperrt wird",
    affiliation_tags: "Begriffe, von denen in der Affiliation einer Person mindestens einer vorkommen muss, damit sie der Einrichtung zugeordnet wird",
    ror_id: "ROR-ID der Einrichtung als Webadresse",
    openalex_id: "OpenAlex ID der Einrichtung",
    doi_import_service: 'Pfad des verwendeten Anreicherungsdienst für DOI-importierte Publikationen',
    optional_fields: "Welche der optionalen Zitationsangaben sollen importiert, angereichert und angezeigt werden?",
    pub_index_columns: "Welche der möglichen Spalten sollen in der Publikationsübersicht angezeigt werden?",
    import_services: "Welche der verfügbaren Importdienste soll angeboten werden?",
    enrich_services: "Welche der verfügbaren Anreicherungsdienste soll angeboten werden?",
};