var express = require('express');
var bodyParser = require('body-parser');
var indexRouter = require('./routes/index.js');

var app = express();

// Use body parser to get POST request parameters
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up routes
app.use('/', indexRouter);

// Catch and handle errors
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send("Error " + err.status + "\n" + err.message);
});

if (module === require.main) {
  // Start the server
  var server = app.listen(process.env.PORT || 8080, () => {
    var port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

module.exports = app;
