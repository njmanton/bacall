// jshint node: true, esversion: 6
'use strict';

const routes = app => {

  const player = require('./models/player'),
        pred = require('./models/prediction'),
        fs = require('fs'),
        logger = require('winston'),
        tmdb = require('./models/tmdb'),
        config = require('./config/');

  // main page
  app.get('/', (req, res) => {
    const expired = (new Date() > config.deadline || config.exp_test);
    res.render('main', { expired: expired, signups: config.placeholders() }, (err, html) => {
      if(err) {
        res.status(500).send(`An interal error (${ err }) has occurred`);
      } else {
        res.send(html);
      }
    });      
  });

  // other static routes
  app.get('/about', (req, res) => {
    res.render('about', { title: 'About M20YOH' });
  });

  app.get('/recap/:code', (req, res) => {
    if (fs.existsSync(`./views/recap/analysis_${ req.params.code }.hbs`)) {
      res.render(`recap/analysis_${ req.params.code }`, { title: `MY20OH Recap ${ req.params.code }` });
    } else {
      res.status(404).render('404', {});
    }
  });

  // get the summary table for a player - should only be available after deadline
  app.get('/summary/:id', (req, res) => {
    const expired = (new Date() > config.deadline || config.exp_test);
    if (!expired) {
      res.render('main', { expired: expired, message: true, message_err: true, message_text: 'Summaries are unavailable until after the deadline' });
    } else {
      pred.summary(req.params.id, false, data => {
        if (!data.err) {
          res.render('summary', {
            debug: config.debug(data),
            data: data.table,
            total: data.total,
            username: data.username,
            title: `Summary for ${ data.username }`
          });          
        } else {
          res.status(500).send(`Sorry, that operation couldn't be completed ( ${ data.err }).`);
        }
      })    
    }
  });

  // handle user signup form
  app.post('/signup', (req, res) => {
    player.create(req.body.username, req.body.email, check => {
      if (check.error) {
        res.render('main', {
          signups: config.placeholders(),
          message: true,
          message_err: true,
          message_text: `Sorry, an error occurred processing your form. Please try again.`
        })
      } else {
        res.render('main', { 
          message: true, 
          message_text: `Signup successful! Your code is &nbsp;<strong>${ check.code }</strong>. Use this to make your predictions at&nbsp; <a href="/player/${ check.code }">https://oscars.mxxyqh.com/player/${ check.code }</a> &nbsp; (You'll get an email too).`,
          signups: config.placeholders()
        });
      }
    })
  })

  // get the scoreboard
  app.get('/scoreboard', (req, res) => {
    pred.results( data => {
      if (data.err) {
        res.status(500).send(`Sorry, there was an error retrieving that data (${ data.err })`);
      } else {
        res.render('scoreboard', { 
          debug: config.debug(data), 
          table: data, 
          expired: true, 
          title: 'Leaderboard' });
      }
    })
  });

  // show a list of results
  app.get('/results', (req, res) => {
    pred.list(data => {
      if (data.err) {
        res.status(500).send(`Sorry, there was an error retrieving the results (${ data.err })`);
      } else {
        res.render('results', { debug: config.debug(data), list: data, title: 'Results by Category' });
      }
    })
  });

  // routing for users
  // no category get rerouted to cid:1
  app.get('/player/:code', (req, res) => {
    res.redirect(['/player',req.params.code,'1'].join('/'));
  });

  // routing for player predictions
  app.get('/player/:code/:cat', (req, res) => {
    // check if deadline reached. If it has redirect to summary page
    const expired = (new Date() > config.deadline || config.exp_test);
    if (expired) {
      pred.summary(req.params.code, true, data => { 
        res.render('summary', {
          debug: config.debug(data),
          data: data.table,
          total: data.total,
          username: data.username,
          message: true,
          message_err: true,
          message_text: 'The predictions deadline has now passed. You have been redirected to the summary page.'
        });
      })
    } else {
      // get all preds for :code
      pred.preds(req.params.code, req.params.cat, data => {
        if (data.err == 'No such user') {
          logger.info(`Invalid login from '${ req.params.code }'`);
          res.render('main', { 
            message: true,
            message_err: true,
            message_text: `Sorry, but <b>'${ req.params.code }'</b> doesn't appear to be a valid player code.`
          })
        } else if (data.code) {
          // probably a SQL error
          res.render('main', { 
            message: true,
            message_err: true,
            message_text: 'Sorry, an error has occurred. Please try again later. The error has been logged.' 
          });
        } else {
          pred.list(cats => {
            if (cats.err) {
              res.status(500).send(`Sorry, there was an error retrieving data (${ cats.err })`)
            } else {
              // loop through nominees to get prediction for the default image
              let img = '';
              for (let x = 0; x < data[0].length; x++) {
                if (data[0][x].pred) {
                  // short-circuit the loop once we find a prediction
                  img = data[0][x].image; break;
                }
              }
              res.render('players', {
                debug: config.debug(data),
                expired: expired,
                user: data[1],
                uname: data[2],
                user_code: data[3],
                data: data[0],
                cat: cats[req.params.cat - 1],
                img: img,
                title: `Best ${ cats[req.params.cat - 1].name }`
              });                  
            }
          })
        }
      })
    }
  });

  // handle prediction update
  app.post('/prediction', (req, res) => {
    pred.save(req.body, response=> {
      res.send(response);
    })
  });

  // render a summary of given category
  app.get('/category/:cat', (req, res) => {
    tmdb.images(req.params.cat, data => {
      if (!data) {
        res.status(500).send('Sorry, there was an error retrieving information for that category');
      } else if (data.err == 'invalid category') {
        res.render('main', { message: true, message_err: true, message_text: 'Category id must be between 1 and 23'});
      } else {
        res.render('category', {
          debug: config.debug(data),
          data: data,
          cat: req.params.cat,
          title: `Best ${ data.category }`
        });    
      }
    })
  });

  // ajax request for pie chart on category page
  app.get('/api/cat/:cat', (req, res) => {
    pred.pie(req.params.cat, data => {
      res.json(data);
    })
  });

  // get progress of predictions for :uid
  app.get('/api/progress/:uid', (req, res) => {
    pred.progress(req.params.uid, data => {
      // data should be a 23 element array of 0,1 
      res.json(data);
    })
  });

  app.get('/api/logs', (req, res) => {
    player.logs(data => {
      res.json(data);
    });
  })

  // check the uniqueness of a signups name and email
  app.post('/player/check', (req, res) => {
    player.unique(req.body.type, req.body.value, check => {
      res.send(check);
    })
  });

  app.get('/live', (req, res) => {
    res.render('live', { title: 'Live scores' });
  });

  app.get('/logs', (req, res) => {
    res.render('logfile', { title: 'M20YOH Logs' });
  });

  //app.get('/test', (req, res) => {
  //});

  // capture any other non-matching routes here
  app.get('*', (req, res) => {
    res.status(404).render('404', { layout: 'layout_err', title: "Page not found", ref: req.path });
  });
}

module.exports = routes;