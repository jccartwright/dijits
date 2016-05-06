define([
    'dojo/_base/declare',
    'dijit/_WidgetBase', 
    'dijit/_TemplatedMixin', 
    'dijit/_WidgetsInTemplateMixin',
    'dijit/_OnDijitClickMixin', 
    'dijit/Toolbar', 
    'dijit/form/Button', 
    'dojo/_base/lang', 
    'dojo/_base/array', 
    'dojo/dom-class',
    'esri/tasks/GeometryService',
    'esri/tasks/ProjectParameters',
    'esri/toolbars/draw', 
    'esri/symbols/SimpleFillSymbol', 
    'esri/symbols/SimpleLineSymbol', 
    'esri/geometry/Polygon',
    'esri/geometry/geometryEngine',
    'dojo/_base/Color',
    'dijit/form/DropDownButton', 
    'dijit/DropDownMenu', 
    'dijit/ToolbarSeparator', 
    'dijit/MenuItem', 
    'dijit/CheckedMenuItem',
    'ngdc/BoundingBoxDialog', 
    'esri/graphic', 
    'esri/toolbars/draw', 
    'dojo/topic',
    'dojo/_base/connect', 
    'dojo/on', 
    'dojo/text!./templates/MapToolbar.html'
    ],
    function(
        declare, 
        _WidgetBase, 
        _TemplatedMixin, 
        _WidgetsInTemplateMixin,
        _OnDijitClickMixin, 
        Toolbar, 
        Button, 
        lang, 
        array, 
        domClass,
        GeometryService,
        ProjectParameters,
        draw, 
        SimpleFillSymbol, 
        SimpleLineSymbol,
        Polygon,
        geometryEngine,
        Color,
        DropDownButton, 
        DropDownMenu, 
        ToolbarSeparator, 
        MenuItem,
        CheckedMenuItem,
        BoundingBoxDialog, 
        Graphic, 
        Draw, 
        topic,
        Connect, 
        on,
        template 
        ){
        return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _OnDijitClickMixin], {

            templateString: template,
            _basemaps: null,
            _overlays: null,
            defaultBasemapIndex: 0,
            defaultBoundariesIndex: 0,

            // A class to be applied to the root node in template
            baseClass: 'mapToolbar',
            layerCollection: null,

            /*            
            In the constructor of subclasses, this._basemaps, this._overlays, and this._identifyTools should be set similar to these:
                this._basemaps = [
                    {base: 'Ocean Base', overlays: [{id: 'Ocean Reference'}], label: 'Ocean Basemap (Esri)'},
                    {base: 'GEBCO_08', overlays: [{id: 'World Boundaries and Places'}], label: 'Shaded Relief (GEBCO_08)'},
                    {base: 'ETOPO1', overlays: [{id: 'World Boundaries and Places'}], label: 'Shaded Relief (ETOPO1)'},
                    {base: 'Light Gray', overlays: [{id: 'Light Gray Reference'}], label: 'Light Gray (Esri)'},
                    {base: 'World Imagery', overlays: [{id: 'World Boundaries and Places'}], label: 'World Imagery (Esri)'},
                    {base: 'NatGeo', label: 'National Geographic (Esri)'} //NatGeo has no boundaries overlay
                ];
                this._overlays = [
                    {
                        label: 'Boundaries/Labels',
                        services: [{id: 'Ocean Reference'}],
                        visible: true
                    }, 
                    {
                        label: 'Bathymetry Contours (from GEBCO_08)',
                        services: [{id: 'GEBCO_08 Contours'}],
                        visible: false
                    },
                    {
                        label: 'Graticule',
                        services: [{id: 'Graticule'}],
                        visible: false
                    },
                    {
                        label: 'EEZs (NOAA OCS and VLIZ)',
                        services: [{id: 'ECS Catalog', sublayers: [21, 22]}],
                        visible: true
                    },
                    {
                        label: 'International ECS Areas',
                        services: [{id: 'ECS Catalog', sublayers: [40]}],
                        visible: false
                    }
                ];
                this._identifyTools = [
                    {label: 'Point (Single-Click)', id: 'point', iconClass: 'identifyByPointIcon'},
                    {label: 'Draw Rectangle', id: 'rect', iconClass: 'identifyByRectIcon'},
                    {label: 'Draw Polygon', id: 'polygon', iconClass: 'identifyByPolygonIcon'},
                    {label: 'Define Bounding Box', id: 'coords', iconClass: 'identifyByCoordsIcon'}
                ];
            */

            //constructor for parent called before constructor of child class
            constructor: function(/*Object*/ kwArgs) {
                this.layerCollection = kwArgs.layerCollection;
                this.map = kwArgs.map;
                this.minLat = kwArgs.minLat;
                this.maxLat = kwArgs.maxLat;
                this.enabled = true; //Enabled by default; set enabled=false after initialization if you don't want it to be active on startup (i.e. Arctic/Antarctic maps)

                this._drawToolbar = new Draw(this.map);
                Connect.connect(this._drawToolbar, 'onDrawEnd', this, this._addAreaOfInterestToMapAndIdentify);

                this.clickHandler = on.pausable(this.map, 'click', function(evt) {
                    topic.publish('/ngdc/mapPoint', evt.mapPoint);
                });

                this.aoiSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([255, 0, 0]), 2),
                    new Color([255, 255, 0, 0.25]));

                //Listen for an Escape keypress, which should deactivate any draw action
                on(this.map, 'key-down', lang.hitch(this, function(evt) {
                    if (evt.keyCode === 27 /*Esc key*/) {    
                        this._drawToolbar.deactivate(); //Deactivate any existing draw
                        this._setIdentifyIcon('identifyByPointIcon'); //Switch back to the pointer icon
                    }
                }));

                topic.subscribe('/ngdc/BoundingBoxDialog/cancel', lang.hitch(this, function() {
                    if (this.enabled) {
                        //BoundingBoxDialog canceled, switch to pointer icon
                        this._setIdentifyIcon('identifyByPointIcon');
                    }
                }));

                topic.subscribe('/ngdc/BoundingBoxDialog/extent', lang.hitch(this, function(extent) {
                    if (this.enabled) {
                        //BoundingBoxDialog passed an extent. Add to map, execute identify, and zoom to the extent.
                        if (this.map.spatialReference.isWebMercator()) {
                            //If in Web Mercator, pass the extent as-is.
                            this._addAreaOfInterestToMapAndIdentify(extent, true);
                        }
                        else {
                            //In polar coordinates, need to densify and project the geometry first.
                            this._densifyAndProjectExtentAndIdentify(extent);
                        }
                    }
                }));

                this.geometryService = new GeometryService('//maps.ngdc.noaa.gov/arcgis/rest/services/Utilities/Geometry/GeometryServer');
            },

            showBasemap: function(selectedIndex) {

                //only one basemap showing at a time
                array.forEach(this._basemaps, lang.hitch(this, function(basemap, idx) {                                       
                    //Hide the base and overlays
                    topic.publish('/ngdc/layer/visibility', basemap.base, false);

                    array.forEach(basemap.overlays, lang.hitch(this, function() {
                        this.setOverlayVisibility(this.defaultBoundariesIndex, false);
                    }));

                    this.basemapMenu.getChildren()[idx].containerNode.style.fontWeight = 'normal';
                }));

                var basemap = this._basemaps[selectedIndex];

                //Show the basemap base                                
                topic.publish('/ngdc/layer/visibility', basemap.base, true);

                //Set the Boundaries/Labels checkbox to use the currently-selected overlay(s)
                this._overlays[this.defaultBoundariesIndex].services = basemap.overlays;

                this.basemapMenu.getChildren()[selectedIndex].containerNode.style.fontWeight = 'bold';

                var menuItem = this.overlayMenu.getChildren()[this.defaultBoundariesIndex];
                if (this._basemaps[selectedIndex].overlays) {
                    //If the current basemap has overlay(s), enable the Boundaries/Labels checkbox
                    menuItem.set('disabled', false);
                    domClass.remove(menuItem.domNode, 'dijitMenuItemDisabled');  //Manually gray out the MenuItem (tundra.css is missing dijitCheckedMenuItemDisabled)
                    
                    //If the Boundaries/Labels checkbox is checked, show the current overlay(s)
                    if (menuItem.checked) {
                        this.setOverlayVisibility(this.defaultBoundariesIndex, true);
                    }
                }
                else {
                    //Disable the Boundaries/Labels checkbox
                    menuItem.set('disabled', true);
                    domClass.add(menuItem.domNode, 'dijitMenuItemDisabled');
                }
            },

            setOverlayVisibility: function(selectedIndex, visible) {
                var overlayServices = this._overlays[selectedIndex].services;
                array.forEach(overlayServices, lang.hitch(this, function(overlayService){                                        
                    if (overlayService.sublayers) {
                        topic.publish('/ngdc/sublayer/visibility', overlayService.id, overlayService.sublayers, visible);
                    } else{
                        topic.publish('/ngdc/layer/visibility', overlayService.id, visible);
                    }                   
                }));
            },

            postCreate: function() {
                //this.inherited(arguments);

                //add menu items to basemap menu
                array.forEach(this._basemaps, lang.hitch(this, function(item, idx) {
                    this._addBasemapMenuItem(this.basemapMenu, item, idx, this);
                }));

                //add menu items to overlay menu
                array.forEach(this._overlays, lang.hitch(this, function(item, idx) {
                    this._addOverlayMenuItem(this.overlayMenu, item, idx, this);
                }));

                 //add menu items to overlay menu
                array.forEach(this._identifyTools, lang.hitch(this, function(item, idx) {
                    this._addIdentifyMenuItem(this.identifyMenu, item, idx, this);
                }));

                this.showBasemap(this.defaultBasemapIndex);
            },

            _addBasemapMenuItem: function(menu, item, idx, parent) {
                menu.addChild(new MenuItem({
                    label: item.label,
                    onClick: function() {
                        parent.showBasemap(idx);
                    }
                }));
            },

            _addOverlayMenuItem: function(menu, item, idx, parent) {
                menu.addChild(new CheckedMenuItem({
                    label: item.label,
                    checked: item.visible,
                    onClick: function() {
                        parent.setOverlayVisibility(idx, this.checked);
                    }
                }));
            },

            _addIdentifyMenuItem: function(menu, item, idx, parent) {
                menu.addChild(new MenuItem({
                    label: item.label,
                    iconClass: item.iconClass,
                    onClick: function() {
                        parent.identifyWithTool(item.id);
                    }
                }));
            },

            _validateLayerIds: function() {
                //validate config by verifying each of the service ids are in LayerCollection
                var allLayerIds = this.layerCollection.getLayerIds();
                array.forEach(this._basemaps, function(basemap) {
                    if (array.indexOf(allLayerIds, basemap.base) < 0) {
                        console.error('MapToolbar configuration error: layer '+basemap.base+' not found in LayerCollection');
                    }                    
                });

                array.forEach(this._overlays, function(overlay) {
                    array.forEach(overlay.services, function(service){
                        if (array.indexOf(allLayerIds, service.id) < 0) {
                            console.error('MapToolbar configuration error: overlay '+service.id+' not found in LayerCollection');
                        }
                    });
                });
            },

            identifyWithTool: function(tool) {
                this._drawToolbar.deactivate(); //Deactivate any existing draw

                if (tool === 'point') {
                    this._setIdentifyIcon('identifyByPointIcon');
                    return; //Point tool is not really activated, it's just the default behavior of the map
                }
                else if (tool === 'coords') {
                    this._setIdentifyIcon('identifyByCoordsIcon');
                    this._identifyByCoords();
                }
                else {
                    this._identifyByShape(tool);
                }
            },

            _identifyByShape: function(shape) {
                this.map.graphics.clear();

                if (shape === 'rect') {
                    this._setIdentifyIcon('identifyByRectIcon');
                    this._drawToolbar.activate(Draw.EXTENT);
                }
                else if (shape === 'polygon') {
                    this._setIdentifyIcon('identifyByPolygonIcon');
                    this.clickHandler.pause(); //Pause the map click event
                    this._drawToolbar.activate(Draw.POLYGON);                    
                }
                else if (shape === 'freehand-polygon') {
                    this._setIdentifyIcon('identifyByPolygonIcon');
                    this._drawToolbar.activate(Draw.FREEHAND_POLYGON);
                }
                // else if (shape === 'geodetic-circle') {
                //     //not yet implemented
                // }
                // else if (shape === 'planar-circle') {
                //     //not yet implemented
                // }
                else {
                    logger.warn('Unrecognized geometry type for identify: ' + shape);
                }

                this.map.hideZoomSlider();
            },

            _setIdentifyIcon: function(iconClass) {
                domClass.replace('identifyIcon', iconClass, 
                    ['identifyByPointIcon', 'identifyByRectIcon', 'identifyByCoordsIcon', 'identifyByPolygonIcon']);
            },

            _identifyByCoords: function() {
                this.map.graphics.clear();
                if (!this.bboxDialog) {
                    this.bboxDialog = new BoundingBoxDialog({
                        map: this.map, 
                        minLat: this.minLat ? this.minLat : -85, 
                        maxLat: this.maxLat ? this.maxLat : 85
                    });
                    if (this.bboxDialogTitle) {
                        this.bboxDialog.set('title', this.bboxDialogTitle);
                    }
                }
                this.bboxDialog.show();
            },            

            //Add the extent/polygon to the map and publish to the identify dijit.
            //Attached to onDrawEnd event when drawing geometry. Also called from _densifyAndProjectExtentAndIdentify().
            _addAreaOfInterestToMapAndIdentify: function(/*Geometry*/ geometry, /*boolean*/ zoomToExtent) {
                this.map.identifyGraphic = new Graphic(geometry, this.aoiSymbol);
                this.map.graphics.add(this.map.identifyGraphic);
                if (zoomToExtent) {
                    this.map.setExtent(geometry, true);
                }

                //If in Web Mercator, add the graphic to the map and publish to the identify. Works with any extents or polygons, even crossing antimeridian.
                if (this.map.spatialReference.isWebMercator()) {
                    topic.publish('/ngdc/geometry', geometry);
                }
                //In other projections, only a polygon (not extent) works with the ArcGIS REST identify, if it crosses the antimeridian. 
                //Convert any extent to a polygon, then publish to the identify.
                else {
                    var polygon = geometry;
                    if (geometry.type === 'extent') {
                        polygon = Polygon.fromExtent(geometry); //Create a polygon from the extent
                    }
                    topic.publish('/ngdc/geometry', polygon);
                }
                
                //only allow one shape to be drawn
                this._drawToolbar.deactivate();
                this.map.showZoomSlider();
                this.clickHandler.resume(); //Resume map click events if they were paused
                domClass.replace('identifyIcon', 'identifyByPointIcon', ['identifyByPolygonIcon', 'identifyByRectIcon', 'identifyByCoordsIcon']);
            },

            //For polar projections, take a geographic extent and densify it, then project it to the local coordinate system. 
            //Continue by adding it to the map and identifying.
            //Called when returning from the BoundingBoxDialog.
            _densifyAndProjectExtentAndIdentify: function(/*Extent*/ extent) {
                var projectParams = new ProjectParameters();
                var polygon = Polygon.fromExtent(extent); //Create a polygon from the extent

                //Set the densify max segment length to be 1/20th of the width of the extent in degrees
                var extentWidth = Math.abs(extent.xmax - extent.xmin);
                var maxSegmentLength = extentWidth / 20;
                var densifiedPolygon = geometryEngine.densify(polygon, maxSegmentLength);

                projectParams.geometries = [densifiedPolygon];
                projectParams.outSR = this.map.spatialReference;
                projectParams.transformForward = true;

                //Project the densififed geometry
                this.geometryService.project(projectParams, lang.hitch(this, function(geometries) {                            
                    this._addAreaOfInterestToMapAndIdentify(geometries[0], true);
                }), function(error) {
                    logger.error(error);
                });

            },

            geometryToGeographic: function(geometry) {
                //already in geographic - no conversion necessary
                return(geometry);
            }
        });
    }
);
