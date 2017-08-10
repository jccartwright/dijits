define(["dojo/_base/declare","dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
    "dijit/_OnDijitClickMixin", "dijit/Toolbar", "dijit/form/Button", "dojo/_base/lang", "dojo/_base/array", "dojo/dom-class",
    "dijit/form/DropDownButton", "dijit/DropDownMenu", "dijit/MenuItem", "dijit/CheckedMenuItem",
    "dojo/_base/connect", "dojo/on", "dojo/text!./templates/SimpleBasemapToolbar.html"],
    function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
             _OnDijitClickMixin, Toolbar, Button, lang, array, domClass,
             DropDownButton, DropDownMenu, MenuItem, CheckedMenuItem,
             Connect, on, template ){
        return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _OnDijitClickMixin], {

            templateString: template,
            _basemaps: null,
            _overlays: null,
            defaultBasemapIndex: 0,

            // A class to be applied to the root node in template
            baseClass: "basemapToolbar",
            layerCollection: null,

            //constructor for parent called before constructor of child class
            constructor: function() {
                this.layerCollection = arguments.layerCollection;
                this.map = arguments.map;
            },

            showBasemap: function(selectedIndex) {
                //only one basemap showing at a time
                array.forEach(this._basemaps, function(basemap, idx) {
                    if (selectedIndex === idx) {
                        array.forEach(basemap.services, function(targetId){
                            this.layerCollection.getLayerById(targetId).setVisibility(true);
                            this.basemapMenu.getChildren()[idx].containerNode.style.fontWeight = "bold";
                        }, this);
                    } else {
                        array.forEach(basemap.services, function(targetId){
                            this.layerCollection.getLayerById(targetId).setVisibility(false);
                            this.basemapMenu.getChildren()[idx].containerNode.style.fontWeight = "normal";
                        }, this);
                    }
                }, this);
            },

            postCreate: function() {
                //this.inherited(arguments);

                //add menu items to basemap menu
                array.forEach(this._basemaps, function(item, idx) {
                    this._addBasemapMenuItem(this.basemapMenu, item, idx, this);
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

            _validateLayerIds: function() {
                //validate config by verifying each of the service ids are in LayerCollection
                var allLayerIds = this.layerCollection.getLayerIds();
                array.forEach(this._basemaps, function(basemap) {
                    array.forEach(basemap.services, function(targetId){
                        if (array.indexOf(allLayerIds, targetId) < 0) {
                            console.error("BasemapToolbar configuration error: layer "+targetId+" not found in LayerCollection");
                        }
                    });
                });
            }
        });
    }
);