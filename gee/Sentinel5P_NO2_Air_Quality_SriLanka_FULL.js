// ============================================================
// Sentinel-5P NO2 Air Quality Monitoring - Sri Lanka
// Google Earth Engine
// ============================================================

// Load Sentinel-5P OFFL NO2 dataset
var no2 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2');

// Check the first image
print('First Sentinel-5P NO2 image:', no2.first());

// ============================================================
// 2. Define Area of Interest (AOI) - Sri Lanka
// ============================================================

// Load country boundaries
var countries = ee.FeatureCollection('FAO/GAUL/2015/level0');

// Select Sri Lanka
var sriLanka = countries.filter(
  ee.Filter.eq('ADM0_NAME', 'Sri Lanka')
);

// Display Sri Lanka boundary
Map.centerObject(sriLanka, 7);
Map.addLayer(sriLanka, {}, 'Sri Lanka Boundary');

print('Study Area:', sriLanka);

// ============================================================
// 3. Filter Sentinel-5P NO2 Data
// ============================================================

// Define study period
var startDate = '2020-01-01';
var endDate = '2020-02-01';

// Filter Sentinel-5P data by:
// 1. Study area
// 2. Date
// 3. NO2 band
var filteredNO2 = no2
  .filterBounds(sriLanka)
  .filterDate(startDate, endDate)
  .select('NO2_column_number_density');

// Check the number of images
print('Number of Sentinel-5P images:', filteredNO2.size());

// Check the first filtered image
print('First filtered NO2 image:', filteredNO2.first());

// ============================================================
// 4. Create Mean NO2 Image
// ============================================================

// Calculate mean NO2 concentration for January 2020
var meanNO2 = filteredNO2.mean();

// Clip the result to Sri Lanka
var meanNO2SriLanka = meanNO2.clip(sriLanka);

// 439 Sentinel-5P observations → .mean() → 1 mean NO₂ image

// Check the resulting image
print('Mean NO2 - January 2020:', meanNO2SriLanka);

// ============================================================
// 5. Visualize Mean NO2
// ============================================================

var no2Vis = {
  min: 0,
  max: 0.0002,
  palette: [
    'black',
    'blue',
    'purple',
    'cyan',
    'green',
    'yellow',
    'red'
  ]
};

Map.addLayer(
  meanNO2SriLanka,
  no2Vis,
  'Mean NO2 - January 2020'
);

Map.centerObject(sriLanka, 7);

// ============================================================
// 6. Add NO2 Legend
// ============================================================

// Create legend panel
var legend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px'
  }
});

// Legend title
var legendTitle = ui.Label({
  value: 'NO₂ Column Density (mol/m²)',
  style: {
    fontWeight: 'bold',
    fontSize: '14px',
    margin: '0 0 6px 0'
  }
});

legend.add(legendTitle);

// Visualization palette
var palette = [
  'black',
  'blue',
  'purple',
  'cyan',
  'green',
  'yellow',
  'red'
];

// Create color bar
var colorBar = ui.Thumbnail({
  image: ee.Image.pixelLonLat()
    .select('longitude')
    .multiply((no2Vis.max - no2Vis.min) / 100.0)
    .add(no2Vis.min),
    
  params: {
    bbox: [0, 0, 100, 10],
    dimensions: '250x20',
    format: 'png',
    min: no2Vis.min,
    max: no2Vis.max,
    palette: palette
  },

  style: {
    stretch: 'horizontal',
    margin: '0px 8px',
    maxHeight: '24px'
  }
});

legend.add(colorBar);

// Add values below color bar
var legendLabels = ui.Panel({
  widgets: [
    ui.Label('0'),
    ui.Label('0.0001', {
      textAlign: 'center',
      stretch: 'horizontal'
    }),
    ui.Label('0.0002')
  ],

  layout: ui.Panel.Layout.flow('horizontal')
});

legend.add(legendLabels);

// Add legend to map
Map.add(legend);

// ============================================================
// 7. Descriptive Statistics - Sri Lanka
// ============================================================

var no2Stats = meanNO2SriLanka.reduceRegion({
  reducer: ee.Reducer.minMax()
    .combine({
      reducer2: ee.Reducer.mean(),
      sharedInputs: true
    }),
  geometry: sriLanka.geometry(),
  scale: 1000,
  maxPixels: 1e9
});

print('NO2 Statistics - January 2020:', no2Stats);

// Print statistics individually
print(
  'Maximum NO2:',
  no2Stats.get('NO2_column_number_density_max')
);

