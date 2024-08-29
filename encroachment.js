
// // Define the boundary of Lake Bosomtwe


// Define time periods for analysis
var startDate1 = '2015-01-01';
var endDate1 = '2015-12-31';
var startDate2 = '2016-01-01';
var endDate2 = '2016-12-31';

// Load Landsat 8 imagery for both years
var dataset1 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                .filterBounds(lakeBoundary)
                .filterDate(startDate1, endDate1)
                .median()
                .clip(lakeBoundary);

var dataset2 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                .filterBounds(lakeBoundary)
                .filterDate(startDate2, endDate2)
                .median()
                .clip(lakeBoundary);

// Define training points
var trainingPoints = dam.merge(vegetation)

// Sample the input imagery using the training points
var trainingData1 = dataset1.sampleRegions({
  collection: trainingPoints,
  properties: ['class'],
  scale: 30
});

///SPLITS:Training(75%) & Testing samples(25%) for dataset1
var Total_samples1=trainingData1.randomColumn('random')
var training_samples1=Total_samples1.filter(ee.Filter.lessThan('random',0.75))
print(training_samples1,"Training Samples")

var validation_samples1=Total_samples1.filter(ee.Filter.greaterThanOrEquals('random',0.75))
print(validation_samples1,"Validation_Samples")


var trainingData2 = dataset2.sampleRegions({
  collection: trainingPoints,
  properties: ['class'],
  scale: 30
});

///SPLITS:Training(75%) & Testing samples(25%) for dataset2
var Total_samples2=trainingData2.randomColumn('random')
var training_samples2=Total_samples2.filter(ee.Filter.lessThan('random',0.75))
print(training_samples2,"Training Samples")

var validation_samples2=Total_samples2.filter(ee.Filter.greaterThanOrEquals('random',0.75))
print(validation_samples2,"Validation_Samples")

// Train the classifier
var classifier1 = ee.Classifier.smileRandomForest(10)
                      .train({
                        features: training_samples1,
                        classProperty: 'class',
                        inputProperties: dataset1.bandNames()  // Use the bands from the dataset
                      });
                      
var validation_classifier1 = ee.Classifier.smileRandomForest(10)
                      .train({
                        features: validation_samples1,
                        classProperty: 'class',
                        inputProperties: dataset1.bandNames()  // Use the bands from the dataset
                      });

// Classify the images
var classified1 = dataset1.classify(classifier1);


var confusionMatrix1=ee.ConfusionMatrix(validation_samples1.classify(validation_classifier1)
                    .errorMatrix({
                      actual:'landcover',
                      predicted:'classification'
                    }))
print(confusionMatrix1,"confusionMatrix")

print('Dataset 1 Kappa Accuracy:', confusionMatrix1.kappa());
print(confusionMatrix1.accuracy(),"Dataset 1  overall_Accuracy")



var names = ['dam','vegetation']
var count = classified1.eq([1,2])
var total = count.multiply(ee.Image.pixelArea()).divide(1e6).rename(names);
var area = total.reduceRegion({
reducer:ee.Reducer.sum(),
  geometry:lakeBoundary,
  scale:30,
maxPixels: 1e12,
bestEffort:true
});
print ('Classified 1 Area in (km²):', area)





var classifier2 = ee.Classifier.smileRandomForest(10)
                      .train({
                        features: training_samples2,
                        classProperty: 'class',
                        inputProperties: dataset1.bandNames()  // Use the bands from the dataset
                      });
                      
var validation_classifier2 = ee.Classifier.smileRandomForest(10)
                      .train({
                        features: validation_samples2,
                        classProperty: 'class',
                        inputProperties: dataset1.bandNames()  // Use the bands from the dataset
                      });




var classified2 = dataset2.classify(classifier2);

var confusionMatrix2=ee.ConfusionMatrix(validation_samples2.classify(validation_classifier2)
                    .errorMatrix({
                      actual:'landcover',
                      predicted:'classification'
                    }))
print(confusionMatrix2,"confusionMatrix")

print('Dataset 2 Kappa Accuracy:', confusionMatrix2.kappa());
print(confusionMatrix2.accuracy(),"Dataset 2  overall_Accuracy")


var names = ['dam','vegetation']
var count = classified2.eq([1,2])
var total = count.multiply(ee.Image.pixelArea()).divide(1e6).rename(names);
var area = total.reduceRegion({
reducer:ee.Reducer.sum(),
  geometry:lakeBoundary,
  scale:30,
maxPixels: 1e12,
bestEffort:true
});
print ('Classified 2 Area in (km²):', area)


// var confusionMatrix=ee.ConfusionMatrix(classified2
//                     .errorMatrix({
//                       actual:'landcover',
//                       predicted:'classification'
//                     }))
// print(confusionMatrix,"confusionMatrix")

// print('Classified 2 Kappa Accuracy:', confusionMatrix.kappa());
// print(confusionMatrix.accuracy(),"Classified 2 overall_Accuracy");

// Compute the difference between the classifications
var changeDetection = classified2.subtract(classified1);

// Define visualization parameters
var visParamsClass = {
  min: 0,
  max: 2,
  palette: ['blue', 'green', 'grey']  // Colors for different classes
};

var visParamsChange = {
  min: -2,
  max: 2,
  palette: ['red', 'white', 'green']  // Colors to show changes
};

// Add layers to the map
Map.centerObject(lakeBoundary, 12);
Map.addLayer(classified1, visParamsClass, 'Land Cover 2015');
Map.addLayer(classified2, visParamsClass, 'Land Cover 2016');
Map.addLayer(changeDetection, visParamsChange, 'Change Detection');

// // Add map title and legend
// // Map.add(ui.Label('Land Cover Classification and Change Detection Around Lake Bosomtwe', {fontSize: '24px', padding: '8px'}));
// // Map.add(ui.Map.Layer(lakeBoundary, {color: 'red'}, 'Lake Boundary'));

// Add Legend
var legendPanel = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px'
  }
});
var legendTitle = ui.Label({
  value: 'Legend',
  style: {fontWeight: 'bold', fontSize: '16px'}
});
legendPanel.add(legendTitle);

var colorList = ['blue', 'green', 'grey'];
var classNames = ['Water (Lake)', 'Forest', 'Urban/Built-up'];
for (var i = 0; i < colorList.length; i++) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: colorList[i],
      padding: '10px',
      margin: '2px'
    }
  });
  var description = ui.Label(classNames[i]);
  var row = ui.Panel([colorBox, description], ui.Panel.Layout.Flow('horizontal'));
  legendPanel.add(row);
}
Map.add(legendPanel);

// // Add North Arrow
var northArrow = ui.Label({
  value: 'N',
  style: {
    position: 'bottom-right',
    fontSize: '24px',
    padding: '8px',
    backgroundColor: 'white'
  }
});
Map.add(northArrow);

// Add Scale Bar
var scaleBar = ui.Label({
  value: 'Scale: 1:10,000',
  style: {
    position: 'bottom-right',
    fontSize: '12px',
    padding: '8px',
    backgroundColor: 'white'
  }
});
Map.add(scaleBar);

// Export results
Export.image.toDrive({
  image: classified1,
  description: 'land_cover_classification_2015_lake_bosomtwe',
  scale: 30,
  region: lakeBoundary
});

Export.image.toDrive({
  image: classified2,
  description: 'land_cover_classification_2016_lake_bosomtwe',
  scale: 30,
  region: lakeBoundary
});

Export.image.toDrive({
  image: changeDetection.float(),// float solved the export issue
  description: 'change_detection_2015_2016_lake_bosomtwe',
  scale: 30,
  region: lakeBoundary
});





