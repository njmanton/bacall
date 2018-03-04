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
    const expired = (new Date() > config.deadline);
    res.render('main', { expired: expired, signups: config.placeholders() });
  });

  // other static routes
  app.get('/about', (req, res) => {
    res.render('about');
  });

  // app.get('/tmdb', (req, res) => {
  //   tmdb.images({
  //     id: 17,
  //     type: 1
  //   }, urls => {
  //     res.send(urls);
  //   })

  // });

  // handle user signup form
  app.post('/signup', (req, res) => {
    player.create(req.body.username, req.body.email, req.body.franchise, check => {
      res.render('main', { signup: check, signups: config.placeholders() });
    })
  })

  // get the results
  app.get('/results', (req, res) => {
    pred.results( data => {
      res.render('results', { table: data, expired: true });
    })
  })

  // routing for users
  app.get('/player/:code', (req, res) => {
    const expired = (new Date() > config.deadline);
    player.exists(req.params.code, check => {
      if (check.id) {
        pred.preds(check.id, data => {
          if (data.code) { // if preds returned an error, go back to main page and display error
            res.render('main', { expired: expired, error: data.code, signups: config.placeholders() })
          } else {
            res.render('players', {
              expired: expired,
              user: check, 
              data: data, 
            });
          }
        })
      } else {
        res.render('main', { expired: expired, error: check.err, signups: config.placeholders() })
      } 
    })
  })

  // handle prediction update
  app.post('/prediction', (req, res) => {
    pred.save(req.body, response=> {
      res.send(response);
    })
  });

  // handle setting a category winner
  // app.post('/setwinner', (req, res) => {
  //   pred.setwinner(req.body, check => {
  //     res.send(check);
  //   })
  // });

  // render a view of a category, with predictions
  app.get('/category/:cat', (req, res) => {

    if (req.params.cat > 0 && req.params.cat < 25) {
      pred.categoryDetails(req.params.cat, data => {
        tmdb.images({
          id: data.winner.tmdb,
          type: data.winner.class
        }, urls => {
          res.render('category', {
            layout: 'layout_cat',
            data: data,
            images: urls
          })          
        })
      })
    } else {
      res.status(404).render('404', { err: 'invalid category' });
    }
  })

  // check the uniqueness of a signups name and email
  app.post('/player/check', (req, res) => {
    player.unique(req.body.type, req.body.value, check => {
      res.send(check);
    })
  });

  // get list of users predicting nom in cat
  // app.get('/prediction/userbycat/:cat/:nom', (req, res) => {
  //   pred.getUsersByBet(req.params.cat, req.params.nom, list => {
  //     res.send(list);
  //   })
  // });

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