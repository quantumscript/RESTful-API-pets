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

const ANIMAL = "Animal";
const baseURL = "animals";


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

// GET ANIMALS
function getAnimals(req) {
  const LIMIT = 5;

  // Set offset value from request object or initialize to 0
  var offset = 0;
  if (Object.keys(req.query).includes("offset")) {
    offset = parseInt(req.query.offset, 10);
  }

  var query = datastore.createQuery(ANIMAL).limit(LIMIT).offset(offset);

  return datastore.runQuery(query).then(
    async results => {
      var finalResults = {};
      const promise = results[0].map(addId).map(callAddURL);
      finalResults.items = await Promise.all(promise);

      // Next pagination
      if(results[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
        var offsetNEXT = offset + LIMIT;
        finalResults.next =  URL + '/animals' + "?offset=" + offsetNEXT;
      }
      // Prev pagination
      if (offset >= LIMIT) {
        var offsetPREV = offset - LIMIT;
        finalResults.prev =  URL + '/animals' + "?offset=" + offsetPREV;
      }

      var query2 = datastore.createQuery(ANIMAL);
      return datastore.runQuery(query2).then( fullResults => {
        finalResults.total = fullResults[0].length;
        return finalResults;
      });
  });
}

// POST ANIMAL
function postAnimal(name, species, weight, age, color, owner, adopter) {
  var key = datastore.key(ANIMAL);
  const animalData = {"name": name, "species": species, "weight": weight,
  "age": age, "color": color, "owner": owner, "adopter": adopter};
  return datastore.save({"key": key, "data": animalData}).then(() => {return key});
}

// GET ANIMAL by id
function getAnimalById(id, req) {
  const key = datastore.key([ANIMAL, parseInt(id,10)]);
  return datastore.get(key).then( results => {
    results.map(addId).map(callAddURL);
    return results;
  });
}

// UPDATE ANIMAL by id
function updateAnimalById(id, name, age, color, species, weight) {
  const key = datastore.key([ANIMAL, parseInt(id,10)]);
  return datastore.get(key).then((results) => {
    results[0].name = name;
    results[0].age = age;
    results[0].color = color;
    results[0].species = species;
    results[0].weight = weight;
    return datastore.update(results[0]).then( () => {return});
  });
}

// DELETE ANIMAL
function deleteAnimal(id, owner) {
  const key = datastore.key([ANIMAL, parseInt(id,10)]);
  return datastore.get(key).then( results => {
    if ( results[0].owner === owner || results[0].owner === "NULL") {
      datastore.delete(key);
      return 204;
    } else {
      return 403;
    }
  });
}
/************* END MODEL funcs *************/


/*********** START CONTROLLER **********/
// GET /animals
router.get('/', function(req, res) {
  const accepts = req.accepts(['application/json']);
  if (!accepts) {
    res.status(406).send('Server can only send json. Change "Accept"');
  } else {
    getAnimals(req).then( results => {res.status(200).send(results)});
  }
});

// POST /animals
router.post('/', checkJwt, function(req, res) {
  postAnimal(req.body.name, req.body.species, req.body.weight, req.body.age,
    req.body.color, req.user.name, req.body.adopter)
  .then( key => {
    res.status(201).send('{"id": ' + key.id + ' }')
  });
});

// GET /animals/:id
router.get('/:id', function(req, res) {
  const accepts = req.accepts(['application/json']);
  if (!accepts) {
    res.status(406).send('Server can only send json. Change "Accept"');
  } else {
    getAnimalById(req.params.id, req)
    .then( results => {res.status(200).send(results)});
  }
});

// PUT /animals/:id
router.put('/:id', checkJwt, function(req, res) {
  updateAnimalById(req.params.id, req.body.name, req.body.age, req.body.color,
    req.body.species, req.body.weight)
  .then(res.status(204).end());
});

// DELETE /animals/:id
router.delete('/:id', checkJwt, function(req, res) {
  deleteAnimal(req.params.id, req.user.name)
  .then(statusRet => {res.status(statusRet).end()
  });
});

//|||||||||||| 405 Status |||||||||||||||/
// /animals
router.all('/', function(req, res) {
  res.set('Accept', 'GET, POST');
  res.status(405).end();
});

// /animals/:id
router.all('/:id', function(req, res) {
  res.set('Accept', 'DELETE, GET, PUT');
  res.status(405).end();
});

/************ END CONTROLLER ***********/

module.exports = router;
