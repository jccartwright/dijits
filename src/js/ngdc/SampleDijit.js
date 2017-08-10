define(["dojo/_base/declare","dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/text!./templates/SampleDijit.html"],
    function(declare, _WidgetBase, _TemplatedMixin, template){
        return declare([_WidgetBase, _TemplatedMixin], {
            // Our template - important!
            templateString: template,

            // A class to be applied to the root node in our template
            baseClass: "sampleDijit",

            imageUrl: 'images/mapservice.gif',

            constructor: function() {
                logger.debug('inside constructor...');
            },

            postMixInProperties: function() {
                logger.debug('inside postMixInProperties...');
            },

            buildRendering: function() {
                this.inherited(arguments); //won't draw image w/o this
                console.debug('inside buildRendering...');
            },

            postCreate: function() {
                //DOM tree has already been created
                logger.debug('inside postCreate...');
            },

            startup: function() {
                logger.debug('inside startup...');
            }

        });
    }
);