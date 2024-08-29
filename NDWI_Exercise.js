// EXTRA: Calculate the area in Squared KMs
var areaInSqMeters = ROI.area({
  'maxError': 1
});
var areaInSqKm = areaInSqMeters.divide(1e6);
print('Area in square kilometers:', areaInSqKm);


// 3-4 Applying radiometric scaling factors and masking clouds function used (https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED#description)
function maskS2clouds_and_radiometric_scaling(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  // masking cloud pixels and applying radiometric scaling factors
  return image.updateMask(mask).divide(10000);
}


// We filter the ROI for date, ROI area and cloudy pixel percentage and create a variable named filtered_collection_noclouds
var filtered_collection = S2_SR_Collection.filterDate('2021-08-01', '2021-10-31')
                                                .filterBounds(ROI)
                                                // just images which have a cloudy coverage lower than 50%
                                                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50))

print('Number of images: ', filtered_collection.size())

var filtered_collection_noclouds = filtered_collection.map(maskS2clouds_and_radiometric_scaling)


// 5. We create and aggregate image of all images using the median
var aggregated_image = filtered_collection_noclouds.median().select(['B2', 'B3', 'B4', 'B8'])
var aggregated_image_roi = aggregated_image.clip(ROI);

// 8. Visualizing images on the map, True color composites
Map.addLayer(aggregated_image_roi, {bands:['B4', 'B3', 'B2'], min:0, max:0.3}, 'RGB ROI')


// 6-7. Compute the NDVI on the aggregated (radiometrically scaled) image
var RED = aggregated_image_roi.select ('B4');
var NIR = aggregated_image_roi.select ('B8');
var numerator = NIR.subtract(RED);
var denominator = NIR.add(RED);
var NDVI = numerator.divide(denominator);
print ('NDVI', NDVI);

// Rename the band of NDVI image using the rename method
NDVI = NDVI.rename('ndvi');
print('NDVI', NDVI);


Map.addLayer(NDVI, {min:-1, max:1}, 'NDVI ROI')
Map.centerObject(ROI)


// 9. Visualizing images on the map, False color composites
Map.addLayer(aggregated_image_roi, {bands:['B8', 'B4', 'B3'], min:0, max:0.3}, 'NIR R G ROI')

// 10-11. Masking pixels using NDVI
var healthy_vegetation_mask = NDVI.gt(0.3)
print('healthy_vegetation_mask', healthy_vegetation_mask)
Map.addLayer(healthy_vegetation_mask, {}, 'mask_NDVI ROI')

var masked_aggregated_picture = aggregated_image.updateMask(healthy_vegetation_mask)
Map.addLayer(masked_aggregated_picture, {bands:['B4', 'B3', 'B2'], min:0, max:0.3}, 'mask_NDVI ROI RGB')

// 12. Retrieve scale of analysis
var scale_of_analysis = 
filtered_collection_noclouds.first().select('B8').
projection().nominalScale();
print('nominal_spatial_resolution B8', scale_of_analysis);

// 14. Image spatial aggregation
var n_pixels_from_reducer = masked_aggregated_picture.select('B8').reduceRegion(
  {
  reducer : ee.Reducer.count(),
  maxPixels : 1e29,
  scale : scale_of_analysis,
  geometry : ROI,
  })
print('n_pixels_from_reducer', n_pixels_from_reducer);
print('number of pixels with healty vegetation (B8 -> NIR )', n_pixels_from_reducer.get('B8'));

// 15. Healthy vegetation extension computation
var unmasked_pixels = n_pixels_from_reducer.get('B8')
var extension_vegetation_area_m2 =  ee.Number(unmasked_pixels).multiply(scale_of_analysis).multiply(scale_of_analysis)
var extension_vegetation_area_km2 = extension_vegetation_area_m2.divide(1000).divide(1000)
print('healthy km2', extension_vegetation_area_km2);


