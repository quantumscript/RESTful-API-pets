var express = require('express');
const request = require('request');
const ds = require('../lib/datastore');
const lib = require('../lib/lib');
const authoCred = require('../lib/authoCred');

const router = express.Router();
const client_id = authoCred.client_id;
const client_secret = authoCred.client_secret;


/*********** START CONTROLLER **********/
// POST /login
router.post('/', function(req, res) {
  const username = req.body.email;
  const password = req.body.password;

  var options = {
    method: 'POST',
    url: 'https://cs493-87684.us.auth0.com/oauth/token',
    headers: { 'content-type': 'application/json' },
    body: {
      grant_type: 'password',
      username: username,
      password: password,
      audience: 'https://cs493-87684.us.auth0.com/api/v2/',
      scope: 'openid',
      client_id: client_id,
      client_secret: client_secret },
    json: true
  };

  request(options, (error, response, body) => {
    if (error) {
      console.log(error);
      res.status(500).send(error);
    } else {
      const access_token = body.access_token;
      res.send(body);
    }
  });
});
/************ END CONTROLLER ***********/

module.exports = router;
