// jshint node: true, esversion: 6
'use strict';

const key = process.env.TMDB_API,
      mdb = require('moviedb')(key),
      db  = require('../models/');

const tmdb = {

  // get random images, incl. backdrop for movie types for the winner
  images: (category, done) => {
    if (!category || category < 1 || category > 25) {
      done({ error: 'invalid category' });
    } else {
      const sql = 'SELECT C.class, C.name AS cname, C.winner_id, N.id, N.name AS wname, N.tmdb_id, COUNT(P.id) AS preds, SUM(P.nominee_id = C.winner_id) AS correct FROM categories C LEFT JOIN nominees N ON C.winner_id = N.id LEFT JOIN predictions P ON P.category_id = C.id WHERE C.id = ?;'
      db.use().query(sql, category, (err, rows) => {
        const winner = rows[0] || []; // get the winner data
        let data = {
          error:null, 
          poster: null, 
          backdrop: null,
          category: winner.cname,
          winner: winner.wname, 
          correct: winner.correct, 
          points: Math.round((winner.preds / winner.correct) * 100) / 100,
          singular: (winner.correct == 1)
        };

        if (winner.class == 0) { // nominee is a movie
          mdb.movieImages({ id: winner.tmdb_id }, (err, res) => {
            try {
              if (!res) throw new Error (`can't find that resource`);
              const idx = Math.floor(Math.random() * (res.backdrops.length - 1)),
                    idx2 = Math.floor(Math.random() * (res.posters.length - 1));
              data.poster = res.posters[idx2].file_path;
              data.backdrop = res.backdrops[idx].file_path;
              done(data);
            } catch(e) {
              data.error = e.message;
              done(data);
            }

          });
        } else if (winner.class == 1) { // nominee is a person 
          mdb.personImages({ id: winner.tmdb_id }, (err, res) => {
            try {
              if (!res) throw new Error(`can't find that resource`);
              const idx = Math.floor(Math.random() * (res.profiles.length - 1));
              data.poster = res.profiles[idx].file_path;
              done(data);
            } catch(e) {
              data.error = e.message;
              done(data);
            }
          });
        } else {
          data.error = 'no class';
          done(data);
        }
      });
    }
  }

}

module.exports = tmdb;
