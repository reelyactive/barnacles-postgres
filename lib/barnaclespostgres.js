/**
 * Copyright reelyActive 2025
 * We believe in an open Internet of Things
 */


const pg = require('pg');
const EventEmitter = require('events').EventEmitter;
const RaddecFilter = require('raddec-filter');
const DynambFilter = require('dynamb-filter');
const SpatemFilter = require('spatem-filter');


const DEFAULT_POSTGRES_USER = process.env.PGUSER || 'reelyactive';
const DEFAULT_POSTGRES_PASSWORD = process.env.PGPASSWORD || 'paretoanywhere';
const DEFAULT_POSTGRES_HOST = process.env.PGHOST || 'localhost';
const DEFAULT_POSTGRES_PORT = process.env.PGPORT || 5432;
const DEFAULT_POSTGRES_DATABASE = process.env.PGDATABASE || 'pareto_anywhere';
const DEFAULT_PRINT_ERRORS = false;
const DEFAULT_RADDEC_OPTIONS = { includePackets: false,
                                 filterParameters: {} };
const DEFAULT_DYNAMB_OPTIONS = { filterParameters: {} };
const DEFAULT_SPATEM_OPTIONS = { filterParameters: {} };
const DEFAULT_EVENTS_TO_STORE = { raddec: DEFAULT_RADDEC_OPTIONS,
                                  dynamb: DEFAULT_DYNAMB_OPTIONS,
                                  spatem: DEFAULT_SPATEM_OPTIONS };
const SUPPORTED_EVENTS = [ 'raddec', 'dynamb', 'spatem' ];
const EVENT_FILTER_CLASSES = { raddec: RaddecFilter,
                               dynamb: DynambFilter,
                               spatem: SpatemFilter };


/**
 * BarnaclesPostgres Class
 * Detects events and writes to a PostgreSQL database.
 */
class BarnaclesPostgres extends EventEmitter {

