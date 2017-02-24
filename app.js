/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */

'use strict';

require( 'dotenv' ).config( {silent: true} );

var express = require( 'express' );  // app server
var bodyParser = require( 'body-parser' );  // parser for post requests
var Watson = require( 'watson-developer-cloud/conversation/v1' );  // watson sdk
//var cors = require('cors');

// The following requires are needed for logging purposes
var uuid = require( 'uuid' );
var vcapServices = require( 'vcap_services' );
var basicAuth = require( 'basic-auth-connect' );

// The app owner may optionally configure a cloudand db to track user input.
// This cloudand db is not required, the app will operate without it.
// If logging is enabled the app must also enable basic auth to secure logging
// endpoints
var cloudantCredentials = vcapServices.getCredentials( 'cloudantNoSQLDB' );
var cloudantUrl = null;
if ( cloudantCredentials ) {
  cloudantUrl = cloudantCredentials.url;
}
cloudantUrl = cloudantUrl || process.env.CLOUDANT_URL; // || '<cloudant_url>';
var logs = null;
var watsonapp = express();

// Bootstrap application settings
watsonapp.use( express.static( './public' ) ); // load UI from public folder
watsonapp.use( bodyParser.json() );
//watsonapp.use(cors());


// Create the service wrapper
var conversation = new Watson( {
  url: 'https://gateway.watsonplatform.net/conversation/api',
  username: process.env.CONVERSATION_USERNAME,
  password: process.env.CONVERSATION_PASSWORD,
//  username: process.env.CONVERSATION_USERNAME || '<username>',
//  password: process.env.CONVERSATION_PASSWORD || '<password>',
  version_date: '2016-09-20',
  version: 'v1'
} );

/*var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'hhttp://localhost:8888/WatsonServices/watsontest/');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
}*/

/*var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:8888');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
}*/

var watsonAPI = require('watson-developer-cloud');
var alchemy_language = watsonAPI.alchemy_language({
  api_key: 'f300a6f9d8caf98b17c828f08655cdff174b8b58'
})

//var parametersAPI = {  text: 'Estoy realmente contento, esto es fantastico, lo mejor. Soy Feliz.' };

