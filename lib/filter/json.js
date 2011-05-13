/**
 * JSON filter - returns a JSONified string
 */

this.filter = function(str, jsonAttribute){

    jsonAttribute = (jsonAttribute)? jsonAttribute.replace(/["]/ig, '\\"') : "data";

    str = str.replace(/([\s][\s]+|[\t])/ig, ' ');
    str = str.replace(/[\n\r]/ig, '');
    str = str.replace(/["]/ig, '\\"');

    return '{ "'+ jsonAttribute +'" : "'+ str +'"}';
};
