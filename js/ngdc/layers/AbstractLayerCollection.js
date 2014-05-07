define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "esri/layers/ImageParameters",
    "esri/layers/ImageServiceParameters",
    "ngdc/layers/PairedMapServiceLayer"],
    function(
        declare,
        array,
        ImageParameters,
        ImageServiceParameters,
        PairedMapServiceLayer){

        //"static" properties
        var imageParameters;

        return declare([], {
            //instance objects set in concrete class constructor
            mapServices: null,
            pairedMapServices: null,
            layerTimeouts: null,
            name: null,

            //TODO still necessary?
            firstZoomLevel: 2,

            constructor: function() {
                //TODO check to ensure unique id for mapServices

                this.createImageParameters();
            },

            //if >1 layers share an ID, return the first. return undefined if list is null or layer not found
            getLayerById: function(/*String*/ id) {
                if (! this.mapServices) { return (undefined)}

                var foundValues = array.filter(this.mapServices,function(item){
                    return(item.id === id);
                });
                return foundValues[0];
            },

            getLayerIds: function() {
                return array.map(this.mapServices, function(svc){
                    return svc.id;
                })
            },

            createImageParameters: function() {
                this.imageParameters = {};
                this.imageParameters.png32 = new ImageParameters();
                this.imageParameters.png32.format = "png32";
                this.imageParameters.jpg = new ImageParameters();
                this.imageParameters.jpg.format = "jpg";

                this.imageServiceParameters = new ImageServiceParameters();
                this.imageServiceParameters.interpolation = ImageServiceParameters.INTERPOLATION_BILINEAR;
            },

            buildPairedMapServices: function(map) {
                if (! this.pairedMapServices) {
                    logger.debug("pairedMapServices list is null for "+this.name);
                    return;
                }
                logger.debug('building '+this.pairedMapServices.length+' PairedMapServices for '+this.name+'...');

                var layer;
                array.forEach(this.pairedMapServices, function(layerDef){
                    layer = new PairedMapServiceLayer(layerDef, map);

                    //insert into mapServices list replacing two existing entries
                    this.updateMapServiceList(layer);
                }, this);
            },

            setLayerTimeouts: function() {
                logger.debug('setting layer timeouts for '+this.name+'...');
                //setup timeouts for each layer to load
                this.layerTimeouts = {};
                dojo.forEach(this.mapServices, function(svc) {
                    this.layerTimeouts[svc.id] = setTimeout(dojo.partial(this.layerTimeoutHandler, svc), 5000);
                    //alternate way to bind argument to closure
                    //globals.layerTimeouts[svc.id] = setTimeout(function(){layerTimeoutHandler(svc.id);}, 5000);
                }, this);
            },

            //TODO refactor
            updateMapServiceList: function(layer) {
                //determine the original array index of each of the layers
                var idx = [];
                array.forEach(this.mapServices, function(svc, i){
                    if (svc.id === layer._dynamicService.id) {
                        idx.push(i);
                    }
                }, this);

                array.forEach(this.mapServices, function(svc, i){
                    if (svc.id === layer._tiledService.id) {
                        idx.push(i);
                    }
                }, this);
                if (idx.length != 2) {
                    logger.warn("There should only be two elements in this array")
                }
                idx.sort();

                //place the new PairedMapServiceLayer at the lowest index, remove the other
                //WARNING: modifies the original list
                this.mapServices.splice(idx[0], 1, layer);
                this.mapServices.splice(idx[1], 1);
            },

            layerTimeoutHandler: function(mapservice) {
                //logger.debug('inside layerTimeoutHandler with '+mapservice.id);
                logger.warn("failed to load layer "+mapservice.id);
                mapservice.suspend();

                //TODO send message to server to log, email, etc.
            },

            clearLayerTimeout: function(mapserviceId) {
                //logger.debug('clearing timeout for layer '+mapserviceId);
                clearTimeout(this.layerTimeouts[mapserviceId]);
            }
        });
    }
);