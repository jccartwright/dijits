define([
    'intern!object',
    'intern/chai!assert',
    'esri/geometry/Extent',
    'esri/SpatialReference',
    'esri/geometry/Point',
    'esri/geometry/screenUtils',
    'esri/geometry/webMercatorUtils',
    'ncei/tasks/WMSIdentifyParameters',
    'dojo/io-query'
], function(
    registerSuite,
    assert,
    Extent,
    SpatialReference,
    Point,
    screenUtils,
    webMercatorUtils,
    WMSIdentifyParameters,
    ioQuery) {

    // local vars scoped to this module
    var mockMap;
    var mapPoint;
    var wmsIdentifyParameters;

    var sampleRequest = 'http://geoservice.maris2.nl/wms/seadatanet/emodnet_hydrography?REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.3.0&WIDTH=1029&HEIGHT=581&CRS=EPSG:900913&LAYERS=EMODnet_Bathymetry_multi_beams_polygons&QUERY_LAYERS=EMODnet_Bathymetry_multi_beams_polygons&INFO_FORMAT=text/html&FEATURE_COUNT=99&BBOX=-9254193.645271054,3604041.3812617734,813480.2242234056,9288510.30077225&i=732&j=244';
    var sampleQuery = sampleRequest.substring(sampleRequest.indexOf("?") + 1, sampleRequest.length);
    var sampleQueryObject = ioQuery.queryToObject(sampleQuery);

    registerSuite({
        name: 'WMSIdentifyParameters',
        
        // before the suite starts
        setup: function() {
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

            //back out the mapPoint in web mercator from the row, column
            mapPoint = screenUtils.toMapGeometry(sampleExtent, 1029, 581, new Point(732,244));
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
        'Generate QueryInfo string': function() {
            var queryInfoString = wmsIdentifyParameters.getQueryInfo();
            var queryObject = ioQuery.queryToObject(queryInfoString);
            assert.deepEqual(queryObject, sampleQueryObject, "generated QueryInfo string matches input parameters")
        }
    });
});