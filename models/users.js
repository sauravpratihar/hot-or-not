var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var UserSchema   = new Schema({
    name: String,
    email: String,
    password: String,
    verified: { type: Boolean, default: false},
    created: { type: Date, default: Date.now},
    profile: {type: String, default: 'unknown.jpg'}
});

module.exports = mongoose.model('User', UserSchema);