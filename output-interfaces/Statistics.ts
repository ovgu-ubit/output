export interface FilterOptions {
    corresponding?: boolean,
    locked?: boolean,
    instituteId?: number,
    notInstituteId?: number,
    publisherId?: number,
    notPublisherId?: number,
    contractId?: number,
    notContractId?: number,
    pubTypeId?: number,
    notPubTypeId?: number,
    oaCatId?: number
    notOaCatId?: number
}

export interface HighlightOptions {
    corresponding?: boolean,
    locked?: boolean,
    instituteId?: number,
    publisherId?: number,
    contractId?: number,
    pubTypeId?: number,
    oaCatId?: number
}