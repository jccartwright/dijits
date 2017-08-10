define(['dojo/_base/declare'],
    function(declare){
        // Once all modules in the dependency list have loaded, this
        // function is called to define the module.

        // This returned object becomes the defined value of this module
        return declare([], {
            constructor: function(loglevel) {
                //TODO validate args
                this.logLevel =  loglevel;
            },

            error: function(msg) {
                if (this.logLevel > 0) { console.error(msg); }
            },

            warn: function(msg) {
                if (this.logLevel > 1) { console.warn(msg); }
            },

            info: function(msg) {
                if (this.logLevel > 2) { console.info(msg); }
            },

            debug: function(msg) {
                if (this.logLevel > 3) { console.debug(msg); }
            }

        });
    }
);