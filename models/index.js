// jshint node: true, esversion: 6
'use strict';

const mysql = require('mysql');
const state = { pool: null, mode: null };
const debug = true;

exports.conn = done => {
  // environment variable to pass connection parameters, including utf8mb4 charset (for emoji)
  state.pool = mysql.createPool(process.env.BACALL_DB);
  done();
}

exports.use = () => {
  return state.pool;
}
