// jshint node: true, esversion: 6
'use strict';

const db = require('../models/'),
      logger = require('winston'),
      mail = require('../models/mailer');

const player = {

  exists: (code, done) => {

    if (!code || code.length != 8) {
      done({ err: 'Invalid code' });
    } else {
      const sql = 'SELECT id, username, franchise FROM users WHERE code = ? LIMIT 1';

      db.use().query(sql, code, (err, rows) => {
        let result = { err: null, id: null, name: null }; // object to return to valid code check
        if (err) {
          result.err = err.code;
        } else if (!rows.length) {
          result.err = 'Invalid code';
        } else {
          result = rows[0];

        }
        done(result);
      });
    }

  },

  unique: (type, val, done) => {

    const fld = (type == 1) ? 'username' : 'email';
    if (type == 1) {
      var sql = 'SELECT id FROM users WHERE username = ?';
    } else if (type == 2) {
      var sql = 'SELECT id FROM users WHERE email = ?';
    } else {
      return false;
    }
    
    db.use().query(sql, val, (err, rows) => {
      if (err) {
        done(null);
      } else {
        done(rows.length == 0);
      }
    })

  },

  franchise: (fragment, done) => {
    // can't get db.use() to recognise parameterised LIKE query. Need to sanitise input
    const sql = `SELECT DISTINCT franchise FROM users WHERE franchise LIKE ` + db.use().escape('%'+fragment+'%');
    db.use().query(sql, (err, rows, fields) => {
      done(rows);
    })
    //done(null);

  },

  create: (username, email, franchise, done) => {

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
      franchise: franchise,
      code: code,
      registered: new Date()
    };
    const sql = 'INSERT INTO users SET ?';

    db.use().query(sql, user, (err, rows) => {
      const result = {
        error: null,
        code: null
      };
      if (err) {
        result.error = err.code;
        console.log(err);
      } else {
        result.code = code;
        mail.send(email, user, result => {
          logger.info(`signup email sent to ${ user.email }`);
        })
      }
      done(result);
    })

  }

}

module.exports = player;
