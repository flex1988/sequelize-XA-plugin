# sequelize-XA-plugin
sequelize XA plugin

## support sequelize for xa distribute protocol

## Usage

1. Prepare Environment,support postgres only,edit postgresql.conf set max_prepared_transactions = 10

2. Init sequelize
  ```javascript
  let xaPlugin = require('sequelize-xa-plugin');
  sequelize = new Sequelize(config.db.dbname, config.db.username, config.db.password, {
    dialect: 'mysql',
    host: config.db.host,
    port: config.db.port,
    timezone: '+08:00',
    logging: undefined,
    pool: {
        maxConnections: config.db.pool
    }
  });
  sequelize = xaPlugin(sequelize);
  ```
3. Add XATransaction function
  ```javascript
  yield db.XATransaction({
      transactionManager: 'TM URL',
      xid: 'TM ID',
      name: 'child service name',
      callback: 'child transaction callback',
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED
    }, function(t) {
      return co(function*() {
        //...do something to database
      });
    });
  ```
4. Add XA callback to commit or roolback prepared transaction
  ```javascript
  yield sequelize.finishPrepared(transactionId, action);
  ```