  /**
   * BarnaclesPostgres constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    super();
    let self = this;
    options = options || {};

    this.printErrors = options.printErrors || DEFAULT_PRINT_ERRORS;
    this.eventsToStore = {};
    let eventsToStore = options.eventsToStore || DEFAULT_EVENTS_TO_STORE;

    for(const event in eventsToStore) {
      let isSupportedEvent = SUPPORTED_EVENTS.includes(event);

      if(isSupportedEvent) {
        let eventToStore = eventsToStore[event] ||
                           DEFAULT_EVENTS_TO_STORE[event];
        let filterParameters = eventToStore.filterParameters || {};
        eventToStore.filter = new EVENT_FILTER_CLASSES[event](filterParameters);
        self.eventsToStore[event] = eventToStore;
      }
    }

    // The (provided) PostgreSQL pool has already been instantiated
    if(options.pool) {
      self.pool = options.pool;
    }
    // Create pool using the provided or default config
    else {
      self.pool = new pg.Pool({
          user: options.user || DEFAULT_POSTGRES_USER,
          password: options.password || DEFAULT_POSTGRES_PASSWORD,
          host: options.host || DEFAULT_POSTGRES_HOST,
          port: options.port || DEFAULT_POSTGRES_PORT,
          database: options.database || DEFAULT_POSTGRES_DATABASE
      });
      self.pool.on('error', (error, client) => { handleError(self, error); });
      testDatabaseConnection(self);
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

  if(raddecOptions.filter.isPassing(raddec)) {
    let flatRaddec = raddec.toFlattened({ includePackets: false });
    let text = 'INSERT INTO raddec (transmittersignature, timestamp, raddec) ' +
               'VALUES ($1, $2, $3) ' +
               'RETURNING _storeId';
    let values = [ raddec.signature, new Date(raddec.initialTime),
                   JSON.stringify(flatRaddec) ];

    instance.pool.query(text, values, (err, res) => {
      if(err) {
        handleError(instance, err);
      }
      else {
        let _storeId = res.rows[0]['_storeid'];
        let storedRaddec = Object.assign({ _storeId: _storeId }, flatRaddec);
        instance.emit('raddec', storedRaddec);
      }
    });
  }
}


/**
 * Handle the given dynamb by storing it in the PostgreSQL database.
 * @param {BarnaclesPostgres} instance The BarnaclesPostgres instance.
 * @param {Object} dynamb The dynamb data.
 */
function handleDynamb(instance, dynamb) {
  let dynambOptions = instance.eventsToStore['dynamb'];
  let deviceSignature = dynamb.deviceId + '/' + dynamb.deviceIdType;

  if(dynambOptions.filter.isPassing(dynamb)) {
    // TODO: replace this with dynamb-filter when available
    // accelerationTimeSeries property automatically removed due to its size
    let trimmedDynamb = Object.assign({}, dynamb);
    delete trimmedDynamb.accelerationTimeSeries;

    let text = 'INSERT INTO dynamb (devicesignature, timestamp, dynamb) ' +
               'VALUES ($1, $2, $3) ' +
               'RETURNING _storeId';
    let values = [ deviceSignature, new Date(trimmedDynamb.timestamp),
                   JSON.stringify(trimmedDynamb) ];

    instance.pool.query(text, values, (err, res) => {
      if(err) {
        handleError(instance, err);
      }
      else {
        let _storeId = res.rows[0]['_storeid'];
        let storedDynamb = Object.assign({ _storeId: _storeId }, trimmedDynamb);
        instance.emit('dynamb', storedDynamb);
      }
    });
  }
}


/**
 * Handle the given spatem by storing it in the PostgreSQL database.
 * @param {BarnaclesPostgres} instance The BarnaclesPostgres instance.
 * @param {Object} spatem The spatem data.
 */
function handleSpatem(instance, spatem) {
  let spatemOptions = instance.eventsToStore['spatem'];
  let deviceSignature = spatem.deviceId + '/' + spatem.deviceIdType;

  if(spatemOptions.filter.isPassing(spatem)) {
    let trimmedSpatem = Object.assign({}, spatem);
    let pointCoordinates;

    if(Array.isArray(spatem.data?.features) && spatem.data.features.length) {
      let primaryFeature = trimmedSpatem.data.features[0];
      if(primaryFeature?.geometry?.type === 'Point') {
        pointCoordinates = primaryFeature.geometry.coordinates;
      }
      trimmedSpatem.data.features.splice(1); // Retain only primary feature
    }

    if(Array.isArray(pointCoordinates) && (pointCoordinates.length >= 2)) {
      let text = 'INSERT INTO spatem ' +
                 '(devicesignature, timestamp, spatem, geom) ' +
                 'VALUES ($1, $2, $3, $4) ' +
                 'RETURNING _storeId';
      let point = 'POINT(' + pointCoordinates[0] + ' ' + pointCoordinates[1] +
                  ' ' + (pointCoordinates[2] || '0') + ')'; // Always 3D
      let values = [ deviceSignature, new Date(trimmedSpatem.timestamp),
                     JSON.stringify(trimmedSpatem), point ];

      instance.pool.query(text, values, (err, res) => {
        if(err) {
          handleError(instance, err);
        }
        else {
          let _storeId = res.rows[0]['_storeid'];
          let storedSpatem = Object.assign({ _storeId: _storeId },
                                           trimmedSpatem);
          instance.emit('spatem', storedSpatem);
        }
      });
    }
  }
}


/**
 * Attempt to connect to the database and print the connection status.
 * @param {BarnaclesPostgres} instance The BarnaclesPostgres instance.
 */
function testDatabaseConnection(instance) {
  instance.pool.connect((error, client, release) => {
    release();
    if(error && instance.printErrors) {
      console.log('barnacles-postgres: could not connect to database ->',
                  error.message);
    }
    else if(!error) {
      console.log('barnacles-postgres: connected to database');
    }
  });
}


/**
 * Handle the given error by logging to the console, if enabled.
 * @param {BarnaclesPostgres} instance The BarnaclesPostgres instance.
 * @param {Object} error The error.
 */
function handleError(instance, error) {
  if(instance.printErrors) {
    console.log('barnacles-postgres:', error.message);
  }
}


module.exports = BarnaclesPostgres;
