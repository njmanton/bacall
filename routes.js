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
      res.render(`recap/analysis_${ req.params.code }`, { title: 'Recap' });
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
    player.create(req.body.username, req.body.email, req.body.franchise, check => {
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
          message_text: `Signup successful! Your code is <strong>${ check.code }</strong>. Use this to make your predictions at <a href="/player/${ check.code }">https://oscars.mxxyqh.com/player/${ check.code }</a> (You'll get an email too).`,
          signups: config.placeholders() 
        });
      }
    })
  })

  // get the scoreboard
  app.get('/scoreboard', (req, res) => {
    // if passed as a query string, exclude bot users from scoreboard
    const nobots = (req.query.nobots && req.query.nobots == 'true');
    pred.results(nobots, data => {
      if (data.err) {
        res.status(500).send(`Sorry, there was an error retrieving that data (${ data.err })`);
      } else {
        res.render('scoreboard', { table: data, expired: true , title: 'Leaderboard' });
      }
    })
  });

  // show a list of results
  app.get('/results', (req, res) => {
    pred.list(data => {
      if (data.err) {
        res.status(500).send(`Sorry, there was an error retrieving the results (${ data.err })`);
      } else {
        res.render('results', { list: data, title: 'Results by Category' });
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
        //res.send(`<pre>${ JSON.stringify(data, null, 2) }</pre>`);
        res.render('summary', {
          data: data.table,
          total: data.total,
          username: data.username,
          message: true,
          message_err: true,
          message_text: 'The predictions deadline has now passed. You have been redirected to the summary page.'
        });
      })
    } else {
      // first check if the code is real
      player.exists(req.params.code, user => {
        if (user.id) {
          // player exists, so retrieve predictions
          pred.preds(user.id, req.params.cat, data => {
            if (data.err) { // returns a code property if there was an SQL error
              res.render('main', { 
                message: true,
                message_err: true,
                message_text: 'Sorry, an error has occurred. Please try again later. The error has been logged.' 
              });
            } else {
              // get the list of all categories for the navigation
              pred.list(cats => {
                if (cats.err) {
                  res.status(500).send(`Sorry, there was an error retrieving data (${ cats.err })`)
                } else {
                  // loop through nominees to get prediction for the default image
                  let img = '';
                  for (let x = 0; x < data.length; x++) {
                    if (data[x].pred) {
                      // short-circuit the loop once we find a prediction
                      img = data[x].image; break;
                    }
                  }
                  res.render('players', {
                    expired: expired,
                    user: user,
                    data: data,
                    cat: cats[req.params.cat - 1],
                    img: img,
                    title: `Best ${ cats[req.params.cat - 1].name }`
                  });                  
                }
              })
            }
          })
        } else {
          // invalid code
          logger.info(`Invalid login from '${ req.params.code }'`);
          res.render('main', { 
            message: true,
            message_err: true,
            message_text: `Sorry, but <b>'${ req.params.code }'</b> doesn't appear to be a valid player code.`
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
          layout: 'layout_cat',
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
      res.send(data);
    })
  });

  // check the uniqueness of a signups name and email
  app.post('/player/check', (req, res) => {
    player.unique(req.body.type, req.body.value, check => {
      res.send(check);
    })
  });

  // get list of existing franchises
  app.get('/player/franchise/:fragment', (req, res) => {
    player.franchise(req.params.fragment, list => {
      res.send(list);
    })
  })

  app.get('/live', (req, res) => {
    res.render('live', { title: 'demo chart' });
  })

  // capture any other non-matching routes here
  app.get('*', (req, res) => {
    res.status(404).render('404', { layout: 'layout_err', title: "Page not found", ref: req.path });
  });
}

module.exports = routes;