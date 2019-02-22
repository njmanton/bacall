// jshint node: true, esversion: 6
'use strict';

const exp_test = 0;
exports.exp_test = exp_test;

const deadline = new Date('2019-02-24T18:00');
exports.deadline = deadline;

var signups = [
  { uid: 'rubeus', email: 'rhagrid@hogwarts.ac.uk' },
  { uid: 'dan', email: 'd.truman@nasa.gov' },
  { uid: 'holly', email: 'gennaro@nakatomi.com' },
  { uid: 'mbd', email: 'milesdyson@cyberdyne.com' },
  { uid: 'stan', email: 'goodspeed@fbi.gov' },
  { uid: 'ellen', email: 'ripley@wayland-yutani.com' },
  { uid: 'eldon', email: 'eldon@tyrell.com' }
];

exports.placeholders = () => {
  return signups[Math.floor(Math.random() * signups.length)];
}
