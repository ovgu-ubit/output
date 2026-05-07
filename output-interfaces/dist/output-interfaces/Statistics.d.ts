export interface FilterOptions {
    corresponding?: boolean;
    locked?: boolean;
    instituteId?: number[];
    notInstituteId?: number[];
    publisherId?: number[];
    notPublisherId?: number[];
    contractId?: number[];
    notContractId?: number[];
    costCenterId?: number[];
    notCostCenterId?: number[];
    pubTypeId?: number[];
    notPubTypeId?: number[];
    oaCatId?: number[];
    notOaCatId?: number[];
}
export interface HighlightOptions {
    corresponding?: boolean;
    locked?: boolean;
    instituteId?: number;
    publisherId?: number;
    contractId?: number;
    costCenterId?: number;
    pubTypeId?: number;
    oaCatId?: number;
}
export declare enum GROUP {
    INSTITUTE_FIRST = 0,
    INSTITUTE_CORRESPONDING = 1,
    PUBLISHER = 2,
    CONTRACT = 3,
    PUB_TYPE = 4,
    CORRESPONDING_ANY = 5,
    OA_CATEGORY = 6,
    LOCK = 7,
    GREATER_ENTITY = 8,
    COST_CENTER = 9
}
export declare enum STATISTIC {
    COUNT = 0,
    NET_COSTS = 1
}
export declare enum TIMEFRAME {
    CURRENT_YEAR = 0,
    THREE_YEAR_REPORT = 1,
    ALL_YEARS = 2
}
