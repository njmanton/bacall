// jshint node: true, esversion: 6
'use strict';

const exp_test = (process.argv[2] === 'expired') || false;
exports.exp_test = exp_test;

const deadline_date = '2024-03-10T23:00Z';
exports.deadline = new Date(deadline_date);;

exports.placeholders = () => {
  const signups = require('./signups.json'),
        rnd = Math.floor(Math.random() * signups.length);
  return signups[rnd];
}

exports.debug = data => {
  return process.env.OSCAR_DEV ? JSON.stringify(data, null, 2) : null;
}
