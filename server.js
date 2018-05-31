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
  let rtnObj = {
    historyData: [],
    years:[],
  };
  rtnObj.calcYears = function(dateStr) {
    for(let i = 1; i < 3; i++) {
      let year = parseInt(dateStr.split('-')[0]) - i;
      rtnObj.years.push(dateStr.replace(/^\d{1,4}/g, year.toString()));
    }
  };
  rtnObj.calcYears(req.query.date);
//   console.log(rtnObj)

  superagent.get(geoCodeUrl)
    .query({address: req.query.location})
    .query({key: MAP_API_KEY})
    .then(data => {
      rtnObj.address = data.body.results[0].formatted_address;
      rtnObj.latitude = data.body.results[0].geometry.location.lat;
      rtnObj.longitude = data.body.results[0].geometry.location.lng;
      // console.log(rtnObj)
      return rtnObj;
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
      promiseArr.forEach(element => rtnObj.historyData.push(element.body));
      console.log(rtnObj);
      res.send(rtnObj);
    });
});

// Using UNIX time for Dark Sky API
// app.get('/api/v1/location', (req, res) => {
//   console.log(req.query);
//   let geoCodeUrl =`https://maps.googleapis.com/maps/api/geocode/json`;
//   let timeZoneUrl = '';
//   let darkSkyUrl = `https://api.darksky.net/forecast/${SKY_API_KEY}/`;
//   let rtnObj = {};
//   rtnObj.historyData = [];
//   rtnObj.calcUnixTime = function(obj) {
//     let arr = obj.query.date.split('-').map(Number);
//     this.unixTime = (arr[0] - 1970) * 31556926 + (arr[1] - 1) * 2629743 + (arr[2] - 1) * 86400;
//   };
//   rtnObj.calcUnixTime(req);
//   // console.log(rtnObj);

//   superagent.get(geoCodeUrl)
//     .query({address: req.query.location})
//     .query({key: MAP_API_KEY})
//     // .then(data => console.log(data.body.results[0].geometry.location))
//     .then(data => {
//     //   console.log(data.body.results[0]);
//       rtnObj.address = data.body.results[0].formatted_address;
//       rtnObj.latitude = data.body.results[0].geometry.location.lat;
//       rtnObj.longitude = data.body.results[0].geometry.location.lng;
//       timeZoneUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${rtnObj.latitude},${rtnObj.longitude}`;
//       return rtnObj;
//     })
//     .then(obj => {
//       superagent.get(timeZoneUrl)
//         .query({timestamp: obj.unixTime})
//         .query({key: MAP_API_KEY})
//         // .then(data => console.log(data.body.rawOffset))
//         .then( data => {
//         //   console.log('before'+obj.unixTime)
//           obj.unixTime = obj.unixTime + data.body.dstOffset + data.body.rawOffset;
//           console.log('after adddition'+obj.unixTime)
//           return obj;
//         })
//         .then(obj => {
//           for(let i = 1; i < 2; i++) {
//             superagent.get(`${darkSkyUrl}${obj.latitude},${obj.longitude},${obj.unixTime - 31556926 * i}`)
//               .then(data => console.log(data.body))
//           }
//         })
//         //       .then(data => obj.historyData.push(data))
//         //   }
//         // });
//     })
//     // .then(obj => {
//     //   console.log('objjjjjjjjj',obj);
//     //   res.send(obj)
//     // })
//     .catch(console.error);
// });



// // app.get('/api/v1/weather', (req, res) => {
// //   let url = 'https://www.ncdc.noaa.gov/cdo-web/api/v2/data?datasetid=GHCND';
// //   let query = '';

// //   if(req.query.date) query += `&startdate=${req.query.date}&enddate=${req.query.date}`
// //   if(req.query.zipCode) query += `&locationid=ZIP:${req.query.zipCode}`;
// //   // if(req.query.userLocation) query += `&locationid=`
// //   superagent.get(url)
// //     .query({'q': query})
// //     .query({'key': API_KEY})
// //     .then(console.log);
// // });

app.get('*', (req, res) => res.status(403).send('This route does not exist'));

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));


// export PORT=3000
// Mac:     export DATABASE_URL=postgres://localhost:5432/rainParade
// Windows: export DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/rainParade