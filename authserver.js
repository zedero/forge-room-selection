let express = require('express');
let request = require('request');
let credentials = require('./client-credentials');
let app = express();

const client_id = credentials.client_id;
const client_secret = credentials.client_secret;
const POST_AUTH_URL = 'https://developer.api.autodesk.com/authentication/v1/authenticate';


app.get('/getAccessToken', function (req, res) {
  getAndReturnAccessToken(res);
});

app.listen(3000, function () {
  console.log('Auth app listening on port 3000!');
});


function getAndReturnAccessToken(res) {
  let body = {
    client_id: client_id,
    client_secret: client_secret,
    grant_type: 'client_credentials',
    scope: 'data:read',
  };
  let callData = {
    url: POST_AUTH_URL,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: body,
  };

  let access_token;

  request.post(callData, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      response = JSON.parse(body);
      access_token = response.access_token;
      res.end(access_token);
    } else {
      console.log('==== FORGE API error ====');
      console.log(error,response);
      console.log('========================');
      res.end(access_token);
    }
  });
}