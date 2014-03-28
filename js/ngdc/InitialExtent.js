define(["dojo/_base/declare","esri/geometry/Extent", "esri/SpatialReference"],
    function(declare, Extent, SpatialReference){
        return declare([Extent], {
            constructor: function() {
                console.log('inside constructor...');
            },

            sayHello: function() {
                return "Hello World!";
            }
        });
    }
);