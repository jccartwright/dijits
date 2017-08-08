define(['dojo/_base/declare'],
    function(declare){

        return declare([], {

            //called after parent class constructor
            constructor: function() {
                logger.debug('inside constructor for ngdc/identify/IdentifyResultsPopup');

                //TODO hide when Identify operation initiated
            }
        });
    }
);