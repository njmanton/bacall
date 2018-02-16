// jshint node: true, esversion: 6
'use strict';

const fs      = require('fs'),
      hbs     = require('handlebars'),
      pkg     = require('../package.json'),
      logger  = require('winston'),
      mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_KEY, domain: 'lcssl.org' });

const mail = {

  send: (recipient, context, done) => {

    // convert template and context into message
    let template = fs.readFileSync(__dirname + '/../views/mail/signup.hbs', 'utf8');
    let message = hbs.compile(template);

    // add app specific information
    context.app = {
      version: pkg.version,
      name: pkg.name
    }

console.log('mailer', template);
console.log('context', context);

    var data = {
      from: 'Oscar Preds <oscars2018@lcssl.org>',
      to: recipient,
      bcc: 'njmanton@gmail.com',
      subject: 'Your signup code for My 20 Year Oscar Hell',
      text: message(context),
      html: message(context)
    };

    mailgun.messages().send(data).then(response => {
      logger.info(`signup by ${ context.name } (${ recipient })`);
      done(response);
    }, err => {
      logger.error(`signup not processed: ${ err }`);
      done(err);
    });

  },

};

module.exports = mail;
