define([
    'dojo/_base/declare', 
    'esri/map', 
    'esri/tasks/GeometryService', 
    'esri/dijit/OverviewMap',
    'esri/geometry/webMercatorUtils', 
    'dojo/_base/connect', 
    'dojo/_base/array', 
    'dojo/topic', 
    'dojo/_base/lang', 
    'dojo/dom'
    ],
    function(
        declare, 
        Map, 
        GeometryService, 
        OverviewMap, 
        webMercatorUtils, 
        Connect, 
        array, 
        topic, 
        lang, 
        dom
        ){

        return declare([], {
            constructor: function(divId, options, mapLayerCollection) {
                this.map = new Map(divId, options);

                this.mapLayerCollection = mapLayerCollection;

                this.map.on('load', function(evt){
                    if (options.overview) {
                        var overviewMap = new OverviewMap({
                            map: evt.map,
                            attachTo: 'bottom-right',
                            width: 150,
                            height: 120,
                            visible: true,
                            opacity: 0.3
                        });
                        overviewMap.startup();
                    }
                });

                //If custom lods are used, the first defined zoom level will be considered level 0. 
                //However, we want access to the absolute level (i.e. 2 instead of 0).
                //Augment the Map by adding a new method getAbsoluteLevel(), 
                //which returns the current zoom level matching the well-known indices used by the map services.
                var baseZoomLevel = 0;
                if (options.lods) {
                    baseZoomLevel = options.lods[0].level;
                }
                this.map.getAbsoluteLevel = function() {
                    return this.getLevel() + baseZoomLevel;    
                };

                //fires after each Layer added to Map
                this.map.on('layer-add-result', lang.hitch(this, this.layerAddResultHandler));

                //Fires after all Layers are added to the Map.  Appears to have a timeout of 60 seconds
                //where it gets called even if a remote server is unresponsive
                this.map.on('layers-add-result', lang.hitch(this, this.layersAddResultHandler));

                //add all layers to Map
                this.map.addLayers(this.mapLayerCollection.mapServices);

                this.geometryService = new GeometryService('http://maps.ngdc.noaa.gov/rest/services/Geometry/GeometryServer');

                this.loadingIconEnabled = true;
            },  //end constructor

            layerAddResultHandler: function( evt ) {
                var error = evt.error;
                var layer = evt.layer;

                if (error) {
                    logger.warn('error adding layer '+layer.url+' to map');
                } else {
                    logger.debug('added layer '+layer.url+' to map...');
                }
                //clear timeout even if error. time out handler designed for unresponsive server
                this.mapLayerCollection.clearLayerTimeout(layer.id);
            },

            layersAddResultHandler: function( evt ) {
                //logger.debug('inside handler for onLayersAddResult...');
                var layers = evt.layers;
                //check for every layer reporting success
                var success = array.every(layers, function(item) {
                    return (item.success);
                });

                if (success) {
                    logger.debug('all layers added to map.');
                } else {
                    logger.warn('one or more layers failed to load');
                }

                //should always be true
                if (layers.length !== this.mapLayerCollection.mapServices.length) {
                    logger.warn('onLayersAddResult != mapservice collection length');
                }
                this.mapReady();
            },

            //handle setup which requires all layers to be loaded
            mapReady: function() {
                logger.debug('inside mapReady...');
                this.mapLayerCollection.buildPairedMapServices(this.map);

                //setup mouse event handlers
                this.map.on('mouse-move', lang.hitch(this, this.showCoordinates));
                this.map.on('mouse-drag', lang.hitch(this, this.showCoordinates));

                this.map.on('update-start', lang.hitch(this, this.showLoading));
                this.map.on('update-end', lang.hitch(this, this.hideLoading));

                topic.subscribe('/ngdc/showLoading', lang.hitch(this, this.showLoading));
                topic.subscribe('/ngdc/hideLoading', lang.hitch(this, this.hideLoading));
            },

            //Show coordinates when moving the mouse, updates limited to every 100ms.
            waitToUpdate: false,
            showCoordinates: function(evt) {
                if (! this.waitToUpdate) {
                    this.waitToUpdate = true;
                    topic.publish('/ngdc/mouseposition', this.mapPointToGeographic(evt.mapPoint));

                    //Wait 100ms before allowing another update
                    setTimeout(lang.hitch(this, function(){
                        this.waitToUpdate = false;
                    }), 100);
                }
            },

            //override for various projections
            mapPointToGeographic: function (mapPoint) {
                //already in geographic - no conversion necessary
                return(mapPoint);
            },

            showLoading: function() {
                if (this.loadingIconEnabled) {
                    var loader = dom.byId('busy');
                    if (loader) {
                        loader.style.display = 'block';
                    }
                }
            },

            hideLoading: function() {
                if (this.loadingIconEnabled) {
                    var loader = dom.byId('busy');
                    if (loader) {
                        loader.style.display = 'none';
                    }
                }
            },

            //Enable/disable the identify, identifyPane, and loading icon for this MapConfig.
            setEnabled: function(/*boolean*/ enabled) {
                if (this.identify) {
                    this.identify.enabled = enabled;
                }
                if (!enabled) {
                    this.hideLoading();
                }
                this.loadingIconEnabled = enabled;  

                if (this.identifyPane) {
                    if (enabled) {
                        this.identifyPane.enable();
                    } else {
                        this.identifyPane.disable();
                    }
                }
                
                //TODO Suspend/resume the entire LayerCollection for this MapConfig?
                // this.mapLayerCollection.resume();
            }
        });
    }
);

