define(["dojo/_base/declare"],
    function(declare){
        var lods;

        return declare([], {
            constructor: function() {
                this.lods = [
                    //{"level": 0, "resolution": 39135.759990686645,"scale": 1.479143876E8},
                    {"level": 1, "resolution": 19567.880000634977, "scale": 7.39571938199999E7},
                    {"level": 2,"resolution": 9783.9400003175,"scale": 3.697859691E7},
                    {"level": 3,"resolution": 4891.969998835831,"scale": 1.848929845E7},
                    {"level": 4,"resolution": 2445.9849999470835,"scale": 9244649.227},
                    {"level": 5,"resolution": 1222.9925001058336,"scale": 4622324.614},
                    {"level": 6,"resolution": 611.4962500529168,"scale": 2311162.307},
                    {"level": 7,"resolution": 305.74812489416644,"scale": 1155581.153}
                    //{"level": 8,"resolution": 152.8740625,"scale": 577790.5767}
                    //{"level": 9,"resolution": 76.4370312632292,"scale": 288895.2884}
                ];
            }
        });
    }
);