require(
	["ngdc/InitialExtent", "esri/SpatialReference"],
    function(InitialExtent, SpatialReference) {

    	//test suite
		describe("InitialExtent", function() {
            var initialExtent;

			beforeEach(function(){
				console.log("inside setup...");
                initialExtent = new InitialExtent(-10, -10, 10, 10, new SpatialReference({ wkid:4326 }));
            });

			//spec
			it("should calculate centroid", function() {
			    expect( initialExtent.getCenter().x ).toEqual(0);
		    });

            it("should have a SpatialReference", function(){
                expect( initialExtent.spatialReference ).toBeDefined();
            });

		    afterEach(function(){
			    console.log("inside teardown...");
		    });


	});
});
