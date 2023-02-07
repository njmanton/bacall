// jshint node: true, esversion: 6
'use strict';

const key = process.env.TMDB_API,
      mdb = require('moviedb')(key),
      logger = require('winston'),
      db  = require('../models/');

const tmdb = {

  // get random images, incl. backdrop for movie types for the winner
  images: (category, done) => {
    if (!category || category < 1 || category > 25) {
      done({ err: 'invalid category' });
    } else {
      const sql = 'SELECT C.class, C.name AS cname, C.winner_id, N.id, N.name AS wname, N.film AS film, N.tmdb_id, MIN(P.score) AS score, COUNT(P.id) AS preds, SUM(P.nominee_id = C.winner_id) AS correct FROM categories C LEFT JOIN nominees N ON C.winner_id = N.id LEFT JOIN predictions P ON P.category_id = C.id WHERE C.id = ? GROUP BY C.class, C.name, C.winner_id, N.id, N.tmdb_id;'
      db.use().promise().execute(sql, [category]).then(([rows,fields]) => {
        const winner = rows[0] || []; // get the winner data
        let data = {
          error:null, 
          poster: null, 
          backdrop: null,
          category: winner.cname,
          winner: winner.wname, 
          film: winner.film,
          correct: winner.correct * 1, 
          points: (winner.score * 1).toFixed(2),
          singular: (winner.correct == 1),
          preds: winner.preds
        };

        if (winner.class == 0 || winner.winner_id == 287) { // nominee is a movie (or multiple winners for EEAAO)
          mdb.movieImages({ id: winner.tmdb_id }, (err, res) => {
            try {
              if (!res) throw new Error (`can't find that resource`);
              const idx = Math.floor(Math.random() * (res.backdrops.length - 1)),
                    idx2 = Math.floor(Math.random() * (res.posters.length - 1));
              data.poster = res.posters[idx2].file_path;
              data.backdrop = res.backdrops[idx].file_path;
              done(data);
            } catch(e) {
              data.err = e.message;
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
              data.err = e.message;
              done(data);
            }
          });
        } else {
          data.error = 'no class';
          done(data);
        }
      }).catch(err => { 
        logger.error(`could not get image from db (${ err.code })`);
        done(false);  
      });
    }
  }

}

module.exports = tmdb;
