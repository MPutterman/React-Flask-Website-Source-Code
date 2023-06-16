// Helper functions for search pages

// TODO:
// * Need to translate additional operators to DataGrid compatible operators

import { GridLinkOperator } from "@material-ui/data-grid";


// Create filter model for DataGrid
// Input format is [{field:<String>, value:<any>, operator:<String>},]

export function createFilterModel(filters) {
    var filterModel = {
        items: [],
        linkOperator: GridLinkOperator.And,
    };
    if (filters) {
        filters.map((element,i) => {
            return filterModel.items.push({
                id: i,
                columnField: element.field,
                operatorValue: element.operator ? element.operator : 'equals',
                value: element.value,
            });
        });
    }
    //console.log('heres the filter model=>', filterModel);
    return filterModel;
}
