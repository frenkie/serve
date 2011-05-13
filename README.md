# Serve

Serve is a file server with support for JSON(P). Originally intended as a JavaScript file server
for delivering (template) files raw, as JSON or as JSONP. The latter on behalf
of client-side cross domain serving.

Current Version: **0.1.0**

## Usage

Serve can deliver files based on a HTTP request, where the request URL and parameters will
define whether the request is served raw, as JSON or as JSONP or you can call Serve's
`raw`, `json` and `jsonp` methods directly.

Serve can be initialised with or without configuration.

The default configuration is as followed

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

Initialisation:

    var serve = require("./lib/serve");

    var butler1 = serve(cfg); //where cfg is either not provided or a hash of config options
    var butler2 = serve.create(cfg);
    var butler3 = new serve.Serve(cfg);

    //you can always setup Serve later
    var butler4 = serve();
        butler4.setup(cfg);


### API

Serve exposes the following methods

1.request

2.raw

3.json

4.jsonp

All methods return an instance of `events.EventEmitter` and emit a `serve.DATA` or `serve.ERROR` event.


#### serve.DATA

    serve.DATA( data, //{String} requested file contents
                contentType, //{String} MIME type
                charset)    //{String} charset belonging to the MIME type, can be null


#### serve.ERROR

    serve.ERROR({
                   code: errorCode, //{Number}
                   message: errorMessage //{String}
                })


#### serve.request()

Will determine whether to serve a file raw, as JSON or as JSONP based on the request's query parameters,
as defined in the defaultConfig mentioned above.

    serve().request({
            httpRequest : httpRequest, //{http.ServerRequest} required
            httpResponse: httpResponse, //[optional] if provided will deliver the
                                        //requested file (or an error) over this httpResponse
            headers: { //[optional] extra headers to send with the httpResponse
                "key" : "value",
                "key" : "value"
            }
        })
        .on(serve.DATA, dataHandler)
        .on(serve.ERROR, errorHandler);


#### serve.raw()

    serve().raw({
            filePath : "filePath", //{String} Required, file to serve, relative to the documentRoot
            httpResponse: httpResponse, //{http.ServerResponse} [optional] if provided will deliver the
                                        //requested file (or an error) over this httpResponse
            headers: { //[optional] extra headers to send with the httpResponse
                "key" : "value",
                "key" : "value"
            }
        })
        .on(serve.DATA, dataHandler)
        .on(serve.ERROR, errorHandler);

#### serve.json()

    serve().json({
            filePath : "filePath", //{String} Required, file to serve, relative to the documentRoot
            httpResponse: httpResponse, //{http.ServerResponse} [optional] if provided will deliver the
                                        //requested file (or an error) over this httpResponse
            headers: { //[optional] extra headers to send with the httpResponse
                "key" : "value",
                "key" : "value"
            },
            jsonAttribute : "jsonAttribute" //{String} [optional] The return attribute for json data,
                                            // defaults to the one defined in Serve's config
        })
        .on(serve.DATA, dataHandler)
        .on(serve.ERROR, errorHandler);

#### serve.jsonp()

    serve().jsonp({
            filePath : "filePath", //{String} Required, file to serve, relative to the documentRoot
            httpResponse: httpResponse, //{http.ServerResponse} [optional] if provided will deliver the
                                        //requested file (or an error) over this httpResponse
            headers: { //[optional] extra headers to send with the httpResponse
                "key" : "value",
                "key" : "value"
            },
            jsonAttribute : "jsonAttribute",//{String} [optional] The return attribute for json data,
                                            // defaults to the one defined in Serve's config
            jsonCallback : "jsonCallback"   //{String} [optional] The jsonp callback function,
                                            // defaults to the one defined in Serve's config
        })
        .on(serve.DATA, dataHandler)
        .on(serve.ERROR, errorHandler);


## Example

The best example is of course a file server. You can find one in `examples/server`.
Fire it up with `node server` and you'll see an index page at `http://localhost:8008/`.

The default document root to serve files from is the current working directory, so
the files inside the `examples/server` folder are now served by Serve. The default jsonAttribute
and jsonCallback query parameters are configured as well as an `index.html` indexFile.

By the way, you can also run the example server with a string argument that will define the documentRoot.





