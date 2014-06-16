define([
    "dojo/_base/declare",
    "dojo/_base/config",
    "dojo/on",
    "dojo/dom",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/dom-style",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dnd/move",
    "esri/domUtils",
    "dojox/layout/FloatingPane",
    "dojo/topic",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dijit/tree/ObjectStoreModel",
    "dijit/Tree",
    "dijit/layout/BorderContainer",
    "dijit/layout/StackContainer",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "dijit/registry",
    "esri/tasks/QueryTask",
    "esri/tasks/query",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "dojo/_base/Color",
    "esri/SpatialReference",
    "esri/geometry/Polyline",
    "esri/geometry/Point",
    "esri/geometry/Polygon",
    "esri/geometry/Multipoint",
    "esri/geometry/Extent",
    "esri/geometry/screenUtils",
    "esri/geometry/webMercatorUtils",
    "dojo/window"
],
    function (
        declare,
        config,
        on,
        dom,
        domConstruct,
        array,
        domStyle,
        lang,
        domClass,
        move,
        domUtils,
        FloatingPane,
        topic,
        Memory,
        Observable,
        ObjectStoreModel,
        Tree,
        BorderContainer,
        StackContainer,
        ContentPane,
        Button,
        registry,
        QueryTask,
        Query,
        SimpleFillSymbol,
        SimpleLineSymbol,
        SimpleMarkerSymbol,
        Color,
        SpatialReference,
        Polyline,
        Point,
        Polygon,
        Multipoint,
        Extent,
        screenUtils,
        webMercatorUtils,
        win
        )
    {
        return declare(FloatingPane, {

            constructor: function (params) {
                logger.debug('inside constructor for ngdc.identify.IdentifyPane');

                this.resizable = true;
                this.dockable = false;
                this.doLayout = true;
                this.duration = 100;
                this.isFirstShow = true;
                this.autoExpandTree = params.autoExpandTree && true;
                this.enabled = true;
                this.visible = false;

                lang.mixin(this, params);

                this.uid = 0;

                topic.subscribe("/identify/results", lang.hitch(this, function (results) {
                    //console.log('identify results: ', results);
                    if (this.enabled) {
                        this.results = results;
                        this.showResults(results);
                    }
                }));

                // the symbol used to display polygon features
                // default is 30% opaque blue fill
                this.fillSymbol = params.fillSymbol ||
                    new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                        new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                            new Color([64, 64, 64, 1]), 2), new Color([0, 0, 255, 0.3]));

                // the symbol used to display polyline features
                // default is blue lines
                this.lineSymbol = params.lineSymbol ||
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 255]), 2);

                // the symbol used to display point/multipoint features
                this.markerSymbol = params.markerSymbol ||
                    new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 13,
                        new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 128, 0]), 2), new Color([0, 255, 0]));

            },

            postCreate: function() {
                this.inherited(arguments);
                //console.log('inside postCreate...');

                //Hide initial display
                this.hide();

                //Set the FloatingPane's Moveable to be constrained to the parent
                this.moveable = new dojo.dnd.move.parentConstrainedMoveable(
                    this.domNode,
                    {
                        handle: this.focusNode,
                        area: "content",
                        within: true
                    }
                );

                //Initialize the StackContainer with 2 ContentPanes: featurePage and infoPage
                this.stackContainer = new StackContainer({
                    style: "height: 100%; width: 100%; padding: 0px;",
                    class: "identifyPane-stackContainer"
                }, this.containerNode);

                this.featurePage = new ContentPane({
                    style: "height: 100%; width: 100%; padding: 0px;",
                    class: "identifyPane-featurePage"
                }).placeAt(this.containerNode);
                this.stackContainer.addChild(this.featurePage);

                this.infoPage = new ContentPane({
                    style: "height: 100%; width: 100%",
                    class: "identifyPane-infoPage"
                });
                this.stackContainer.addChild(this.infoPage);

                //Create a BorderContainer for the featurePage.
                //The top part (featurePane) contains the tree; the bottom part is a spacer for the resize handle
                var bc = new BorderContainer({
                    style: "height: 100%; width: 100%",
                    gutters: false
                });

                this.featurePane = new ContentPane({
                    region: "center",
                    style: "background: #EEE; border: 1px solid #BFBFBF; padding: 2px;"
                });
                bc.addChild(this.featurePane);

                this.featurePageBottomBar = new ContentPane({
                    region: "bottom",
                    style: "height: 16px;"
                });
                bc.addChild(this.featurePageBottomBar);
                bc.placeAt(this.featurePage);


                //Create a BorderContainer for the infoPage.
                var bc2 = new BorderContainer({
                    style: "height: 100%; width: 100%",
                    gutters: false,
                    splitter: true
                });
                this.infoPane = new ContentPane({
                    region: "center",
                    style: "background: #EEE; border: 1px solid #BFBFBF; padding: 2px;"
                });
                bc2.addChild(this.infoPane);

                this.infoPageBottomBar = new ContentPane({
                    region: "bottom",
                    style: "padding: 2px"
                });
                bc2.addChild(this.infoPageBottomBar);
                bc2.placeAt(this.infoPage);

                //Initialize the infoPage with a back button
                //TODO: finish implementing this
                this.backButton = new Button({
                    label: "Back",
                    style: "bottom: 5px; left: 5px;",
                    onClick: lang.hitch(this, function(){
                        this.setTitle(this.featurePageTitle);
                        this.stackContainer.back();
                    })
                }).placeAt(this.infoPageBottomBar);

                this.stackContainer.startup();

                //Initialize a Memory store with a root only
                this.featureStore = new Observable(Memory({
                    data: [
                        {id: 'root', label: 'root'}
                    ],
                    getChildren: function(object){
                        return this.query({parent: object.id});
                    }
                }));

                //Create the store model used by the Tree
                this.storeModel = new ObjectStoreModel({
                    store: this.featureStore,
                    query: {id: 'root'},
                    labelAttr: 'label',
                    mayHaveChildren: function(item) {
                        //items of type 'item' never have children.
                        return (item.type != 'item');
                    }
                });

                //Custom TreeNode class (based on dijit.TreeNode) that allows rich text labels.
                //Example here: http://dojotoolkit.org/reference-guide/1.9/dijit/Tree-examples.html
                this.CustomTreeNode = declare(Tree._TreeNode, {
                    _setLabelAttr: {node: "labelNode", type: "innerHTML"}
                });
            },

            resize: function(newSize) {
                var top = this.domNode.style.top;
                var left = this.domNode.style.left;

                this.inherited(arguments);
                domStyle.set(this.domNode, "top", top);
                domStyle.set(this.domNode, "left", left);

                //Ensure the contents get properly resized when the entire widget resizes, doesn't seem to happen otherwise
                this.stackContainer.resize();
                this.featurePage.resize();
                this.infoPage.resize();
            },

            startup: function() {
                //console.log('inside startup...');
                this.inherited(arguments);

                //Activate the featurePage by default. TODO fix this
                this.stackContainer.forward();
                this.stackContainer.back();
                //this.showFeaturePage();
            },

            showResults: function(resultCollection) {
                //console.log("inside showResults...");
                var screenPt;
                if (this.map.spatialReference.isWebMercator() && resultCollection.anchorPoint.spatialReference.wkid == 4326) {
                    screenPt = screenUtils.toScreenGeometry(this.map.extent, this.map.width, this.map.height,
                        webMercatorUtils.geographicToWebMercator(resultCollection.anchorPoint));
                }
                else {
                    screenPt = screenUtils.toScreenGeometry(this.map.extent, this.map.width, this.map.height, resultCollection.anchorPoint);
                }
                screenPt.x += this.map.position.x;
                screenPt.y += this.map.position.y;

                this.removeHighlightGraphic();

                this.showFeaturePage();

                //Destroy the existing tree and clear the feature store
                if (this.tree) {
                    this.tree.destroyRecursive();
                }
                this.clearFeatureStore();

                //Populate the store used by the tree
                this.numFeatures = this.populateFeatureStore(resultCollection.results);

                //Construct a new tree and place it in the feature pane.
                this.constructFeatureTree();

                this.featurePageTitle = "Identified Features (" + this.numFeatures + ")";
                this.setTitle(this.featurePageTitle);
                this.show(screenPt.x, screenPt.y); //Show the widget
                this.visible = true;
                //this.resize();
            },

            populateFeatureStore: function(results) {
                var numFeatures = 0;

                for (var svcName in results) {
                    for (var layerName in results[svcName]) {

                        numFeatures += results[svcName][layerName].length;

                        for (var i = 0; i < results[svcName][layerName].length; i++) {
                            var item = results[svcName][layerName][i];
                            var layerKey = svcName + '/' + layerName;
                            var layerUrl = results[svcName][layerName][i].layerUrl;

                            //Create a layer "folder" node if it doesn't already exist
                            if (this.featureStore.query({name: layerName}).length == 0) {
                                this.featureStore.put({
                                    uid: ++this.uid,
                                    id: layerName,
                                    label: this.getLayerDisplayLabel(item),
                                    type: 'folder',
                                    parent: 'root'
                                });
                            }

                            //Add the current item to the store, with the layerName as parent
                            this.featureStore.put({
                                uid: ++this.uid,
                                id: this.uid,
                                //TODO: make sure magnifying glass DOM id property is unique
                                displayLabel: this.getItemDisplayLabel(item),
                                label: this.getItemDisplayLabel(item) + " <a id='zoom-" + this.uid + "' href='#' class='zoomto-link'><img src=config.app.ngdcDijitsUrl+'/identify/images/magnifying-glass.png'></a>",
                                layerUrl: layerUrl,
                                layerKey: layerKey,
                                attributes: item.feature.attributes,
                                parent: layerName,
                                type: 'item'
                            });
                        }
                    }
                }
                return numFeatures;
            },

            constructFeatureTree: function() {
                //Construct a new Tree
                this.tree = new Tree({
                    model: this.storeModel,
                    showRoot: false,
                    persist: false,
                    autoExpand: false, //seems to be more efficient to call expandAll() later.
                    openOnClick: true,
                    onClick: lang.hitch(this, function(item) {
                        this.showInfo(item);
                    }),
                    getIconClass: function(item, opened) {
                        if (item.type == 'item') {
                            return "iconBlank";
                        }
                        else if (item.type == 'folder') {
                            return (opened ? "dijitFolderOpened" : "dijitFolderClosed");
                        }
                        else {
                            return "dijitLeaf";
                        }
                    },
                    _createTreeNode: lang.hitch(this, function(args){
                        return new this.CustomTreeNode(args);
                    })
                });

                //Attach the onMouseOver handler for highlighting features.
                //It's pausable so we can pause it when hiding the dijit to avoid extraneous mouseovers firing
                this.onMouseOverHandler = on.pausable(this.tree, "mouseOver", lang.hitch(this, function(item) {
                    this.onMouseOverNode(item);
                }));
                this.tree.placeAt(this.featurePane);
                this.tree.startup();
                if (this.autoExpandTree) {
                    this.tree.expandAll();
                }
            },

            getLayerDisplayLabel: function(item) {
                //Sub-classes should implement this method. By default, it's the layer name (from the map service) in bold
                return '<b>' + item.layerName + '</b>';
            },

            getItemDisplayLabel: function(item) {
                //Sub-classes should implement this method. By default, it's the display expression for the feature (from the map service)
                return item.value;
            },

            clearFeatureStore: function() {
                //console.log("inside clearFeatureStore...");
                //Remove all items except for the root
                var allItems = this.featureStore.query();
                array.forEach(allItems, lang.hitch(this, function(item) {
                    if (item.id != 'root') {
                        this.featureStore.remove(item.id);
                    }
                }));
            },

            showInfo: function(item) {
                //Should be overidden by subclasses in most cases
                //console.log("inside showInfo...");

                this.currentItem = item;

                //Highlight the current geometry (specifically for touch-screen devices where the mouseOver event won't fire)
                this.queryForHighlightGeometry(item);

                this.setTitle('Attributes: ' + item.displayLabel);

                var layerKey = item.layerKey;
                this.setInfoPaneContent(this.identify.formatters[layerKey](item));

                this.showInfoPage();
                var size = {w: this.domNode.clientWidth, h: this.domNode.clientHeight}; //hack: prevent it from resetting to the initial size/position when calling resize()
                this.resize(size); //manually call resize() so the contents layout properly, even if line wrapping occurs.
            },

            setInfoPaneContent: function(content) {
                this.infoPane.domNode.innerHTML = content;
            },

            onMouseOverNode: function(evt) {
                //console.log("inside onMouseOverNode...");

                //The event references the TreeRow. Get the enclosing TreeNode widget.
                var item = registry.getEnclosingWidget(evt.target).item;

                if (item && item.type == 'item') {
                    if (this.highlightItem && item.uid == this.highlightItem.uid) {
                        //skip if current item already highlighted
                        return;
                    }

                    clearTimeout(this.mouseOverTimer); //clear any existing timeout
                    this.mouseOverTimer = setTimeout(lang.hitch(this, function(){
                        //only fire a query if hovering for >100ms
                        this.queryForHighlightGeometry(item);
                    }), 100);

                    //TODO: cache feature geometries in a store to speed up subsequent mouseovers?
                    //Cache the first X features on load?
                }
            },

            queryForHighlightGeometry: function(item) {
                //Query the map service for one feature's geometry
                //console.log("inside mouseOverQuery...");
                if (this.highlightItem && item.uid == this.highlightItem.uid) {
                    //skip if current item already highlighted
                    return;
                }

                this.highlightItem = item;

                var queryTask = new QueryTask(item.layerUrl);
                var query = new Query();
                query.where = "OBJECTID = " + item.attributes['OBJECTID'];
                query.outSpatialReference = this.map.spatialReference;
                query.returnGeometry = true;
                query.maxAllowableOffset = 100; //simpify a bit for performance
                query.outFields = [];
                var uid = item.uid;

                //console.log("Executing query");
                queryTask.execute(query).then(lang.hitch(this, function(featureSet) {
                    //console.log("Query returned");

                    //highlight the feature on the map
                    this.highlightFeature(featureSet.features[0]);

                    //TODO: show the zoom-to button for this TreeNode
                    this.showZoomToIcon(uid);

                    //TODO: error handling
                }));

            },

            showZoomToIcon: function(id) {
                if (this.currentZoomToIcon && dom.byId(this.currentZoomToIcon.id)) {
                    domStyle.set(this.currentZoomToIcon.id, "display", "none");
                }
                this.currentZoomToIcon = dom.byId('zoom-' + id);
                domStyle.set('zoom-' + id, "display", "inline");

                //Remove any existing zoom-to handler
                if (this.zoomToHandler) {
                    this.zoomToHandler.remove();
                }
                this.zoomToHandler = on(this.currentZoomToIcon, "click", lang.hitch(this, function(evt){
                    console.log('Zoom-to clicked for uid=' + id);
                    evt.stopPropagation(); //Stop the onClick event from bubbling up to the enclosing TreeNode
                    this.zoomToFeature(this.highlightGraphic);
                }));
            },

            zoomToFeature: function(graphic) {
                console.log("inside zoomToFeature...");

                var geometry = graphic.geometry;
                var worldWidth = 40075014.13432359; //Width of the map in Web Mercator

                if (geometry.type === "point") {
                    this.map.centerAndZoom(geometry, this.map.getLevel() + 3); //Center on the point and zoom in 3 more levels
                }
                else {
                    var featureExtent = geometry.getExtent();
                    if ((featureExtent.spatialReference.isWebMercator()) &&
                        featureExtent.xmin <= -20000000 && featureExtent.xmax >= 20000000) {
                        //Projection is Web Mercator, and the feature's bounding box crosses the entire globe.
                        //So, it's likely the feature crosses the antimeridian.

                        //180-degree centered Web Mercator WKT
                        var outSR = new SpatialReference({wkt: "PROJCS[\"WGS_1984_Web_Mercator_Auxiliary_Sphere\",GEOGCS[\"GCS_WGS_1984\",DATUM[\"D_WGS_1984\",SPHEROID[\"WGS_1984\",6378137.0,298.257223563]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]],PROJECTION[\"Mercator_Auxiliary_Sphere\"],PARAMETER[\"False_Easting\",0.0],PARAMETER[\"False_Northing\",0.0],PARAMETER[\"Central_Meridian\",180],PARAMETER[\"Standard_Parallel_1\",0.0],PARAMETER[\"Auxiliary_Sphere_Type\",0.0],UNIT[\"Meter\",1.0]]"});

                        //Convert the geometry to 180-centered Web Mercator by adding/subtracting worldWidth from all x coords in the Western Hemisphere
                        var newGeom;
                        if (geometry.type === 'polyline') {
                            newGeom = new Polyline(outSR);
                            array.forEach(geometry.paths, function(path){
                                var newPoints = [];
                                for (var i = 0; i < path.length; i++) {
                                    var x = path[i][0] - worldWidth/2
                                    if (x < -worldWidth/2)
                                        x += worldWidth;
                                    newPoints[i] = new Point(x, path[i][1], outSR);
                                }
                                newGeom.addPath(newPoints);
                            }, this);
                        }
                        else if (geometry.type === 'polygon') {
                            newGeom = new Polygon(outSR);
                            array.forEach(geometry.rings, function(ring){
                                var newPoints = [];
                                for (var i = 0; i < ring.length; i++) {
                                    var x = ring[i][0] - worldWidth/2;
                                    if (x < -worldWidth/2)
                                        x += worldWidth;
                                    newPoints[i] = new Point(x, ring[i][1], outSR);
                                }
                                newGeom.addRing(newPoints);
                            }, this);
                        }
                        else { //multipoint
                            newGeom = new Multipoint(outSR);
                            array.forEach(geometry.points, function(point){
                                var x = point - worldWidth/2;
                                if (x < -worldWidth/2)
                                    x += worldWidth;
                                newGeom.addPoint(new Point(x, point[1], outSR));
                            }, this);
                        }
                        var newExtent = newGeom.getExtent(); //extent in 180-centered coords

                        //Shift the extent by a constant to convert back to Web Mercator
                        //May result in a geometry extending past the western edge of the map. This is what we want.
                        featureExtent = new Extent(newExtent.xmin - worldWidth/2, newExtent.ymin, newExtent.xmax - worldWidth/2, newExtent.ymax, new esri.SpatialReference({
                            wkid: 3857
                        }));
                    }
                    this.map.setExtent(featureExtent, true); //Set the map's extent for Web Mercator, Arctic, etc.
                }

            },

            highlightFeature: function(graphic) {
                //console.log("inside highlightFeature...");

                // remove previous highlight graphic
                this.removeHighlightGraphic();

                if (graphic) {
                    // set the symbol for the graphic
                    switch (graphic.geometry.type) {
                        case "point":
                            graphic.setSymbol(this.markerSymbol);
                            break;
                        case "multipoint":
                            graphic.setSymbol(this.markerSymbol);
                            break;
                        case "polyline":
                            graphic.setSymbol(this.lineSymbol);
                            break;
                        case "polygon":
                            graphic.setSymbol(this.fillSymbol);
                            break;
                    }

                    // add the highlight graphic to the map
                    this.map.graphics.add(graphic);
                    this.highlightGraphic = graphic;
                }
            },

            removeHighlightGraphic: function() {
                if (this.highlightGraphic) {
                    this.map.graphics.remove(this.highlightGraphic);
                }
            },

            showFeaturePage: function() {
                this.stackContainer.selectChild(this.featurePage);
            },

            showInfoPage: function() {
                this.stackContainer.selectChild(this.infoPage);
            },

            close: function() {
                //Remove any highlighted feature on the map.
                this.removeHighlightGraphic();

                //Remove any identify graphic (point or extent) from the map
                if (this.map.identifyGraphic) {
                    this.map.graphics.remove(this.map.identifyGraphic);
                }

                //Override the default close function so the widget doesn't get destroyed. Hide it instead.
                this.hide();
            },

            show: function(x, y) {
                this.inherited(arguments);
                var padding = 10;
                var width = domStyle.get(this.domNode, 'width');
                var height = domStyle.get(this.domNode, 'height');

                x += padding;
                y += padding;


                if (this.isFirstShow) {
                    this.isFirstShow = false;

                    //Default initial position is lower-right if the anchor point.
                    //If it goes off the right edge of the map, position it to the left of the anchor.
                    if ((x + width > win.getBox().w) && (x - width - 2*padding > 0))  {
                        x = x - width - 2*padding;
                    }
                    //If it goes off the bottom edge of the map, position it to the top of the anchor.
                    if ((y + height > win.getBox().h) && (y - height - 2*padding > 0)) {
                        y = y - height - 2*padding;
                    }
                    domStyle.set(this.domNode, 'left', x+'px');
                    domStyle.set(this.domNode, 'top', y+'px');
                }

                //Resume mouseover events on the tree
                if (this.onMouseOverHandler) {
                    this.onMouseOverHandler.resume();
                }
            },

            hide: function() {
                this.inherited(arguments);

                //Pause the tree's mouseover event to prevent unwanted mouseovers when closing the dijit
                if (this.onMouseOverHandler) {
                    this.onMouseOverHandler.pause();
                }
                this.visible = false;
            },

            //Set the pane to be enabled and show it if it was in the background
            enable: function() {
                this.enabled = true;
                if (this.visible) {
                    this.show();
                } else {
                    this.hide();
                }
            },

            //Set the pane to be disabled and hide it. If it was already visible, set visible to true so it's in the background
            disable: function() {
                var currentlyVisible = this.visible;
                this.enabled = false;
                this.hide();
                this.visible = currentlyVisible;
            }

        });
    });