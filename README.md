# sequelize-XA-plugin
sequelize XA plugin

## support sequelize for xa distribute protocol

## Usage

1. Prepare Environment,support postgres only,edit postgresql.conf set max_prepared_transactions = 10

2. Init sequelize
  ```javascript
  let xaPlugin = require('sequelize-xa-plugin');
  let sequelize = new Sequelize('database', 'user', 'pwd', {
    dialect: 'postgres',
    host: 'localhost',
    port: 5432,
    timezone: '+00:00',
    logging: undefined,
    pool: {
        maxConnections: 10
    }
  });
  sequelize = xaPlugin(sequelize);
  ```
3. XATransaction function

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
4. XA callback to commit or roolback prepared transaction

  ```javascript
  yield sequelize.finishPrepared(transactionId, action);
  ```
