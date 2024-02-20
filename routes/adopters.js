var express = require('express');
const ds = require('../lib/datastore');
const lib = require('../lib/lib');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const router = express.Router();
const Datastore = ds.Datastore;
const datastore = ds.datastore;
const addId = lib.addId;
const addURL = lib.addURL;
const makeURL = lib.makeURL;
const URL = lib.URL;

const ADOPTER = "Adopter";
const ANIMAL = "Animal";
const baseURL = "adopters";


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

// GET ADOPTERS
function getAdopters(req) {
  const LIMIT = 5;

  // Set offset value from request object or initialize to 0
  var offset = 0;
  if (Object.keys(req.query).includes("offset")) {
    offset = parseInt(req.query.offset, 10);
  }

  var query = datastore.createQuery(ADOPTER).limit(LIMIT).offset(offset);

  return datastore.runQuery(query).then(
    async results => {
      var finalResults = {};
      // finalResults.total = 6;
      const promise = results[0].map(addId).map(callAddURL);
      finalResults.items = await Promise.all(promise);

      // Next pagination
      if(results[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
        var offsetNEXT = offset + LIMIT;
        finalResults.next =  URL + '/adopters' + "?offset=" + offsetNEXT;
      }
      // Prev pagination
      if (offset >= LIMIT) {
        var offsetPREV = offset - LIMIT;
        finalResults.prev =  URL + '/adopters' + "?offset=" + offsetPREV;
      }

      var query2 = datastore.createQuery(ADOPTER);
      return datastore.runQuery(query2).then( fullResults => {
        finalResults.total = fullResults[0].length;
        return finalResults;
      });

      // return finalResults;
  });
}

// POST ADOPTER
function postAdopter(name, email, phone, address) {
  var key = datastore.key(ADOPTER);
  const adopterData = {"name": name, "email": email, "phone": phone, "address": address};
  return datastore.save({"key": key, "data": adopterData}).then(() => {return key});
}

// GET ADOPTER by id
function getAdopterById(id) {
  const key = datastore.key([ADOPTER, parseInt(id,10)]);
  return datastore.get(key).then( results => {
    results.map(addId).map(callAddURL);
    return results;
  });
}

// UPDATE ADOPTER by id
function updateAdopterById(id, name, email, phone, address) {
  const key = datastore.key([ADOPTER, parseInt(id,10)]);
  return datastore.get(key).then((results) => {
    results[0].name = name;
    results[0].email = email;
    results[0].phone = phone;
    results[0].address = address;
    return datastore.update(results[0]).then( () => {return});
  });
}

// UPDATE adopter to NULL for ANIMAL
function removeAdopterFromAnimal(idADOPTER, idANIMAL) {
  const key = datastore.key([ANIMAL, parseInt(idANIMAL,10)]);
  return datastore.get(key).then(results => {
    if (results[0].adopter === idADOPTER || results[0].adopter === "NULL") {
      results[0].adopter = "NULL";
      return datastore.update(results[0]).then( () => {return 204});
    }
    else { return 403; }
  });
}

// UPDATE adopter for ANIMAL
function updateAnimalAdopter(idADOPTER, idANIMAL) {
  const key = datastore.key([ANIMAL, parseInt(idANIMAL,10)]);
  return datastore.get(key).then(results => {
    if (results[0].adopter === idADOPTER || results[0].adopter === "NULL") {
      results[0].adopter = idADOPTER;
      return datastore.update(results[0]).then( () => {return 204});
    }
    else { return 403; }
  });
}

// DELETE ADOPTER
function deleteAdopter(id) {
  const key = datastore.key([ADOPTER, parseInt(id,10)]);
  return datastore.get(key).then( results1 => {
    datastore.delete(key);

    // Set animal owner to "NULL" for any animals the user owned
    var query = datastore.createQuery(ANIMAL).filter('adopter', '=', id);
    return datastore.runQuery(query).then( results => {
      for (i=0; i<results[0].length; i++) {
          results[0][i].adopter = "NULL";
          return datastore.update(results[0]).then( () => {return 204});
      }
    });
  });
}
/************* END MODEL funcs *************/


/*********** START CONTROLLER **********/
// GET /adopters
router.get('/', function(req, res) {
  const accepts = req.accepts(['application/json']);
  if (!accepts) {
    res.status(406).send('Server can only send json. Change "Accept"');
  } else {
    getAdopters(req).then( results => {res.status(200).send(results)});
  }
});

// POST /adopters
router.post('/', checkJwt, function(req, res) {
  postAdopter(req.body.name, req.body.email, req.body.phone, req.body.address)
  .then( key => {
    res.status(201).send('{"id": ' + key.id + ' }')
  });
});

// GET /adopters/:id
router.get('/:id', function(req, res) {
  const accepts = req.accepts(['application/json']);
  if (!accepts) {
    res.status(406).send('Server can only send json. Change "Accept"');
  } else {
    getAdopterById(req.params.id)
    .then( results => {res.status(200).send(results)});
  }
});

// PUT /adopters/:id
router.put('/:id', checkJwt, function(req, res) {
  updateAdopterById(req.params.id, req.body.name, req.body.email,
    req.body.phone, req.body.address)
  .then(res.status(204).end());
});

// DELETE /adopters/:id
router.delete('/:id', checkJwt, function(req, res) {
  deleteAdopter(req.params.id, req.user.name)
  .then(results => {res.status(204).end()});
});

// PUT ADOPTER as ANIMAL adopter
router.put('/:id1/animals/:id2', checkJwt, function(req, res) {
  updateAnimalAdopter(req.params.id1, req.params.id2)
  .then( resultStatus => res.status(resultStatus).end());
});

// REMOVE ADOPTER as ANIMAL adopter
router.delete('/:id1/animals/:id2', checkJwt, function(req, res) {
  removeAdopterFromAnimal(req.params.id1, req.params.id2)
  .then( resultStatus => res.status(resultStatus).end());
});


//|||||||||||| 405 Status |||||||||||||||/
// /adopters
router.all('/', function(req, res) {
  res.set('Accept', 'GET, POST');
  res.status(405).end();
});

// /adopters/:id
router.all('/:id', function(req, res) {
  res.set('Accept', 'DELETE, GET, PUT');
  res.status(405).end();
});

// /adopters/:id/animals/:id2
router.all('/:id1/animals/:id2', function(req, res) {
  res.set('Accept', 'DELETE, PUT');
  res.status(405).end();
});

/************ END CONTROLLER ***********/

module.exports = router;