// Endpoint to be call from the client side
watsonapp.post( '/api/message', function(req, res) {
  //var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  var workspace = process.env.WORKSPACE_ID
  if ( !workspace || workspace === '<workspace-id>' ) {
    return res.json( {
      'output': {
        'text': 'Orange app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' +
        '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' +
        'Once a workspace has been defined the intents may be imported from ' +
        '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    } );
  }
  var payload = {
    workspace_id: workspace,
    context: {},
    input: {}
  };
  if ( req.body ) {
    if ( req.body.input ) {
      payload.input = req.body.input;
    }
    if ( req.body.context ) {
      // The client must maintain context/state
      payload.context = req.body.context;
    }
  }
  // Send the input to the conversation service
  conversation.message( payload, function(err, data) {
    if ( err ) {
      return res.status( err.code || 500 ).json( err );
    }
    return res.json( updateMessage( payload, data ) );
  } );
} );

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response) {
  var responseText = null;
  var miresponsed =null;
  var id = null;
  if ( !response.output ) {
    response.output = {};
  } else {
    if ( logs ) {
      // If the logs db is set, then we want to record all input and responses
      id = uuid.v4();
      
      var parametersAPI = {  text: input.input.text };
      alchemy_language.sentiment(parametersAPI, function (err, miresponsed) {
      
        if (err) {
         console.log('error:', err);
         logs.insert( {'_id': id, 'request': input, 'response': response,'SINsentimiento': miresponsed, 'time': new Date()});
       } else {
//       logs.insert( {'_id': id,'dialogo':input, 'request': input.input.text, 'intencion': response.intents.intent, 'confianza': response.intents.confidence,'sentimiento': miresponsed, 'time': new Date()});
         logs.insert( {'_id': id, 'request': input.input.text, 'response': response.intents,'sentimiento': miresponsed.docSentiment, 'time': new Date()});
         console.log(JSON.stringify(miresponsed, null, 2));
         console.log(JSON.stringify(input.input, null, 2));  
       } 
        });
//debug      logs.insert( {'_id': id, 'request': input, 'response': response,'sentimiento': miresponsed, 'time': new Date()});
//logs.insert( {'_id': id, 'request': input, 'response': response,'sentimiento': miresponsed, 'time': new Date()});

      
    }
    return response;
  }
  if ( response.intents && response.intents[0] ) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if ( intent.confidence >= 0.75 ) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if ( intent.confidence >= 0.5 ) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  if ( logs ) {
    // If the logs db is set, then we want to record all input and responses
    id = uuid.v4();
    logs.insert( {'_id': id, 'request': input, 'response': response,'unchurro': new Date(), 'time': new Date()});
  }
  return response;
}

if ( cloudantUrl ) {
  // If logging has been enabled (as signalled by the presence of the cloudantUrl) then the
  // app developer must also specify a USER and LOG_PASS env vars.
  if ( !process.env.LOG_USER || !process.env.LOG_PASS ) {
    throw new Error( 'LOG_USER OR LOG_PASS not defined, both required to enable logging!' );
  }
  // add basic auth to the endpoints to retrieve the logs!
  var auth = basicAuth( process.env.LOG_USER, process.env.LOG_PASS );
  // If the cloudantUrl has been configured then we will want to set up a nano client
  var nano = require( 'nano' )( cloudantUrl );
  // add a new API which allows us to retrieve the logs (note this is not secure)
  nano.db.get( 'orangelove_logs', function(err) {
    if ( err ) {
      console.error(err);
      nano.db.create( 'orangelove_logs', function(errCreate) {
        console.error(errCreate);
        logs = nano.db.use( 'orangelove_logs' );
      } );
    } else {
      logs = nano.db.use( 'orangelove_logs' );
    }
  } );

  // Endpoint which allows deletion of db
  watsonapp.post( '/clearDb', auth, function(req, res) {
    nano.db.destroy( 'orangelove_logs', function() {
      nano.db.create( 'orangelove_logs', function() {
        logs = nano.db.use( 'orangelove_logs' );
      } );
    } );
    return res.json( {'message': 'Clearing db'} );
  } );

  // Endpoint which allows conversation logs to be fetched
  watsonapp.get( '/chats', auth, function(req, res) {
    logs.list( {include_docs: true, 'descending': true}, function(err, body) {
      console.error(err);
      // download as CSV
      var csv = [];
      csv.push( ['Question', 'Intent', 'Confidence', 'Entity', 'Output', 'Time'] );
      body.rows.sort( function(a, b) {
        if ( a && b && a.doc && b.doc ) {
          var date1 = new Date( a.doc.time );
          var date2 = new Date( b.doc.time );
          var t1 = date1.getTime();
          var t2 = date2.getTime();
          var aGreaterThanB = t1 > t2;
          var equal = t1 === t2;
          if (aGreaterThanB) {
            return 1;
          }
          return  equal ? 0 : -1;
        }
      } );
      body.rows.forEach( function(row) {
        var question = '';
        var intent = '';
        var confidence = 0;
        var time = '';
        var entity = '';
        var outputText = '';
        if ( row.doc ) {
          var doc = row.doc;
          if ( doc.request && doc.request.input ) {
            question = doc.request.input.text;
          }
          if ( doc.response ) {
            intent = '<no intent>';
            if ( doc.response.intents && doc.response.intents.length > 0 ) {
              intent = doc.response.intents[0].intent;
              confidence = doc.response.intents[0].confidence;
            }
            entity = '<no entity>';
            if ( doc.response.entities && doc.response.entities.length > 0 ) {
              entity = doc.response.entities[0].entity + ' : ' + doc.response.entities[0].value;
            }
            outputText = '<no dialog>';
            if ( doc.response.output && doc.response.output.text ) {
              outputText = doc.response.output.text.join( ' ' );
            }
          }
          time = new Date( doc.time ).toLocaleString();
        }
        csv.push( [question, intent, confidence, entity, outputText, time] );
      } );
      res.csv( csv );
    } );
  } );
}

module.exports = watsonapp;
