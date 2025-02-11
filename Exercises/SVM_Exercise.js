// Define the ROI using the provided coordinates
var ROI = ee.Geometry.Polygon([
  [
    [-69.98173697010589,-15.401833318877646],
    [-69.98238877884977,-15.663998439358567],
    [-70.06547482286614,-15.740994599144926],
    [-70.00648508161882,-15.927014806367351],
    [-69.23378098443672,-16.358153345943613],
    [-69.10599103116941,-16.28093576859637],
    [-69.00377871267496,-16.16185790060706],
    [-68.86091026198046,-16.221902285325445],
    [-68.81140321126996,-16.185918631943217],
    [-68.80031267300132,-16.05477828284279],
    [-68.69724978851751,-16.00514943507212],
    [-68.69049467711152,-15.945066153305618],
    [-69.70773501512058,-15.184464006613037],
    [-69.89563006501542,-15.278806501676769],
    [-69.98173697010589,-15.401833318877646]
  ]
]);

// Visualize the ROI on the map
Map.centerObject(ROI);

var L8_SR_coll = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");

// Filter the collection by period
//                       by location
//                       by cloud cover property
var L8_SR_filtered_coll = L8_SR_coll.filterDate('2013-01-01', '2013-12-31')
                       .filterBounds(ROI)
                       .filter(ee.Filter.lt('CLOUD_COVER',50));

print('number of images in L8 filtered collection');
print(L8_SR_filtered_coll.size());

// Function that applies radiometric scaling factors
function applyRadiometricScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// Function that applies cloud masking
function cloud_maskL8sr(image) {
  // Bits 3 and 4 are cloud shadow and cloud, respectively
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 4;
  // Get the pixel QA band.
  var qa = image.select('QA_PIXEL');
  // Both flags should be set to zero, indicating clear conditions
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
      .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  // Return the masked image without the QA bands
  return image.updateMask(mask);
}

// Applying radiometric scaling factors and cloud masking
L8_SR_filtered_coll = L8_SR_filtered_coll.map(applyRadiometricScaleFactors).map(cloud_maskL8sr);

// Check the effectiveness of the cloud masking 
// on the first image of the filtered collection
Map.addLayer(L8_SR_filtered_coll.first(), {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min:0,max: 0.3},'L8 first image 2018 (RGB)', false);

// Computing the aggregated image
var L8_SR_median_image = L8_SR_filtered_coll.median();
print('L8_SR_median_image');
print(L8_SR_median_image);

// Display the aggregated image (input for the classifier)
Map.addLayer(L8_SR_median_image, {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min:0,max: 0.3},'L8 median image 2018 (RGB)');

// Manually created polygons for training the classifier
// They can be directly drawn from the GUI
var water1 = ee.Geometry.Rectangle(-69.55169318456952, -15.777508539361635, -69.53521369238202, -15.758345130195975);
var water2 = ee.Geometry.Rectangle(-69.79575274725262, -15.903801205366275, -69.78613971014325, -15.895216304860448);
var water3 = ee.Geometry.Rectangle(-69.74932296081587,-15.339686477862061, -69.72666365905806, -15.321144521186511);

var nonWater1 = ee.Geometry.Rectangle(-69.79389260230286, -15.70689401184787, -69.78427956519349, -15.697639723301776);
var nonWater2 = ee.Geometry.Rectangle(-69.07480309424622,-16.128340537410033, -69.03600762305481, -16.104757704640715);
var nonWater3 = ee.Geometry.Rectangle(-69.0248453986976,-15.733675221513577, -68.99051312330697, -15.703270692909937);


// Make a FeatureCollection from the hand-made geometries
var polygons = ee.FeatureCollection([
  ee.Feature(nonWater1, {'class': 0}),
  ee.Feature(nonWater2, {'class': 0}),
  ee.Feature(nonWater3, {'class': 0}),
  ee.Feature(water1,    {'class': 1}),
  ee.Feature(water2,    {'class': 1}),
  ee.Feature(water3,    {'class': 1}),
]);
print('polygons', polygons);

// Display the training polygons
Map.addLayer(polygons, {}, 'training polygons');

// Create the training dataset
// Getting the values for all pixels in each polygon in the training
var training_data = L8_SR_median_image.sampleRegions({
  // Get the sample from the polygons FeatureCollection
  collection: polygons,
  // Keep this list of properties from the polygons
  properties: ['class'],
  // Set the scale (spatial resolution) to get Landsat pixels in the polygons (m)
  scale: 30
});

print('training_data size');
print(training_data.size());

print('training_data first 50');
print(training_data.limit(50));

// Create an SVM classifier with custom parameters
var classifier = ee.Classifier.libsvm({
  kernelType: 'RBF',
  gamma: 0.5,
  cost: 10
});

// Bands to be used for the prediction
var bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'ST_B10'];

// Train the classifier
var trained_classifier = classifier.train(training_data, 'class', bands);

// Get information about the trained classifier
print('Trained classifier', trained_classifier.explain());

// Classify the L8 SR median image (inference)
var classified_L8_SR_median_image = L8_SR_median_image.classify(trained_classifier);

print('classified_L8_SR_median_image');
print(classified_L8_SR_median_image);

// Clip the classified image to the ROI
var clipped_classified_image = classified_L8_SR_median_image.clip(ROI);

// Display the classification results clipped to the ROI
Map.addLayer(clipped_classified_image, {min: 0, max: 1, palette: ['red', 'blue']}, 'classified_L8_SR_median_image (deforestation) - clipped to ROI');

// Create binary masks for green (forest) and red (non-forest) pixels
var green_mask = clipped_classified_image.eq(1);
var red_mask = clipped_classified_image.eq(0);

// Count the number of green and red pixels with adjusted maxPixels parameter
var green_pixel_count = ee.Number(green_mask.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: ROI,
  scale: 30,
  maxPixels: 1e8, // Increase maxPixels limit
  bestEffort: true // Allow best effort if maxPixels limit is exceeded
}).get('classification'));

var red_pixel_count = ee.Number(red_mask.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: ROI,
  scale: 30,
  maxPixels: 1e8, // Increase maxPixels limit
  bestEffort: true // Allow best effort if maxPixels limit is exceeded
}).get('classification'));

// Calculate the total number of pixels
var total_pixel_count = green_pixel_count.add(red_pixel_count);

// Calculate the percentage of green and red pixels
var blue_percentage = green_pixel_count.divide(total_pixel_count).multiply(100);
var red_percentage = red_pixel_count.divide(total_pixel_count).multiply(100);

// Print the results
print('Blue (Water) pixel percentage: ', blue_percentage);
print('Red (non-water) pixel percentage: ', red_percentage);
