/**
 * JSON filter - returns a JSONified string
 */

this.filter = function(str, jsonAttribute, dataIsJson){

    jsonAttribute = (jsonAttribute)? jsonAttribute.replace(/["]/ig, '\\"') : "data";
    dataIsJson || (dataIsJson = false);

    str = str.replace(/([\s][\s]+|[\t])/ig, ' ');
    str = str.replace(/[\n\r]/ig, '');

    if(!dataIsJson){
        str = str.replace(/["]/ig, '\\"');
    }

    var quot = (dataIsJson)? '' : '"';

    return '{ "'+ jsonAttribute +'" : '+ quot + str + quot +'}';
};
