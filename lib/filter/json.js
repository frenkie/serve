/**
 * JSON filter - returns a JSONified string
 */

this.filter = function(str, jsonAttribute){

    jsonAttribute || (jsonAttribute = "data");

    jsonAttribute = jsonAttribute.replace(/["]/ig, '\\"');

    str = str.replace(/[\s][\s]+/ig, ' ');
    str = str.replace(/[\t]/ig, ' ');
    str = str.replace(/[\n\r]/ig, '');
    str = str.replace(/["]/ig, '\\"');

    return '{ "'+ jsonAttribute +'" : "'+ str +'"}';
};
