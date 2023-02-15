// jshint node: true, esversion: 6
'use strict';

/******************************************************************************
index.js main - entry point for app
******************************************************************************/

var express       = require('express'),
    app           = express(),
    db            = require('./models/'),
    pkg           = require('./package.json'),
    config        = require('./config/'),
    logger        = require('./logs/'),
    bp            = require('body-parser'),
    { DateTime }  = require('luxon'),
    bars          = require('express-handlebars');

app.engine('.hbs', bars.engine({
  defaultLayout: 'layout', extname: '.hbs'
}));
app.set('view engine', '.hbs');

require('dotenv').config(); // load env variables

// set static route
app.use(express.static('assets'));
// use body-parser to get post data
app.use(bp.urlencoded({ extended: false }));
app.use(bp.json());

app.use((req, res, next) => {
  res.locals.ver = pkg.version;
  res.locals.app = pkg.name;
  res.locals.env = process.env.OSCAR_ENV;
  res.locals.deadline = DateTime.fromJSDate(config.deadline).toLocaleString(DateTime.DATETIME_FULL);
  next();
})

app.locals.tmdb_base_url = 'https://image.tmdb.org/t/p/';
app.locals.tmdb_poster_size = 'w300/';
app.locals.tmdb_backdrop_size = 'w1280/';
app.set('port', process.env.PORT || 2009); // a good year for bacall

// pull in the different routes
require('./routes')(app);

// start the server
db.conn( err => {
  console.log(`----------| ${ pkg.name } started |----------`);
  if (err) {
    console.log(`database: Error - can't connect`);
  } else {
    db.use().promise().query('SELECT DATABASE();').then(rows => {
      console.log('Database  :', rows[0][0]['DATABASE()']);
      app.listen(app.get('port'), () => {
        console.log(`System up : ${ DateTime.now().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS) } `)
        console.log(`Port      : ${ app.get('port') }`);
        logger.info(`Server started (${ pkg.name })`);
        console.log(`exp_test  : ${ config.exp_test }`);
        console.log(`--------------------------------------`);
      })
    });
  }
})
