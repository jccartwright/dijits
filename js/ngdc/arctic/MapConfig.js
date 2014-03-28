define(["dojo/_base/declare","ngdc/MapConfig"],
    function(declare, MapConfig ){
        return declare([MapConfig], {

            constructor: function(arguments) {
                logger.debug('inside constructor for ngdc/arctic/MapConfig');
            },

            //override method in parent class for projection-specific conversion
            mapPointToGeographic: function mapPointToGeographic(mapPoint) {
                //return (webMercatorUtils.webMercatorToGeographic(mapPoint));
            }
        });
    }
);