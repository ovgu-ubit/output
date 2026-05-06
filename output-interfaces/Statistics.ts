export interface FilterOptions {
    corresponding?: boolean,
    locked?: boolean,
    instituteId?: number[],
    notInstituteId?: number[],
    publisherId?: number[],
    notPublisherId?: number[],
    contractId?: number[],
    notContractId?: number[],
    costCenterId?: number[],
    notCostCenterId?: number[],
    pubTypeId?: number[],
    notPubTypeId?: number[],
    oaCatId?: number[],
    notOaCatId?: number[]
}

export interface HighlightOptions {
    corresponding?: boolean,
    locked?: boolean,
    instituteId?: number,
    publisherId?: number,
    contractId?: number,
    costCenterId?: number,
    pubTypeId?: number,
    oaCatId?: number
}

export enum GROUP {
    INSTITUTE_FIRST,
    INSTITUTE_CORRESPONDING,
    PUBLISHER,
    CONTRACT,
    PUB_TYPE,
    CORRESPONDING_ANY,
    OA_CATEGORY,
    LOCK,
    GREATER_ENTITY,
    COST_CENTER
}

export enum STATISTIC {
    COUNT,
    NET_COSTS
}

export enum TIMEFRAME {
    CURRENT_YEAR,
    THREE_YEAR_REPORT,
    ALL_YEARS
}