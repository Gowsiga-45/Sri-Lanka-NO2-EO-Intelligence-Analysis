// ============================================================
// Sri Lanka NO2 Earth Observation Intelligence Analysis - 2020
// Sentinel-5P OFFL NO2 | Google Earth Engine
// CLEAN PORTFOLIO VERSION
// ============================================================

// ============================================================
// 1. CONFIGURATION
// ============================================================

var YEAR = 2020;
var BAND = 'NO2_column_number_density';
var SCALE = 1000;

// Hotspot definition:
// Pixel > monthly 95th percentile
var HOTSPOT_PERCENTILE = 95;

// Persistent hotspot definition:
// Hotspot in at least 6 months of the year
var PERSISTENCE_MONTHS = 6;


// ============================================================
// 2. STUDY AREA - SRI LANKA
// ============================================================

// Country boundaries
var countries = ee.FeatureCollection(
  'FAO/GAUL/2015/level0'
);

// Select Sri Lanka
var sriLanka = countries.filter(
  ee.Filter.eq('ADM0_NAME', 'Sri Lanka')
);

// District boundaries
var districts = ee.FeatureCollection(
  'FAO/GAUL/2015/level2'
).filter(
  ee.Filter.eq('ADM0_NAME', 'Sri Lanka')
);

Map.centerObject(sriLanka, 7);


// ============================================================
// 3. SENTINEL-5P NO2 DATA
// ============================================================

var no2 = ee.ImageCollection(
  'COPERNICUS/S5P/OFFL/L3_NO2'
)
.filterBounds(sriLanka)
.select(BAND);


// ============================================================
// 4. VISUALIZATION PARAMETERS
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


// District choropleth visualization
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


// ============================================================
// 5. ANNUAL MEAN NO2 - 2020
// ============================================================

var annualNO2 = no2

  .filterDate(
    YEAR + '-01-01',
    (YEAR + 1) + '-01-01'
  )

  .mean()

  .clip(sriLanka);


Map.addLayer(
  annualNO2,
  no2Vis,
  'Annual Mean NO2 - 2020',
  false
);


// ============================================================
// 6. JANUARY 2020 BASELINE ANALYSIS
// ============================================================

var januaryNO2 = no2

  .filterDate(
    '2020-01-01',
    '2020-02-01'
  )

  .mean()

  .clip(sriLanka);


// Descriptive statistics
var januaryStats = januaryNO2.reduceRegion({

  reducer: ee.Reducer.minMax()

    .combine({
      reducer2: ee.Reducer.mean(),
      sharedInputs: true
    }),

  geometry: sriLanka.geometry(),

  scale: SCALE,

  maxPixels: 1e9

});


print(
  'January NO2 Statistics:',
  januaryStats
);


// ============================================================
// 7. JANUARY NO2 PERCENTILE ANALYSIS
// ============================================================

var januaryPercentiles = januaryNO2.reduceRegion({

  reducer: ee.Reducer.percentile(
    [5, 25, 50, 75, 90, 95, 99]
  ),

  geometry: sriLanka.geometry(),

  scale: SCALE,

  maxPixels: 1e9

});


var januaryP95 = ee.Number(

  januaryPercentiles.get(
    BAND + '_p95'
  )

);


print(
  'January Hotspot Threshold (P95):',
  januaryP95
);


// January hotspot mask
var januaryHotspots = januaryNO2

  .gt(januaryP95)

  .selfMask();


Map.addLayer(
  januaryNO2,
  no2Vis,
  'Mean NO2 - January 2020',
  false
);


Map.addLayer(
  januaryHotspots,
  {
    palette: ['red']
  },
  'January Hotspots (> P95)',
  false
);


// ============================================================
// 8. MONTHLY TEMPORAL ANALYSIS - 2020
// ============================================================

var months = ee.List.sequence(
  1,
  12
);


