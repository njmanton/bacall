// jshint node: true, esversion: 6
'use strict';

const routes = app => {

  const player = require('./models/player'),
        pred = require('./models/prediction'),
        logger = require('winston'),
        https = require('https'),
        tmdb = require('./models/tmdb'),
        config = require('./config/');

  // main page
  app.get('/', (req, res) => {
    const expired = (new Date() > config.deadline || config.exp_test);
    res.render('main', { expired: expired, signups: config.placeholders() });
  });

  // other static routes
  app.get('/about', (req, res) => {
    res.render('about');
  });

  app.get('/analysis', (req, res) => {
    res.render('analysis');
  });

  // get the summary table for a player - should only be available after deadline
  app.get('/summary/:code', (req, res) => {
    pred.summary(req.params.code, data => {
      //res.send(`<pre>${ JSON.stringify(data, null, 2) }</pre>`);
      res.render('summary', {
        data: data.table,
        total: data.total,
        username: data.username
      });
    })
  });

  // handle user signup form
  app.post('/signup', (req, res) => {
    player.create(req.body.username, req.body.email, req.body.franchise, check => {
      res.render('main', { signup: check, signups: config.placeholders() });
    })
  })

  // get the scoreboard
  app.get('/scoreboard', (req, res) => {
    pred.results( data => {
      res.render('scoreboard', { table: data, expired: true });
    })
  });

  // show a list of results
  app.get('/results', (req, res) => {
    pred.list(data => {
      res.render('results', { list: data });
    })
  });

  // routing for users
  // no category get rerouted to cid:1
  app.get('/player/:code', (req, res) => {
    res.redirect(['/player',req.params.code,'1'].join('/'));
  });

  // routing for player predictions
  app.get('/player/:code/:cat', (req, res) => {
    // check if deadline reached
    const expired = (new Date() > config.deadline || config.exp_test);
    if (expired) {
      pred.summary(req.params.code, data => {
        //res.send(`<pre>${ JSON.stringify(data, null, 2) }</pre>`);
        res.render('summary', {
          data: data.table,
          total: data.total,
          username: data.username,
          past_deadline: true
        });
      })
    } else {
      // first check if the code is real
      player.exists(req.params.code, check => {
        if (check.id) {
          // player exists, so retrieve predictions
          pred.preds(check.id, req.params.cat, data => {
            if (data.code) {
              res.render('main', {});
            } else {
              // get the list of all categories for the navigation
              pred.list(cats => {
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
                  user: check,
                  data: data,
                  cat: cats[req.params.cat - 1],
                  img: img
                });
                //res.send(`<pre>${ JSON.stringify([data, cats[req.params.cat - 1], img], null, 2) }</pre>`);
              })

            }
          })
        } else {
          res.render('main', {});
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
      res.render('category', {
        layout: 'layout_cat',
        data: data,
        cat: req.params.cat
      });
      //res.send(`<pre>${ JSON.stringify(data, null, 2) }</pre>`)
    })
  });

  // ajax request for pie chart on category page
  app.get('/api/cat/:cat', (req, res) => {
    //res.send(['a', 'b', 'c']);
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

  // capture any other non-matching routes here
  app.get('*', function(req, res){
    res.status(404).render('404', { layout: 'layout_err', title: "Page not found" });
  });
}

module.exports = routes;