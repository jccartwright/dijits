define([
    'dojo/_base/declare',
    'esri/layers/TiledMapServiceLayer',
    'esri/layers/TileInfo',
    'esri/SpatialReference',
    'esri/geometry/Extent',
    'esri/geometry/webMercatorUtils',
    'ngdc/web_mercator/ZoomLevels'],
    function(
        declare,
        TiledMapServiceLayer,
        TileInfo,
        SpatialReference,
        Extent,
        webMercatorUtils,
        ZoomLevels) {

        return declare([TiledMapServiceLayer], {

            constructor: function(baseUrl) {
                this.baseUrl = baseUrl;
                this.layerNames = arguments[1].layerNames;
                this.wmsVersion = arguments[1].wmsVersion || '1.3.0';
                this.transparent = arguments[1].transparent || 'TRUE';
                this.format = arguments[1].format || 'jpeg';
                this.srsOrCrs = 'SRS';
                if (this.wmsVersion == '1.3.0') {
                    this.srsOrCrs = 'CRS'
                }
                this.epsgCode = arguments[1].epsgCode || '3857';
                this.sld = arguments[1].sld;

                this.initialExtent = (this.fullExtent = new Extent(-20037507.067161843, -19971868.8804086, 20037507.067161843, 19971868.8804086, new SpatialReference({ wkid: 102100 })));

                var zoomLevels = new ZoomLevels();

                this.tileInfo = new TileInfo({
                    "rows" : 256,
                    "cols" : 256,
                    "dpi" : 96,
                    "format" : "MIXED",
                    "compressionQuality" : 0,
                    "origin" : {
                        "x" : -20037508.342787,
                        "y" : 20037508.342787
                    },
                    "spatialReference" : {"wkid" : 102100},
                    "lods" : zoomLevels.lods
                });

                this.loaded = true;
                this.onLoad(this);
            }, //end constructor function

            getTileUrl: function(level, row, col) {
                var urlParams = 'REQUEST=GetMap&SERVICE=WMS&BGCOLOR=0xFFFFFF&TRANSPARENT=TRUE&WIDTH=256&HEIGHT=256&reaspect=false' +
                    '&' + this.srsOrCrs + '=EPSG:' + this.epsgCode +
                    '&LAYERS=' + this.layerNames.join(',') + 
                    '&VERSION=' + this.wmsVersion + 
                    '&FORMAT=image/' + this.format;
                if (this.sld) {
                    urlParams += '&SLD=' + this.sld;
                }

                //Get the lat/lon extent of the current tile
                var llExtent = new Extent(
                    this.tile2long(col, level), 
                    this.tile2lat(row+1, level), 
                    this.tile2long(col+1, level), 
                    this.tile2lat(row, level), 
                    new SpatialReference({wkid:4326})
                );
                //Project it to Web Mercator
                var webMercatorExtent = webMercatorUtils.geographicToWebMercator(llExtent);

                return this.baseUrl + urlParams + '&BBOX=' +
                    webMercatorExtent.xmin + ',' + 
                    webMercatorExtent.ymin + ',' + 
                    webMercatorExtent.xmax + ',' + 
                    webMercatorExtent.ymax;
            },

            //Methods to get the lower-left coordinates of the specified tile.
            //Taken from here: http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
            tile2long: function(x, z) {
                return (x/Math.pow(2,z)*360-180);
            },

            tile2lat: function(y, z) {
                var n = Math.PI-2*Math.PI*y/Math.pow(2,z);
                return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
            }
        });
    }
);