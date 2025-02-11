# Geospatial Analysis with Google Earth Engine 🌍  

This repository contains advanced geospatial analysis projects leveraging Google Earth Engine (GEE) and Machine Learning (ML) techniques to process and analyze satellite imagery from Sentinel-2 and Landsat 8. The projects focus on land cover classification, vegetation health assessment, water body detection, and predictive modeling using ML algorithms. I don't publish my Reports simply because the class is still being teached and often use the same questions as Homework.

---
## How to Use This Repository
Simply follow the link attached for each project and Run the Script!

---

## Project 1: Machine Learning with Google Earth Engine
### Project 1.1: Land Cover Classification Using Random Forest 🌎

Link: https://code.earthengine.google.com/d17a77cfd678c0555ca32655eb3cc02e

This project classifies land cover types (e.g., vegetation, water, urban areas) using Sentinel-2 imagery and the Random Forest machine learning algorithm for the Coral Sea
off the coast of Queensland, Australia.

✅ Collect training samples for different land cover types
✅ Extract spectral features (NDVI, MNDWI, etc.)
✅ Train a Random Forest classifier
✅ Apply the trained model to classify land cover

```javascript
// Train Random Forest Classifier
var classifier = ee.Classifier.smileRandomForest(50).train({
  features: trainingSamples,
  classProperty: 'landcover',
  inputProperties: bands
});
var classified = image.classify(classifier);
Map.addLayer(classified, {min: 0, max: 4, palette: ['green', 'blue', 'gray', 'yellow']}, 'Land Cover');
```

<img width="630" alt="image" src="https://github.com/user-attachments/assets/5c6256b2-1f7d-43f6-9c4e-93b1d261260f" />

### Project 1.2: Urban Area Detection Using SVM 🏙️

Link: https://code.earthengine.google.com/d8f81d1a0b76995b271000ce18a541b2

This project identifies urban areas using Support Vector Machines (SVM) applied to Sentinel-2 imagery again using Lake Titicaca as our example.

✅ Extract spectral indices for urban detection (e.g., NDBI - Normalized Difference Built-up Index)
✅ Train an SVM classifier using labeled training data
✅ Classify urban and non-urban areas
✅ Evaluate model accuracy using a confusion matrix

```javascript
// Train SVM Classifier
var classifier = ee.Classifier.libsvm().train(trainingSamples, 'class', bands);
var classified = image.classify(classifier);
Map.addLayer(classified, {min: 0, max: 1, palette: ['gray', 'red']}, 'Urban Areas');
```

<img width="608" alt="image" src="https://github.com/user-attachments/assets/ac90bfde-f6c7-4add-ab39-129e7ff956bd" />

### Project 1.3: Unsupervised Land Classification Using K-Means

Link: https://code.earthengine.google.com/ca0f7321843f193f25a9371d3a89d20c

This project explores unsupervised classification using K-Means clustering for land cover segmentation in the Rome Area

✅ Convert multi-band satellite images into feature space
✅ Apply K-Means clustering to classify land cover types
✅ Visualize clustered land cover classes

```javascript
// Apply K-Means Clustering
var clusterer = ee.Clusterer.wekaKMeans(5).train(features);
var clustered = image.cluster(clusterer);
Map.addLayer(clustered.randomVisualizer(), {}, 'K-Means Clusters');
```

<img width="419" alt="image" src="https://github.com/user-attachments/assets/597edbed-7463-4d6a-99f0-6690a91bacec" />


## Project 2: NDVI and MNDWI Data Manipulation to Obtain Valuable Insights
### **Project 2.1: Vegetation Health Assessment Using NDVI** 🌱  

Link: https://code.earthengine.google.com/57dadacc97eb69de6405cf7b281aeaab
Script in Github: NDWI_Exercise.js

This project analyzes **vegetation health** in the are affected by the Bootleg fire to estimate damaage in vegetation by:  

✅ **Filtering Sentinel-2 images** based on date, ROI, and cloud cover  
✅ **Applying radiometric scaling and cloud masking**  
✅ **Computing NDVI** to highlight healthy vegetation  
✅ **Visualizing data** (RGB composites, NDVI maps, and vegetation masks)  
✅ **Estimating healthy vegetation area** in square kilometers  

#### **Key Code Snippets**  
```javascript
// Compute NDVI
var RED = aggregated_image_roi.select('B4');
var NIR = aggregated_image_roi.select('B8');
var NDVI = NIR.subtract(RED).divide(NIR.add(RED));
Map.addLayer(NDVI, {min: -1, max: 1}, 'NDVI ROI');
```

<img width="587" alt="image" src="https://github.com/user-attachments/assets/b0da4755-ad33-4233-8ce7-54c1d4a8e753" />

### Project 2.2: Water Body Detection Using MNDWI 💧

Link: https://code.earthengine.google.com/760fc9a9990192afa2f8261b23a6690b
Script in Github: MNDWI_Exercise.js

This project identifies the loss in water bodies in Lake Titicaca (Peru) in satellite images using Landsat 8 data and MNDWI. The steps include:

✅ Filtering Landsat 8 images by date and cloud cover
✅ Computing MNDWI to highlight water bodies
✅ Masking non-water pixels
✅ Extracting water body edges using Canny Edge Detection
✅ Estimating water area in square kilometers

```javascript
// Compute MNDWI
var mndwi = image.normalizedDifference(['B3', 'B6']);
Map.addLayer(mndwi.clip(geometry), {min: -1, max: 1}, 'MNDWI');
```

<img width="618" alt="image" src="https://github.com/user-attachments/assets/0d9dc5e4-dc11-4dc4-985b-1637b65177e1" />









