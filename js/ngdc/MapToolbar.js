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
    'esri/toolbars/draw', 
    'esri/symbols/SimpleFillSymbol', 
    'esri/symbols/SimpleLineSymbol', 
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
        draw, 
        SimpleFillSymbol, 
        SimpleLineSymbol, 
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

            //constructor for parent called before constructor of child class
            constructor: function(/*Object*/ kwArgs) {
                this.layerCollection = kwArgs.layerCollection;
                this.map = kwArgs.map;

                this._drawToolbar = new Draw(this.map);
                Connect.connect(this._drawToolbar, 'onDrawEnd', this, this._addAreaOfInterestToMap);

                this.clickHandler = on.pausable(this.map, 'click', function(evt) {
                    topic.publish('/ngdc/mapPoint', evt.mapPoint);
                });

                this.aoiSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([255, 0, 0]), 2),
                    new Color([255, 255, 0, 0.25]));

                //Listen for an Escape keypress, which should deactivate any draw action
                on(this.map, 'key-down', lang.hitch(this, function(evt) {
                    if (evt.keyCode == 27 /*Esc key*/) {    
                        this._drawToolbar.deactivate(); //Deactivate any existing draw
                        this._setIdentifyIcon('identifyByPointIcon'); //Switch back to the pointer icon
                    }
                }));

                topic.subscribe('/ngdc/BoundingBoxDialog/cancel', lang.hitch(this, function() {
                    //BoundingBoxDialog canceled, switch to pointer icon
                    this._setIdentifyIcon('identifyByPointIcon');
                }));

                topic.subscribe('/ngdc/BoundingBoxDialog/extent', lang.hitch(this, function(extent) {
                    //BoundingBoxDialog passed an extent. Add to map, execute identify, and zoom to the extent.
                    this._addAreaOfInterestToMap(extent, true);
                }));
            },

            showBasemap: function(selectedIndex) {

                //only one basemap showing at a time
                array.forEach(this._basemaps, function(basemap, idx) {
                    if (selectedIndex == idx) {        
                        //Show the basemap base                
                        this.layerCollection.getLayerById(basemap.base).setVisibility(true);
                                                
                        //Set the Boundaries/Labels checkbox to use the currently-selected overlay(s)
                        this._overlays[this.defaultBoundariesIndex].services = basemap.overlays;

                        this.basemapMenu.getChildren()[idx].containerNode.style.fontWeight = 'bold';
                    } 
                    else {
                        //Hide the base and overlays
                        this.layerCollection.getLayerById(basemap.base).setVisibility(false);
                        array.forEach(basemap.overlays, lang.hitch(this, function(overlay) {
                            this.layerCollection.getLayerById(overlay).setVisibility(false);
                        }));

                        this.basemapMenu.getChildren()[idx].containerNode.style.fontWeight = 'normal';
                    }
                }, this);

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

            toggleOverlay: function(selectedIndex) {
                var layers = this._overlays[selectedIndex].services;
                array.forEach(layers, function(targetId){
                    var layer = this.layerCollection.getLayerById(targetId);
                    layer.setVisibility(! layer.visible);
                }, this);
            },

            setOverlayVisibility: function(selectedIndex, visible) {
                var layers = this._overlays[selectedIndex].services;
                array.forEach(layers, function(targetId){
                    var layer = this.layerCollection.getLayerById(targetId);
                    layer.setVisibility(visible);
                }, this);
            },

            postCreate: function() {
                //this.inherited(arguments);

                //add menu items to basemap menu
                array.forEach(this._basemaps, function(item, idx) {
                    this._addBasemapMenuItem(this.basemapMenu, item, idx, this);
                }, this);

                //add menu items to overlay menu
                array.forEach(this._overlays, function(item, idx) {
                    this._addOverlayMenuItem(this.overlayMenu, item, idx, this);
                }, this);

                 //add menu items to overlay menu
                array.forEach(this._identifyTools, function(item, idx) {
                    this._addIdentifyMenuItem(this.identifyMenu, item, idx, this);
                }, this);

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
                var layer = this.layerCollection.getLayerById(item.services[0]);
                menu.addChild(new CheckedMenuItem({
                    label: item.label,
                    checked: layer.visible,
                    onClick: function() {
                        parent.toggleOverlay(idx);
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
                    array.forEach(basemap.services, function(targetId){
                        if (array.indexOf(allLayerIds, targetId) < 0) {
                            console.error('MapToolbar configuration error: layer '+targetId+' not found in LayerCollection');
                        }
                    });
                });

                array.forEach(this._overlays, function(overlay) {
                    array.forEach(overlay.services, function(targetId){
                        if (array.indexOf(allLayerIds, targetId) < 0) {
                            console.error('MapToolbar configuration error: overlay '+targetId+' not found in LayerCollection');
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

                if (shape == 'rect') {
                    this._setIdentifyIcon('identifyByRectIcon');
                    this._drawToolbar.activate(Draw.EXTENT);
                }
                else if (shape == 'polygon') {
                    this._setIdentifyIcon('identifyByPolygonIcon');
                    this.clickHandler.pause(); //Pause the map click event
                    this._drawToolbar.activate(Draw.POLYGON);                    
                }
                else if (shape == 'freehand-polygon') {
                    this._setIdentifyIcon('identifyByPolygonIcon');
                    this._drawToolbar.activate(Draw.FREEHAND_POLYGON);
                }
                else if (shape == 'geodetic-circle') {
                    //not yet implemented
                }
                else if (shape == 'planar-circle') {
                    //not yet implemented
                }
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
                    this.bboxDialog = new BoundingBoxDialog({map: this.map});
                }
                this.bboxDialog.show();
            },            

            //attached to onDrawEnd event when drawing geometry. Also called after defining extent with the BoundingBoxDialog.
            _addAreaOfInterestToMap: function(/*Geometry*/ geometry, /*boolean*/ zoomToExtent) {
                this.map.identifyGraphic = new Graphic(geometry, this.aoiSymbol);
                this.map.graphics.add(this.map.identifyGraphic);

                //only allow one shape to be drawn
                this._drawToolbar.deactivate();
                this.map.showZoomSlider();

                topic.publish('/ngdc/geometry', this.geometryToGeographic(geometry));

                if (zoomToExtent) {
                    this.map.setExtent(geometry, true);
                }

                this.clickHandler.resume(); //Resume map click events if they were paused
                domClass.replace('identifyIcon', 'identifyByPointIcon', ['identifyByPolygonIcon', 'identifyByRectIcon', 'identifyByCoordsIcon']);
            },

            geometryToGeographic: function(geometry) {
                //already in geographic - no conversion necessary
                return(geometry);
            }
        });
    }
);
