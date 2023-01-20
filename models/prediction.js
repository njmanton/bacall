// jshint node: true, esversion: 6
'use strict';

const db = require('../models/'),
      logger = require('winston'),
      moment = require('moment'),
      config = require('../config/');

const pred = {

  // simple query to get list of categories and their ids
  list: done => {
    const sql = 'SELECT id, name, class, lastyear, precursors FROM categories';
    db.use().promise().query(sql).then(([rows, fields]) => {
      done(rows);
    }).catch(err => {
      console.log(err);
      done({ error: true });
    })
  },

  preds: (uid, cid, done) => {
    const sql = 'SELECT N.image, N.film, N.id AS nid, N.name AS nominee, N.tmdb_id AS tmdb, (I.nominee_id > 0) AS pred FROM nominees N JOIN categories C ON N.category_id = C.id LEFT JOIN (SELECT category_id, nominee_id FROM predictions P WHERE user_id = ?) I ON (I.category_id = C.id AND I.nominee_id = N.id) WHERE C.id = ? ORDER BY nid';
    db.use().promise().query(sql, [uid, cid]).then(([rows, fields]) => {
      done(rows);
    }).catch(err => {
      console.log(err);
      logger.error(`Error retrieving predictions for user_id: ${ uid }`);
      done(err);
    })
  },

  pie: (cid, done) => {
    const sql = 'SELECT N.name, COUNT(N.id) AS y FROM nominees N INNER JOIN predictions P ON P.nominee_id = N.id WHERE P.category_id = ? GROUP BY N.name ORDER BY 2 DESC';
    db.use().query(sql, cid, (err, rows) => {
      done(rows);
    })
  },

  summary: (code, done) => {
    let sql = 'SELECT id, username FROM users WHERE id = ?';
    db.use().query(sql, code, (err, rows) => {
      const uid = rows && rows[0] ? rows[0].id : null;
      const un = rows && rows[0] ? rows[0].username : null;
      sql = 'SELECT N.name AS prediction, N.id AS pid, N.image AS pimage, C.name AS category, C.id AS cid, P.score AS pts, W.name AS winner, W.id AS wid, W.image AS wimage FROM predictions P INNER JOIN nominees N ON P.nominee_id = N.id LEFT JOIN categories C ON P.category_id = C.id LEFT JOIN nominees W ON C.winner_id = W.id WHERE P.user_id = ?';
      db.use().query(sql, code, (err, rows) => {
        if (err || !rows.length) {
          done({ err: 'no data' })
        } else {
          let score = 0;
          for (let x = 0; x < rows.length; x++) {
            rows[x].pts = Math.round(rows[x].pts * 100) / 100;
            score += rows[x].pts;
            //rows[x].prediction = rows[x].prediction.replace(' ', '<br />');
          }
          done({
            table: rows,
            total: score.toFixed(2),
            username: un
          });
        }
      });
    })
  },

  save: (body, done) => {
    if (body.cid && body.uid && body.nid && (new Date() < config.deadline) && !config.exp_test) {
      // first see if there's an existing row
      var sql = 'SELECT id FROM predictions WHERE user_id = ? AND category_id = ?';
      db.use().query(sql, [body.uid, body.cid], (err, rows) => {
        let now = moment().format('YYYY-MM-DD HH:mm:ss');
        if (rows && rows.length) { // row exists so update
          db.use().query('UPDATE predictions SET ? WHERE id = ?', [{ user_id: body.uid, category_id: body.cid, nominee_id: body.nid, updated: now }, rows[0].id], (err, rows) => {
            logger.info(`Prediction updated: uid:${ body.uid } | cid:${ body.cid } | nid:${ body.nid }`);
            done((rows) ? rows.affectedRows.toString() : false);
          })
        } else { // row doesn't exist so insert
          db.use().query('INSERT INTO predictions SET ?', { user_id: body.uid, category_id: body.cid, nominee_id: body.nid, updated: now }, (err, rows) => {
            logger.info(`Prediction created: uid:${ body.uid } | cid:${ body.cid } | nid:${ body.nid }`);
            done((rows) ? rows.affectedRows.toString() : false);
          })
        }
      })
    } else {
      // parameters not properly sent
      done(false);
    }

  },

  category: (cat, done) => {
    // get all predictions by nominee for a given category
    const sql = 'SELECT N.id, N.name, N.image, COUNT(P.id) AS cnt, (C.winner_id = N.id) AS winner FROM predictions P JOIN nominees N ON N.id = P.nominee_id JOIN categories C ON C.id = P.category_id WHERE P.category_id = ? GROUP BY N.id ORDER BY cnt DESC';
    db.use().query(sql, cat, (err, rows) => {
      if (err) {
        done(err);
      } else {
        done(rows);
      }
    })
  },

  categoryDetails: (cat, done) => {
    // return object to render category view
    let data = { winner: null, noms: null },
        preds  = 'SELECT U.username, N.name, (C.winner_id = N.id) AS winner FROM nominees N LEFT JOIN predictions P on P.nominee_id = N.id LEFT JOIN categories C on N.category_id = C.id LEFT JOIN users U on U.id = P.user_id WHERE N.category_id = ? ORDER BY winner DESC, name ASC',
        winner = 'SELECT C.id AS cid, C.class, C.name AS category, C.lastyear, N.id, N.tmdb_id AS tmdb, N.name AS name, N.film, N.image FROM categories C LEFT JOIN nominees N ON C.winner_id = N.id WHERE C.id = ?';

    db.use().query(winner, cat, (err, rows) => {
      if (err) {
        console.log(err);
        done(err);
      } else {
        data.winner = rows[0];
        db.use().query(preds, cat, (err, rows) => {
          if (err) {
            done(err);
          } else {
            let prev = null,
                arr = {};
            for (let i = 0; i < rows.length; i++) {
              let name = rows[i].name;
              if (!(name in arr)) {
                arr[name] = {
                  winner: rows[i].winner,
                  cnt: 0,
                  noms: []
                }
              }
              if (rows[i].username) {
                arr[name].noms.push(rows[i].username);
                arr[name].cnt++;
              }
            }
            data.noms = arr;
            done(data);
          }
        })
      }
    })
  },

  categories: done => {
    // return list of unannounced categories for CLI
    const sql = 'SELECT id AS value, name FROM categories WHERE winner_id IS NULL';
    db.use().query(sql, (err, rows) => {
      if (err) {
        done(err);
      } else {
        done(rows);
      }
    })
  },

  nominees: (cat, done) => {
    // return list of nominees for a given category for CLI
    const sql = 'SELECT N.id AS value, N.name, C.name AS cat FROM nominees N JOIN categories C ON C.id = N.category_id WHERE category_id = ?';
    db.use().query(sql, cat, (err, rows) => {
      if (err) {
        done(err);
      } else {
        done(rows);
      }
    })
  },

  setWinner: (data, done) => {
    // sets the winner of a category and saves to database
    if (!process.env.OSCAR_ADMIN) {
      done({ err: true, msg: `permission denied` });
    } else {
      // data object should contain cid & nid
      db.use().query('UPDATE categories SET winner_id = ? WHERE id = ?', [data.nid, data.cid], (err, rows) => {
        if (err) {
          done({ err: true, msg: err })
        } else {
          // get the category/nominee names
          // then calculate score based on total predictions / correct predictions
          db.use().query('SELECT name FROM categories WHERE id = ?', data.cid, (cerr, cat) => {
            db.use().query('SELECT name FROM nominees WHERE id = ?', data.nid, (nerr, nom) => {
              db.use().query('SELECT COUNT(*)/SUM(nominee_id = winner_id) AS score FROM predictions P INNER JOIN categories C ON C.id = P.category_id WHERE C.id = ?', data.cid, (serr, value) => {
                const score = Math.pow((JSON.parse(JSON.stringify(value))[0].score),0.5).toFixed(2);
                // finally update all correct predictions with the score
                db.use().query('UPDATE predictions SET score = ? WHERE category_id = ? AND nominee_id = ?', [score, data.cid, data.nid], (err, rows) => {
                  logger.info(`Set winner of Best ${ cat[0].name } to ${ nom[0].name }`);
                  done({ err: false, msg: `The Oscar for ${ cat[0].name } goes to - ${ nom[0].name }\n${ rows.changedRows } prediction${ (rows.changedRows == 1) ? '' : 's' } correct, scoring ${ score }` });                 
                })
              })
            })
          })
        }
      })
    }
    
  },

  getWinner: (cat, done) => {
    db.use().query('SELECT C.id AS cid, C.name AS category, C.lastyear, N.id, N.name AS winner, N.film, N.image FROM categories C LEFT JOIN nominees N ON C.winner_id = N.id WHERE C.id = ?', cat, (err, rows) => {
      if (err) {
        done(err);
      } else {
        done(rows);
      }
    })

  },

  // calculate overall scores
  results: (nobots, done) => {
    const sql = `SELECT username AS player, U.id AS id, bot, ROUND(SUM(score),2) AS score FROM predictions P INNER JOIN categories C ON C.id = P.category_id INNER JOIN users U ON U.id = P.user_id ${ (nobots) ? 'WHERE bot = 0': '' } GROUP BY username ORDER BY 4 DESC`;
    //console.log(sql);
    db.use().query(sql, (err, rows) => {
      let result = { error: null, data: null };
      if (err) {
        result.error = err;
      } else {
        result.data = rows;
        // loop through rows, assigning a rank
        let prev_score = 0, 
            rank = 1, 
            row = 0;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].score == prev_score) {
            row++;
          } else {
            rank = ++row;
          }
          prev_score = rows[i].score;
          rows[i].rank = rank;
        }
      }
      done(result);
    })
  }
}

module.exports = pred;
