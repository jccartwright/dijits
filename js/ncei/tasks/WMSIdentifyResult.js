define([
    "dojo/_base/declare"
], function(
    declare) {

    //"static" variables - shared across instances
    var layerType = 'WMS';

    return declare([], {
        displayFieldName: null,
        feature: null,
        layerId: null,
        layerName: null,

        constructor: function(url) {
            console.log('inside constructor for WMSIdentifyResult...');
        },

        getLayerType: function() {
            return (layerType || 'ArcGIS');
        }
    });
});