let {google} = require('googleapis');
let privatekey = require("./privatekey.json");

let jwtClient = new google.auth.JWT(
       privatekey.client_email,
       null,
       privatekey.private_key,
       ['https://www.googleapis.com/auth/drive']);

module.exports = {
  jwtClient: function() {return jwtClient},
  google: function() {return google}
}
