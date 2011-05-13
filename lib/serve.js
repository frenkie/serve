/**
 *  Serve -  A file server that delivers files raw, as json or as jsonp
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
        jsonCallback : "callback" //the default jsonp callback function, i.e callback( { "data" : "<filecontents>"} );
    };

exports.create = createServe;
exports.Serve = Serve;

function createServe (cfg){
    var s = new Serve();

    if(cfg){
        s.setup(cfg);
    }
    return s;
}

function Serve(){

    this.config = {};
    this.setup( defaultConfig );
}

Serve.DATA = "data";
Serve.ERROR = "serve-error";//'error' is special in node
    Serve.NO_FILE_REQUESTED = "No file requested";
    Serve.PERMISSION_DENIED = "Permission denied";

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
     * @param options hash of options
     *      @option httpRequest {http.ServerRequest} required
     *      @option httpResponse {http.ServerResponse} [optional]
     */
    request : function(options){

        if(validateArguments( options, ["httpRequest"]) ){

            var parsedUrl = urlUtils.parse(options.httpRequest.url, true),
                query = parsedUrl.query,
                jsonattrib,
                callback;

            options.filePath = decodeURIComponent( parsedUrl.pathname );

            if( query.callback ){
                callback = decodeURIComponent( query.callback );
                options.jsonCallback = callback;
            }

            if(query.json){
                jsonattrib = decodeURIComponent(query.json);
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
            return invalidArguments();
        }
    },

    /**
     *
     * @param options
     */
    raw : function(options){

        options.contentType = "";

        return handleRequest.apply(this, [options]);
    },


    /**
     *
     * @param options
     */
    json : function(options){

        var that = this;

        options.contentType = meta.contentTypes["json"];

        return ( handleRequest.apply(this, [options, function(data){

            data = require("./filter/json")
                    .filter(data,
                            options.jsonAttribute || that.config.jsonAtribute);

            return data;
        }]) );

    },

    jsonp : function(options){

        var that = this;

        options.contentType = meta.contentTypes["js"];

        return ( handleRequest.apply(this, [options, function(data){

            data = require("./filter/jsonp")
                    .filter(data,
                            options.jsonAttribute || that.config.jsonAtribute,
                            options.jsonCallback || that.config.jsonCallback);

            return data;
        }]) );
    }
};



//private delegates

function handleRequest(options, dataHandler){

    var that = this,
        emitter = new EventEmitter();;

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
        emitInvalidArguments(emitter);
    }

    return emitter;
}

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



//private
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
                                options.headerFields,
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

function emitInvalidArguments(emitter){

    process.nextTick(function(){

        emitter.emit( Serve.ERROR, {
            code: 400,
            message: "Invalid arguments"
        });
    });
}

function doHttpResponse( httpResponse, data, headerFields, contentType, charset ){

    headerFields = headerFields || {};

    headerFields["Content-type"] = contentType;
    if(charset){
        headerFields["Content-type"] += "; charset="+ charset;
    }

    httpResponse.writeHead(200, headerFields);
    httpResponse.write( data );
    httpResponse.end();
}

function doHttpErrorResponse(httpResponse, error){

    httpResponse.writeHead(error.code, {"Content-type":"text/html"});
    httpResponse.write( "<h1>"+ error.message +"</h1>");
    httpResponse.end();
}