define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'esri/layers/layer',
    'dojo/on',
    'dojo/_base/lang'],
    function(
        declare,
        array,
        Layer,
        on,
        lang) {

        return declare([Layer], {
            //parameters
            id: null,              //required
            loaded: false,
            opacity: 1.0,
            url: null,
            visible: true,
            layerDefinitions: null,
            visibleLayers: null,

            //internal state
            _active:null,
            _isDynamic: null,
            _cutoffZoom: 5,
            _dynamicService: null, //required, esri.layers.ArcGISDynamicMapServiceLayer
            _tiledService: null,   //required, esri.layers.ArcGISTiledMapServiceLayer
            _map:null,             //required, esri.Map

            constructor: function(params, map) {
                if (!map || !params.id || !params.dynamicService || !params.tiledService) {
                    logger.error('PairedMapServiceLayer is missing required parameters in constructor');
                    return;
                }

                //TODO use safeMixin to transfer params, but will need param names to match
                //declare.safeMixin(this, params);

                //options allowed in the constructor
                params = params || {}; //TODO why should params ever be null?
                this.id = params.id;
                this._dynamicService = params.dynamicService;
                this._tiledService = params.tiledService;
                this._cutoffZoom = params.cutoffZoom;
                this.visible = params.visible;
                this.opacity = params.opacity;
                this._map = map;
                this.ignoreLayerDefinitions = params.ignoreLayerDefinitions;
                this.ignoreDefaultVisibleLayers = params.ignoreDefaultVisibleLayers;

                //TODO ??
                //based on values from layerInfos[], populated in layersLoaded()
                //opacity, visible, id seem to be set automatically. Why not others?
                this._defaultVisibleLayers = params.defaultVisibleLayers || [];

                //TODO any difference between these?
                on(map, 'zoom-end', lang.hitch(this, this.zoomHandler));
//                map.on('zoom-end', lang.hitch(this, this.zoomHandler));

                //verify layers loaded
                if (!this._dynamicService.loaded || !this._tiledService.loaded) {
                    logger.warn('component layers in PairedMapServiceLayer not loaded');
                    return;
                }

                this.initialize();
            }, //end constructor function

            zoomHandler: function() {
                //logger.debug('zoom level: '+evt.level);
                this._toggleService();
            },

            initialize: function () {
                //inherit properties from the DynamicMapService
                this.url = this._dynamicService.url;
                
                this.maxRecordCount = this._dynamicService.maxRecordCount;

                //Only applies to ArcGISDynamicMapServiceLayer
                if (this._dynamicService.hasOwnProperty('layerDefinitions')) {
                    this.layerDefinitions = this._dynamicService.layerDefinitions;
                }

                this.setOpacity(this.opacity);

                //in case one of the pair were originally visible
                if (!this.visible) {
                    this._dynamicService.setVisibility(false);
                    this._tiledService.setVisibility(false);
                }

                //build list of layer ids visible by default, if not already set in the constructor
                if (this._dynamicService.hasOwnProperty('layerInfos')) { //Only applies to ArcGISDynamicMapServiceLayer
                    if (this._defaultVisibleLayers.length === 0) {
                        array.forEach(this._dynamicService.layerInfos, function (layerInfo) {
                            if (layerInfo.defaultVisibility) {
                                this._defaultVisibleLayers.push(layerInfo.id);
                            }
                        }, this);
                    } else {
                        //if defaultVisibleLayers set in the constructor, set the visibleLayers on the dynamic service
                        this._dynamicService.setVisibleLayers(this._defaultVisibleLayers);                    
                    }
                }
                //inherit visibleLayers from the dynamic service
                if (this._dynamicService.hasOwnProperty('visibleLayers')) {
                    this.visibleLayers = this._dynamicService.visibleLayers; //Only applies to ArcGISDynamicMapServiceLayer
                } else {
                    //For ArcGISImageServiceLayer, set "layer 0" to be the visible layer
                    this.visibleLayers = [0];
                    this._defaultVisibleLayers = [0];
                }

                //set the initial active layer
                this._toggleService();
            },

            setVisibleLayers: function(ids){
                if (!this._dynamicService.hasOwnProperty('visibleLayers')) {
                    return; //For ArcGISImageServiceLayer, immediately return.
                }
                logger.debug('setting visibleLayers to ', ids);

                if (ids === null) {
                    logger.error('visibleLayers cannot be null');
                    return;
                }
                //Empty array means default layer visibility defined in the mapservice
                if (ids.length === 0) {
                    ids = this._defaultVisibleLayers;
                }
                //store in public property
                this.visibleLayers = ids;
                this._toggleService();
                this._dynamicService.setVisibleLayers(ids);
            },

            setLayerDefinitions: function(layerDefinitions){
                //checks for both undefined and null via coercion
                if (layerDefinitions === null) {
                    logger.error('layerDefinitions cannot be null');
                    return;
                }

                if (layerDefinitions.length === 0) {
                    this.layerDefinitions = [];
                }
                if (layerDefinitions.length > 0) { //Prevent an unnecessary dynamic image export when setting layerDefs to default
                    if (this._dynamicService.setLayerDefinitions) {
                        //Call setLayerDefinitions() for ArcGISDynamicMapServiceLayers
                        this._dynamicService.setLayerDefinitions(layerDefinitions);
                    }
                    else if (this._dynamicService.setDefinitionExpression) {
                        //Call setDefinitionExpression() for ArcGISImageServiceLayers
                        this._dynamicService.setDefinitionExpression(layerDefinitions[0], false);
                    }

                    //store in public property
                    this.layerDefinitions = layerDefinitions;
                }

                this._toggleService();

                if (layerDefinitions.length === 0) {
                    if (this._dynamicService.setLayerDefinitions) {
                        //Call setLayerDefinitions() for ArcGISDynamicMapServiceLayers
                        this._dynamicService.setLayerDefinitions([]);
                    }
                    else if (this._dynamicService.setDefinitionExpression) {
                        //Call setDefinitionExpression() for ArcGISImageServiceLayers
                        this._dynamicService.setDefinitionExpression('', false);
                    }
                }
            },


//defined in layers.Layer
            show: function(){
                //console.log('inside show: ', this._active);
                this.setVisibility(true);
            },


//defined in layers.Layer
            hide: function(){
                //console.log('inside hide:', this._active);
                this.setVisibility(false);
            },

//defined in layers.Layer
            setVisibility: function(isVisible){
                //console.log('setting visibility to ',isVisible);
                this.visible = isVisible;
                if (isVisible) {
                    this._toggleService();
                } else {
                    this._tiledService.hide();
                    this._dynamicService.hide();
                }
            },

//defined in layers.Layer
            setOpacity: function(value){
                //console.log('setting opacity to ',value);
                this._tiledService.setOpacity(value);
                this._dynamicService.setOpacity(value);
                this.opacity = value;
            },

//checks whether the current visibleLayers setting matches the default values
            isDefaultVisibleLayers: function(){
                //console.log('inside isDefaultVisibleLayers...');
                if (this.visibleLayers === null) {
                    this.logger.warn('visibleLayers is null');
                    return (false);
                }
                //Empty array means default layers defined in the mapservice
                if (this.visibleLayers === []) {
                    return true;
                }
                if (this.visibleLayers.length !== this._defaultVisibleLayers.length) {
                    return (false);
                }

                var result = dojo.every(this._defaultVisibleLayers, function(item){
                    return (dojo.indexOf(this.visibleLayers, item) > -1);
                }, this);
                return (result);
            },

            suspend: function() {
                this._tiledService.suspend();
                this._dynamicService.suspend();
            },

            resume: function() {
                this._tiledService.resume();
                this._dynamicService.resume();
            },

//implement rules for switching between tiled, dynamic services.
//dynamic service should be used in any of these cases
// 1) zoom level > threshold
// 2) definition query applied
// 3) sublayer visibility does not match default
            _toggleService: function(){
                //logger.debug('inside _toggleService. level = ' + this._map.getLevel());

                // 1) zoom level > threshold
                if (this._map.getAbsoluteLevel() > this._cutoffZoom) {
                    //console.log('zoomLevel exceeded - switching to dynamic...');
                    this._activateDynamicService();
                    return;
                }

                // 2) definition query applied
                if (!this.ignoreLayerDefinitions && this.layerDefinitions && this.layerDefinitions.length > 0) {
                    //console.log('definition query set - switching to dynamic...');
                    this._activateDynamicService();
                    return;
                }

                // 3) sublayer visibility does not match default
                if (!this.ignoreDefaultVisibleLayers && !this.isDefaultVisibleLayers()) {
                    //console.log('visibleLayers not equal to default - switching to dynamic...');
                    this._activateDynamicService();
                    return;
                }

                this._activateTiledService();
            },

            _activateTiledService: function(){
                logger.debug('activating tiled layer ' + this._tiledService.id + '...');

                this._active = this._tiledService;
                this._isDynamic = false;
                this._dynamicService.hide();

                if (this.visible) {
                    this._tiledService.show();
                } else {
                    this._tiledService.hide();
                }
                //this.url = this._tiledService.url;
            },

            _activateDynamicService: function(){                
                logger.debug('activating dynamic layer ' + this._dynamicService.id + '...');

                this._active = this._dynamicService;
                this._isDynamic = true;
                this._tiledService.hide();

                if (this.visible) {
                    this._dynamicService.show();
                } else {
                    this._dynamicService.hide();
                }
                //this.url = this._dynamicService.url;
            }

        });
    }
);