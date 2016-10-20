// app/models/content.js
// cargando lo que se necesita
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// define el esquema
var contentSchema = new Schema({
	id : Number,
	title : String,
	subTitle : String,
	textContent : String,
	user : String,
	created_at: Date,
	updated_at : Date
});

// metodos ======================
// generador de hash
contentSchema.methods.generateHash = function(password) {
    
};

contentSchema.pre('save', function(next) {
  var currentDate = new Date();
  
  this.updated_at = currentDate;

  if (!this.created_at)
    this.created_at = currentDate;

  next();
});

// contentSchema.index({ id: 1 }, {unique: true});

module.exports = mongoose.model('Content', contentSchema);
