barnacles-postgres
==================

Write ambient IoT data from Pareto Anywhere open source middleware to a PostgreSQL database.


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

Environment variables, when used, take precedence over the default values.


PostgreSQL Installation
-----------------------

[Download PostgreSQL](https://www.postgresql.org/download/) or follow the OS-specific instructions below.

### Ubuntu / Raspberry Pi OS (64-bit)

```
sudo apt install postgresql
sudo systemctl start postgresql.service
sudo -u postgres createuser --login --pwprompt reelyactive
sudo -u postgres createdb pareto_anywhere
```


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