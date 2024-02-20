var express = require('express');
const request = require('request');
const ds = require('../lib/datastore');
const lib = require('../lib/lib');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const authoCred = require('../lib/authoCred');

const router = express.Router();
const Datastore = ds.Datastore;
const datastore = ds.datastore;
const addId = lib.addId;
const addURL = lib.addURL;
const makeURL = lib.makeURL;
const URL = lib.URL;
const client_id = authoCred.client_id;
const client_secret = authoCred.client_secret;

const ANIMAL = "Animal";
const USER = "User";
var baseURL = "";


/************* START MODEL funcs *************/
const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://cs493-87684.us.auth0.com/.well-known/jwks.json`
    }),
    algorithms: ['RS256']
  });

function callAddURL(item) {
  return addURL(item, baseURL);
}

function callMakeURL(id) {
  return makeURL(id, baseURL);
}

// GET USERS
function getUsers(req) {
  const LIMIT = 5;

  // Set offset value from request object or initialize to 0
  var offset = 0;
  if (Object.keys(req.query).includes("offset")) {
    offset = parseInt(req.query.offset, 10);
  }

  var query = datastore.createQuery(USER).limit(LIMIT).offset(offset);

  return datastore.runQuery(query).then(
    async results => {
      var finalResults = {};
      baseURL = "users";
      const promise = results[0].map(addId).map(callAddURL);
      finalResults.items = await Promise.all(promise);

      // Next pagination
      if(results[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
        var offsetNEXT = offset + LIMIT;
        finalResults.next =  URL + '/users' + "?offset=" + offsetNEXT;
      }
      // Prev pagination
      if (offset >= LIMIT) {
        var offsetPREV = offset - LIMIT;
        finalResults.prev =  URL + '/users' + "?offset=" + offsetPREV;
      }

      var query2 = datastore.createQuery(USER);
      return datastore.runQuery(query2).then( fullResults => {
        finalResults.total = fullResults[0].length;
        return finalResults;
      });
  });
}

// GET USER by id
function getUserById(id) {
  const key = datastore.key([USER, parseInt(id,10)]);
  return datastore.get(key).then( results => {
    baseURL = "users";
    results.map(addId).map(callAddURL);
    return results;
  });
}

// GET ANIMALS by user
function getUserAnimals(id, requesterName) {
  const key = datastore.key([USER, parseInt(id,10)]);
  return datastore.get(key).then( results1 => {

    if (results1[0].email.toLowerCase() === requesterName) {
      var query = datastore.createQuery(ANIMAL).filter('owner', '=', requesterName);
      return datastore.runQuery(query).then(
        async results => {
          var finalResults = {};
          baseURL = "animals";
          const promise = results[0].map(addId).map(callAddURL);
          finalResults = await Promise.all(promise);
          return finalResults;
        });
    }

    else {return 403;}

  });
 }

// UPDATE USER by id
function updateUserById(id, name, phone, address) {
  const key = datastore.key([USER, parseInt(id,10)]);
  return datastore.get(key).then((results) => {
    results[0].name = name;
    results[0].phone = phone;
    results[0].address = address;
    return datastore.update(results[0]).then( () => {return});
  });
}

// UPDATE owner to NULL for ANIMAL
function removeUserFromAnimal(user, idANIMAL) {
  const key = datastore.key([ANIMAL, parseInt(idANIMAL,10)]);
  return datastore.get(key).then(results => {
    if (results[0].owner === user || results[0].owner === "NULL") {
      results[0].owner = "NULL";
      return datastore.update(results[0]).then( () => {return 204});
    }
    else { return 403; }
  });
}

// UPDATE owner for ANIMAL
function updateAnimalOwner(user, idANIMAL) {
  const key = datastore.key([ANIMAL, parseInt(idANIMAL,10)]);
  return datastore.get(key).then(results => {
    if (results[0].owner === user || results[0].owner === "NULL") {
      results[0].owner = user;
      return datastore.update(results[0]).then( () => {return 204});
    }
    else { return 403; }
  });
}

// DELETE USER
function deleteUser(id, requester) {
  const key = datastore.key([USER, parseInt(id,10)]);
  return datastore.get(key).then( results => {

    if ( results[0].email.toLowerCase() === requester) {
      // If any animal is owned by the user, deny request
      var query = datastore.createQuery(ANIMAL).filter('owner', '=', requester);
      return datastore.runQuery(query).then( results => {
        if (results[0].length === 0) {
          datastore.delete(key);
          return 204;
        }
        else {return 403.1}
      });
    }

    else { return 403; }
  });
}

/************* END MODEL funcs *************/


/*********** START CONTROLLER **********/
// GET /users
router.get('/', function(req, res) {
  const accepts = req.accepts(['application/json']);
  if (!accepts) {
    res.status(406).send('Server can only send json. Change "Accept"');
  } else {
    getUsers(req).then( results => {res.status(200).send(results)});
  }
});

// GET /users/:id
router.get('/:id', function(req, res) {
  const accepts = req.accepts(['application/json']);
  if (!accepts) {
    res.status(406).send('Server can only send json. Change "Accept"');
  } else {
    getUserById(req.params.id)
    .then( results => {res.status(200).send(results)});
  }
});

// PUT /users/:id
router.put('/:id', checkJwt, function(req, res) {
  updateUserById(req.params.id, req.body.name, req.body.phone, req.body.address)
  .then(res.status(204).end());
});

// GET /users/:id/animals
router.get('/:id/animals', checkJwt, function(req, res) {
  const accepts = req.accepts(['application/json']);
  if (!accepts) {
    res.status(406).send('Server can only send json. Change "Accept"');
  } else {
    getUserAnimals(req.params.id, req.user.name).then( results => {
      if (results === 403) {
        res.status(403).end();
      } else {
        res.status(200).send(results);
      }
    });
  }
});

// PUT USER as ANIMAL owner
router.put('/:id1/animals/:id2', checkJwt, function(req, res) {
  updateAnimalOwner(req.user.name, req.params.id2)
  .then(res.status(204).end());
});

// REMOVE USER as ANIMAL owner
router.delete('/:id1/animals/:id2', checkJwt, function(req, res) {
  removeUserFromAnimal(req.user.name, req.params.id2)
  .then(res.status(204).end());
});

// DELETE /users/:id
router.delete('/:id', checkJwt, function(req, res) {
  deleteUser(req.params.id, req.user.name).then( results => {

    // Datastore failed to delete
    if (results === 403) {
      res.status(403).end();
    }

    // Cannot delete user because it still has animals in posession
    else if (results === 403.1) {
      res.status(403.1).send("Cannot delete user while they own animals.");
    }

    // Datastore deletion was successful
    else {
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

      // Request auth0 access_token
      request(options, (error, response, body) => {
        if (error) {res.status(500).send(error);}

        // Using access_token, delete user
        else {
          var access_token = body.access_token;
          var options = {
            method: 'DELETE',
            url: 'https://cs493-87684.us.auth0.com/api/v2/users/' + req.user.sub,
            headers: { 'content-type': 'application/json',
              'Authorization': 'Bearer ' + access_token },
            json: true
          };

          // With access_token, delete user
          request(options, (error, response, body) => {
            if (error) {
              console.log(error);
              res.status(500).send(error);
            }
            // Successful deletion
            else if (response.statusCode === 204) { res.status(204).end(); }

            // Error from Auth0
            else {res.send(body); }
          });
        }
      });

    }
  });
});

//|||||||||||| 405 Status |||||||||||||||/
// /users
router.all('/', function(req, res) {
  res.set('Accept', 'GET');
  res.status(405).end();
});

// /users/:id
router.all('/:id', function(req, res) {
  res.set('Accept', 'DELETE, GET, PUT');
  res.status(405).end();
});

// /users/:id/animals
router.all('/:id1/animals', function(req, res) {
  res.set('Accept', 'GET');
  res.status(405).end();
});

// /users/:id/animals/:id2
router.all('/:id1/animals/:id2', function(req, res) {
  res.set('Accept', 'DELETE, PUT');
  res.status(405).end();
});

/************ END CONTROLLER ***********/

module.exports = router;