var monthlyNO2 = ee.FeatureCollection(

  months.map(function(month) {


    var start = ee.Date.fromYMD(
      YEAR,
      month,
      1
    );


    var end = start.advance(
      1,
      'month'
    );


    // Monthly mean NO2 image
    var monthlyMean = no2

      .filterDate(
        start,
        end
      )

      .mean()

      .clip(sriLanka);


    // National spatial mean
    var nationalMean = monthlyMean.reduceRegion({

      reducer: ee.Reducer.mean(),

      geometry: sriLanka.geometry(),

      scale: SCALE,

      maxPixels: 1e9

    }).get(BAND);


    return ee.Feature(
      null,
      {

        month: month,

        month_name:
          start.format('MMM'),

        mean_NO2:
          nationalMean

      }
    );

  })

);


print(
  'Monthly NO2 Statistics:',
  monthlyNO2
);


// ============================================================
// 9. MONTHLY NO2 TIME-SERIES CHART
// ============================================================

var monthlyChart =
  ui.Chart.feature.byFeature({

    features:
      monthlyNO2,

    xProperty:
      'month_name',

    yProperties:
      ['mean_NO2']

  })


  .setChartType(
    'LineChart'
  )


  .setOptions({

    title:
      'Monthly Mean NO₂ Column Density - Sri Lanka (2020)',


    hAxis: {

      title:
        'Month'

    },


    vAxis: {

      title:
        'NO₂ Column Density (mol/m²)',

      format:
        '0.00000'

    },


    lineWidth:
      2,


    pointSize:
      5,


    legend: {

      position:
        'none'

    }

  });


print(
  monthlyChart
);


// ============================================================
// 10. MONTHLY NO2 RANKING
// ============================================================

var rankedMonths = monthlyNO2

  .sort(
    'mean_NO2',
    false
  );


var highestMonth = ee.Feature(
  rankedMonths.first()
);


var lowestMonth = ee.Feature(

  monthlyNO2

    .sort(
      'mean_NO2',
      true
    )

    .first()

);


var highestValue = ee.Number(
  highestMonth.get('mean_NO2')
);


var lowestValue = ee.Number(
  lowestMonth.get('mean_NO2')
);


var monthlyIncreasePct = highestValue

  .subtract(
    lowestValue
  )

  .divide(
    lowestValue
  )

  .multiply(
    100
  );


print(
  'Highest NO2 Month:',
  highestMonth.get('month_name')
);


print(
  'Highest Monthly Mean NO2:',
  highestValue
);


print(
  'Lowest NO2 Month:',
  lowestMonth.get('month_name')
);


print(
  'Lowest Monthly Mean NO2:',
  lowestValue
);


print(
  'Increase from Lowest to Highest Month (%):',
  monthlyIncreasePct
);


// ============================================================
// 11. MONTHLY HOTSPOT DETECTION
// ============================================================
//
// Each month receives its own P95 threshold.
//
// Pixel = 1
// if monthly NO2 > that month's P95.
//
// Pixel = 0
// otherwise.
//
// ============================================================

var monthlyHotspots =
  ee.ImageCollection.fromImages(


    months.map(function(month) {


      var start =
        ee.Date.fromYMD(
          YEAR,
          month,
          1
        );


      var end =
        start.advance(
          1,
          'month'
        );


      // Monthly mean
      var monthlyMean = no2

        .filterDate(
          start,
          end
        )

        .mean()

        .clip(
          sriLanka
        );


      // Monthly P95 threshold
      var monthlyP95 =
        ee.Number(


          monthlyMean.reduceRegion({

            reducer:
              ee.Reducer.percentile(
                [HOTSPOT_PERCENTILE]
              ),

            geometry:
              sriLanka.geometry(),

            scale:
              SCALE,

            maxPixels:
              1e9

          }).get(BAND)

        );


      // Binary hotspot image
      var hotspot = monthlyMean

        .gt(
          monthlyP95
        )

        .rename(
          'hotspot'
        )

        .unmask(
          0
        );


      return hotspot.set({

        month:
          month,

        'system:time_start':
          start.millis()

      });


    })

  );


