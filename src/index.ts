const got = require('got');
const writeJsonFile = require('write-json-file');
const { format } = require('date-fns');

const HISTORIC_TIMESERIES_FILE = './data/timeseries.json';
const REALTIME_SNAPSHOT_BY_COUNTRY_FILE = './data/realtime_by_country.json';
const REALTIME_TIMESERIES_BY_COUNTRY_FILE = './data/realtime_timeseries_by_country.json';

(async () => {
  
	try {

    console.log('  ⏳Downloading historic timeseries data..');
    const response = await got('https://pomber.github.io/covid19/timeseries.json');
    const timeseries = response.body;
    const timeseriesJson = JSON.parse(timeseries);
    await writeJsonFile(HISTORIC_TIMESERIES_FILE, timeseriesJson, { indent: '  '});
    console.log('    ✅Saved historic timeseries data..');


    console.log('  ⏳Downloading realtime data..');
    const arcgisReponse = await got(
      'https://services9.arcgis.com/N9p5hsImWXAccRNI/arcgis/rest/services/Nc2JKvYFoAEOFCG5JSI6/FeatureServer/2/query?f=json&where=1%3D1&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&orderByFields=Confirmed%20desc&resultOffset=0&resultRecordCount=190&cacheHint=true',
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': '*/*',
          'referer': 'https://www.arcgis.com/apps/opsdashboard/index.html',
          'origin': 'https://www.arcgis.com'
        }
      }
    );
    const realtimeData = arcgisReponse.body;
    const realtimeDataJson = JSON.parse(realtimeData);
    const currentDate = format(new Date(), 'yyyy-M-d');
    const realtimeDataByCountry = {};
    for (const countryStats of realtimeDataJson.features) {
      realtimeDataByCountry[countryStats.attributes.Country_Region] = {
        date: currentDate,
        confirmed: countryStats.attributes.Confirmed,
        deaths: countryStats.attributes.Deaths,
        recovered: countryStats.attributes.Recovered
      };
    }
    await writeJsonFile(REALTIME_SNAPSHOT_BY_COUNTRY_FILE, realtimeDataByCountry, { indent: '  '});
    console.log('    ✅Saved realtime data..');


    console.log('  ⏳Creating realtime timeseries data..');
    const realtimeTimeseriesByCountryJson = JSON.parse(timeseries);
    const timeseriesKeys = Object.keys(timeseriesJson);

    for (const country of timeseriesKeys) {
      const timeseriesArray = realtimeTimeseriesByCountryJson[country];
      const lastTimeRecord = timeseriesArray[timeseriesArray.length - 1];

      // Update the last record if the current date matches
      if (lastTimeRecord.confirmed < realtimeDataByCountry[country].confirmed) {
        if (lastTimeRecord.date === currentDate) {
          lastTimeRecord.confirmed = realtimeDataByCountry[country].confirmed;
          lastTimeRecord.deaths = realtimeDataByCountry[country].deaths;
          lastTimeRecord.recovered = realtimeDataByCountry[country].recovered;
        }
        
        // Otherwise add the record to the end of the list
        else {
          timeseriesArray.push(realtimeDataByCountry[country]);
        }
      }

    }
    await writeJsonFile(REALTIME_TIMESERIES_BY_COUNTRY_FILE, realtimeTimeseriesByCountryJson, { indent: '  '});
    console.log('    ✅Saved realtime timeseries data..');

	} catch (error) {
		console.log('ERROR!', error);
  }

})();

