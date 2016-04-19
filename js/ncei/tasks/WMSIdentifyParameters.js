define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/io-query",
    "esri/geometry/screenUtils"
], function(
    declare,
    lang,
    ioQuery,
    screenUtils) {

    //"static" variables - shared across instances
    var INFO_FORMAT = "text/html";
    var WMS_VERSION = "1.3.0";

    //used to construct QueryInfo part of URL. could be done w/in WMSIdentifyTask as well
    var QUERY_INFO_TEMPLATE = "REQUEST=GetFeatureInfo&SERVICE=WMS&WIDTH={width}&HEIGHT={height}&CRS={crs}"
        + "&LAYERS={layers}&QUERY_LAYERS={layers}&VERSION={version}&INFO_FORMAT={format}"
        + "&BBOX={minx},{miny},{maxx},{maxy}&i={col}&j={row}";


    return declare([], {
        //comma separated list of layer names
        layers: null,

        //SRID used with BBOX coordinates
        crs: null,

        //can be used to override previous properties
        getMapRequestUrl: null,

        mapPoint: null,

        //keep a reference to the map to facilitate internal calculation of extent, screen position of mouse click
        _map: null,

        constructor: function(params) {
            this._map = params.map;
        },


        /**
         * return a WMS GetFeatureInfo URL constructed from GetMap request and map click event
         * @param evt
         * @returns String
         */
        getQueryInfo: function() {
            //GetFeatureInfo requires the row,column of mouseclick rather than geographic coordinate
            var screenGeom = screenUtils.toScreenGeometry(this._map.extent, this._map.width, this._map.height, this.mapPoint);

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
                layers: this.layers,
                width: this._map.width,
                height: this._map.height,
                crs: this.crs,
                minx: this._map.extent.xmin,
                miny: this._map.extent.ymin,
                maxx: this._map.extent.xmax,
                maxy: this._map.extent.ymax,
                col: screenGeom.x,
                row: screenGeom.y
            };

            return(lang.replace(QUERY_INFO_TEMPLATE, params));
        },


        /**
         * parse the WMS GetMap URL to derive the WMS GetFeatureInfo URL
         *
         * example WMS GetMap URL
         * http://geoservice.maris2.nl/wms/seadatanet/emodnet_hydrography?REQUEST=GetMap&SERVICE=WMS
         * &BGCOLOR=0xFFFFFF&TRANSPARENT=TRUE&reaspect=false&WIDTH=512&HEIGHT=512&CRS=EPSG:900913
         * &LAYERS=EMODnet_Bathymetry_multi_beams_polygons&VERSION=1.3.0&FORMAT=image/png
         * &SLD=http://maps.ngdc.noaa.gov/viewers/emodnet.sld&BBOX=-5009377.085697226,0,0,5009377.085697209
         */
        parseGetMapRequestUrl: function() {
            var wmsUrl = this.getMapRequestUrl;

            var location = wmsUrl.substring(0, wmsUrl.indexOf('?') + 1);

            var queryString = wmsUrl.substring(wmsUrl.indexOf('?') + 1, wmsUrl.length);
            var queryObject = ioQuery.queryToObject(queryString);

            return(queryObject);
        }
    });
});