// jshint node: true, esversion: 6
'use strict';

const fs          = require('fs'),
      hbs         = require('handlebars'),
      pkg         = require('../package.json'),
      logger      = require('winston'),
      { Resend }  = require('resend');

const mail = {

  send: async (recipient, context, done) => {

    // convert template and context into message
    let template = fs.readFileSync(__dirname + '/../views/mail/signup.hbs', 'utf8');
    let message = hbs.compile(template);

    // add app specific information
    context.app = {
      version: pkg.version,
      name: pkg.name
    }

    var msg = {
      from: 'Oscar Preds <oscars+noreply@oscars.mxxyqh.com>',
      to: recipient,
      bcc: 'njmanton@gmail.com',
      subject: 'Your signup code for My 20 Year Oscar Hell',
      text: message(context),
      html: message(context)
    };

    const resend = new Resend(process.env.RESEND_KEY);
    const { data, error } = await resend.emails.send(msg);

    if (error) {
      logger.error(`sign-up not processed ${ error }`);
      console.error({ error });
      done(false);
    } else {
      logger.info(`new sign-up by ${ context.username } (${ recipient })`);
      done(true);
    }
  },

};

module.exports = mail;
