/**
 * Server implementation of the serve module
 */

var http = require('http'),
    serve = require('../../lib/serve');

var PORT = 8008,
    args = process.argv,
    serveConfig = {

        indexFile : "index.html", //file to search for if a directory is requested

        documentRoot : (args.length > 2 && typeof args[2] == "string")?
                            args[2] : process.cwd()
    },
    butler = serve.create(serveConfig);


http.createServer(function(req, res) {

    //based on URL query parameters a raw, json or jsonp request is served

    butler.request({
        httpRequest : req,
        httpResponse : res
    })
    .on(serve.DATA, function(data, contentType, charset){//charset can be null

        console.log("Serve:Data We received data with content type: "+ contentType);
    })
    .on(serve.ERROR, function(error){

        console.log("Serve:Error "+ error.message);
    });

}).listen(PORT);


console.log("serve server running on port: "+ PORT);