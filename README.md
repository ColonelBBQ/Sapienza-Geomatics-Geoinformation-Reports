# Sapienza-Geomatics-Geoinformation-Reports
## Geospatial Analysis with Google Earth Engine 🌍  

This repository contains two geospatial analysis projects using **Google Earth Engine (GEE)**. These projects leverage satellite imagery from **Sentinel-2** and **Landsat 8** to analyze land cover, vegetation health, and water bodies using techniques such as **NDVI (Normalized Difference Vegetation Index)** and **MNDWI (Modified Normalized Difference Water Index)**.

---

### **Project 1: Vegetation Health Assessment Using NDVI** 🌱  

This project analyzes **vegetation health** in a given Region of Interest (ROI) by:  

✅ **Filtering Sentinel-2 images** based on date, ROI, and cloud cover  
✅ **Applying radiometric scaling and cloud masking**  
✅ **Computing NDVI** to highlight healthy vegetation  
✅ **Visualizing data** (RGB composites, NDVI maps, and vegetation masks)  
✅ **Estimating healthy vegetation area** in square kilometers  

### **Key Code Snippets**  
```javascript
// Compute NDVI
var RED = aggregated_image_roi.select('B4');
var NIR = aggregated_image_roi.select('B8');
var NDVI = NIR.subtract(RED).divide(NIR.add(RED));
Map.addLayer(NDVI, {min: -1, max: 1}, 'NDVI ROI');
```

### Project 2: Water Body Detection Using MNDWI 💧

This project identifies water bodies in satellite images using Landsat 8 data and MNDWI. The steps include:

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

### How to Use This Repository
	1.	Open Google Earth Engine (GEE Code Editor)
	2.	Copy and paste the scripts into a new GEE script file
	3.	Define your own ROI (Region of Interest) for analysis
	4.	Run the script to visualize the results on the GEE Map





