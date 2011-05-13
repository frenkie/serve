/**
 * JSONP filter - returns a JSONPified string
 */

var jsonFilter = require("./json");

this.filter = function(str, jsonAttribute, jsonCallback){

    jsonAttribute || (jsonAttribute = "data");
    jsonCallback || (jsonCallback = "callback");

    str = jsonFilter.filter(str, jsonAttribute);

    return jsonCallback +'('+ str +');';
};
