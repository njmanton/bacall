#!/usr/bin/env node
'use strict';

/*********************************************************
heartbeat.js
runs from a cron job to send a periodic email to stop
sendgrid from (silently) closing the account for non-use
*********************************************************/

const sg  = require('@sendgrid/mail'),
      { DateTime }  = require('luxon'),
      msg = {
        from: 'heartbeat@mxxyqh.com',
        to: 'njmanton@gmail.com',
        subject: 'Heartbeat email',
        text: `This is your periodic email for ${ DateTime.now().toFormat('MMMM yyyy') }`
      };

sg.setApiKey(process.env.SENDGRID_KEY);

sg.send(msg).then(() => {
  console.log('Message sent');
}).catch(err => {
  console.error(`Message not sent: ${ err }`);
});
