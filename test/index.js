//jshint node: true, esversion: 6
'use strict';

var request = require('supertest'),
    express = require('express'),
    //utils   = require('../utils'),
    //player  = require('../models/player'),
    expect  = require('chai').expect,
    url     = 'http://localhost:2009';

describe('Server',
  () => {
  it('is connecting locally', done => {
  // pass in our server to supertest
  request(url)
    .get('/')
    // test passes if statusCode is 200
    .end((err, res) => {
      expect(res.status).to.equal(200);
      done();
    })      
  });

});

describe('Player', () => {

  const player = require('../models/player');
  console.log('player:', player);
  it('should return FALSE for an invalid code', done => {
    player.exists('ABCDEFGH', ret => {
      //console.log(ret);
      expect(ret).to.be.false;
      done();      
    });

  });

});