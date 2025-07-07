/**
 * Copyright reelyActive 2025
 * We believe in an open Internet of Things
 */


const pg = require('pg');


const DEFAULT_POSTGRES_USER = process.env.PGUSER || 'reelyactive';
const DEFAULT_POSTGRES_PASSWORD = process.env.PGPASSWORD || 'paretoanywhere';
const DEFAULT_POSTGRES_HOST = process.env.PGHOST || 'localhost';
const DEFAULT_POSTGRES_PORT = process.env.PGPORT || 5432;
const DEFAULT_POSTGRES_DATABASE = process.env.PGDATABASE || 'pareto_anywhere';
const DEFAULT_PRINT_ERRORS = false;
const DEFAULT_RADDEC_OPTIONS = { includePackets: false };
const DEFAULT_DYNAMB_OPTIONS = {};
const DEFAULT_SPATEM_OPTIONS = {};
const DEFAULT_EVENTS_TO_STORE = { raddec: DEFAULT_RADDEC_OPTIONS,
                                  dynamb: DEFAULT_DYNAMB_OPTIONS,
                                  spatem: DEFAULT_SPATEM_OPTIONS };
const SUPPORTED_EVENTS = [ 'raddec', 'dynamb', 'spatem' ];


/**
 * BarnaclesPostgres Class
 * Detects events and writes to a PostgreSQL database.
 */
class BarnaclesPostgres {

  /**
   * BarnaclesPostgres constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    let self = this;
    options = options || {};

    this.printErrors = options.printErrors || DEFAULT_PRINT_ERRORS;
    this.eventsToStore = {};
    let eventsToStore = options.eventsToStore || DEFAULT_EVENTS_TO_STORE;

    for(const event in eventsToStore) {
      let isSupportedEvent = SUPPORTED_EVENTS.includes(event);

      if(isSupportedEvent) {
        self.eventsToStore[event] = eventsToStore[event] ||
                                    DEFAULT_EVENTS_TO_STORE[event];
      }
    }

    // The (provided) PostgreSQL client has already been instantiated
    if(options.client) {
      self.client = options.client;
    }
    // Create client using the provided or default config
    else {
      self.client = new pg.Client({
          user: options.user || DEFAULT_POSTGRES_USER,
          password: options.password || DEFAULT_POSTGRES_PASSWORD,
          host: options.host || DEFAULT_POSTGRES_HOST,
          port: options.port || DEFAULT_POSTGRES_PORT,
          database: options.database || DEFAULT_POSTGRES_DATABASE
      });
      self.client.connect((error) => {
        if(error && self.printErrors) {
          console.log('barnacles-postgres: could not connect to database ->',
                      error.message);
        }
        else if(!error) {
          console.log('barnacles-postgres: connected to database');
        }
      });
    }
  }

  /**
   * Handle an outbound event.
   * @param {String} name The outbound event name.
   * @param {Object} data The outbound event data.
   */
  handleEvent(name, data) {
    let self = this;
    let isEventToStore = self.eventsToStore.hasOwnProperty(name);

    if(isEventToStore) {
      switch(name) {
        case 'raddec':
          return handleRaddec(self, data);
        case 'dynamb':
          return handleDynamb(self, data);
        case 'spatem':
          return handleSpatem(self, data);
      }
    }
  }
}


/**
 * Handle the given raddec by storing it in the PostgreSQL database.
 * @param {BarnaclesPostgres} instance The BarnaclesPostgres instance.
 * @param {Object} raddec The raddec data.
 */
function handleRaddec(instance, raddec) {
  let raddecOptions = instance.eventsToStore['raddec'];
  let flatRaddec = raddec.toFlattened({ includePackets: false });
  let text = 'INSERT INTO raddec (transmitterid, timestamp, raddec) ' +
             'VALUES ($1, to_timestamp($2), $3) ' +
             'RETURNING _storeId';
  let values = [ raddec.transmitterId, raddec.initialTime,
                 JSON.stringify(flatRaddec) ];

  instance.client.query(text, values, (err, res) => {
    if(err) {
      handleError(instance, err);
    }
    else {
      let storeId = res.rows[0]['_storeid'];
      // TODO: emit raddec with _storeId
    }
  });
}


/**
 * Handle the given dynamb by storing it in the PostgreSQL database.
 * @param {BarnaclesPostgres} instance The BarnaclesPostgres instance.
 * @param {Object} dynamb The dynamb data.
 */
function handleDynamb(instance, dynamb) {
  let dynambOptions = instance.eventsToStore['dynamb'];
  let text = 'INSERT INTO dynamb (deviceid, timestamp, dynamb) ' +
             'VALUES ($1, to_timestamp($2), $3) ' +
             'RETURNING _storeId';
  let values = [ dynamb.deviceId, dynamb.timestamp, JSON.stringify(dynamb) ];

  instance.client.query(text, values, (err, res) => {
    if(err) {
      handleError(instance, err);
    }
    else {
      let storeId = res.rows[0]['_storeid'];
      // TODO: emit dynamb with _storeId
    }
  });
}


/**
 * Handle the given spatem by storing it in the PostgreSQL database.
 * @param {BarnaclesPostgres} instance The BarnaclesPostgres instance.
 * @param {Object} spatem The spatem data.
 */
function handleSpatem(instance, dynamb) {
  let spatemOptions = instance.eventsToStore['spatem'];

  // TODO: store spatem
}


/**
 * Handle the given error by logging to the console, if enabled.
 * @param {BarnaclesPostgres} instance The BarnaclesPostgres instance.
 * @param {Object} error The error.
 */
function handleError(instance, error) {
  if(instance.printErrors) {
    console.log('barnacles-postgres:', error);
  }
}


module.exports = BarnaclesPostgres;
