// Helper functions for search pages

// TODO:
// * Need to translate additional operators to DataGrid compatible operators
// * DataGrid seems now to have much more built-in support -- can we use the native functions?

import { GridLogicOperator } from "@mui/x-data-grid";


// Create filter model for DataGrid
// Input format is [{field:<String>, value:<any>, operator:<String>},]

export function createFilterModel(filters) {
    var filterModel = {
        items: [],
        linkOperator: GridLogicOperator.And,
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
