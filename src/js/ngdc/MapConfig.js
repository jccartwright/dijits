define([
    'dojo/_base/declare', 
    'esri/map', 
    'esri/tasks/GeometryService', 
    'esri/dijit/OverviewMap',
    'esri/geometry/webMercatorUtils',
    'esri/geometry/Extent',
    'esri/SpatialReference', 
    'dojo/_base/connect', 
    'dojo/_base/array', 
    'dojo/topic', 
    'dojo/_base/lang', 
    'dojo/dom',
    'esri/request'
],
    function(
        declare, 
        Map, 
        GeometryService, 
        OverviewMap, 
        webMercatorUtils, 
        Extent,
        SpatialReference,
        Connect, 
        array, 
        topic, 
        lang, 
        dom,
        request
        ){

        return declare([], {
            showElevation: true,

            constructor: function(divId, options, mapLayerCollection) {
                this.map = new Map(divId, options);

                this.mapLayerCollection = mapLayerCollection;

                if (options.noElevation) {
                    this.showElevation = false;
                }

                if (options.initialExtent) {
                    this.initialExtent = options.initialExtent;
                }

                if (options.overview) {
                    var overviewMap = new OverviewMap({
                        map: this.map,
                        attachTo: 'bottom-right',
                        width: 150,
                        height: 120,
                        visible: true,
                        opacity: 0.3
                    });
                    overviewMap.startup();
                }

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

                this.geometryService = new GeometryService('https://maps.ngdc.noaa.gov/arcgis/rest/services/Utilities/Geometry/GeometryServer');

                this.loadingIconEnabled = true;

                this.map.on('update-start', lang.hitch(this, this.showLoading));
                this.map.on('update-end', lang.hitch(this, this.hideLoading));

                topic.subscribe('/ngdc/showLoading', lang.hitch(this, this.showLoading));
                topic.subscribe('/ngdc/hideLoading', lang.hitch(this, this.hideLoading));
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

                //this needs to be separate from showCoordinates because it has a different behaviour and timer
                if (this.showElevation) {
                    this.map.on('mouse-move', lang.hitch(this, this.showDepthCoordinates));
                }

                //If it's a Web Mercator map, zoom to the specified initial extent.
                //We're doing this here instead of in the Map contructor, in order to properly handle antimeridian-crossing extents.
                if (this.initialExtent && this.map.spatialReference.isWebMercator()) {
                    this.calculateWebMercatorExtent();
                    this.map.setExtent(this.webMercatorExtent, true);
                }
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

                if (this.mapToolbar) {
                    this.mapToolbar.enabled = enabled;
                }
                
                //TODO Suspend/resume the entire LayerCollection for this MapConfig?
                // this.mapLayerCollection.resume();
            },

            //Show depth when mouse stops moving for 500ms. Different behaviour from showCoordinates which fires
            //periodically while the mouse is moving
            movementTimer: null,
            showDepthCoordinates: function(evt) {
                clearTimeout(this.movementTimer);

                this.movementTimer = setTimeout(lang.hitch(this, function () {
                    this.getDepth(this.mapPointToGeographic(evt.mapPoint));
                }), 500);
            },

            getDepth: function (geoPoint) {
                request({
                    url: 'https://gis.ngdc.noaa.gov/arcgis/rest/services/DEM_global_mosaic/ImageServer/identify',
                    content: {
                        geometry: geoPoint.x+','+geoPoint.y,
                        geometryType:'esriGeometryPoint',
                        returnGeometry:false,
                        returnCatalogItems:false,
                        f:'json'
                    }
                }).then(function(data) {
                    //augment incoming Point with retrieved depth value
                    geoPoint.z = data.value;
                    topic.publish('/ngdc/mouseposition', geoPoint);

                }, function(err) {
                    console.error("Error getting depth: ",err);
                });
            },

            calculateWebMercatorExtent: function() {
                var geographicExtent = this.clampExtentTo85(
                    new Extent(this.initialExtent.xmin, this.initialExtent.ymin, this.initialExtent.xmax, this.initialExtent.ymax, {
                    spatialReference:{wkid:4326}
                }));

                this.webMercatorExtent = webMercatorUtils.geographicToWebMercator(geographicExtent);

                //Handles an antimeridian-crossing extent, where the west coordinate is in the Eastern Hemisphere, and the east coordinate is in the Western Hemisphere.
                //Subtract the width of the entire world from the left coordinate. The extent will extend beyond the standard Web Mercator bounds. This is what we want.
                if (this.webMercatorExtent.xmax < this.webMercatorExtent.xmin) {
                    var worldWidth = 40075014.13432359; //Width of the map in Web Mercator
                    this.webMercatorExtent.xmin -= worldWidth;
                }
            },

            //Ensure an extent doesn't go beyond the bounds of the Mercator map (85 N/S)
            clampExtentTo85: function(extent) {
                if (extent.ymax > 85) {
                    extent.ymax = 85;
                }
                if (extent.ymin > 85) {
                    extent.ymin = 85;
                }
                if (extent.ymax < -85) {
                    extent.ymax = -85;
                }
                if (extent.ymin < -85) {
                    extent.ymin = -85;
                }
                return extent;
            }
        });
    }
);

