define(['dojo/_base/declare'],
    function(declare){
        return declare([], {
            results: null,
            features: null,
            searchGeometry: null,
            anchorPoint: null,
            serviceUrls: null,

            constructor: function(serviceUrls, serviceTypes) {
                logger.debug('inside constructor for ngdc/identify/IdentifyResultCollection');
                this.serviceUrls = serviceUrls;
                this.serviceTypes = serviceTypes;
            },

            setResultSet: function(results) {
                //this.results = results;
                this.setFeatures(results);
            },

            setSearchGeometry: function(geometry) {
                this.searchGeometry = geometry;
                if (geometry.type === 'point') {
                    this.anchorPoint = geometry;
                }
                else if (geometry.type === 'extent') {
                    this.anchorPoint = geometry.getCenter();
                }
                else if (geometry.type === 'polygon') {
                    this.anchorPoint = geometry.getCentroid();
                }
                else {
                    logger.warn('setSearchGeometry: unrecognized geometry type: ' + geometry.type);
                }
            },


            setFeatures: function(results) {
                //Build an object composed of a list of IdentifyResults for each sublayer in a service.
                //Augment each with formatter key composed of its layer and sublayer names, layerUrl, and service ID.
                this.results = {};
                for (var svcId in results) {

                    for (var i=0; i<results[svcId].length; i++) {
                        var result = results[svcId][i];
                        result.formatter = svcId+'/'+results[svcId][i].layerName;
                        result.layerUrl = this.serviceUrls[svcId] + '/' + results[svcId][i].layerId;
                        result.layerType = this.serviceTypes[svcId];
                        result.svcId = svcId;

                        if (!this.results[svcId]) {
                            this.results[svcId] = {};
                        }
                        if (!this.results[svcId][result.layerName]) {
                            this.results[svcId][result.layerName] = [];
                        }
                        this.results[svcId][result.layerName].push(result);
                    }

                }
            }
        });
    }
);
