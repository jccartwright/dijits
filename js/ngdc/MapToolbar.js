define(["dojo/_base/declare","dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
    "dijit/_OnDijitClickMixin", "dijit/Toolbar", "dijit/form/Button", "dojo/_base/lang", "esri/graphic",
    "esri/toolbars/draw", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "dojo/_base/Color",
    "esri/geometry/webMercatorUtils", "dojo/_base/connect", "dojo/topic", "dojo/on", "dojo/text!./templates/MapToolbar.html"],
    function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _OnDijitClickMixin, Toolbar, Button, lang,
             Graphic, Draw, SimpleFillSymbol, SimpleLineSymbol, Color, webMercatorUtils, Connect, topic, on, template ){
        return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _OnDijitClickMixin], {

            templateString: template,

            // A class to be applied to the root node in template
            baseClass: "mapToolbar",
            _map: null,
            _drawToolbar: null,
            aoiSymbol: null,

            constructor: function(arguments) {
                logger.debug('inside constructor for MapToolbar');
                this._map = arguments.map;
                this._drawToolbar = new Draw(this._map);
                Connect.connect(this._drawToolbar, "onDrawEnd", this, this._addAreaOfInterestToMap);

                this.aoiSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([255, 0, 0]), 2),
                    new Color([255, 255, 0, 0.25]));
            },

            postCreate: function() {
                //replaced by using data-dojo-attach-event in template
//                this.own(
//                    on(this.selectByRectButton, "click", lang.hitch(this, "_selectByRect"))
//                );
            },

            //attached to onClick event of selectByRectButton
            _selectByRect: function(/*Event*/ evt) {
                this._map.graphics.clear();
                this._drawToolbar.activate(Draw.EXTENT);
                this._map.hideZoomSlider();
            },

            //attached to onDrawEnd event
            _addAreaOfInterestToMap: function(/*Geometry*/ geometry) {
                this._map.identifyGraphic = new Graphic(geometry, this.aoiSymbol);
                this._map.graphics.add(this._map.identifyGraphic);

                //only allow one shape to be drawn
                this._drawToolbar.deactivate();
                this._map.showZoomSlider();

                topic.publish("/ngdc/boundingBox", this.extentToGeographic(geometry));
            },

            extentToGeographic: function(extent) {
                //already in geographic - no conversion necessary
                return(extent);
            }
        });
    }
);

