'use strict';

var MessageDigest = require('dw/crypto/MessageDigest');
var Bytes = require('dw/util/Bytes');
var Encoding = require('dw/crypto/Encoding');

/**
 * Hash function with MD5 algorithm
 * @param {string} data Input value
 * @returns {string} Return hash value
 */
function hashMD5(data) {
    var messageDigest = new MessageDigest(MessageDigest.DIGEST_MD5);
    var hashByte = messageDigest.digestBytes(new Bytes(data));
    var hashString = Encoding.toBase64(hashByte);
    return hashString;
}

var hashHelpers = {
    hashMD5: hashMD5
};

module.exports = hashHelpers;
