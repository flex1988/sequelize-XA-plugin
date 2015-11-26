'use strict';

let XATransaction = require('./XATransaction.js');
let _ = require('lodash');
let request = require('request');
let qs = require('querystring');
let util = require('util');

exports = module.exports = XAPlugin;

function XAPlugin(sequelize, options) {
  util.inherits(XATransaction, sequelize.__proto__.Transaction);
  require('./addAttributes.js')(XATransaction);

  let queryInterface = sequelize.getQueryInterface();
  queryInterface.startXATransaction = function(xa, options) {
    if (!xa || !(xa instanceof XATransaction)) {
      throw new Error('Ubable to start a transaction without transaction object');
    }
    options = _.assign({}, options || {}, {
      transaction: xa.parent || xa
    });
    return this.sequelize.query('BEGIN;', options);
  };

  queryInterface.prepareXATransaction = function(xa, options) {
    if (!xa || !(xa instanceof XATransaction)) {
      throw new Error('Ubable to start a transaction without transaction object');
    }
    options = _.assign({}, options || {}, {
      transaction: xa.parent || xa
    });
    return this.sequelize.query('PREPARE TRANSACTION \'' + xa.id + '\';', options);
  };

  queryInterface.rollbackXATransaction = function(xa, options) {
    if (!xa || !(xa instanceof XATransaction)) {
      throw new Error('Ubable to start a transaction without transaction object');
    }
    options = _.assign({}, options || {}, {
      transaction: xa.parent || xa
    });
    return this.sequelize.query('ROLLBACK;', options);
  }

  sequelize.__proto__.XATransaction = function(options, autoCallback) {
    if (typeof options === 'function') {
      autoCallback = options;
      options = undefined;
    }

    let transaction = new XATransaction(this, options);
    let ns = Sequelize.cls;
    if (autoCallback) {
      let transactionResolver = function(resolve, reject) {
        transaction.prepareEnvironment().then(function() {
          if (ns) {
            autoCallback = ns.bind(autoCallback);
          }

          let result = autoCallback(transaction);
          if (!result || !result.then) throw new Error('You need to return a promise chain/thenable to the sequelize.XATransaction() callback');

          return result.then(function(result) {
            return transaction.prepare().then(function() {
              resolve(result);
            });
          });
        }).then(function() {

          request({
            method: 'put',
            uri: options.transactionManager +  options.xid,
            form: qs.stringify({
              name: options.name,
              status: 'READY',
              id: transaction.id,
              callback: options.callback
            })
          });
        }).catch(function(err) {
          //通知TM rollback
          if (transaction.finished === 'ROLLBACK') {
            reject(err);
          } else if (transaction.prepared !== 'PREPARE') {
            transaction.rollback().finally(function() {
              reject(err);
            });
          }

          let status = transaction.prepared || transaction.finished || 'ERROR';

          request({
            method: 'put',
            uri: options.transactionManager + options.xid,
            form: qs.stringify({
              name: options.name,
              status: status,
              id: transaction.id,
              callback: options.callback
            })
          });
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

  sequelize.__proto__.finishPrepared = function(tid, action) {
    return this.query(action + ' PREPARED \'' + tid + '\';');
  }

  return sequelize;
}
