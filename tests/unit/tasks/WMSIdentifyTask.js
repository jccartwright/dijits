define([
    'intern!object',
    'intern/chai!assert',
    'esri/geometry/Extent',
    'esri/SpatialReference',
    'esri/geometry/Point',
    'esri/geometry/screenUtils',
    'esri/geometry/webMercatorUtils',
    'ncei/tasks/WMSIdentifyParameters',
    'ncei/tasks/WMSIdentifyTask',
    'dojo/io-query',
    'dojo/on'
], function(
    registerSuite,
    assert,
    Extent,
    SpatialReference,
    Point,
    screenUtils,
    webMercatorUtils,
    WMSIdentifyParameters,
    WMSIdentifyTask,
    ioQuery,
    on) {

    // local vars scoped to this module
    var mockMap;
    var mapPoint;
    var wmsIdentifyParameters;
    var wmsUrl;

    registerSuite({
        name: 'WMSIdentifyTask',
        
        // before the suite starts
        setup: function() {
            wmsUrl = 'http://geoservice.maris2.nl/wms/seadatanet/emodnet_hydrography?';

            var spatialReference = new SpatialReference({ wkid: 102100 });

            var sampleExtent = new Extent(
                -9254193.645271054, 3604041.3812617734, 813480.2242234056, 9288510.30077225,
                spatialReference
            );

            mockMap = {
                extent: sampleExtent,
                width: 1029,
                height: 581
            };

            //click point on map in mercator coords
            mapPoint = new Point(-2092349.843065083, 6901229.03337026, spatialReference);
            //var geoMapPoint = webMercatorUtils.webMercatorToGeographic(mapPoint);

            wmsIdentifyParameters = new WMSIdentifyParameters({map: mockMap});
            wmsIdentifyParameters.crs = 'EPSG:900913';
            wmsIdentifyParameters.layers = 'EMODnet_Bathymetry_multi_beams_polygons';
            wmsIdentifyParameters.geometry = mapPoint;
        },

        // before each test executes
        beforeEach: function() {
            // do nothing
        },

        // after the suite is done (all tests)
        teardown: function() {
            // do nothing
        },

        // The tests, each function is a test
        'listen for complete event on WMSIdentifyTask': function() {
            var wmsIdentifyTask = new WMSIdentifyTask(wmsUrl);

            var dfd = this.async(1000);
            var task = wmsIdentifyTask.execute(wmsIdentifyParameters);
            assert.isNotNull(task);

            on(wmsIdentifyTask, 'complete', function(evt) {
                //console.log("execute completed successfully");

                try {
                    // assertions re: content of message
                    assert.strictEqual(evt.results.length, 2, "expected 2 features at this location");
                    //console.log('resolving deferred...');
                    dfd.resolve();
                } catch (error) {
                    //console.log('rejecting deferred...');
                    dfd.reject(error);
                }
            });
        },


        'check the Deferred returned by WMSIdentifyTask': function() {
            var wmsIdentifyTask = new WMSIdentifyTask(wmsUrl);

            return wmsIdentifyTask.execute(wmsIdentifyParameters).then(function(results) {
                //assertions
                assert.isNotNull(results, 'GetFeatureInfo results should not be null');
                assert.strictEqual(results.length, 2, "expected 2 features at this location");
            });
        }

    });
});