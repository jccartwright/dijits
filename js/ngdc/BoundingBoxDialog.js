define([
    "dojo/_base/declare", "dijit/Dialog", "dijit/_Widget", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button", "dijit/form/NumberTextBox", "dojo/_base/lang", "dojo/_base/array",
    "dojo/dom-attr", "dojo/on", "dojo/topic", "esri/geometry/Extent", 
    "esri/SpatialReference", "dojo/text!./templates/BoundingBoxDialog.html"
    ],
    function(
        declare, Dialog, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin,
        Button, NumberTextBox, lang, array,
        domAttr, on, topic, Extent,
        SpatialReference, template 
    ){
        return declare([Dialog, _TemplatedMixin, _WidgetsInTemplateMixin], {

            templateString: template,
            
            // A class to be applied to the root node in template
            baseClass: "bboxDialog",
            title: "Enter Coordinates to Identify Features",

            constructor: function(/*Object*/ kwArgs) {
                console.log("inside BoundingBoxDialog constructor...");
                lang.mixin(this, kwArgs);
            },

            postCreate: function() {
                this.inherited(arguments);

                on(this.cancelButton, "click", lang.hitch(this, function(evt){
                    this.onCancel();
                }));
                on(this.clearButton, "click", lang.hitch(this, function(evt){
                    this.clear();
                }));

                //Is the form valid? Watch the 'state' property and enable/disable the submit button
                this.watch('state', function() {
                    if (this.state == '') {
                        this.submitButton.set('disabled', false);
                    }
                    else {
                        this.submitButton.set('disabled', true);
                    }
                });
            },

            execute: function(formContents) {
                var extent = new Extent(formContents.minx, formContents.miny, formContents.maxx, formContents.maxy, new SpatialReference({wkid: 4326}));
                topic.publish("/ngdc/boundingBox", extent);
            },
           
            clear: function() {
                this.minxInput.set('value', '');
                this.maxxInput.set('value', '');
                this.minyInput.set('value', '');
                this.maxyInput.set('value', '');
            },

            onCancel: function() {
                topic.publish("/ngdc/boundingBoxCanceled");
            }
    });
});
