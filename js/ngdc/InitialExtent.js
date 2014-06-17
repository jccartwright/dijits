define([
    'dojo/_base/declare',
    'esri/geometry/Extent'
    ],
    function(
        declare, 
        Extent
        ){
        return declare([Extent], {
            constructor: function() {
                console.log('inside constructor...');
            },

            sayHello: function() {
                return 'Hello World!';
            }
        });
    }
);