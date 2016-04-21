define([
    "dojo/_base/declare"
], function(
    declare) {

    //"static" variables - shared across instances

    return declare([], {
        displayFieldName: null,
        feature: null,
        layerId: null,
        layerName: 'default'

        //no constructor
    });
});