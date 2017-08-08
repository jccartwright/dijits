define([
    "dojo/_base/declare",
    "dojo/request",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/_base/lang",
    "dojo/topic",
    "dojo/Evented",
    "esri/graphic",
    "ncei/tasks/WMSIdentifyResult"
], function(
    declare,
    request,
    domConstruct,
    query,
    lang,
    topic,
    Evented,
    Graphic,
    WMSIdentifyResult
    ) {

    //"static" variables - shared across instances
    var SAMPLE_URL = "http://geoservice.maris2.nl/wms/seadatanet/emodnet_hydrography";

    return declare([Evented], {
        url: null,

        constructor: function(url) {
            //use sample request if no URL provided
            this.url = url || SAMPLE_URL;

            this.standardizeUrl();
        },


        //standardize URL. default to http protocol and add ? if necessary
        standardizeUrl: function() {
            if (! this.url.startsWith('http')) {
                this.url = 'http:' + this.url;
            }
            if (! this.url.endsWith('?')) {
                this.url = this.url + '?';
            }
        },


        execute: function(identifyParameters) {
            var deferred = request.get(this.url + identifyParameters.getQueryInfo(), {
                headers: {
                    "X-Requested-With": null
                }
            }).then(
                lang.hitch(this, function(text) {

                    //scrape the HTML response for data since the plain text
                    //format does not seem to contain all the information
                    var responseFragment = domConstruct.toDom(text);
                    var headerFields = [];
                    query("th", responseFragment).forEach(function(node){
                        headerFields.push(node.innerHTML);
                    });

                    //<WMSIdentifyResult[]> list of returned features.
                    var responseData = [];

                    var identifyResult;

                    query("tbody > tr", responseFragment).forEach(function(node){
                        var attr = {};
                        query("td", node).forEach(function (node, index) {
                            attr[headerFields[index]] = node.innerHTML;
                        });
                        identifyResult = new WMSIdentifyResult();
                        identifyResult.feature = new Graphic(null, null, attr, null);
                        responseData.push(identifyResult);
                    });

                    this.emit('complete', {results: responseData});

                    return responseData;
                }),


                function(error) {
                    //console.error("Error occurred with GetFeatureInfo request: ", error);
                    this.emit('error', {error: error});
                }
            );

            return deferred;
        }
    });
});