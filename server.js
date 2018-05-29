'use strict';

// Require Dependencies
const express = require('express');
const cors = require('cors');
const pg = require('pg');
const superagent = require('superagent');

//Application Set Up
const app = express();
const PORT = process.env.PORT;
const TOKEN = process.env.TOKEN;

//Sets up API_Key
const API_KEY = process.env.NOAA_API_KEY;

//Connects to Database
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true})); // body parser


app.get('/test', (req, res) => res.send('hello world'))


app.get('*', (req, res) => res.status(403).send('This route does not exist'));

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));


// export PORT=3000
// Mac:     export DATABASE_URL=postgres://localhost:5432/rainParade
// Windows: export DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/rainParade