print(
  'Mean NO2:',
  no2Stats.get('NO2_column_number_density_mean')
);

print(
  'Minimum NO2:',
  no2Stats.get('NO2_column_number_density_min')
);

// ============================================================
// 8. NO2 Distribution - Percentile Analysis
// ============================================================

var no2Percentiles = meanNO2SriLanka.reduceRegion({
  reducer: ee.Reducer.percentile([5, 25, 50, 75, 90, 95, 99]),
  geometry: sriLanka.geometry(),
  scale: 1000,
  maxPixels: 1e9
});

print('NO2 Percentiles - January 2020:', no2Percentiles);

// ============================================================
// 9. NO2 Hotspot Detection - 95th Percentile
// ============================================================

// Get the 95th percentile threshold
var p95 = ee.Number(
  no2Percentiles.get('NO2_column_number_density_p95')
);

print('Hotspot Threshold (P95):', p95);

// Identify pixels above the 95th percentile
var no2Hotspots = meanNO2SriLanka.gt(p95);

// Mask everything below the threshold
var hotspotMask = no2Hotspots.selfMask();

// Add hotspots to map
Map.addLayer(
  hotspotMask,
  {palette: ['red']},
  'NO2 Hotspots (> P95)'
);

// ============================================================
// 10. Monthly NO2 Time-Series Analysis - 2020
// ============================================================

// Create list of months
var months = ee.List.sequence(1, 12);

// Calculate monthly mean NO2
var monthlyNO2 = ee.FeatureCollection(
  months.map(function(month) {

    var start = ee.Date.fromYMD(2020, month, 1);
    var end = start.advance(1, 'month');

    // Filter Sentinel-5P for each month
    var monthlyCollection = no2
      .filterBounds(sriLanka)
      .filterDate(start, end)
      .select('NO2_column_number_density');

    // Monthly mean image
    var monthlyMean = monthlyCollection.mean();

    // Spatial mean over Sri Lanka
    var meanValue = monthlyMean.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: sriLanka.geometry(),
      scale: 1000,
      maxPixels: 1e9
    }).get('NO2_column_number_density');

    // Store result
    return ee.Feature(null, {
      month: month,
      month_name: start.format('MMM'),
      mean_NO2: meanValue
    });
  })
);

print('Monthly NO2 Statistics - 2020:', monthlyNO2);

// ============================================================
// 11. Monthly NO2 Time-Series Chart
// ============================================================

var monthlyChart = ui.Chart.feature.byFeature({
  features: monthlyNO2,
  xProperty: 'month_name',
  yProperties: ['mean_NO2']
})
.setChartType('LineChart')
.setOptions({
  title: 'Monthly Mean NO₂ Column Density - Sri Lanka (2020)',

  hAxis: {
    title: 'Month'
  },

  vAxis: {
    title: 'NO₂ Column Density (mol/m²)',
    format: '0.00000'
  },

  lineWidth: 2,
  pointSize: 5,

  legend: {
    position: 'none'
  }
});

print(monthlyChart);

// ============================================================
// 12. Monthly NO2 Ranking
// ============================================================

// Sort from highest to lowest
var rankedMonths = monthlyNO2.sort('mean_NO2', false);

print(
  'Monthly NO2 Ranking - Highest to Lowest:',
  rankedMonths
);

// Highest month
var highestMonth = ee.Feature(rankedMonths.first());

print(
  'Highest NO2 Month:',
  highestMonth.get('month_name')
);

print(
  'Highest Monthly Mean NO2:',
  highestMonth.get('mean_NO2')
);

// Sort from lowest to highest
var lowestMonth = ee.Feature(
  monthlyNO2.sort('mean_NO2', true).first()
);

print(
  'Lowest NO2 Month:',
  lowestMonth.get('month_name')
);

print(
  'Lowest Monthly Mean NO2:',
  lowestMonth.get('mean_NO2')
);

// ============================================================
// 13. Difference Between Highest and Lowest Months
// ============================================================

var highestValue = ee.Number(
  highestMonth.get('mean_NO2')
);

var lowestValue = ee.Number(
  lowestMonth.get('mean_NO2')
);

var percentageDifference = highestValue
  .subtract(lowestValue)
  .divide(lowestValue)
  .multiply(100);

print(
  'Increase from Lowest to Highest Month (%):',
  percentageDifference
);

// ============================================================
// 14. Monthly Hotspot Frequency Analysis - 2020
// ============================================================

