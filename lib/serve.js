/**
 *  Serve -  A Node.js file server that delivers files raw, as json or as jsonp
 */

var events = require('events'),
    EventEmitter = events.EventEmitter,
    urlUtils = require('url'),
    meta = require("./meta"),
    path = require('path'),
    serveRequest = require("./serveRequest");


var exports = module.exports = createServe, //support serve()

    defaultConfig = {

        documentRoot : process.cwd(), //current working directory

        //Serve.request config
        indexFile : "", //if given, will search for this file when a directory is requested
        jsonParam: "json", //the query param used to denote a json request and define the json return attribute
        jsonCallbackParam: "callback", //the query param used to denote a jsonp request and define a jsonp callback

        //Serve.json and jsonp config
        jsonAttribute : "data", //the return attribute for a direct json(p) request, i.e {"data" : "<filecontents>"}
        jsonCallback : "callback", //the default jsonp callback function, i.e callback( { "data" : "<filecontents>"} );
        treatJsonAsJson : true //JSON data from .json files will be returned as a JSON object instead of a string
    };

exports.create = createServe;
exports.Serve = Serve;
exports.version = "0.1.0";

function createServe (cfg){
    return new Serve(cfg);
}

function Serve(cfg){

    this.config = {};
    this.setup( defaultConfig );
    if(cfg){
        this.setup(cfg);
    }
}

Serve.DATA = "data";
Serve.ERROR = "serve-error";//'error' is special in node, should always be caught or the process exits
    Serve.NO_FILE_REQUESTED = "No file requested";
    Serve.PERMISSION_DENIED = "Permission denied";
    Serve.INVALID_ARGUMENTS = "Invalid arguments";

exports.DATA = Serve.DATA;
exports.ERROR = Serve.ERROR;

Serve.prototype = {

    setup : function(cfg){

       for(var c in cfg){
            this.config[c] = cfg[c];
       }
    },

    /**
     * based on URL parameters of a httpRequest, serve the request raw, as json or as jsonp
     * @param options {Object}
     *      @option httpRequest {http.ServerRequest} Required
     *      @option httpResponse {http.ServerResponse} [optional] If provided will deliver the
     *                                              requested file (or an error) over this httpResponse
     *      @option headers {Object} [optional] key/value pairs of extra headers to send
     *                                              with the httpResponse
     * @return {event.EventEmitter} An EventEmitter for Serve events
     */
    request : function(options){

        if(validateArguments( options, ["httpRequest"]) ){

            var parsedUrl = urlUtils.parse(options.httpRequest.url, true),
                query = parsedUrl.query,
                jsonattrib,
                callback;

            options.filePath = decodeURIComponent( parsedUrl.pathname );

            if(query[this.config.jsonCallbackParam]){
                callback = decodeURIComponent( query[this.config.jsonCallbackParam] );
                options.jsonCallback = callback;
            }

            if(query[this.config.jsonParam]){
                jsonattrib = decodeURIComponent(query[this.config.jsonParam]);
                options.jsonAttribute = jsonattrib;
            }

            //only act on found query params
            if(callback){

                return this.jsonp(options);

            }else if(jsonattrib){

                return this.json(options);
            }else{
                return this.raw(options);
            }

        }else{

            var emitter = new EventEmitter();
            emitInvalidArgumentsError(emitter);
            return emitter;
        }
    },

    /**
     * @param options {Object}
     *      @option filePath {String} Required, file to serve, relative to the documentRoot
     *      @option httpResponse {http.ServerResponse} [optional] If provided will deliver the
     *                                              requested file (or an error) over this httpResponse
     *      @option headers {Object} [optional] key/value pairs of extra headers to send
     *                                              with the httpResponse
     * @return {event.EventEmitter} An EventEmitter for Serve events
     */
    raw : function(options){

        options.contentType = "";//make sure contentType isn't set from outside

        return handleRequest.apply(this, [options]);
    },


    /**
     * @param options {Object}
     *      @option filePath {String} Required, file to serve, relative to the documentRoot
     *      @option httpResponse {http.ServerResponse} [optional] If provided will deliver the
     *                                              requested file (or an error) over this httpResponse
     *      @option headers {Object} [optional] key/value pairs of extra headers to send
     *                                              with the httpResponse
     *      @option jsonAttribute {String} [optional] The return attribute for json data, defaults to
     *                                              the one defined in Serve's config
     *      @option fileIsJson {Boolean} [optional] force return of file data as a JSON object instead of a string
     * @return {event.EventEmitter} An EventEmitter for Serve events
     */
    json : function(options){

        var that = this;

        options.contentType = meta.contentTypes["json"]; //TODO: find a non option way to force json contentType
                                                         // later on

        return ( handleRequest.apply(this, [options, function(data){

            data = require("./filter/json")
                    .filter(data,
                            options.jsonAttribute || that.config.jsonAtribute,
                            (treatFileAsJson(options, that.config)) );

            return data;
        }]) );

    },

    /**
     * @param options {Object}
     *      @option filePath {String} Required, file to serve, relative to the documentRoot
     *      @option httpResponse {http.ServerResponse} [optional] If provided will deliver the
     *                                              requested file (or an error) over this httpResponse
     *      @option headers {Object} [optional] key/value pairs of extra headers to send
     *                                              with the httpResponse
     *      @option jsonAttribute {String} [optional] The return attribute for json data, defaults to
     *                                              the one defined in Serve's config
     *      @option jsonCallback {String} [optional] The jsonp callback function, defaults to
     *                                              the one defined in Serve's config
     *      @option fileIsJson {Boolean} [optional] return of file data as a JSON object instead of a string
     * @return {event.EventEmitter} An EventEmitter for Serve events
     */    
    jsonp : function(options){

        var that = this;

        options.contentType = meta.contentTypes["js"];

        return ( handleRequest.apply(this, [options, function(data){

            data = require("./filter/jsonp")
                    .filter(data,
                            options.jsonAttribute || that.config.jsonAtribute,
                            options.jsonCallback || that.config.jsonCallback,
                            (treatFileAsJson(options, that.config)) );
            return data;
        }]) );
    }
};



