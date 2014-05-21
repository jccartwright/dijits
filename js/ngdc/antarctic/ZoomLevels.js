define(["dojo/_base/declare"],
    function(declare){
        var lods;

        return declare([], {
            constructor: function() {

                //Arctic/Antarctic default zoom levels. Level 0 and 1 are disabled.
                this.lods = [
                    //{"level": 0, "resolution": 67733.46880027094, "scale": 256000000}, 
                    //{"level": 1, "resolution": 33866.73440013547, "scale": 128000000}, 
                    {"level": 2, "resolution": 16933.367200067736, "scale": 64000000}, 
                    {"level": 3, "resolution": 8466.683600033868, "scale": 32000000}, 
                    {"level": 4,"resolution": 4233.341800016934,"scale": 16000000}, 
                    {"level": 5,"resolution": 2116.670900008467,"scale": 8000000}, 
                    {"level": 6,"resolution": 1058.3354500042335,"scale": 4000000}, 
                    {"level": 7,"resolution": 529.1677250021168,"scale": 2000000}, 
                    {"level": 8,"resolution": 264.5838625010584,"scale": 1000000} 
                ];
            }
        });
    }
);