// jshint node: true, esversion: 6
'use strict';

const db = require('../models/'),
      logger = require('winston'),
      mail = require('../models/mailer');

const player = {

  unique: async (type, val, done) => {

    let sql = '';
    if (type == 1) {
      sql = 'SELECT id FROM users WHERE UPPER(username) = ?';
    } else if (type == 2) {
      sql = 'SELECT id FROM users WHERE UPPER(email) = ?';
    } else {
      return null;
    }
    
    val = val.toUpperCase();
    try {
      const [rows, fields] = await db.use().promise().execute(sql, [val]);
      done(rows.length == 0);
    } catch (err) {
      logger.error(`Error in player.exists (${ err.code })`);
      console.log(err);
      done(null);
    }
  },

  create: (username, email, done) => {
    let code = '';
    const len = 8,
          letters = '2346789ABCDEFGHJKLMNPQRTUVWXYZ'; // don't use easily confused chars, e.g. I and 1
    
    // generate a random code
    for (let i = 0; i < len; i++) {
      const idx = Math.floor(Math.random() * (letters.length - 1));
      code += letters[idx];
    }

    const user = {
      username: username, 
      email: email, 
      code: code,
      registered: new Date()
    }

    const sql = 'INSERT INTO users SET username = ?, email = ?, code = ?, registered = ?';
    const result = {
      error: null,
      code: null
    };
    db.use().promise().execute(sql, [username, email, code, new Date()]).then(([rows, fields]) => {
      result.code = code;
      mail.send(email, user, result => {
        logger.info(`signup email sent to ${ user.email }`);
      })
    }).catch(err => { 
      console.log(err);
      logger.error(`Error processing signup for ${ email }. The code was '${ err }'`);
      result.error = true;
    }).finally(() => {
      done(result);
    })
  },

  logs: async done => {
    // get text from activity.log
    try {
      logger.query({
        from: '-4w',
        limit: 100
      }, (err, results) => {
        if (err) throw err;
        done(results['info-log']);
      })
    } catch (error) {
      logger.error(`error in player.logs (${ error })`);
      done(null);
    }
  }
}

module.exports = player;
