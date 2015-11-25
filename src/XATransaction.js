'use strict';

let uuid = require('uuid');

let XATransaction = module.exports = function(sequelize, options) {
  this.sequelize = sequelize;
  this.options = options || {};
  this.id = this.name = uuid.v4();
}

XATransaction.prototype.begin = function() {
  let self = this;
  return this
    .sequelize
    .getQueryInterface()
    .startXATransaction(this, this.options);
};

XATransaction.prototype.prepare = function() {
  let self = this;
  if (this.prepared) {
    throw new Error('XATransaction cannot be prepared because it has been committed with state: ' + self.prepared);
  }
  return this
    .sequelize
    .getQueryInterface()
    .prepareXATransaction(this, this.options)
    .finally(function() {
      self.prepared = 'prepared';
      self.cleanup();
    });
};

XATransaction.prototype.prepareEnvironment = function() {
  let self = this;

  return self.sequelize.Promise.resolve(
    self.sequelize.connectionManager.getConnection({
      uuid: self.id
    })
  ).then(function(connection) {
    self.connection = connection;
    self.connection.uuid = self.id;
  }).then(function() {
    return self.begin();
  }).catch(function(setupErr) {
    return self.rollback().finally(function() {
      throw setupErr;
    });
  }).tap(function() {
    if (self.sequelize.constructor.cls) {
      self.sequelize.constructor.cls.set('transaction', self);
    }
  });
};

XATransaction.prototype.setIsolationLevel = function() {
  return this
    .sequelize
    .getQueryInterface()
    .setIsolationLevel(this, this.options.isolationLevel, this.options);
};

XATransaction.prototype.rollback = function() {
  let self = this;

  if (this.finished) {
    throw new Error('Transaction cannot be rolled back because it has been finished with state: ' + self.finished);
  }

  this.$clearCls();

  return this
    .sequelize
    .getQueryInterface()
    .rollbackXATransaction(this, this.options)
    .finally(function() {
      self.finished = 'rollback';
      if (!self.parent) {
        self.cleanup();
      }
    });
};

XATransaction.prototype.cleanup = function() {
  let res = this.sequelize.connectionManager.releaseConnection(this.connection);
  this.connection.uuid = undefined;
  return res;
};

XATransaction.prototype.$clearCls = function() {
  let cls = this.sequelize.constructor.cls;

  if (cls) {
    if (cls.get('transaction') === this) {
      cls.set('transaction', null);
    }
  }
};
