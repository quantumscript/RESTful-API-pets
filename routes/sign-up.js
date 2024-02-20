var express = require('express');
const request = require('request');
const ds = require('../lib/datastore');
const lib = require('../lib/lib');
const authoCred = require('../lib/authoCred');

const router = express.Router();
const client_id = authoCred.client_id;
const client_secret = authoCred.client_secret;
const Datastore = ds.Datastore;
const datastore = ds.datastore;

const USER = "User";
const baseURL = "users";

/*********** START MODEL **********/
// POST USER
function postUser(name, email, phone, address) {
  var key = datastore.key(USER);
  const userData = {"name": name, "email": email, "phone": phone, "address": address};
  return datastore.save({"key": key, "data": userData}).then(() => {return key.id});
}
/*********** END MODEL **********/

/*********** START CONTROLLER **********/
// POST /sign-up
router.post('/', function(req, res) {

  // Request body properties
  const name = req.body.name;
  const email = req.body.email;
  const phone = req.body.phone;
  const address = req.body.address;
  const password = req.body.password;

  var options = {
    method: 'POST',
    url: 'https://cs493-87684.us.auth0.com/oauth/token',
    headers: { 'content-type': 'application/json' },
    body: {
      grant_type: 'client_credentials',
      audience: 'https://cs493-87684.us.auth0.com/api/v2/',
      client_id: client_id,
      client_secret: client_secret },
    json: true
  };

  request(options, (error, response, body) => {
    if (error) {res.status(500).send(error);}

    // Using access_token, create new user
    else {
      var access_token = body.access_token;
      var options = {
        method: 'POST',
        url: 'https://cs493-87684.us.auth0.com/api/v2/users', // Uncertain about this one
        headers: { 'content-type': 'application/json',
          'Authorization': 'Bearer ' + access_token },
        body:
         { connection: 'Username-Password-Authentication',
         name: email,
           email: email,
           password: password },
        json: true
      };

      request(options, (error, response, body) => {
        if (error) {
          console.log(error);
          res.status(500).send(error);
        }
        // Error: User already exists in Auth0
        else if (body.statusCode === 409) {
          res.send(body);
        }
        // Successful user creation in Auth0, add user to Datastore
        else {
          return postUser(name, email, phone, address)
          .then( results => {
            res.send( '{"id": ' + results + ' }' );
          });
        }
      });
    }
  });
});

/************ END CONTROLLER ***********/

module.exports = router;
