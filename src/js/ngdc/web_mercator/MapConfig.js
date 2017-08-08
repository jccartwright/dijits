define([
    'dojo/_base/declare',
    'ngdc/MapConfig', 
    'esri/geometry/webMercatorUtils'],
    function(
        declare, 
        MapConfig, 
        webMercatorUtils
        ){
        return declare([MapConfig], {

            constructor: function() {
                logger.debug('inside constructor for ngdc/web_mercator/MapConfig');
            },

            //override method in parent class for projection-specific conversion
            mapPointToGeographic: function mapPointToGeographic(mapPoint) {
                return (webMercatorUtils.webMercatorToGeographic(mapPoint));
            }
        });
    }
);

