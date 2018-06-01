'use strict';

// Require Dependencies
const express = require('express');
const cors = require('cors');
const pg = require('pg');
const superagent = require('superagent');

//Application Set Up
const app = express();
const PORT = process.env.PORT;

//Sets up API_Key
const MAP_API_KEY = process.env.MAP_API_KEY;
const SKY_API_KEY = process.env.SKY_API_KEY;

//Connects to Database
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true})); // body parser


app.get('/test', (req, res) => res.send('hello world'));

// Using time as srting for Dark Sky API
app.get('/api/v1/location', (req, res) => {
  // console.log(req.query)
  let geoCodeUrl =`https://maps.googleapis.com/maps/api/geocode/json`;
  let darkSkyUrl = `https://api.darksky.net/forecast/${SKY_API_KEY}/`;
  let holdObj = {
    historyData: [],
    years:[],
  };
  holdObj.calcYears = function(dateStr) {
    for(let i = 1; i < 3; i++) {
      let year = parseInt(dateStr.split('-')[0]) - i;
      holdObj.years.push(dateStr.replace(/^\d{1,4}/g, year.toString()));
    }
  };
  holdObj.calcYears(req.query.date);

  superagent.get(geoCodeUrl)
    .query({address: req.query.location})
    .query({key: MAP_API_KEY})
    .then(data => {
      holdObj.address = data.body.results[0].formatted_address;
      holdObj.latitude = data.body.results[0].geometry.location.lat;
      holdObj.longitude = data.body.results[0].geometry.location.lng;
      // console.log(holdObj)
      return holdObj;
    })
    .then(obj => {
      let promises = [];
      for (let i = 0; i < obj.years.length; i++) {
        promises.push(
          superagent.get(darkSkyUrl+`${obj.latitude},${obj.longitude},${obj.years[i]}T12:00:00?exclude=flags,hourly`)
        );
      }
      return Promise.all(promises);
    })
    .then(promiseArr => {
      promiseArr.forEach(element => holdObj.historyData.push(element.body));
      console.log(holdObj);
      let rtnObj = {
        address: holdObj.address,
        date: req.query.date,
        years: holdObj.years,
        summary: [],
        precipProbability: [],
        temperatureHigh: [],
        temperatureLow: [],
      };
      holdObj.historyData.forEach(obj => {
        rtnObj.summary.push(obj.daily.data[0].summary);
        rtnObj.precipProbability.push(obj.daily.data[0].precipProbability);
        rtnObj.temperatureHigh.push(obj.daily.data[0].temperatureHigh);
        rtnObj.temperatureLow.push(obj.daily.data[0].temperatureLow);
      });
      console.log(rtnObj)
      res.send(rtnObj);
    });
});

app.post('/api/v1/weather', (req, res) => {
  let {address, date, avg_temp, rainy_days} = req.body;
  let SQL = `INSERT INTO returned_weather (address, date, avg_temp, rainy_days) VALUES($1, $2, $3, $4);`
  let VALUES = [address, date, avg_temp, rainy_days];
  client.query(SQL, VALUES)
  .then(() => res.sendStatus(201))
  .catch(console.error);
});

app.get('/api/v1/searchhistory', (req, res) => {
  let SQL = `SELECT * FROM returned_weather;`;
  client.query(SQL)
  .then(results => res.send(results.rows))
  .catch(console.error);
});

app.get('*', (req, res) => res.status(403).send('This route does not exist'));

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));


// export PORT=3000
// Mac:     export DATABASE_URL=postgres://localhost:5432/rainParade
// Windows: export DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/rainParade