define([
    'dojo/_base/declare',
    'dijit/_WidgetBase', 
    'dijit/_TemplatedMixin', 
    'dijit/_WidgetsInTemplateMixin',
    'dojo/_base/lang', 
    'dojo/_base/connect', 
    'dojo/topic', 
    'dojo/on', 
    'dojo/dom-style',
    'dijit/Destroyable', 
    'esri/dijit/Scalebar',
    'dojo/text!./templates/CoordinatesToolbar.html'
    ],
    function(
        declare, 
        _WidgetBase, 
        _TemplatedMixin, 
        _WidgetsInTemplateMixin, 
        lang,
        Connect,
        topic, 
        on, 
        domStyle,
        Destroyable, 
        Scalebar, 
        template 
        ){
        return declare([Destroyable, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

            templateString: template,

            // A class to be applied to the root node in template
            baseClass: 'coordinatesWithElevationToolbar',
            _map: null,
            _scalebar: null,
            _scalebarThreshold: null,

            constructor: function(/*Object*/ kwArgs) {
                this._map = kwArgs.map;
                if (kwArgs.scalebarThreshold) {
                    this._scalebarThreshold = kwArgs.scalebarThreshold;
                }
            },

            postCreate: function() {
                this._scalebar = new Scalebar({map: this._map, scalebarUnit: 'dual'}, this.scalebar);

                this.own(
                    topic.subscribe('/ngdc/mouseposition', lang.hitch(this, function(mapPoint) {
                        if (! mapPoint.z) {
                            this.coordsDiv.innerHTML = mapPoint.x.toFixed(3) + '°, ' + mapPoint.y.toFixed(3) + '°<br>Elevation:';
                        } else {
                            this.coordsDiv.innerHTML = mapPoint.x.toFixed(3) + '°, ' + mapPoint.y.toFixed(3) + '°<br>Elevation: '+mapPoint.z+' meters';
                        }
                    }))
                );

                if (this._scalebarThreshold) {
                    //initialize
                    this.toggleScalebar();

                    //update on each  zoom
                    this.own (
                        on( this._map, 'zoom-end', lang.hitch(this, 'toggleScalebar'))
                    );
                }
            },


            toggleScalebar: function() {
                if (this._map.getAbsoluteLevel() <= this._scalebarThreshold) {
                    this.hideScalebar();
                } else {
                    this.showScalebar();
                }
            },

            //These need to be on a short timer due to unexpected errors during the zoom animation
            showScalebar: function() {
                setTimeout(lang.hitch(this, function() {
                    this._scalebar.show();
                    domStyle.set(this.domNode, 'height', '65px');
                }), 100);
            },

            hideScalebar: function() {
                setTimeout(lang.hitch(this,function() {
                    this._scalebar.hide();
                    domStyle.set(this.domNode, 'height', '28px');
                }), 100);
            }
        });
    });