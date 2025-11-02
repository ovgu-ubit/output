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
        scopus: true
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