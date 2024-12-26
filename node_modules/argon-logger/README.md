# Argon logger [![Build Status](https://travis-ci.org/scssyworks/argon-logger.svg?branch=master)](https://travis-ci.org/scssyworks/argon-logger)
Argon logger is a simple console utility with options to enable/disable logs for any environment. Argon logger extends the existing console API, there it works the same as ``console.log`` but with more control and flexibility. Additionally, it doesn't throw any linting error (unless someone decides to create a rule for ``logger.log`` too).

# Installation

```sh
npm i argon-logger
```

# How it works?

Argon logger is simple to use.

## Without configuration

```js
import Logger from 'argon-logger';

const logger = new Logger();

logger.log('Hello'); // -> Hello
logger.warn('This is a warning'); // -> This is a warning
logger.error('This is an error'); // -> This is an error
logger.debug('This is a debug message'); // -> This is a debug message
...
```

By default argon logger enables log statements for localhost URLs or URLs containing ``debug`` as a search parameter. We can change this behavior by providing a configuration.

## With configuration

```js
const logger = new Logger({
    allowedHostnames: ['google.com'], // List of hostnames allowed. Set this to an empty array to allow logs everywhere.
    allowedQueryStringParameters: ['debug=true'], // List of query string parameters for which logs should be generated.
    allowedPorts: [], // List of ports for which logging should be enabled
    test: () => { ... }, // A test function for full flexibility on customizing where to hide the logs
                         // A test function overrides existing filters.
    disable: false // If set to "true" disables the logging completely. The remaining two parameters are ignored.
});

logger.log('Hello'); // Hello
logger.warn('This is a warning'); // This is a warning
...
```

# Disclaimer

Argon logger doesn't have any major releases yet. It means it has potential to break in few scenarios. We need your contribution to make it better. Please email at <a href="mailto:contactsachinsingh@gmail.com">contactsachinsingh@gmail.com</a> if you want to become a contributor.