// ============================================================
// 12. HOTSPOT FREQUENCY
// ============================================================
//
// Sum the 12 monthly hotspot masks.
//
// Result:
// 0 = never hotspot
// 12 = hotspot every month
//
// ============================================================

var hotspotFrequency =
  monthlyHotspots

    .sum()

    .clip(
      sriLanka
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
// 13. MAXIMUM HOTSPOT PERSISTENCE
// ============================================================

var maxPersistence =
  hotspotFrequency.reduceRegion({

    reducer:
      ee.Reducer.max(),

    geometry:
      sriLanka.geometry(),

    scale:
      SCALE,

    maxPixels:
      1e9

  });


print(

  'Maximum Hotspot Persistence (months):',

  maxPersistence.get(
    'hotspot'
  )

);


// ============================================================
// 14. PERSISTENT HOTSPOTS
// ============================================================
//
// Operational definition used in this project:
//
// Persistent hotspot =
// pixel classified above the monthly P95
// in >= 6 months during 2020.
//
// ============================================================

var persistentHotspots =
  hotspotFrequency

    .gte(
      PERSISTENCE_MONTHS
    )

    .selfMask();


Map.addLayer(

  persistentHotspots,

  {
    palette:
      ['red']
  },

  'Persistent NO2 Hotspots (>= 6 months)'

);


// ============================================================
// 15. NATIONAL PERSISTENT HOTSPOT AREA
// ============================================================

var pixelAreaKm2 =
  ee.Image.pixelArea()

    .divide(
      1e6
    );


var persistentAreaKm2 =
  ee.Number(


    pixelAreaKm2

      .updateMask(
        persistentHotspots
      )

      .reduceRegion({

        reducer:
          ee.Reducer.sum(),

        geometry:
          sriLanka.geometry(),

        scale:
          SCALE,

        maxPixels:
          1e9

      })

      .get(
        'area'
      )

  );


// Total mapped area
var totalAreaKm2 =
  ee.Number(


    pixelAreaKm2.reduceRegion({

      reducer:
        ee.Reducer.sum(),

      geometry:
        sriLanka.geometry(),

      scale:
        SCALE,

      maxPixels:
        1e9

    })

    .get(
      'area'
    )

  );


var persistentCoveragePct =
  persistentAreaKm2

    .divide(
      totalAreaKm2
    )

    .multiply(
      100
    );


print(
  'Persistent Hotspot Area (km²):',
  persistentAreaKm2
);


print(
  'Persistent Hotspot Coverage (%):',
  persistentCoveragePct
);


// ============================================================
// 16. DISTRICT-LEVEL ANNUAL MEAN NO2
// ============================================================

var districtNO2 =
  annualNO2.reduceRegions({

    collection:
      districts,

    reducer:
      ee.Reducer.mean(),

    scale:
      SCALE

  })


  .map(function(feature) {


    return feature.set(

      'mean_NO2_2020',

      feature.get(
        'mean'
      )

    );


  });


// Rank districts
var districtRanking =
  districtNO2.sort(

    'mean_NO2_2020',

    false

  );


var highestNO2District =
  ee.Feature(

    districtRanking.first()

  );


print(

  'Highest Mean-NO2 District:',

  highestNO2District.get(
    'ADM2_NAME'
  )

);


print(

  'District Mean NO2:',

  highestNO2District.get(
    'mean_NO2_2020'
  )

);


// ============================================================
// 17. PERSISTENT HOTSPOT AREA BY DISTRICT
// ============================================================

var persistentAreaImage =
  pixelAreaKm2

    .updateMask(
      persistentHotspots
    )

    .rename(
      'persistent_hotspot_km2'
    );


var districtHotspotArea =
  persistentAreaImage.reduceRegions({

    collection:
      districts,

    reducer:
      ee.Reducer.sum(),

    scale:
      SCALE

  });


districtHotspotArea =
  districtHotspotArea.map(

    function(feature) {


      return feature.set(

        'hotspot_area_km2',

        feature.get(
          'sum'
        )

      );


    }

  );


// Rank by absolute hotspot area
var hotspotAreaRanking =
  districtHotspotArea.sort(

    'hotspot_area_km2',

    false

  );


var largestAreaDistrict =
  ee.Feature(

    hotspotAreaRanking.first()

  );


print(

  'Largest Persistent-Hotspot-Area District:',

  largestAreaDistrict.get(
    'ADM2_NAME'
  )

);


print(

  'Persistent Hotspot Area (km²):',

  largestAreaDistrict.get(
    'hotspot_area_km2'
  )

);


// ============================================================
// 18. PERSISTENT HOTSPOT COVERAGE BY DISTRICT
// ============================================================

var districtHotspotCoverage =
  districtHotspotArea.map(

    function(feature) {


      // District area
      var districtAreaKm2 =
        feature.geometry()

          .area()

          .divide(
            1e6
          );


      // Hotspot area
      var hotspotAreaKm2 =
        ee.Number(

          feature.get(
            'hotspot_area_km2'
          )

        );


      // Percentage
      var hotspotPercentage =
        hotspotAreaKm2

          .divide(
            districtAreaKm2
          )

          .multiply(
            100
          );


      return feature.set({

        district_area_km2:
          districtAreaKm2,

        hotspot_percentage:
          hotspotPercentage

      });


    }

  );


var hotspotCoverageRanking =
  districtHotspotCoverage.sort(

    'hotspot_percentage',

    false

  );


var highestCoverageDistrict =
  ee.Feature(

    hotspotCoverageRanking.first()

  );


print(

  'Highest Persistent-Hotspot-Coverage District:',

  highestCoverageDistrict.get(
    'ADM2_NAME'
  )

);


print(

  'District Area (km²):',

  highestCoverageDistrict.get(
    'district_area_km2'
  )

);


print(

  'Persistent Hotspot Area (km²):',

  highestCoverageDistrict.get(
    'hotspot_area_km2'
  )

);


print(

  'Persistent Hotspot Coverage (%):',

  highestCoverageDistrict.get(
    'hotspot_percentage'
  )

);


// ============================================================
// 19. TOP 10 DISTRICTS BY MEAN NO2
// ============================================================

var districtNO2Chart =
  ui.Chart.feature.byFeature({

    features:
      districtRanking.limit(10),

    xProperty:
      'ADM2_NAME',

    yProperties:
      ['mean_NO2_2020']

  })


  .setChartType(
    'BarChart'
  )


  .setOptions({

    title:
      'Top 10 Districts by Mean NO₂ Column Density - 2020',


    hAxis: {

      title:
        'Mean NO₂ Column Density (mol/m²)',

      format:
        '0.00000'

    },


    vAxis: {

      title:
        'District'

    },


    legend: {

      position:
        'none'

    },


    bar: {

      groupWidth:
        '70%'

    }

  });


print(
  districtNO2Chart
);


// ============================================================
// 20. TOP 10 DISTRICTS BY HOTSPOT COVERAGE
// ============================================================

var hotspotCoverageChart =
  ui.Chart.feature.byFeature({

    features:
      hotspotCoverageRanking.limit(10),

    xProperty:
      'ADM2_NAME',

    yProperties:
      ['hotspot_percentage']

  })


  .setChartType(
    'BarChart'
  )


  .setOptions({

    title:
      'Top 10 Districts by Persistent NO₂ Hotspot Coverage - 2020',


    hAxis: {

      title:
        'Persistent Hotspot Coverage (%)',

      viewWindow: {

        min:
          0,

        max:
          100

      }

    },


    vAxis: {

      title:
        'District'

    },


    legend: {

      position:
        'none'

    },


    bar: {

      groupWidth:
        '70%'

    }

  });


print(
  hotspotCoverageChart
);


// ============================================================
// 21. DISTRICT-LEVEL NO2 CHOROPLETH
// ============================================================

var districtNO2Image =
  districtNO2.reduceToImage({

    properties:
      ['mean_NO2_2020'],

    reducer:
      ee.Reducer.first()

  })

  .clip(
    sriLanka
  );


Map.addLayer(

  districtNO2Image,

  districtNO2Vis,

  'District Mean NO2 - 2020'

);


// District boundaries
Map.addLayer(

  districts.style({

    color:
      'white',

    fillColor:
      '00000000',

    width:
      1

  }),

  {},

  'District Boundaries'

);


// ============================================================
// 22. DISTRICT NO2 LEGEND
// ============================================================

var districtLegend =
  ui.Panel({

    style: {

      position:
        'bottom-right',

      padding:
        '8px 15px'

    }

  });


districtLegend.add(

  ui.Label({

    value:
      'District Mean NO₂ - 2020 (mol/m²)',

    style: {

      fontWeight:
        'bold',

      fontSize:
        '14px',

      margin:
        '0 0 6px 0'

    }

  })

);


var districtColorBar =
  ui.Thumbnail({

    image:
      ee.Image.pixelLonLat()

        .select(
          'longitude'
        )

        .multiply(
          (districtNO2Vis.max -
           districtNO2Vis.min) / 100
        )

        .add(
          districtNO2Vis.min
        ),


    params: {

      bbox:
        [0, 0, 100, 10],

      dimensions:
        '250x20',

      format:
        'png',

      min:
        districtNO2Vis.min,

      max:
        districtNO2Vis.max,

      palette:
        districtNO2Vis.palette

    },


    style: {

      stretch:
        'horizontal',

      margin:
        '0px 8px',

      maxHeight:
        '24px'

    }

  });


districtLegend.add(
  districtColorBar
);


districtLegend.add(

  ui.Panel({

    widgets: [

      ui.Label(
        '0.00004'
      ),


      ui.Label(

        '0.000055',

        {

          textAlign:
            'center',

          stretch:
            'horizontal'

        }

      ),


      ui.Label(
        '0.00007'
      )

    ],


    layout:
      ui.Panel.Layout.flow(
        'horizontal'
      )

  })

);


Map.add(
  districtLegend
);


// ============================================================
// 23. HOTSPOT FREQUENCY LEGEND
// ============================================================

var frequencyLegend =
  ui.Panel({

    style: {

      position:
        'bottom-left',

      padding:
        '8px 15px'

    }

  });


frequencyLegend.add(

  ui.Label({

    value:
      'NO₂ Hotspot Frequency (months)',

    style: {

      fontWeight:
        'bold',

      fontSize:
        '14px'

    }

  })

);


var frequencyBar =
  ui.Thumbnail({

    image:
      ee.Image.pixelLonLat()

        .select(
          'longitude'
        )

        .multiply(
          11 / 100
        )

        .add(
          1
        ),


    params: {

      bbox:
        [0, 0, 100, 10],

      dimensions:
        '250x20',

      format:
        'png',

      min:
        1,

      max:
        12,

      palette: [

        'yellow',
        'orange',
        'red',
        'darkred'

      ]

    },


    style: {

      stretch:
        'horizontal',

      margin:
        '6px 8px'

    }

  });


frequencyLegend.add(
  frequencyBar
);


frequencyLegend.add(

  ui.Panel({

    widgets: [

      ui.Label(
        '1 month'
      ),


      ui.Label(

        '6 months',

        {

          textAlign:
            'center',

          stretch:
            'horizontal'

        }

      ),


      ui.Label(
        '12 months'
      )

    ],


    layout:
      ui.Panel.Layout.flow(
        'horizontal'
      )

  })

);


Map.add(
  frequencyLegend
);


// ============================================================
// 24. FINAL MAP VIEW
// ============================================================

Map.centerObject(
  sriLanka,
  7
);
