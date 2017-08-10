define([
    'dojo/_base/declare',
    'ngdc/MapToolbar', 
    'esri/geometry/webMercatorUtils'],
    function(
        declare, 
        MapToolbar, 
        webMercatorUtils
        ){
        return declare([MapToolbar], {

            constructor: function() {
                logger.debug('inside constructor for web_mercator/MapToolbar');
            },

            //override method in parent class to use projection-specific conversion
            extentToGeographic: function(extent) {
                return (webMercatorUtils.webMercatorToGeographic(extent));
            }
        });
    }
);

