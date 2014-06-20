define([
    'dojo/_base/declare',
    'ngdc/MapConfig'
    ],
    function(
        declare, 
        MapConfig ){
        return declare([MapConfig], {
            constructor: function() {
                logger.debug('inside constructor for ngdc/antarctic/MapConfig');

                if (Proj4js) {  
                    this.sourceProj = new Proj4js.Proj('EPSG:3031');
                    this.destProj = new Proj4js.Proj('EPSG:4326');
                }
            },

            //override method in parent class for projection-specific conversion
            mapPointToGeographic: function mapPointToGeographic(mapPoint) { 
                var mp = {};
                mp.x = mapPoint.x;
                mp.y = mapPoint.y;

                if (Proj4js) {    
                    Proj4js.transform(this.sourceProj, this.destProj, mp);
                }
                return (mp);
            }
        });
    }
);