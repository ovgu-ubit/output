import { SortDirection } from '@angular/material/sort';
import { ActionReducer, createAction, createFeatureSelector, createReducer, createSelector, INIT, on, props, UPDATE } from '@ngrx/store';
import { SearchFilter } from '../../../../output-interfaces/Config';

export const setViewConfig = createAction('Set ViewConfig', props<{ viewConfig: ViewConfig }>());
export const resetViewConfig = createAction('Reset ViewConfig');
export const setReportingYear = createAction('Set Reporting Year', props<{ reporting_year: number }>());
export const resetReportingYear = createAction('Reset Reporting Year');

export interface State {
  viewConfig: ViewConfig;
  reporting_year?: number;
  valid_from: Date;
}

export interface ViewConfig {
  sortColumn?: string;
  sortDir: SortDirection;
  page?: number;
  pageSize?: number;
  filterValue?: string;
  filterColumn?: string;
  filter?: {filter: SearchFilter, paths?: string[]};
}

export const initialState: State = {
  viewConfig: {
    sortDir: 'asc' as SortDirection
  }, valid_from: new Date()
};

export const selectViewConfigState = createFeatureSelector<State>('viewConfigReducer')
export const selectViewConfig = createSelector(
  selectViewConfigState,
  (state: State) => { return state?.viewConfig }
)
export const selectReportingYear = createSelector(
  selectViewConfigState,
  (state: State) => { return state?.reporting_year }
)

export const viewConfigReducer = createReducer(
  initialState,
  on(setViewConfig, (state, action) => {
    return {
      ...state,
      viewConfig: action.viewConfig,
      valid_from: new Date()
    }
  }),
  on(resetViewConfig, (state, action) => {
    return {
      ...state,
      viewConfig: {
        sortDir: 'asc' as SortDirection
      },
      valid_from: new Date()
    }
  }),
  on(setReportingYear, (state, action) => {
    return {
      ...state,
      reporting_year: action.reporting_year,
      valid_from: new Date()
    }
  }),
  on(resetReportingYear, (state, action) => {
    return {
      ...state,
      reporting_year: undefined,
      valid_from: new Date()
    }
  }),
);

export const hydrationMetaReducer = (
  reducer: ActionReducer<State>
): ActionReducer<State> => {
  return (state, action) => {
    if (action.type === INIT || action.type === UPDATE) {
      const storageValue = localStorage.getItem("state");
      if (storageValue) {
        try {
          let state = JSON.parse(storageValue);
          if ((new Date().getTime() - Date.parse(state.viewConfigReducer.valid_from)) < 4*60*60*1000) return state; //if state is older than 4 hours, it is resetted
        } catch (err) {
          localStorage.removeItem("state");
        }
      }
    }
    const nextState = reducer(state, action);
    localStorage.setItem("state", JSON.stringify(nextState));
    return nextState;
  };
};

