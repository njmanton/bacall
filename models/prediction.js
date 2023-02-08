// jshint node: true, esversion: 6
'use strict';

const db            = require('../models/'),
      logger        = require('winston'),
      fs            = require('fs'),
      { stringify } = require('csv-stringify'),
      config        = require('../config/');

 const pred = {

  list: done => {
    // simple query to get list of categories and their ids
    const sql = 'SELECT id, name, class, lastyear, precursors FROM categories';
    db.use().promise().query(sql).then(([rows, fields]) => {
      done(rows);
    }).catch(err => {
      logger.error(`Error in pred.list (${ err.code })`);
      done({ err: err.code });
    })
  },

  preds: async (code, cid, done) => {
    // get user id from code, then extract all pred for that player
    const sqlGetUid = 'SELECT id FROM users WHERE code = ? LIMIT 1';
    const sql = 'SELECT N.image, N.film, N.id AS nid, N.name AS nominee, N.tmdb_id AS tmdb, (I.nominee_id > 0) AS pred FROM nominees N JOIN categories C ON N.category_id = C.id LEFT JOIN (SELECT category_id, nominee_id FROM predictions P WHERE user_id = ?) I ON (I.category_id = C.id AND I.nominee_id = N.id) WHERE C.id = ? ORDER BY nid';
    try {
      const [row] = await db.use().promise().execute(sqlGetUid, [code]);
      if (!row.length) {
        throw new Error('No such user');
      }
      const uid = row[0].id;
      const [preds] = await db.use().promise().execute(sql, [uid, cid]);
      done([preds, uid]);
    } catch (error) {
      logger.error(`error in pred.preds (${ error.code })`)
      done({ err: error.message, code: error.code });
    }

  },

  pie: async (cid, done) => {
    const sql = 'SELECT N.name, COUNT(N.id) AS y FROM nominees N INNER JOIN predictions P ON P.nominee_id = N.id WHERE P.category_id = ? GROUP BY N.name ORDER BY 2 DESC';
    const x = await db.use().promise().execute(sql, [cid]);
    done(x[0]);
    // db.use().promise().execute(sql, [cid]).then(([rows, fields]) => {
    //   done(rows);
    // }).catch(err => {
    //   logger.error(`Error ${ err.code } retrieving pie chart data`);
    //   done(false);
    // })
  },

  // get a summary results table for a player. If 'type' is true, find by user.code otherwise user.id
  summary: (code, type, done) => {
    let sql = `SELECT id, username FROM users WHERE ${ (type) ? 'code' : 'id' } = ?`;
    db.use().promise().execute(sql, [code]).then(([rows, fields]) => {
      const un = rows && rows[0] ? rows[0].username : null;
      sql = 'SELECT N.name AS prediction, N.id AS pid, N.image AS pimage, C.name AS category, C.id AS cid, P.score AS pts, W.name AS winner, W.id AS wid, W.image AS wimage FROM predictions P INNER JOIN nominees N ON P.nominee_id = N.id LEFT JOIN categories C ON P.category_id = C.id LEFT JOIN nominees W ON C.winner_id = W.id WHERE P.user_id = ?';
      db.use().promise().execute(sql, [code]).then(([rows, fields]) => {
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
      }).catch(err => {
        done({ err: err.code });
      });
    }).catch(err => { 
      done({err: err.code }) });
  },

  save: (body, done) => {
    if (body.cid && body.uid && body.nid && (new Date() < config.deadline) && !config.exp_test) {
      // first see if there's an existing row
      var sql = 'SELECT id FROM predictions WHERE user_id = ? AND category_id = ?';
      db.use().promise().execute(sql, [body.uid, body.cid]).then(([rows, fields]) => {
        if (rows && rows.length) { // row exists so update
          db.use().promise().query('UPDATE predictions SET ? WHERE id = ?', [{ user_id: body.uid, category_id: body.cid, nominee_id: body.nid, updated: new Date() }, rows[0].id]).then(([rows, fields]) => {
            logger.info(`Prediction updated: uid:${ body.uid } | cid:${ body.cid } | nid:${ body.nid }`);
            done((rows) ? rows.affectedRows.toString() : false);
          }).catch(err => {
            logger.error(`Could not save prediction (${ err.code })`);
            done(false);
          })
        } else { // row doesn't exist so insert
          db.use().promise().query('INSERT INTO predictions SET ?', { user_id: body.uid, category_id: body.cid, nominee_id: body.nid, updated: new Date() }).then(([rows, fields]) => {
            logger.info(`Prediction created: uid:${ body.uid } | cid:${ body.cid } | nid:${ body.nid }`);
            done((rows) ? rows.affectedRows.toString() : false);
          }).catch(err => {
            logger.error(`Could not save prediction (${ err.code })`);
            done(false);
          })
        }
      }).catch(err => { 
        logger.error(`Could not save prediction (${ err.code })`);
        done(false); 
      })
    } else {
      // parameters not properly sent
      done(false);
    }

  },

  categories: async done => {
    // return list of unannounced categories for CLI
    try {
      const sql = 'SELECT id AS value, name FROM categories WHERE winner_id IS NULL';
      const [rows, fields] = await db.use().promise().query(sql);
      done(rows);
    } catch (err) {
      done({ err: err.code });
    }
  },

  nominees: (cat, done) => {
    // return list of nominees for a given category for CLI
    const sql = 'SELECT N.id AS value, N.name, C.name AS cat FROM nominees N JOIN categories C ON C.id = N.category_id WHERE category_id = ?';
    db.use().promise().execute(sql, [cat]).then(([rows, fields]) => {
        done(rows);
    }).catch(err => {})
  },

  setWinner: (data, order, done) => {
    // set the winner of a category and save to database
    // data is an array of [nominee_id, category_id]
    if (!process.env.OSCAR_ADMIN) {
      done({ err: 'Permission denied' });
    } else {
      db.use().promise().execute('UPDATE categories SET winner_id = ?, `order` = ?, UPDATED = ? WHERE id = ?', [data.nid, order, new Date(), data.cid]).then(([rows, fields]) => {
        const getCat = db.use().promise().execute('SELECT name FROM categories WHERE id = ?', [data.cid]),
              getNom = db.use().promise().execute('SELECT name FROM nominees WHERE id = ?', [data.nid]),
              getScore = db.use().promise().execute('SELECT COUNT(*)/SUM(nominee_id = winner_id) AS score FROM predictions P INNER JOIN categories C ON C.id = P.category_id WHERE C.id = ?', [data.cid]);
        Promise.all([getCat, getNom, getScore]).then((rows) => {
          const [cName, wName] = [rows[0][0][0].name, rows[1][0][0].name];
          const score = Math.pow((rows[2][0][0].score),0.5).toFixed(2);
          db.use().promise().execute('UPDATE predictions SET score = ? WHERE category_id = ? AND nominee_id = ?', [score, data.cid, data.nid]).then(([rows, fields]) => {
            logger.info(`Set winner of Best ${ cName } to ${ wName }`);
            done({ err: false, msg: `The Oscar for Best ${ cName } goes to: ${ wName }\n${ rows.affectedRows } prediction${ (rows.affectedRows == 1) ? '' : 's' } correct, scoring ${ score }` });
          })
        }).catch(err => { 
          logger.error(`Error in pred.setWinner (${ err.code })`)
          done({ err: err.code }); 
        })
      }).catch(err => { 
        logger.error(`Error in pred.setWinner (${ err.code })`)
        done({ err: err.code });
      })
    }
  },

  saveWinner: async done => {
    // save the current score state to a csv
    const sql = 'SELECT C.name AS cat, U.username AS user, P.score AS score FROM predictions AS P INNER JOIN categories AS C ON P.category_id = C.id INNER JOIN users AS U ON P.user_id = U.id WHERE C.winner_id IS NOT NULL ORDER BY U.id, C.order';
    try {
      const [rows, fields] = await db.use().promise().query(sql);
      stringify(rows, { quoted_string: true, header: true, columns: ['cat', 'user', 'score'] }, (err, records) => {
        fs.writeFileSync('./assets/js/live.csv', records);
        done(true);
      })
    } catch (error) {
      console.log(error.code);
      done(false);
    }

  },

  getWinner: (cat, done) => {
    const sql = 'SELECT C.id AS cid, C.name AS category, C.lastyear, N.id, N.name AS winner, N.film, N.image FROM categories C LEFT JOIN nominees N ON C.winner_id = N.id WHERE C.id = ?';
    db.use().promise().execute(sql, [cat]).then(([rows, fields]) => {
      done(rows);
    }).catch(err => {})
  },

  // calculate overall scores
  results: async done => {
    const sql = `SELECT username AS player, U.id AS id, bot, ROUND(SUM(score),2) AS score FROM predictions P INNER JOIN categories C ON C.id = P.category_id INNER JOIN users U ON U.id = P.user_id GROUP BY username ORDER BY 4 DESC`;
    let result = { error: null, data: null };
    try {
      const [rows, fields] = await db.use().promise().query(sql);
      result.data = rows;
      // loop through rows, assigning a rank  
      let prev_score = 0, 
          rank = 1, 
          row = 0;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].bot) { // if this is a bot user, give them no rank
          rank = '🤖';
        } else {
          if (rows[i].score == prev_score) {
            row++;
          } else {
            rank = ++row;
          }
          prev_score = rows[i].score;
        }
        rows[i].rank = rank;
      }
      done(result);
    } catch (err) {
      logger.error(`error in pred.results (${ err })`);
      result.err = err;
      done(result);
    }
  },

  progress: async (uid, done) => {
    // return an array of each cat and whether player uid has made  a prediction
    try {
      const sql = 'SELECT NOT(ISNULL(S.nominee_id)) AS complete FROM categories AS C LEFT JOIN (SELECT category_id, nominee_id FROM predictions WHERE user_id = ?) AS S ON C.id = S.category_id ORDER BY C.id';
      const [rows, fields] = await db.use().promise().execute(sql, [uid]);
      done(rows);
    } catch (err) {
      logger.error(`error in pred.progress (${ err })`);
      done(null);
    }
  }
}

module.exports = pred;
