// jshint node: true, esversion: 6
'use strict';

const key = process.env.TMDB_API;
const mdb = require('moviedb')(key);

const tmdb = {

  // get a path to a random image from tmdb
  // if a movie (item = 0), get a random poster and backdrop
  // if a person (item = 1), just return image
  images: (item, done) => {
    if (!item.id) {
      done({
        error: 'no id provided'
      });
    } else {
      if (item.type == 0) {
        mdb.movieImages({ id: item.id }, (err, res) => {

          try {
            const idx = Math.floor(Math.random() * (res.backdrops.length - 1)),
                  idx2 = Math.floor(Math.random() * (res.posters.length - 1));            
            done({
              poster: res.posters[idx2].file_path,
              backdrop: res.backdrops[idx].file_path,
            });            
          } catch(e) {
            console.log(e);
            done({ error: true });
          }

        })
      } else {
        mdb.personImages({ id: item.id }, (err, res) => {
          try {
            const idx = Math.floor(Math.random() * (res.profiles.length - 1));
            done({
              poster: res.profiles[idx].file_path,
              backdrop: null
            });
          } catch(e) {
            done({ error: true });
          }
        })
      }
    }

  }

}

module.exports = tmdb;
