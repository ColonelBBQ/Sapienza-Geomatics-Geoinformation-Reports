
var QA_BAND = 'cs_cdf';
var CLEAR_THRESHOLD = 0.60;

// Function to cloud masking and radiometric scaling
function cloud_score_plus_maskS2clouds_and_RadiometricScaling(image) {

  return image.updateMask(image.select(QA_BAND).gte(CLEAR_THRESHOLD)).multiply(0.0001);
}


var S2_SR_coll_filtered = S2_SR_coll.filterDate('2021-01-01', '2021-12-31')
                               .filterBounds(ROI)                         
                               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',50)); 


// Apply cloud_score_plus_maskS2clouds_and_RadiometricScaling to the collection
var S2_SR_coll_filtered_cloud_masked =  S2_SR_coll_filtered.linkCollection(csPlus, [QA_BAND])
                                                           .map(cloud_score_plus_maskS2clouds_and_RadiometricScaling);


// Add the first image of  masked collection to the Map and cut if in the area of interest 
Map.addLayer(S2_SR_coll_filtered_cloud_masked.first().clip(ROI),
             {bands:['B4', 'B3', 'B2'], min:0, max:0.3},
             'S2_SR_coll_filtered first image RGB cloud score masking', false);


// Take the median for a better image
var median_SR_S2_image = S2_SR_coll_filtered_cloud_masked.median() // Median image
                                                         .select(["B1","B2","B3","B4",
                                                                  "B5","B6","B7","B8",
                                                                  "B8A","B9","B11","B12"]) // Select only some bands
                                                         .clip(ROI); // Cut the image on rome


// Add the median image to the map
Map.addLayer(median_SR_S2_image, {bands:['B4', 'B3', 'B2'], min:0, max:0.3},
                                 'median_SR_S2_image RGB (cloud score masking)',true);


var ESA_LC_image = ESA_world_LCs.first();
var ESA_LC_image = ESA_LC_image.clip(ROI);

// Remap the values and the band
var old_value_Classes = [10,20,30,40,50,60,70,80,90,95,100];
var new_value_Classes = ee.List.sequence(0,10); 
var ESA_LC_image = ESA_LC_image.remap(old_value_Classes,new_value_Classes).toByte().rename('LC');


// Define the color palette for each of the biomes of the imported training set
var LC_palette = ['006400',  // 0   Tree cover
                  'ffbb22',  // 1   Shrubland
                  'ffff4c',  // 2   Grassland
                  'f096ff',  // 3   Cropland
                  'fa0000',  // 4   Built-up
                  'b4b4b4',  // 5   Bare / sparse vegetation
                  'f0f0f0',  // 6   Snow and ice
                  '0064c8',  // 7   Permanent water bodies
                  '0096a0',  // 8   Herbaceous wetland
                  '00cf75',  // 9   Mangroves
                  'fae6a0']; // 10  Moss and lichen
                  

Map.addLayer(ESA_LC_image , {min:0,max:10, palette:LC_palette}, 'ESA_2021_LC 2021',false);


// Define the datasetSample
var datasetSample = median_SR_S2_image.addBands(ESA_LC_image)
                                      .stratifiedSample(
                                          {
                                            scale: 10,
                                            region: ROI,
                                            geometries: true,
                                            tileScale : 4,
                                            numPoints: 10000,
                                            classBand: 'LC'
                                          }
                                        );

// Add the dataset sample to the map
Map.addLayer(datasetSample,{},"datasetSample",false); 

// Get info about about the sample dataset
var hist_datasetSample = datasetSample.reduceColumns(ee.Reducer.frequencyHistogram(),["LC"]);
print("datasetSample reduceColumns,hist",hist_datasetSample);


// Define train and validation set 
datasetSample = datasetSample.randomColumn(); // Add a random column from a uniform in [0,1)
var trainingSample  = datasetSample.filter(ee.Filter.lte("random",0.8));
var validationSample  = datasetSample.filter(ee.Filter.gt("random",0.8));
Map.addLayer(trainingSample,{},"trainingSample",false);
Map.addLayer(validationSample,{},"trainingSample",false);

// Get info about train and validation set 
print("trainingSample histogram",trainingSample.reduceColumns(ee.Reducer.frequencyHistogram(),["LC"]));
print("validationSample histogram",validationSample.reduceColumns(ee.Reducer.frequencyHistogram(),["LC"]));


var number_of_trees = 10;
var RF_classifier = ee.Classifier.smileRandomForest(number_of_trees);

// Train the classifier
var trained_classifier = RF_classifier.train(
  {
    features: trainingSample,
    classProperty: 'LC', // is the LandCover (LC) band(column)
        inputProperties: median_SR_S2_image.bandNames() 
  }
  );


// Get the accuracy
var training_confusion_matrix = trained_classifier.confusionMatrix();
print("training_accuracy",training_confusion_matrix.accuracy());

var classified_validation = validationSample.classify(trained_classifier);
var validation_confusion_matrix = classified_validation.errorMatrix('LC','classification');

print('accuracy validation',validation_confusion_matrix.accuracy());


var classified_median_SR_S2_image = median_SR_S2_image.classify(trained_classifier);
Map.addLayer(classified_median_SR_S2_image,{min:0,max:10,palette:LC_palette},"classified_median_SR_S2_image 2023");
print("classified_median_SR_S2_image",classified_median_SR_S2_image);

// Get resolution 
var S2_spatial_resolution = S2_SR_coll.first().select('B4').projection().nominalScale();
print("S2_spatial_resolution",S2_spatial_resolution);


// For loop to get the extension surface of each land cover
var somma = 0;
for (var index = 0; index < 11 ; index = index +1){
  var mask = classified_median_SR_S2_image.eq(index);
  var count = mask.reduceRegion({reducer: ee.Reducer.sum(),
                                 geometry: ROI,
                                 scale: S2_spatial_resolution,
                                 maxPixels: 1e9}).get('classification');
                                 
  var title = "Rome" + " biome " + index ;                                  
  var area_m2  = ee.Number(count).multiply(S2_spatial_resolution).multiply(S2_spatial_resolution);
  var area_km2 = area_m2.divide(1000).divide(1000); 
  
  var somma = ee.Number(somma).add(area_km2);
  var extension = title + " extension: ";
  
  Map.addLayer(mask,{},title,false);
  print(extension,area_km2);
}


print("Sum of the areas ",somma);

// Get the extension of the area of interest
var total_pixel_count = median_SR_S2_image.reduceRegion({reducer: ee.Reducer.count(),geometry: ROI, scale: S2_spatial_resolution, maxPixels: 1e9 });
var pixel_count_result = total_pixel_count.get("B4");
var extensions_of_roi_m2 = ee.Number(pixel_count_result).multiply(S2_spatial_resolution).multiply(S2_spatial_resolution);
var extensions_of_roi_km2 = extensions_of_roi_m2.divide(1000).divide(1000);
print("Extension of Rome" ,extensions_of_roi_km2);

// Get the extension of classified the area of interest
var total_pixel_count = classified_median_SR_S2_image.reduceRegion({reducer: ee.Reducer.count(),geometry: ROI, scale: S2_spatial_resolution, maxPixels: 1e9 });
var pixel_count_result = total_pixel_count.get("classification");
var extensions_of_roi_m2 = ee.Number(pixel_count_result).multiply(S2_spatial_resolution).multiply(S2_spatial_resolution);
var extensions_of_roi_km2 = extensions_of_roi_m2.divide(1000).divide(1000);
print("Extension of Rome (classified)" ,extensions_of_roi_km2);
  
