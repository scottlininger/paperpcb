/**
 * @fileoverview Exports a handy parseHash method. Looks at the #fragment in the
 *     window.location and parses it like a URL, with query string and such.
 */

/**
 * Given an object and a string representing a json notation path down into that
 * object, store a value in the appropriate spot.
 * @param {object} obj The object to set data into.
 * @param {string} jsonPath The json notation
 * @param {object} value The value to store.
 * @return {boolean} Whether the set was successful.
 */
function setNestedValue (obj, jsonPath, value) {
  var parts = jsonPath.split(/[\.\[]+/gi);

  var seek = obj;
  for (var i = 0; i < parts.length; i++) {
    var key = parts[i];

    // If the key is exactly ']', that means we're asking to set
    // a value without an explicit key. In such a case, just push the value
    // onto the end of the seek array.
    if (key == ']') {
      key = seek.length;
    } else if (key.indexOf(']') > -1) {
      key = parseInt(key);
    }

    // If we're at the end of the stack, set the value.
    if (i == parts.length - 1) {
      if (typeof value == 'string' && value.indexOf('json:') == 0) {
        value = value.replace(/^json:/, '');
        value = JSON.parse(value);
      }
      seek[key] = value;
      return true;
    }

    var nextKey = parts[i + 1];
    var nextDataType = 'object';
    if (nextKey.indexOf(']') > -1) {
      nextDataType = 'array';
    }

    if (seek[key]) {

      // If the object already has nested data here, move onward.
      // However, if onward means we've reached a different kind of nested
      // structure than was expected, we have to bail.
      seek = seek[key];
      if (typeof seek !== 'object' && Array.isArray(seek) === false) {
        return false;
      }

    } else {

      // The object does not have a nested data at this level. Create it and
      // move onward.
      if (nextDataType == 'object') {
        seek[key] = {};
      } else {
        seek[key] = [];
      }
      seek = seek[key];

    }
  }
}


/**
 * Given a query string, break into key:value pairs and return an object.
 * @param {string} qs The query string, like 'a=5&b=6'.
 * @return {object} A nicely structured breakdown of the variables.
 */
function parseQueryString (qs = '') {
  var query = {};
  var pairs = (qs[0] === '?' ? qs.substr(1) : qs).split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    var jsonPath = decodeURIComponent(pair[0]);
    var value = decodeURIComponent((pair[1] || '').replace(/\+/gi, ' '));

    // If there is a query parameter without an equal sign and value, like
    // '?isDebugVersion', store the value as true.
    if (pair[1] === undefined) {
      value = true;
    }
    setNestedValue(query, jsonPath, value);
  }
  return query;
}


/**
 * Returns a data structure containing details about the browser's url hash. The
 * hash is interpreted as a series of parts.
 *
 * Let's say the user is currently viewing this page:
 *
 * https://somewhere.com/demo#pets/dogs?dogId=123&a[0]=bar&a[1]=baz&obj.foo=1#myanchor?s=1
 *
 * Then the following would be returned.
 * {
 *   "path": "pets/dogs",
 *   "folders": ["pets", "dogs"],
 *   "query": { "dogId": "123", "a": ["bar", "baz"], "obj": {"foo": 1} },
 *   "anchor": "myanchor?style=red",
 *   "anchorQuery": { "s": "1" }
 * }
 * @param {string} hashString
 * @return {object} The object with the hash info.
 */
export default function parseHash(hashString = '#') {
  var hashlessString = hashString.substr(1);
  
  var parts = hashlessString.split('#');
  var pathString = parts[0] || '';
  var anchorString = parts[1] || '';
  
  var pathParts = pathString.split('?');
  var path = pathParts[0] || '';
  var queryString = pathParts[1] || '';
  var query = parseQueryString(queryString);

  var anchorParts = anchorString.split('?');
  anchorParts[0] || '';
  var anchorQueryString = anchorParts[1] || '';
  var anchorQuery = parseQueryString(anchorQueryString);

  // Strip the leading # and trailing / to make paths less fragile.
  path = path.replace(/^[#\/]*/, '').replace(/\/?$/, '');

  return {
    path: path,
    folders: path.split('/'),
    query: query,
    anchor: anchorString,
    anchorQuery: anchorQuery
  }
}

