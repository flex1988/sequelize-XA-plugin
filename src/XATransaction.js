'use strict';

let uuid = require('uuid');

let XATransaction = module.exports = function(sequelize, options) {
  this.sequelize = sequelize;
  this.savepoints = [];
  this.options = options || {};

  this.parent = this.options.transaction;
  this.id = this.parent ? this.parent.id : uuid.v4();

  if (this.parent) {
    this.id = this.parent.id;
    this.parent.savepoints.push(this);
    this.name = this.id + '-savepoint-' + this.parent.savepoints.length;
  } else {
    this.id = this.name = uuid.v4();
  }

  delete this.options.transaction;
}
