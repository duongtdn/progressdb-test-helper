"use strict"

const DatabaseAbstractor = require('database-abstractor');

const progressdb = new DatabaseAbstractor();

const db = {
  host: null,
  port: null
}

module.exports = {

  _dbready: false,

  _tables: null,

  _users: {},

  queue: [],

  use({host, port}) {
    db.host = host;
    db.port = port;

    progressdb.use(require('progressdb-dynamodb-driver')(
      {
        region : 'us-west-2', 
        endpoint : `${db.host}:${db.port}`
      },
      (err, data) => {
        if (err) {
          console.log('Failed to init local db')
          throw new Error(err)
        } else {
          this._dbready = true;
          this._tables = data.TableNames;
          if (this.queue.length > 0) {
            this.queue.forEach(fn => this[fn.name].apply(this,fn.args))
          }
        }
      }
    ))

    return this;
  },

  init(done) {
    if (!db.host && !db.port) {
      throw new Error('host and port of database must be define.')
    }
    if (this._tables) {
      if (this._tables.indexOf('PROGRESS') === -1) {
        console.log('\nInitializing PROGRESS Table...')
        return this.new(() => {
          console.log('PROGRESS Table is created and ready to use.');
          done && done();
        });
      } else {
        console.log('PROGRESS Table already exists')
        done && done();
        return this;
      }
    } else {
      this.queue.push({name: 'init', args: [done]})
    }
  },

  new(done) {
    if (!db.host && !db.port) {
      throw new Error('host and port of database must be define.')
    }
    if (this._dbready) {
      progressdb.createTable((err, data) => {
        if (err) {
          console.log('Failed to create PROGRESS table')
          console.log(err);
        } else {  
          done && done();
        }
      })
    } else {
      this.queue.push({name: 'new', args: [done]})
    }
    return this;
  },

  reset () {
    if (!db.host && !db.port) {
      throw new Error('host and port of database must be define.')
    }
    const self = this;
    if (this._dbready) {
      progressdb.dropTable(function(err, data) {
        if (err) {
          console.log('Failed to drop PROGRESS table')
          console.log(err);
        } else {
          console.log('Dropped old PROGRESS table')
          progressdb.createTable((err, data) => {
            if (err) {
              console.log('Failed to create PROGRESS table')
              console.log(err);
            } else {  
              done && done();
            }
          })
        }
      })
    } else {
      this.queue.push({name: 'reset', args: [done]})
    }
    return this;
  },

}

