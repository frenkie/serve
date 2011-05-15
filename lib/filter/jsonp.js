/**
 * JSONP filter - returns a JSONPified string
 */

var jsonFilter = require("./json");

this.filter = function(str, jsonAttribute, jsonCallback, dataIsJson){

    jsonAttribute || (jsonAttribute = "data");
    jsonCallback || (jsonCallback = "callback");
    dataIsJson || (dataIsJson = false);

    str = jsonFilter.filter(str, jsonAttribute, dataIsJson);

    return jsonCallback +'('+ str +');';
};
