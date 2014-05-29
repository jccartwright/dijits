define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/topic",
    "esri/layers/ImageParameters",
    "esri/layers/ImageServiceParameters",
    "ngdc/layers/PairedMapServiceLayer"],
    function(
        declare,
        array,
        lang,
        topic,
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

            constructor: function() {
                //TODO check to ensure unique id for mapServices

                this.createImageParameters();

                //Subscribe to message to set sublayer visibilities on a service
                topic.subscribe('/ngdc/sublayer/visibility', lang.hitch(this, function (svcId, subLayers, visible) {
                    this.setSublayerVisibility(svcId, subLayers, visible);
                }));

                //Subscribe to message to show/hide the entire service
                topic.subscribe('/ngdc/layer/visibility', lang.hitch(this, function (svcId, visible) {
                    if (visible) {
                        this.getLayerById(svcId).show();
                    } else {
                        this.getLayerById(svcId).hide();
                    }
                }));                
            },

            //if >1 layers share an ID, return the first. return undefined if list is null or layer not found
            getLayerById: function(/*String*/ id) {
                if (! this.mapServices) { return (undefined)}

                var foundValues = array.filter(this.mapServices, function(item){
                    return(item.id === id);
                });
                if (foundValues.length == 0) {
                    //If not found in the main list of map services, check the paired services.
                    foundValues = array.filter(this.pairedMapServices, function(item){
                        return(item.id === id);
                    });  
                }

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
                this.imageServiceParameters.compressionQuality = 90; 
                //default output format is 'jpgpng'
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
            },

            //Set the specified sublayers of svcId to be visible/invisible
            setSublayerVisibility: function(/*String*/ svcId, /*array[int]*/ subLayers, /*boolean*/ visible) {
                logger.debug('setSublayerVisibility ' + svcId + ' ' + subLayers + ' ' + visible);
                var svc = this.getLayerById(svcId);
                if (svc) {
                    var set;
                    if (svc.hasOwnProperty('visibleLayers')) { //Only continue if it has a visibleLayers property, i.e. ArcGISDynamicMapServiceLayer or PairedMapServiceLayer
                        set = this.arrayToSet(svc.visibleLayers);
                        var i;

                        if (visible) {
                            //add sublayer ids to the set
                            for (i = 0; i < subLayers.length; i++) {
                                set[subLayers[i]] = true;    
                            }                            
                        } else {
                            //delete sublayer ids from the set
                            for (i = 0; i < subLayers.length; i++) {
                                delete set[subLayers[i]];
                            }                            
                        }

                        var array = this.setToArray(set);
                        if (array.length == 1 && array[0] == -1) {
                            //if visible layers is [-1], hide the service
                            svc.hide();
                            svc.setVisibleLayers(this.setToArray(set));
                        } else {                            
                            svc.setVisibleLayers(this.setToArray(set));
                            svc.show();
                        }
                    }
                }    
            },

            //Converts a "set" object to an array. If the set is empty, return [-1]
            setToArray: function(set) {
                var array = [];
                for (key in set) {
                    if (set.hasOwnProperty(key)) {
                        array.push(parseInt(key));
                    }
                }
                if (array.length) {
                    return array;
                } else {
                    return [-1];
                }
            },

            //Converts an array to a "set" object.
            //For example, the array [0, 1, 2] will be converted to:
            //{0: true, 1: true, 2: true}
            arrayToSet: function(array) {
                var set = {};

                for (var i = 0; i < array.length; i++) {
                    if (array[i] >= 0) { 
                        set[array[i]] = true;
                    }
                }
                return set;
            }
        });
    }
);