var monthlyHotspots = ee.ImageCollection.fromImages(

  months.map(function(month) {

    var start = ee.Date.fromYMD(2020, month, 1);
    var end = start.advance(1, 'month');

    // Monthly mean NO2
    var monthlyMean = no2
      .filterBounds(sriLanka)
      .filterDate(start, end)
      .select('NO2_column_number_density')
      .mean()
      .clip(sriLanka);

    // Calculate monthly 95th percentile
    var monthlyP95 = ee.Number(
      monthlyMean.reduceRegion({
        reducer: ee.Reducer.percentile([95]),
        geometry: sriLanka.geometry(),
        scale: 1000,
        maxPixels: 1e9
      }).get('NO2_column_number_density')
    );

    // 1 = hotspot, 0 = not hotspot
    var hotspot = monthlyMean
      .gt(monthlyP95)
      .rename('hotspot')
      .unmask(0);

    return hotspot.set({
      month: month,
      'system:time_start': start.millis()
    });

  })
);

// ============================================================
// 15. Persistent Hotspot Frequency
// ============================================================

// Number of months each pixel was classified as a hotspot
var hotspotFrequency = monthlyHotspots
  .sum()
  .clip(sriLanka);

print(
  'Monthly Hotspot Image Collection:',
  monthlyHotspots
);

Map.addLayer(
  hotspotFrequency.selfMask(),
  {
    min: 1,
    max: 12,
    palette: [
      'yellow',
      'orange',
      'red',
      'darkred'
    ]
  },
  'NO2 Hotspot Frequency - 2020'
);

// ============================================================
// 16. Maximum Hotspot Persistence
// ============================================================

var maxPersistence = hotspotFrequency.reduceRegion({
  reducer: ee.Reducer.max(),
  geometry: sriLanka.geometry(),
  scale: 1000,
  maxPixels: 1e9
});

print(
  'Maximum Hotspot Persistence (months):',
  maxPersistence.get('hotspot')
);

// ============================================================
// 17. Persistent NO2 Hotspots
// ============================================================

// Locations classified as hotspots in at least 6 months
var persistentHotspots = hotspotFrequency
  .gte(6)
  .selfMask();

Map.addLayer(
  persistentHotspots,
  {palette: ['red']},
  'Persistent NO2 Hotspots (>= 6 months)'
);

// ============================================================
// 18. Persistent Hotspot Area
// ============================================================

// Pixel area in square kilometres
var pixelAreaKm2 = ee.Image.pixelArea()
  .divide(1e6);

// Area of persistent hotspots
var persistentArea = pixelAreaKm2
  .updateMask(persistentHotspots)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: sriLanka.geometry(),
    scale: 1000,
    maxPixels: 1e9
  });

var persistentAreaKm2 = ee.Number(
  persistentArea.get('area')
);

print(
  'Persistent Hotspot Area (km²):',
  persistentAreaKm2
);

// ============================================================
// 19. Percentage of Sri Lanka Covered by Persistent Hotspots
// ============================================================

// Calculate total area of Sri Lanka in km²
var totalArea = ee.Image.pixelArea()
  .divide(1e6)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: sriLanka.geometry(),
    scale: 1000,
    maxPixels: 1e9
  });

var totalAreaKm2 = ee.Number(
  totalArea.get('area')
);

// Calculate percentage
var persistentPercentage = persistentAreaKm2
  .divide(totalAreaKm2)
  .multiply(100);

print(
  'Calculated Sri Lanka Area (km²):',
  totalAreaKm2
);

print(
  'Persistent Hotspot Area (km²):',
  persistentAreaKm2
);

print(
  'Persistent Hotspot Coverage (%):',
  persistentPercentage
);

// ============================================================
// January NO2 Hotspot Legend
// ============================================================

var hotspotLegend = ui.Panel({
  style: {
    position: 'top-right',
    padding: '8px 15px'
  }
});

// Title
hotspotLegend.add(
  ui.Label({
    value: 'January 2020 NO₂ Hotspots',
    style: {
      fontWeight: 'bold',
      fontSize: '14px',
      margin: '0 0 6px 0'
    }
  })
);

// Red color box
var hotspotColor = ui.Label({
  style: {
    backgroundColor: 'red',
    padding: '8px',
    margin: '0 8px 0 0'
  }
});

// Description
var hotspotDescription = ui.Label(
  'Hotspot (> 95th percentile)'
);

