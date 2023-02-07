# list of API routes

| route | description |
| ---   | ---         |
| `GET /`                       | home page
| `GET /about`                  | static content (about page and help)
| `GET /recap/:code`            | recaps of past competition
| `GET /summary/:id`            | see results for individual players
| `GET /scoreboard`             | overall scoreboard table
| `GET /live`                   | live scoring chart
| `GET /results`                | ceremony results list
| `GET /category/:cat`          | category results
| `GET /player/:code`           | main page for players' predictions
| `GET /player/:code/:cat`      | prediction page for individual categories
| `GET /api/cat/:cat`           | get category results for graphing (ajax)
| `GET /api/progress/:uid`      | get progress on predictions made for user (ajax)

| route | description |
| ---   | ---         |
| `POST /signup`                | send registration details
| `POST /prediction`            | submit a single prediction
| `POST /player/check`          | check uniqueness of registration username/email
