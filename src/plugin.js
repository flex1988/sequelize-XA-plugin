'use strict';

let XATransaction = require('./XATransaction.js');
let _ = require('lodash');

exports = module.exports = XAPlugin;

function XAPlugin(sequelize, options) {
  let queryInterface = sequelize.getQueryInterface();

  queryInterface.startXATransaction = function(xa, options) {
    if (!xa || !(xa instanceof XATransaction)) {
      throw new Error('Ubable to start a transaction without transaction object');
    }
    options = _.assign({}, options || {}, {
      transaction: xa
    });
    return this.sequelize.query('BEGIN;', options);
  };

  queryInterface.prepareXATransaction = function(xa, options) {
    console.log(xa.id);
    if (!xa || !(xa instanceof XATransaction)) {
      throw new Error('Ubable to start a transaction without transaction object');
    }
    options = _.assign({}, options || {}, {
      transaction: xa
    });
    return this.sequelize.query('PREPARE TRANSACTION \'' + xa.id + '\';', options);
  };

  queryInterface.rollbackXATransaction = function(xa, options) {
    if (!xa || !(xa instanceof XATransaction)) {
      throw new Error('Ubable to start a transaction without transaction object');
    }
    options = _.assign({}, options || {}, {
      transaction: xa
    });
    return this.sequelize.query('ROLL BACK;', options);
  }

  sequelize.XATransaction = function(options, autoCallback) {
    if (typeof options === 'function') {
      autoCallback = options;
      options = undefined;
    }

    let transaction = new XATransaction(this, options);
    let ns = Sequelize.cls;
    if (autoCallback) {
      var transactionResolver = function(resolve, reject) {
        transaction.prepareEnvironment().then(function() {
          if (ns) {
            autoCallback = ns.bind(autoCallback);
          }

          var result = autoCallback(transaction);
          if (!result || !result.then) throw new Error('You need to return a promise chain/thenable to the sequelize.XATransaction() callback');

          return result.then(function(result) {
            return transaction.prepare().then(function() {
              resolve(result);
            });
          });
        }).catch(function(err) {
          //todo 通知TM rollback
          //
          console.log(err);
        });
      };
      if (ns) {
        transactionResolver = ns.bind(transactionResolver, ns.createContext());
      }

      return new Promise(transactionResolver);
    } else {
      return transaction.prepareEnvironment().return(transaction);
    }
  }

  sequelize.commitPrepared = function(tid) {
    return this.query('COMMIT PREPARED \'' + tid + '\';', options);
  }

  return sequelize;
}

