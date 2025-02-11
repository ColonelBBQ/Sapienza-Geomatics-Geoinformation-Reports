// EXTRA: Calculate the area in Squared KMs
var areaInSqMeters = geometry.area({
  'maxError': 1
});
var areaInSqKm = areaInSqMeters.divide(1e6);
print('Area in square kilometers:', areaInSqKm);

// step 1
var L8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA");

// step 2
var L8_filtered = L8.filterDate('2024-05-01', '2024-06-30')
                    .filterBounds(geometry)
                    .sort('CLOUD_COVER');
  
// step 3
var image = L8_filtered.first();
print(image);

// step 4
var mndwi = image.normalizedDifference(['B3', 'B6']);

// step 5
Map.addLayer(image.clip(geometry), {'bands': ['B4', 'B3', 'B2'],min: 0, max: 0.3}, 'landsat 8 true color image (RGB)');
Map.addLayer(mndwi.clip(geometry), {min:-1, max:1}, 'MNDWI');
Map.centerObject(geometry,12);

// step 6
Map.addLayer(image.clip(geometry), {'bands': ['B6', 'B5', 'B3'],min: 0, max: 0.3}, 'landsat 8 false color image (SWIR1-NIR-G');

// step 7
var mask_MNDWI = mndwi.gt(0.0);
Map.addLayer(mask_MNDWI.clip(geometry),{}, 'mask_MNDWI');

// step 8
var masked_image = image.updateMask(mask_MNDWI);
Map.addLayer(masked_image.clip(geometry), {'bands': ['B4', 'B3', 'B2'], min: 0,   max: 0.3}, 'masked image (RGB)');

// step 9
var edge = ee.Algorithms.CannyEdgeDetector(mndwi, 0.99);
Map.addLayer(edge.updateMask(edge), {palette:['ffffff']}, 'reservoir edge');

// step 10
var nominal_spatial_resolution = image.select('B3').projection().nominalScale();
print('nominal_spatial_resolution B3',nominal_spatial_resolution);

// step 11
var image_bounding_box = image.geometry().bounds(nominal_spatial_resolution);
Map.addLayer(image_bounding_box, {}, 'image bounding box', false);

// step 12
var n_pixels_from_reducer = masked_image.reduceRegion(
        {
          reducer: ee.Reducer.count(),
          maxPixels: 1e19,
          scale: nominal_spatial_resolution,
          bestEffort: false,
          geometry: image_bounding_box,
          tileScale:1//default is 1
        });
print('n_pixels_from_reducer',n_pixels_from_reducer);
print('number of pixels with healty vegetation (B3-> G)',n_pixels_from_reducer.get('B3') );

// step 13
var area_m2 =ee.Number(n_pixels_from_reducer.get('B3')).multiply(nominal_spatial_resolution).multiply(nominal_spatial_resolution);
var area_km2 = area_m2.divide(1000).divide(1000);
print('Exstension water area (km2)', area_km2);

