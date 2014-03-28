define(["dojo/_base/declare", "dojo/_base/array", "dojo/topic"],
    function(declare, array, topic){

        return declare([], {

            //called after parent class constructor
            constructor: function() {
                logger.debug('inside constructor for ngdc/identify/IdentifyResultsPopup');

                //TODO hide when Identify operation initiated

                topic.subscribe("/identify/results", function(results){
                    //console.log(identify.searchGeometry);
                    console.log('identify results: ', results.results);
                });
            } //end constructor
        });
    }
)