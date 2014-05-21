define([
    "dojo/_base/declare", 
    "dojo/_base/array", 
    "dojo/promise/all", 
    "dojo/Deferred",
    "dojo/_base/lang", 
    "dojo/topic", 
    "dojo/on",
    "dojo/aspect", 
    "dojo/_base/Color", 
    "esri/tasks/IdentifyTask",
    "esri/tasks/IdentifyParameters", 
    "esri/tasks/IdentifyResult", 
    "esri/symbols/SimpleMarkerSymbol", 
    "esri/symbols/SimpleLineSymbol",
    "esri/graphic",
    "ngdc/identify/IdentifyResultCollection"
    ],
    function(
        declare, 
        array, 
        all,
        Deferred, 
        lang, 
        topic, 
        on,
        aspect,
        Color,
        IdentifyTask,
        IdentifyParameters, 
        IdentifyResult, 
        SimpleMarkerSymbol, 
        SimpleLineSymbol, 
        Graphic,
        IdentifyResultCollection
        ) {

        return declare([], {
            _map: null,
            taskInfos: null, //list of IdentifyTasks
            results: null,   //reference to the most recent resultset
            promises: null,  //promise issued by the most recent "all"
            //TODO this only needs to be "instance" variable if need to cancel deferreds individually
            deferreds: null, //list of promises bundled into single promise.
            searchGeometry: null,

            //called prior to subclass constructor
            constructor: function(arguments) {
                logger.debug('inside constructor for ngdc/AbstractIdentify');
            },

            init: function(params) {
                logger.debug('inside init...');

                this._mapConfig = params[0].mapConfig;
                var layerIds = params[0].layerIds,
                    layerCollection = params[0].mapConfig.mapLayerCollection;

                this._map = params[0].mapConfig.map;

                topic.subscribe("/ngdc/geometry", lang.hitch(this, "identifyWithGeometry"));
                topic.subscribe("/ngdc/mapPoint", lang.hitch(this, "identifyWithPoint"));

                this._map.on("extent-change", lang.hitch(this, "updateMapExtent"));

                this.taskInfos = this.createTaskInfos(layerIds, layerCollection);

                // the symbol used to represent the location where the user clicked on the map
                this.clickSymbol = params.clickSymbol ||
                    new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_X, 12, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 255]), 3));

//                this._map.on("click", lang.hitch(this, function(evt) {
//                    this._map.infoWindow.setTitle("Coordinates");
//                    this._map.infoWindow.setContent("lat/lon : " + evt.mapPoint.y + ", " + evt.mapPoint.x);
//                    this._map.infoWindow.show(evt.screenPoint,this._map.getInfoWindowAnchor(evt.screenPoint));
//                }));
            },

            /*
            //only used for debugging
            slowTask: function() {
                var deferred = new Deferred();
                setTimeout(function() {
                    deferred.resolve(new Date());
                }, 5*1000);
                return deferred.promise;
            },
            */

            identifyWithGeometry: function(geometry) {
                logger.debug('inside identifyWithGeometry');
                this.identify(geometry);
            },

            identifyWithPoint: function(mapPoint) {
                this.identify(mapPoint);

                //TOD factor out to better support alternate Identify styles, e.g. Popup
                //Remove any identify graphic from the map
                var graphic = Graphic(mapPoint, this.clickSymbol);
                if (this._map.identifyGraphic) {
                    this._map.graphics.remove(this._map.identifyGraphic);
                }
                this._map.identifyGraphic = graphic;

                //Add the click graphic to the map
                this._map.graphics.add(graphic);
            },

            identify: function(geometry) {
                logger.debug('inside identify...');
                this.resetMapInfoWindow();

                //TODO still necessary since IdentifyResultCollection storing it?
                this.searchGeometry = geometry;

                //TODO use isResolved() or isFulFilled()?
                if (this.promises && this.promises.isResolved() == false) {
                    logger.debug('cancelling an active promise...');
                    //this.cancelPromise();
                    this.promises.cancel('cancelled due to new request', true);
                }

                //only used for debugging
                //this.deferreds = {'slowTask': this.slowTask()};

                this.deferreds = {};

                array.forEach(this.taskInfos, function(taskInfo){
                    taskInfo.params.geometry = geometry;

                    if (taskInfo.enabled) {
                        this._mapConfig.showLoading();
                        this.deferreds[taskInfo.layer.id] = taskInfo.task.execute(taskInfo.params);
                    } else {
                        logger.debug('task not enabled: '+taskInfo.layer.url);
                    }
                }, this);

                this.promises = new all(this.deferreds, true);

                this.promises.then(lang.hitch(this, function(results) {
                    this._mapConfig.hideLoading();
                    //produces an map of arrays where each key/value pair represents a mapservice. The keys are the Layer
                    // names, the values are an array of IdentifyResult instances.

                    //TODO necessary? reference the resultCollection instead?
                    //keep a reference to the last result
                    this.results = results;

                    //create a list of service URLs for each layer to be used in IdentifyResultCollection
                    var serviceUrls = {};
                    array.forEach(this.taskInfos, function(taskInfo) {
                            serviceUrls[taskInfo.layer.id] = taskInfo.layer.url;
                    });

                    var resultCollection = new IdentifyResultCollection(serviceUrls);
                    resultCollection.setResultSet(results);
                    resultCollection.setSearchGeometry(geometry);

                    //Sort the results (customized per viewer)
                    this.sortResults(resultCollection.results);

                    //publish message w/ results
                    //TODO place into a Store instead?
                    topic.publish("/identify/results", resultCollection);
                }));
            },

            sortResults: function(results) {
                //Do nothing. Override this function in subclass if sorting is desired.
                return;
            },

            resetMapInfoWindow: function() {
                console.log('resetting map infoWindow...');
                this._map.infoWindow.hide();
                this._map.infoWindow.clearFeatures();
            },

            //not currently used
            cancelPromise: function() {
                //not sure this is necessary. Documentation says that cancelling a promise returned by "all" will
                //not cancel it's constituent promises.  However, it seems to work.
//                for(var i in this.deferreds) {
//                    this.deferreds[i].cancel();
//                }
                this.promises.cancel('cancelled due to new request', true);
            },


            createTaskInfos: function(layerIds, layerCollection) {
                logger.debug('inside createTaskInfos...');

                var taskInfos = [], layer;

                array.forEach(layerIds, function(layerId) {
                    layer = layerCollection.getLayerById(layerId);
                    //listen for changes to visibility in sublayers
                    aspect.after(layer, "setVisibleLayers", lang.hitch(this, lang.partial(this.updateVisibleLayers, layer)), true);

                    //listen for changes in layer definitions in sublayers
                    aspect.after(layer, "setLayerDefinitions", lang.hitch(this, lang.partial(this.updateLayerDefinitions, layer)), true);

                    //listen for changes in layer visibility
                    on(layer, 'visibility-change', lang.hitch(this, lang.partial(this.updateVisibility, layer)), true);

                    logger.debug('creating IdentifyTask for URL '+layer.url);
                    taskInfos.push({
                        layer: layer,
                        task: new IdentifyTask(layer.url),
                        enabled: layer.visible,
                        params: this.createIdentifyParams(layer)
                    });
                }, this);
                return (taskInfos);
            },

            createIdentifyParams: function(layer) {
                logger.debug('inside createIdentifyParams...');

                var identifyParams = new IdentifyParameters();
                identifyParams.tolerance = 3;
                identifyParams.returnGeometry = false;
                identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
                identifyParams.width  = this._map.width;
                identifyParams.height = this._map.height;
                identifyParams.mapExtent = this._map.extent;

                //initialize these based on current layer settings
                identifyParams.layerIds = layer.visibleLayers
                identifyParams.layerDefinitions = layer.layerDefinitions;
                return(identifyParams);
            },

            updateVisibility: function(layer, visible) {
                logger.debug('inside updateVisibility with ' + layer.id + ' ' + visible);

                array.forEach(this.taskInfos, function(taskInfo){
                    if (taskInfo.layer.id == layer.id) {
                        taskInfo.enabled = visible;
                    }
                });
            },

            updateVisibleLayers: function(layer, visibleLayers) {
                logger.debug('inside updateVisibleLayers with '+layer.id+' visibleLayers: '+visibleLayers);

                array.forEach(this.taskInfos, function(taskInfo){
                    if (taskInfo.layer.id == layer.id) {
                        taskInfo.params.layerIds = visibleLayers;
                    }
                });
            },

            updateLayerDefinitions: function(layer, layerDefinitions) {
                logger.debug('inside updateLayerDefinitions with '+layer.id+' layerDefinitions: '+layerDefinitions);

                array.forEach(this.taskInfos, function(taskInfo){
                    if (taskInfo.layer.id == layer.id) {
                        taskInfo.params.layerDefinitions = layerDefinitions;
                    }
                });
            },

            updateMapExtent: function(evt) {
                logger.debug('inside updateMapExtent: ');
                array.forEach(this.taskInfos, function(taskInfo){
                    taskInfo.params.width  = this._map.width;
                    taskInfo.params.height = this._map.height;
                    taskInfo.params.mapExtent = this._map.extent;
                    //TODO set maxAllowableOffset based on scale?
                }, this);
            },

            //Helper function to replace attributes containing the string "Null" with an empty string.
            replaceNullAttributesWithEmptyString: function(attributes) {
                for (attribute in attributes) {
                    if (attributes[attribute] === 'Null') {
                        attributes[attribute] = '';
                    }
                }
                return attributes;
            }
        });
    }
);
