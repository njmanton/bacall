#!/usr/bin/env node
'use strict';

/*********************************************************
heartbeat.js
runs from a cron job to send a periodic email to stop
sendgrid from (silently) closing the account for non-use
*********************************************************/

const sg  = require('@sendgrid/mail'),
      msg = {
        from: 'heartbeat@mxxyqh.com',
        to: 'njmanton@gmail.com',
        subject: 'Your periodic email message',
        text: 'No message'
      };

sg.setApiKey(process.env.SENDGRID_KEY);

sg.send(msg).then(() => {
  console.log('Message sent');
}).catch(err => {
  console.error(`Message not sent: ${ err }`);
});
