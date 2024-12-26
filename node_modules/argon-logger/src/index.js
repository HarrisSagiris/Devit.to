/**
 * Tests if current host name matches allowed hostnames
 * @param {string} hostname Current hostname
 * @param {object} config Configuration
 */
function matchesURL(hostname, config) {
    const allowedHostnames = Array.isArray(config.allowedHostnames) ? config.allowedHostnames : [];
    if (allowedHostnames.length === 0) {
        return true;
    }
    return !!allowedHostnames.filter(URL => (URL.indexOf(hostname) > -1)).length;
}

/**
 * Checks if given port is allowed
 * @param {string} port Current port
 * @param {object} config Configuration
 */
function matchesPort(port, config) {
    let allowedPorts = Array.isArray(config.allowedPorts) ? config.allowedPorts : [];
    allowedPorts = allowedPorts.map(port => (`${port}`).trim());
    if (allowedPorts.length === 0) {
        return true;
    }
    return (allowedPorts.indexOf(port) > -1);
}

/**
 * Returns a map of query string key value pairs
 * @param {string} queryString Current query string
 */
function getAllParams(queryString) {
    queryString = queryString.substring(queryString.charAt(0) === '?' ? 1 : 0);
    return queryString.split('&').map((pairs) => {
        const [key, value] = pairs.split('=').map(part => decodeURIComponent(part).trim());
        return { key, value };
    });
}

/**
 * Alias for hasOwnProperty
 * @param {object} object Target object
 * @param {string} key Key name
 */
function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

/**
 * Tests if any existing query parameter matches configuration
 * @param {string} queryString Query string
 * @param {object} config Configuration
 */
function matchesQueryParam(queryString, config) {
    const allowedQueryStringParameters = Array.isArray(config.allowedQueryStringParameters) ? config.allowedQueryStringParameters : [];
    const allParams = getAllParams(queryString);
    const allowedParams = [];
    allowedQueryStringParameters.forEach(param => {
        if (typeof param === 'string') {
            const [key, value = true] = param.split('=');
            allowedParams.push({ key, value });
        } else if (
            param
            && typeof param === 'object'
            && hasOwn(param, 'key')
            && hasOwn(param, 'value') // Schema check
        ) {
            param.key = param.key.trim();
            param.value = (`${param.value}`).trim();
            allowedParams.push(param);
        }
    });
    let result = false;
    allowedParams.forEach(param => {
        const currentResult = !!allParams.filter(queryParam => (
            param.key === queryParam.key
            && (param.value === queryParam.value || param.value === true)
        )).length;
        result = result || currentResult;
    });
    return result;
}

/**
 * Returns true if logging should allowed
 */
function isLoggingAllowed() {
    if (typeof this.config.test === 'function') {
        return this.config.test();
    }
    return (
        (typeof console !== 'undefined')
        && (
            (
                matchesURL(this.location.hostname, this.config)
                && matchesPort(this.location.port, this.config)
            )
            || matchesQueryParam(this.location.search, this.config)
        )
        && !this.config.disable
    );
}

/**
 * Logger class
 * @class
 */
export default class Logger {
    constructor(config = {}) {
        this.config = Object.freeze({
            allowedHostnames: ['localhost', '127.0.0.1', '0.0.0.0'],
            disable: false,
            allowedQueryStringParameters: ['debug'],
            allowedPorts: [],
            ...config
        });
        this.location = typeof window === 'undefined' ? {} : window.location;
        this.URL = this.location.href;
    }
    isLoggingAllowed() {
        return isLoggingAllowed.apply(this);
    }
    log() {
        if (this.isLoggingAllowed() && console.log) {
            return console.log(...arguments);
        }
    }
    warn() {
        if (this.isLoggingAllowed() && console.warn) {
            console.warn(...arguments);
        }
    }
    debug() {
        if (this.isLoggingAllowed() && console.debug) {
            console.debug(...arguments);
        }
    }
    error() {
        if (this.isLoggingAllowed() && console.error) {
            console.error(...arguments);
        }
    }
    info() {
        if (this.isLoggingAllowed() && console.info) {
            console.info(...arguments);
        }
    }
    dir() {
        if (this.isLoggingAllowed() && console.dir) {
            console.dir(...arguments);
        }
    }
    dirxml() {
        if (this.isLoggingAllowed() && console.dirxml) {
            console.dirxml(...arguments);
        }
    }
    table() {
        if (this.isLoggingAllowed() && console.table) {
            console.table(...arguments);
        }
    }
    trace() {
        if (this.isLoggingAllowed() && console.trace) {
            console.trace(...arguments);
        }
    }
    group() {
        if (this.isLoggingAllowed() && console.group) {
            console.group(...arguments);
        }
    }
    groupCollapsed() {
        if (this.isLoggingAllowed() && console.groupCollapsed) {
            console.groupCollapsed(...arguments);
        }
    }
    groupEnd() {
        if (this.isLoggingAllowed() && console.groupEnd) {
            console.groupEnd(...arguments);
        }
    }
    clear() {
        if (this.isLoggingAllowed() && console.clear) {
            console.clear(...arguments);
        }
    }
    count() {
        if (this.isLoggingAllowed() && console.count) {
            console.count(...arguments);
        }
    }
    countReset() {
        if (this.isLoggingAllowed() && console.countReset) {
            console.countReset(...arguments);
        }
    }
    assert() {
        if (this.isLoggingAllowed() && console.assert) {
            console.assert(...arguments);
        }
    }
    profile() {
        if (this.isLoggingAllowed() && console.profile) {
            console.profile(...arguments);
        }
    }
    profileEnd() {
        if (this.isLoggingAllowed() && console.profileEnd) {
            console.profileEnd(...arguments);
        }
    }
    time() {
        if (this.isLoggingAllowed() && console.time) {
            console.time(...arguments);
        }
    }
    timeLog() {
        if (this.isLoggingAllowed() && console.timeLog) {
            console.timeLog(...arguments);
        }
    }
    timeStamp() {
        if (this.isLoggingAllowed() && console.timeStamp) {
            console.timeStamp(...arguments);
        }
    }
    context() {
        if (this.isLoggingAllowed() && console.context) {
            console.context(...arguments);
        }
    }
}