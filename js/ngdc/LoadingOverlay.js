define([
    "dojo/dom-style",
    "dojo/_base/fx",
    "dojo/_base/declare",
    "dijit/registry",
    "dojo/dom",
    "dojo/domReady!"],
    function(domStyle, fx, declare, registry, dom){
        return declare(null, {
            overlayNode:null,
            //default overlay node ID
            overlayNodeId: 'loadingOverlay',
            // store a reference to the overlay node
            constructor:function(args){
                declare.safeMixin(this,args);
                this.overlayNode = dom.byId(this.overlayNodeId);
            },
            // called to hide the loading overlay
            endLoading: function() {
                // fade the overlay gracefully
                fx.fadeOut({
                    node: this.overlayNode,
                    onEnd: function(node){
                        domStyle.set(node, 'display', 'none');
                    }
                }).play();
            }
        })
    }
);