define([
    "dojo/_base/declare",
    "dojo/request",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/_base/lang",
    "dojo/topic",
    "dojo/Evented",
    "esri/graphic",
    "ncei/tasks/WMSIdentifyResult",
    "ncei/tasks/WMSIdentifyTask"
], function(
    declare,
    request,
    domConstruct,
    query,
    lang,
    topic,
    Evented,
    Graphic,
    WMSIdentifyResult,
    WMSIdentifyTask
    ) {

    return declare([WMSIdentifyTask], {
        url: null,

        execute: function(identifyParameters) {
            var deferred = request.get(this.url + identifyParameters.getQueryInfo(), {
                headers: {
                    "X-Requested-With": null
                }
            }).then(
                lang.hitch(this, function(text) {

                    var responseFragment = domConstruct.toDom(text);

                    //<WMSIdentifyResult[]> list of returned features.
                    var responseData = [];

                    var identifyResult;

                    var attr = {};
                    var valueQuery;
                    //Search the XML response for the word 'Value' and assign the contents to the attribute called 'Value'
                    if (valueQuery = query('value', responseFragment)) {
                        attr['Value'] = valueQuery[0].innerHTML;
                    }

                    if (!this.isObjectEmpty(attr)) {
                        identifyResult = new WMSIdentifyResult();
                        identifyResult.feature = new Graphic(null, null, attr, null);
                        responseData.push(identifyResult);
                    }

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