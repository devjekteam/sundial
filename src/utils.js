'use strict';

require('console-polyfill');

/*
 * Utily functions
 */

module.exports = {

  isFunction: function(object) {
   return !!(object && object.constructor && object.call && object.apply);
  },

  doCallback: function(hook, config, arg, deprecated) {
    if(this.isFunction(config.callbacks[hook])) {
      config.callbacks[hook](arg);
      if (deprecated) { this.logDeprecated(hook + ' callback has been replaced, please see docs'); }
    }
  },

  logError: function(message) {
    console.error('TimekitBooking Error: ' + message);
  },

  logDeprecated: function(message) {
    console.warn('TimekitBooking Deprecated: ' + message);
  },

  loadScript: function(url, callback) {
    // Adding the script tag to the head as suggested before
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    script.onreadystatechange = callback;
    script.onload = callback;

    // Fire the loading
    head.appendChild(script);
  }

};
