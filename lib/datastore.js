// Set up Google Cloud datastore client
const { Datastore } = require('@google-cloud/datastore');
const projectId = 'cs493-final-project-87684';

module.exports.Datastore = Datastore;
const datastore = module.exports.datastore = new Datastore({
  projectId: projectId,
  keyFilename: 'keyfile.json'
});
