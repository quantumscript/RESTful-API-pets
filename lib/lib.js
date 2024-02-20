const ds = require('./datastore');
const Datastore = ds.Datastore;
const datastore = ds.datastore;

// URL strings
const URLdev = "localhost:8080";
const URLprod = "https://cs493-final-project-87684.uk.r.appspot.com";
var URL = module.exports.URL = URLprod;

// Add id to item. Used with map()
module.exports.addId = function addId(item){
  item.id = item[Datastore.KEY].id;
  return item;
}

// Create self URL
module.exports.addURL = function makeURL(item, baseURL) {
  item.self = URL + "/" + baseURL + "/" + item.id;
  return item;
}

// Create self URL
module.exports.makeURL = function makeURL(id, baseURL) {
  return URL + "/" + baseURL + "/" + id;
}