//private delegate
function handleRequest(options, dataHandler){

    var emitter = new EventEmitter();;

    if(validateArguments( options, ["filePath"])){

        validateFilePath.apply(this, [options.filePath])

            .on(Serve.ERROR, function(error){

                emitter.emit(Serve.ERROR, error);

                if(options.httpResponse){

                    doHttpErrorResponse(options.httpResponse, error);
                }
            })

            .on(Serve.DATA, function(filePath){

                handleServeRequest(options, filePath, emitter, dataHandler);
            });

    }else{
        emitInvalidArgumentsError(emitter);
    }

    return emitter;
}

function validateArguments(options, required){

    var missing = [];

    for(var k in required){
        var attrib = required[k];
        if( !hasOption( options, attrib )){
            missing.push(attrib);
        }
    }
    if(missing.length){
        console.log("".concat("Invalid request, ",
                        "missing attribute"+ ((missing.length > 1)? "s" : "") +": ",
                        "'"+ missing.join(", ") +"'") );
        return false;
    }
    return true;
}

function hasOption(options, requiredOption){
    return (typeof options[ requiredOption ] !== "undefined");
}

function emitInvalidArgumentsError(emitter){

    process.nextTick(function(){

        emitter.emit( Serve.ERROR, {
            code: 400,
            message: Serve.INVALID_ARGUMENTS
        });
    });
}

//private delegate
function validateFilePath(filePath){

    var that = this;
    var emitter = new EventEmitter();

    process.nextTick(function(){

        var absPath,
            documentRoot = that.config.documentRoot;

        if(/\/$/.test(filePath)){

            if(that.config.indexFile !== ""){
                filePath += that.config.indexFile;
            }else{
                emitter.emit(Serve.ERROR, {
                    code: 400,
                    message: Serve.NO_FILE_REQUESTED
                });
            }
        }

        absPath = path.normalize( path.join( documentRoot, filePath) );

        if (absPath.substr(0, documentRoot.length) != documentRoot){

            emitter.emit(Serve.ERROR, {
                code: 403,
                message: Serve.PERMISSION_DENIED
            });

        }else{
            emitter.emit(Serve.DATA, absPath);
        }
    });

    return emitter;
}

function handleServeRequest(options, filePath, eventHandler, dataHandler){

    var servReq = serveRequest.create({

            filePath : filePath
        });
        servReq.on(serveRequest.DATA, function(data){

            var contentType = options.contentType || getContentType( filePath ),
                charset = getCharset( contentType );

            if(typeof dataHandler == "function"){

                data = dataHandler(data);
            }

            if(options.httpResponse){

                doHttpResponse( options.httpResponse,
                                data,
                                options.headers,
                                contentType,
                                charset );
            }

            eventHandler.emit(Serve.DATA, data, contentType, charset);
        });
        servReq.on(serveRequest.ERROR, function(error){

            if(options.httpResponse){

                doHttpErrorResponse(options.httpResponse, error);
            }
            eventHandler.emit(Serve.ERROR, error);
        });
        servReq.handle();
}

function getContentType(filePath){

    var extension = filePath.split(".").pop();
    return meta.contentTypes[extension] || "application/octet-stream";
}

function getCharset(contentType){
    return meta.charsets[contentType];
}

function doHttpResponse( httpResponse, data, headers, contentType, charset ){

    headers = headers || {};

    headers["Content-type"] = contentType;
    if(charset){
        headers["Content-type"] += "; charset="+ charset;
    }

    httpResponse.writeHead(200, headers);
    httpResponse.write( data );
    httpResponse.end();
}

function doHttpErrorResponse(httpResponse, error){

    httpResponse.writeHead(error.code, {"Content-type":"text/html"});
    httpResponse.write( "<h1>"+ error.message +"</h1>");
    httpResponse.end();
}


function treatFileAsJson(options, config){

    if(options.filePath.split(".").pop() == "json" && config.treatJsonAsJson){

        return true;
    }else if(options.fileIsJson){
        return true;
    }
    return false;
}