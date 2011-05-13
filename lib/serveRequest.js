/**
 * ServeRequest handles validation and execution of a file request
 */
var util = require("util"),
    fs = require('fs'),
    EventEmitter = require( "events" ).EventEmitter;

exports = module.exports = createRequest;
exports.create = createRequest;
exports.ServeRequest = ServeRequest;

function createRequest(options){

    return new ServeRequest(options);
}

/**
 *
 * @param options Hash of options
 *      @option filePath the requested file relative from the documentRoot
 *
 */
function ServeRequest(options){//extends EventEmitter

    var that = this;

    EventEmitter.call(this);

    this.options = {};
    this.reset();

    this.setup(options);
}
util.inherits(ServeRequest, EventEmitter);

ServeRequest.DATA = "data";
ServeRequest.ERROR = "serverequest-error";
    ServeRequest.FILE_NOT_FOUND = "File not found";
    ServeRequest.ERROR_READING_FILE = "Error while reading file contents";

exports.DATA = ServeRequest.DATA;
exports.ERROR = ServeRequest.ERROR;

var ServeRequestProto = {

    setup : function(options){

        for(var o in options){
            this.options[o] = options[o];
        }
    },

    reset : function(){
        this.errorMessage = "";
        this.errorCode = false;
        this.data = "";
    },

    getError : function(){
        return {
            message: this.errorMessage,
            code: this.errorCode
        };
    },

    getData : function(){
        return this.data;
    },

    handle: function(){

        this.reset();

        if(this.options.filePath){

            getFile.apply(this, [this.options.filePath]);

        }else{
            this.errorCode = 400;
            this.errorMessage = ServeRequest.NO_FILE_REQUESTED;
            this.emit(ServeRequest.ERROR, this.getError());
        }
    }
};

for(var prop in ServeRequestProto){
   ServeRequest.prototype[prop] = ServeRequestProto[prop];
}

//private delegate
function getFile(filePath){

    var serveRequest = this;

    fs.stat(filePath, function(err, stat){

        if(err || !stat.isFile()){

            serveRequest.errorCode = 404;
            serveRequest.errorMessage = ServeRequest.FILE_NOT_FOUND;

            serveRequest.emit(ServeRequest.ERROR, serveRequest.getError());

        }else{

            fs.readFile(filePath, "utf-8", function(err, data){

                if(err){
                    serveRequest.errorCode = 500;
                    serveRequest.errorMessage = ServeRequest.ERROR_READING_FILE;
                    
                    serveRequest.emit(ServeRequest.ERROR, serveRequest.getError());
                }else{
                    serveRequest.data = data;
                    serveRequest.emit(ServeRequest.DATA, data);
                }
            });
        }
    });
}