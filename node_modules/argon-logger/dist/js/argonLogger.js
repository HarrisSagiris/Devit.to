/**!
 * A simple console logging utility
 * Released under MIT license
 * @author Sachin Singh <contactsachinsingh@gmail.com>
 * @version v0.1.2
 * @license MIT
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Logger = factory());
}(this, (function () { 'use strict';

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArrayLimit(arr, i) {
    if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) {
      return;
    }

    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance");
  }

  /**
   * Tests if current host name matches allowed hostnames
   * @param {string} hostname Current hostname
   * @param {object} config Configuration
   */
  function matchesURL(hostname, config) {
    var allowedHostnames = Array.isArray(config.allowedHostnames) ? config.allowedHostnames : [];

    if (allowedHostnames.length === 0) {
      return true;
    }

    return !!allowedHostnames.filter(function (URL) {
      return URL.indexOf(hostname) > -1;
    }).length;
  }
  /**
   * Checks if given port is allowed
   * @param {string} port Current port
   * @param {object} config Configuration
   */


  function matchesPort(port, config) {
    var allowedPorts = Array.isArray(config.allowedPorts) ? config.allowedPorts : [];
    allowedPorts = allowedPorts.map(function (port) {
      return "".concat(port).trim();
    });

    if (allowedPorts.length === 0) {
      return true;
    }

    return allowedPorts.indexOf(port) > -1;
  }
  /**
   * Returns a map of query string key value pairs
   * @param {string} queryString Current query string
   */


  function getAllParams(queryString) {
    queryString = queryString.substring(queryString.charAt(0) === '?' ? 1 : 0);
    return queryString.split('&').map(function (pairs) {
      var _pairs$split$map = pairs.split('=').map(function (part) {
        return decodeURIComponent(part).trim();
      }),
          _pairs$split$map2 = _slicedToArray(_pairs$split$map, 2),
          key = _pairs$split$map2[0],
          value = _pairs$split$map2[1];

      return {
        key: key,
        value: value
      };
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
    var allowedQueryStringParameters = Array.isArray(config.allowedQueryStringParameters) ? config.allowedQueryStringParameters : [];
    var allParams = getAllParams(queryString);
    var allowedParams = [];
    allowedQueryStringParameters.forEach(function (param) {
      if (typeof param === 'string') {
        var _param$split = param.split('='),
            _param$split2 = _slicedToArray(_param$split, 2),
            key = _param$split2[0],
            _param$split2$ = _param$split2[1],
            value = _param$split2$ === void 0 ? true : _param$split2$;

        allowedParams.push({
          key: key,
          value: value
        });
      } else if (param && _typeof(param) === 'object' && hasOwn(param, 'key') && hasOwn(param, 'value') // Schema check
      ) {
          param.key = param.key.trim();
          param.value = "".concat(param.value).trim();
          allowedParams.push(param);
        }
    });
    var result = false;
    allowedParams.forEach(function (param) {
      var currentResult = !!allParams.filter(function (queryParam) {
        return param.key === queryParam.key && (param.value === queryParam.value || param.value === true);
      }).length;
      result = result || currentResult;
    });
    return result;
  }
  /**
   * Returns true if logging should allowed
   */


  function _isLoggingAllowed() {
    if (typeof this.config.test === 'function') {
      return this.config.test();
    }

    return typeof console !== 'undefined' && (matchesURL(this.location.hostname, this.config) && matchesPort(this.location.port, this.config) || matchesQueryParam(this.location.search, this.config)) && !this.config.disable;
  }
  /**
   * Logger class
   * @class
   */


  var Logger =
  /*#__PURE__*/
  function () {
    function Logger() {
      var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      _classCallCheck(this, Logger);

      this.config = Object.freeze(_objectSpread2({
        allowedHostnames: ['localhost', '127.0.0.1', '0.0.0.0'],
        disable: false,
        allowedQueryStringParameters: ['debug'],
        allowedPorts: []
      }, config));
      this.location = typeof window === 'undefined' ? {} : window.location;
      this.URL = this.location.href;
    }

    _createClass(Logger, [{
      key: "isLoggingAllowed",
      value: function isLoggingAllowed() {
        return _isLoggingAllowed.apply(this);
      }
    }, {
      key: "log",
      value: function log() {
        if (this.isLoggingAllowed() && console.log) {
          var _console;

          return (_console = console).log.apply(_console, arguments);
        }
      }
    }, {
      key: "warn",
      value: function warn() {
        if (this.isLoggingAllowed() && console.warn) {
          var _console2;

          (_console2 = console).warn.apply(_console2, arguments);
        }
      }
    }, {
      key: "debug",
      value: function debug() {
        if (this.isLoggingAllowed() && console.debug) {
          var _console3;

          (_console3 = console).debug.apply(_console3, arguments);
        }
      }
    }, {
      key: "error",
      value: function error() {
        if (this.isLoggingAllowed() && console.error) {
          var _console4;

          (_console4 = console).error.apply(_console4, arguments);
        }
      }
    }, {
      key: "info",
      value: function info() {
        if (this.isLoggingAllowed() && console.info) {
          var _console5;

          (_console5 = console).info.apply(_console5, arguments);
        }
      }
    }, {
      key: "dir",
      value: function dir() {
        if (this.isLoggingAllowed() && console.dir) {
          var _console6;

          (_console6 = console).dir.apply(_console6, arguments);
        }
      }
    }, {
      key: "dirxml",
      value: function dirxml() {
        if (this.isLoggingAllowed() && console.dirxml) {
          var _console7;

          (_console7 = console).dirxml.apply(_console7, arguments);
        }
      }
    }, {
      key: "table",
      value: function table() {
        if (this.isLoggingAllowed() && console.table) {
          var _console8;

          (_console8 = console).table.apply(_console8, arguments);
        }
      }
    }, {
      key: "trace",
      value: function trace() {
        if (this.isLoggingAllowed() && console.trace) {
          var _console9;

          (_console9 = console).trace.apply(_console9, arguments);
        }
      }
    }, {
      key: "group",
      value: function group() {
        if (this.isLoggingAllowed() && console.group) {
          var _console10;

          (_console10 = console).group.apply(_console10, arguments);
        }
      }
    }, {
      key: "groupCollapsed",
      value: function groupCollapsed() {
        if (this.isLoggingAllowed() && console.groupCollapsed) {
          var _console11;

          (_console11 = console).groupCollapsed.apply(_console11, arguments);
        }
      }
    }, {
      key: "groupEnd",
      value: function groupEnd() {
        if (this.isLoggingAllowed() && console.groupEnd) {
          var _console12;

          (_console12 = console).groupEnd.apply(_console12, arguments);
        }
      }
    }, {
      key: "clear",
      value: function clear() {
        if (this.isLoggingAllowed() && console.clear) {
          var _console13;

          (_console13 = console).clear.apply(_console13, arguments);
        }
      }
    }, {
      key: "count",
      value: function count() {
        if (this.isLoggingAllowed() && console.count) {
          var _console14;

          (_console14 = console).count.apply(_console14, arguments);
        }
      }
    }, {
      key: "countReset",
      value: function countReset() {
        if (this.isLoggingAllowed() && console.countReset) {
          var _console15;

          (_console15 = console).countReset.apply(_console15, arguments);
        }
      }
    }, {
      key: "assert",
      value: function assert() {
        if (this.isLoggingAllowed() && console.assert) {
          var _console16;

          (_console16 = console).assert.apply(_console16, arguments);
        }
      }
    }, {
      key: "profile",
      value: function profile() {
        if (this.isLoggingAllowed() && console.profile) {
          var _console17;

          (_console17 = console).profile.apply(_console17, arguments);
        }
      }
    }, {
      key: "profileEnd",
      value: function profileEnd() {
        if (this.isLoggingAllowed() && console.profileEnd) {
          var _console18;

          (_console18 = console).profileEnd.apply(_console18, arguments);
        }
      }
    }, {
      key: "time",
      value: function time() {
        if (this.isLoggingAllowed() && console.time) {
          var _console19;

          (_console19 = console).time.apply(_console19, arguments);
        }
      }
    }, {
      key: "timeLog",
      value: function timeLog() {
        if (this.isLoggingAllowed() && console.timeLog) {
          var _console20;

          (_console20 = console).timeLog.apply(_console20, arguments);
        }
      }
    }, {
      key: "timeStamp",
      value: function timeStamp() {
        if (this.isLoggingAllowed() && console.timeStamp) {
          var _console21;

          (_console21 = console).timeStamp.apply(_console21, arguments);
        }
      }
    }, {
      key: "context",
      value: function context() {
        if (this.isLoggingAllowed() && console.context) {
          var _console22;

          (_console22 = console).context.apply(_console22, arguments);
        }
      }
    }]);

    return Logger;
  }();

  return Logger;

})));
//# sourceMappingURL=argonLogger.js.map
