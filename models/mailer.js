// jshint node: true, esversion: 6
'use strict';

const fs      = require('fs'),
      hbs     = require('handlebars'),
      pkg     = require('../package.json'),
      logger  = require('winston'),
      sg      = require('@sendgrid/mail');

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

    var msg = {
      from: 'Oscar Preds <oscars@mxxyqh.com>',
      to: recipient,
      bcc: 'njmanton@gmail.com',
      subject: 'Your signup code for My 20 Year Oscar Hell',
      text: message(context),
      html: message(context)
    };

    sg.setApiKey(process.env.SENDGRID_KEY);

    sg.send(msg)
      .then(() => {
        logger.info(`new sign-up by ${ context.name } ${ recipient }`);
        done();
       })
      .catch(error => {
        logger.error(`sign-up not processed: ${ error }`);
        done(error);
       });

  },

};

module.exports = mail;
