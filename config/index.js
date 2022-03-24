// jshint node: true, esversion: 6
'use strict';

const exp_test = 0;
exports.exp_test = exp_test;

const deadline_date = '2022-03-27T23:00Z';
exports.deadline = new Date(deadline_date);;

exports.placeholders = () => {
  const signups = require('./signups.json'),
        rnd = Math.floor(Math.random() * signups.length);
  return signups[rnd];
}
