barnacles-postgres
==================

__barnacles-postgres__ writes ambient IoT data to a PostgreSQL database.

![Overview of barnacles-postgres](https://reelyactive.github.io/barnacles-postgres/images/overview.png)

__barnacles-postgres__ ingests a real-time stream of _raddec_ & _dynamb_ objects from [barnacles](https://github.com/reelyactive/barnacles/), and _spatem_ objects from [chimps](https://github.com/reelyactive/chimps/), which it writes to a given PostgreSQL database.  It couples seamlessly with reelyActive's [Pareto Anywhere](https://www.reelyactive.com/pareto/anywhere/) open source IoT middleware.

__barnacles-postgres__ is a lightweight [Node.js package](https://www.npmjs.com/package/barnacles-postgres) that can run on resource-constrained edge devices as well as on powerful cloud servers and anything in between.


Pareto Anywhere integration
---------------------------

A common application of __barnacles-postgres__ is to write IoT data from [pareto-anywhere](https://github.com/reelyactive/pareto-anywhere) to a PostgreSQL database.  Simply follow our [Create a Pareto Anywhere startup script](https://reelyactive.github.io/diy/pareto-anywhere-startup-script/) tutorial using the script below:

```javascript
#!/usr/bin/env node

const ParetoAnywhere = require('../lib/paretoanywhere.js');

// Edit the options to specify the PostgreSQL instance
const BARNACLES_POSTGRES_OPTIONS = {};

// ----- Exit gracefully if the optional dependency is not found -----
let BarnaclesPostgres;
try {
  BarnaclesPostgres = require('barnacles-postgres');
}
catch(err) {
  console.log('This script requires barnacles-postgres.  Install with:');
  console.log('\r\n    "npm install barnacles-postgres"\r\n');
  return console.log('and then run this script again.');
}
// -------------------------------------------------------------------

let pa = new ParetoAnywhere();
pa.barnacles.addInterface(BarnaclesPostgres, BARNACLES_POSTGRES_OPTIONS);
```


Options
-------

__barnacles-postgres__ supports the following options:

| Property      | Default                    | Environment variable           | 
|:--------------|:---------------------------|:-------------------------------|
| user          | "reelyactive"              | PGUSER                         |
| password      | "paretoanywhere"           | PGPASSWORD                     |
| host          | "localhost"                | PGHOST                         |
| port          | 5432                       | PGPORT                         |
| database      | "pareto_anywhere"          | PGDATABASE                     |
| eventsToStore | { raddec: {}, dynamb: {}, spatem: {} } | n/a                |
| pool          | null                       | n/a                            |
| printErrors   | false                      | n/a                            |

Environment variables, when used, take precedence over the default values.

### eventsToStore

The _eventsToStore_ option determines which events (_raddec_, _dynamb_ and/or _spatem_) are to be stored in the database, and any event-specific options such as filter parameters.  For instance, to store only _dynamb_ objects with a given _deviceId_:

    {
      dynamb: {
        filterParameters: { acceptedDeviceIds: [ 'bada55beac04' ] }
      }
    }

Each event supports _filterParameters_.  Consult the [raddec-filter](https://github.com/reelyactive/raddec-filter/), [dynamb-filter](https://github.com/reelyactive/dynamb-filter/) and [spatem-filter](https://github.com/reelyactive/spatem-filter/) documentation for their respective parameters.


PostgreSQL Installation
-----------------------

[Download PostgreSQL](https://www.postgresql.org/download/) or follow the OS-specific instructions below.  __barnacles-postgres__ will automatically connect to a locally-installed PostgreSQL database which observes the default options above.

### Ubuntu / Raspberry Pi OS (64-bit)

```
sudo apt install postgresql
sudo systemctl start postgresql.service
sudo -u postgres createuser --login --pwprompt reelyactive
sudo -u postgres createdb -O reelyactive pareto_anywhere
```


Creating Tables
---------------

Data is stored in three tables: raddec, dynamb and spatem.  These tables must be explicitly created after the database is created.  On Linux systems, run the following script to create these tables:

    npm run create-tables

Alternatively, each table can be manually created with the following SQL commands:

```sql
CREATE TABLE raddec (
    _storeid bigint GENERATED ALWAYS AS IDENTITY,
    transmittersignature varchar(36) NOT NULL,
    timestamp timestamptz DEFAULT current_timestamp,
    raddec JSONB NOT NULL
);

CREATE TABLE dynamb (
    _storeId bigint GENERATED ALWAYS AS IDENTITY,
    devicesignature varchar(36) NOT NULL,
    timestamp timestamptz DEFAULT current_timestamp,
    dynamb JSONB NOT NULL
);

CREATE TABLE spatem (
    _storeId bigint GENERATED ALWAYS AS IDENTITY,
    devicesignature varchar(36) NOT NULL,
    timestamp timestamptz DEFAULT current_timestamp,
    spatem JSONB NOT NULL
);
```


Creating Indexes
----------------

To facilitate efficient queries at scale, the transmitterid/deviceid and timestamp columns may be indexed.  On Linux systems, run the following script to create these indexes:

    npm run create-indexes

Alternatively, each index can be manually created with the following SQL commands:

```sql
CREATE INDEX raddec_transmitter_idx ON raddec (transmittersignature);
CREATE INDEX raddec_timestamp_idx ON raddec USING BRIN(timestamp);

CREATE INDEX dynamb_device_idx ON dynamb (devicesignature);
CREATE INDEX dynamb_timestamp_idx ON dynamb USING BRIN(timestamp);

CREATE INDEX spatem_device_idx ON spatem (devicesignature);
CREATE INDEX spatem_timestamp_idx ON spatem USING BRIN(timestamp);
```


Importing data from CSV files
-----------------------------

To import _raddec_ data from a CSV file into a local PostgreSQL database, run the following script:

    npm run import-raddec-csv filename.csv

Change `filename.csv` to the name/path of the source file.


Contributing
------------

Discover [how to contribute](CONTRIBUTING.md) to this open source project which upholds a standard [code of conduct](CODE_OF_CONDUCT.md).


Security
--------

Consult our [security policy](SECURITY.md) for best practices using this open source software and to report vulnerabilities.


License
-------

MIT License

Copyright (c) 2025 [reelyActive](https://www.reelyactive.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.