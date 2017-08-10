define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/io-query",
    "esri/geometry/screenUtils",
    "ncei/tasks/WMSIdentifyParameters"
], function(
    declare,
    lang,
    ioQuery,
    screenUtils,
    WMSIdentifyParameters) {

    //"static" variables - shared across instances
    var INFO_FORMAT = "text/xml";
    var WMS_VERSION = "1.3.0";
    var MAX_FEATURES = 99;

    //used to construct QueryInfo part of URL. could be done w/in WMSIdentifyTask as well
    var QUERY_INFO_TEMPLATE = "REQUEST=GetFeatureInfo&SERVICE=WMS&WIDTH={width}&HEIGHT={height}&CRS={crs}" + 
        "&LAYERS={layers}&QUERY_LAYERS={layers}&VERSION={version}&INFO_FORMAT={format}&FEATURE_COUNT={max_features}" +
        "&BBOX={minx},{miny},{maxx},{maxy}&i={col}&j={row}";


    return declare([WMSIdentifyParameters], {
        
        /**
         * return a WMS GetFeatureInfo URL constructed from GetMap request and map click event
         * @param evt
         * @returns String
         */
        getQueryInfo: function() {
            //GetFeatureInfo requires the row,column of mouseclick rather than geographic coordinate
            var screenGeom = screenUtils.toScreenGeometry(this._map.extent, this._map.width, this._map.height, this.geometry);

            //pull information out the the GetMap URL if provided. It will override layers, crs values input individually
            var queryObject;
            if (this.getMapRequestUrl) {
                queryObject = this.parseGetMapRequestUrl();
                //TODO look for case sensitivity in parameter keys
                this.layers = queryObject.LAYERS;
                this.crs = queryObject.CRS;
            }

            var params = {
                version: WMS_VERSION,
                format: INFO_FORMAT,
                max_features: MAX_FEATURES,
                layers: this.layers,
                width: this._map.width,
                height: this._map.height,
                crs: 'EPSG:' + this.crs,
                minx: this._map.extent.xmin,
                miny: this._map.extent.ymin,
                maxx: this._map.extent.xmax,
                maxy: this._map.extent.ymax,
                col: screenGeom.x,
                row: screenGeom.y
            };

            return(lang.replace(QUERY_INFO_TEMPLATE, params));
        }
    });
});