// Put color box and text together
hotspotLegend.add(
  ui.Panel({
    widgets: [
      hotspotColor,
      hotspotDescription
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  })
);

// Add to map
Map.add(hotspotLegend);

// ============================================================
// 20. Sri Lanka District Boundaries
// ============================================================

// GAUL Level 2 administrative boundaries
var districts = ee.FeatureCollection(
  'FAO/GAUL/2015/level2'
)
.filter(
  ee.Filter.eq('ADM0_NAME', 'Sri Lanka')
);

print('Sri Lanka Districts:', districts);
print('Number of Districts:', districts.size());

// Display district boundaries
Map.addLayer(
  districts.style({
    color: 'white',
    fillColor: '00000000',
    width: 1
  }),
  {},
  'Sri Lanka District Boundaries'
);

// ============================================================
// 21. Check District Names
// ============================================================

print(
  'District Names:',
  districts.aggregate_array('ADM2_NAME')
);

// ============================================================
// 22. Annual Mean NO2 - 2020
// ============================================================

var annualNO2_2020 = no2
  .filterBounds(sriLanka)
  .filterDate('2020-01-01', '2021-01-01')
  .select('NO2_column_number_density')
  .mean()
  .clip(sriLanka);

Map.addLayer(
  annualNO2_2020,
  no2Vis,
  'Annual Mean NO2 - 2020',
  false
);

print('Annual Mean NO2 - 2020:', annualNO2_2020);

// ============================================================
// 23. District-Level Mean NO2 - 2020
// ============================================================

var districtNO2 = annualNO2_2020.reduceRegions({
  collection: districts,
  reducer: ee.Reducer.mean(),
  scale: 1000
});

// Rename the mean property for clarity
districtNO2 = districtNO2.map(function(feature) {
  return feature.set(
    'mean_NO2_2020',
    feature.get('mean')
  );
});

print(
  'District NO2 Statistics - 2020:',
  districtNO2
);

// ============================================================
// 24. Rank Districts by Mean NO2
// ============================================================

var districtRanking = districtNO2
  .sort('mean_NO2_2020', false);

print(
  'District Ranking - Highest Mean NO2:',
  districtRanking
);

// Highest-ranked district
var highestDistrict = ee.Feature(
  districtRanking.first()
);

print(
  'Highest NO2 District:',
  highestDistrict.get('ADM2_NAME')
);

print(
  'Mean NO2:',
  highestDistrict.get('mean_NO2_2020')
);

// ============================================================
// 25. Persistent Hotspot Area by District
// ============================================================

// Persistent hotspot area image in km²
var persistentAreaImage = ee.Image.pixelArea()
  .divide(1e6)
  .updateMask(persistentHotspots)
  .rename('persistent_hotspot_km2');

// Calculate hotspot area for every district
var districtHotspotArea = persistentAreaImage.reduceRegions({
  collection: districts,
  reducer: ee.Reducer.sum(),
  scale: 1000
});

// Rename result
districtHotspotArea = districtHotspotArea.map(function(feature) {

  return feature.set(
    'hotspot_area_km2',
    feature.get('sum')
  );

});

// Rank districts
var hotspotAreaRanking = districtHotspotArea
  .sort('hotspot_area_km2', false);

print(
  'District Ranking - Persistent Hotspot Area:',
  hotspotAreaRanking
);

// Highest district
var highestHotspotDistrict = ee.Feature(
  hotspotAreaRanking.first()
);

print(
  'District with Largest Persistent Hotspot Area:',
  highestHotspotDistrict.get('ADM2_NAME')
);

print(
  'Persistent Hotspot Area (km²):',
  highestHotspotDistrict.get('hotspot_area_km2')
);

// ============================================================
// 26. Persistent Hotspot Coverage (%) by District
// ============================================================

var districtHotspotCoverage = districtHotspotArea.map(function(feature) {

  // Total district area in km²
  var districtAreaKm2 = feature.geometry()
    .area()
    .divide(1e6);

  // Persistent hotspot area
  var hotspotAreaKm2 = ee.Number(
    feature.get('hotspot_area_km2')
  );

  // Percentage of district covered by persistent hotspots
  var hotspotPercentage = hotspotAreaKm2
    .divide(districtAreaKm2)
    .multiply(100);

  return feature.set({
    'district_area_km2': districtAreaKm2,
    'hotspot_percentage': hotspotPercentage
  });

});

// Rank districts by percentage
var hotspotPercentageRanking = districtHotspotCoverage
  .sort('hotspot_percentage', false);

print(
  'District Ranking - Persistent Hotspot Coverage (%):',
  hotspotPercentageRanking
);

// District with highest percentage
var highestPercentageDistrict = ee.Feature(
  hotspotPercentageRanking.first()
);

print(
  'District with Highest Hotspot Coverage:',
  highestPercentageDistrict.get('ADM2_NAME')
);

print(
  'District Area (km²):',
  highestPercentageDistrict.get('district_area_km2')
);

print(
  'Persistent Hotspot Area (km²):',
  highestPercentageDistrict.get('hotspot_area_km2')
);

print(
  'Persistent Hotspot Coverage (%):',
  highestPercentageDistrict.get('hotspot_percentage')
);

// ============================================================
// 27. Top 10 Districts by Mean NO2 - Horizontal Chart
// ============================================================

var top10NO2 = districtRanking.limit(10);

var districtNO2Chart = ui.Chart.feature.byFeature({
  features: top10NO2,
  xProperty: 'ADM2_NAME',
  yProperties: ['mean_NO2_2020']
})
.setChartType('BarChart')
.setOptions({
  title: 'Top 10 Districts by Mean NO₂ Column Density - 2020',

  hAxis: {
    title: 'Mean NO₂ Column Density (mol/m²)',
    format: '0.00000'
  },

  vAxis: {
    title: 'District'
  },

  legend: {
    position: 'none'
  },

  bar: {
    groupWidth: '70%'
  }
});

print(districtNO2Chart);
// ============================================================
// 28. Top 10 Districts by Persistent Hotspot Coverage
// ============================================================

var top10Coverage = hotspotPercentageRanking.limit(10);

var hotspotCoverageChart = ui.Chart.feature.byFeature({
  features: top10Coverage,
  xProperty: 'ADM2_NAME',
  yProperties: ['hotspot_percentage']
})
.setChartType('BarChart')
.setOptions({
  title: 'Top 10 Districts by Persistent NO₂ Hotspot Coverage - 2020',

  hAxis: {
    title: 'Persistent Hotspot Coverage (%)',
    viewWindow: {
      min: 0,
      max: 100
    }
  },

  vAxis: {
    title: 'District'
  },

  legend: {
    position: 'none'
  },

  bar: {
    groupWidth: '70%'
  }
});

print(hotspotCoverageChart);

// ============================================================
// 29. District-Level Annual Mean NO2 Map - 2020
// ============================================================

// Convert district mean NO2 values to an image
var districtNO2Image = districtNO2
  .reduceToImage({
    properties: ['mean_NO2_2020'],
    reducer: ee.Reducer.first()
  })
  .clip(sriLanka);

// Visualization settings
var districtNO2Vis = {
  min: 0.00004,
  max: 0.00007,
  palette: [
    'blue',
    'cyan',
    'green',
    'yellow',
    'orange',
    'red'
  ]
};

// Add district-level NO2 map
Map.addLayer(
  districtNO2Image,
  districtNO2Vis,
  'District Mean NO2 - 2020'
);

// Add district boundaries on top
Map.addLayer(
  districts.style({
    color: 'white',
    fillColor: '00000000',
    width: 1
  }),
  {},
  'District Boundaries'
);

Map.centerObject(sriLanka, 7);

// ============================================================
// 30. District Mean NO2 Legend
// ============================================================

var districtLegend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px'
  }
});

districtLegend.add(
  ui.Label({
    value: 'District Mean NO₂ - 2020 (mol/m²)',
    style: {
      fontWeight: 'bold',
      fontSize: '14px',
      margin: '0 0 6px 0'
    }
  })
);

var districtColorBar = ui.Thumbnail({
  image: ee.Image.pixelLonLat()
    .select('longitude')
    .multiply((0.00007 - 0.00004) / 100)
    .add(0.00004),

  params: {
    bbox: [0, 0, 100, 10],
    dimensions: '250x20',
    format: 'png',
    min: 0.00004,
    max: 0.00007,
    palette: [
      'blue',
      'cyan',
      'green',
      'yellow',
      'orange',
      'red'
    ]
  },

  style: {
    stretch: 'horizontal',
    margin: '0px 8px',
    maxHeight: '24px'
  }
});

districtLegend.add(districtColorBar);

districtLegend.add(
  ui.Panel({
    widgets: [

      ui.Label('0.00004'),

      ui.Label('0.000055', {
        textAlign: 'center',
        stretch: 'horizontal'
      }),

      ui.Label('0.00007')

    ],

    layout: ui.Panel.Layout.flow('horizontal')
  })
);

Map.add(districtLegend);
