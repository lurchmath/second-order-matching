"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OM = exports.OMNode = void 0;

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

// # OpenMath module
//
// This module implements an encoding of OpenMath objects as JSON.  It is *not*
// an official encoding endorsed by the OpenMath Society.  It is merely my own
// choice of how to do the encoding, in the absence of an official standard
// (that I could find).
//
// Objects are encoded as follows.  (If these phrases are unfamiliar to you,
// see [the OpenMath Standard,
// v2.0](http://www.openmath.org/standard/om20-2004-06-30/).)
//  * OMI - `{ t : 'i', v : 6 }` (where `t` stands for type and `v` for value),
//    and integers may also be stored as strings if desired (e.g., `-6`)
//  * OMF - `{ t : 'f', v : -0.521 }`
//  * OMSTR - `{ t : 'st', v : 'example' }`
//  * OMB - `{ t : 'ba', v : aUint8ArrayHere }`
//  * OMS - `{ t : 'sy', n : 'symbolName', cd : 'cd', uri : 'http://...' }`,
//    where the URI is optional
//  * OMV - `{ t : 'v', n : 'name' }`
//  * OMA - `{ t : 'a', c : [ child, objects, here ] }` (children are the
//    required operator, followed by zero or more operands)
//  * OMATTR - rather than wrap things in OMATTR nodes, simply add the
//    attributes object (a mapping from string keys to objects) to the existing
//    object, with 'a' as its key.  To create the string key for an OM symbol,
//    just use its JSON form (fully compact, as created by `JSON.stringify`
//    with one argument).
//  * OMBIND - `{ t : 'bi', s : object, v : [ bound, vars ], b : object }`,
//    where `s` stands for the head symbol and `b` for the body
//  * OMERR - `{ t : 'e', s : object, c : [ child, nodes, here ] }`, where `s`
//    stands for the head symbol, and `c` can be omitted if empty.
//  * No encoding for foreign objects is specified here.
//
// ## OpenMath Node class
// We declare the following structure for use in the simple encoding and
// decoding routines defined later in the OMNode class.
var tokenTypes = [{
  name: 'symbol',
  pattern: /[:A-Za-z_][:A-Za-z_0-9-]*\.[:A-Za-z_][:A-Za-z_0-9-]*/
}, {
  name: 'variable',
  pattern: /[:A-Za-z_][:A-Za-z_0-9-]*/
}, {
  name: 'float',
  pattern: /[+-]?(?:[0-9]+\.[0-9]*|[0-9]*\.[0-9]+)/
}, {
  name: 'integer',
  pattern: /[+-]?[0-9]+/
}, {
  name: 'string',
  pattern: /"(?:[^"\\]|\\"|\\\\)*"|'(?:[^'\\]|\\'|\\\\)*'/
}, {
  name: 'comma',
  pattern: /,/
}, {
  name: 'openParen',
  pattern: /\(/
}, {
  name: 'closeParen',
  pattern: /\)/
}, {
  name: 'openBracket',
  pattern: /\[/
}, {
  name: 'closeBracket',
  pattern: /\]/
}];

var OMNode = /*#__PURE__*/function () {
  (0, _createClass2["default"])(OMNode, null, [{
    key: "checkJSON",
    // ### Class ("static") methods
    //
    // The following class method checks to see if an object is of any one of the
    // formats specified above; if so, it returns null, and if not, it returns an
    // error describing why not.  It is recursive, verifying that children are also
    // of the correct form.
    //
    // It either returns a string, meaning that the object is invalid, and the
    // string contains the reason why, or it returns null, meaning that the object
    // is valid.
    value: function checkJSON(object) {
      var key, reason;
      var child;

      if (!(object instanceof Object)) {
        return "Expected an object, found ".concat((0, _typeof2["default"])(object));
      } // If the object has attributes, we must verify that their keys are the
      // stringified forms of JSON objects representing OpenMath symbols and their
      // values also pass this same validity test, recursively.


      if (object.hasOwnProperty('a')) {
        for (var _i = 0, _Object$keys = Object.keys(object.a || {}); _i < _Object$keys.length; _i++) {
          key = _Object$keys[_i];
          var symbol;
          var value = object.a[key];

          try {
            symbol = JSON.parse(key);
          } catch (e) {
            return "Key ".concat(key, " invalid JSON");
          }

          if (symbol.t !== 'sy') {
            return "Key ".concat(key, " is not a symbol");
          }

          if (reason = this.checkJSON(symbol)) {
            return reason;
          }

          if (reason = this.checkJSON(value)) {
            return reason;
          }
        }
      } // This function verifies that the object doesn't have any keys beyond those on
      // the list, plus 't' for type and 'a' for attributes.


      var checkKeys = function checkKeys() {
        for (var _len = arguments.length, list = new Array(_len), _key = 0; _key < _len; _key++) {
          list[_key] = arguments[_key];
        }

        for (var _i2 = 0, _Object$keys2 = Object.keys(object); _i2 < _Object$keys2.length; _i2++) {
          key = _Object$keys2[_i2];

          if (!list.includes(key) && key !== 't' && key !== 'a') {
            return "Key ".concat(key, " not valid in object of type ").concat(object.t);
          }
        }

        return null;
      }; // This is not nearly the full range of Unicode symbols permitted for
      // identifiers in the OpenMath specification, but is a useful subset for this
      // first implementation.  See page 14 of [the
      // standard](http://www.openmath.org/standard/om20-2004-06-30/omstd20.pdf) for
      // the exact regular expression.


      var identRE = /^[:A-Za-z_\u0374-\u03FF][:A-Za-z_\u0374-\u03FF.0-9-]*$/; // Now we consider each type of object separately.

      switch (object.t) {
        // Integers must have t and v keys, and the latter must look like an integer,
        // whether it's actually one or a string doesn't matter.
        case 'i':
          if (reason = checkKeys('v')) {
            return reason;
          }

          if (!/^[+-]?[0-9]+$/.test("".concat(object.v))) {
            return "Not an integer: ".concat(object.v);
          }

          break;
        // Floats must have t and v keys, and the latter must be a number.

        case 'f':
          if (reason = checkKeys('v')) {
            return reason;
          }

          if (typeof object.v !== 'number') {
            return "Not a number: ".concat(object.v, " of type ").concat((0, _typeof2["default"])(object.v));
          }

          if (isNaN(object.v)) {
            return 'OpenMath floats cannot be NaN';
          }

          if (!isFinite(object.v)) {
            return 'OpenMath floats must be finite';
          }

          break;
        // Strings must have t and v keys, and the latter must be a string.

        case 'st':
          if (reason = checkKeys('v')) {
            return reason;
          }

          if (typeof object.v !== 'string') {
            return "Value for st type was ".concat((0, _typeof2["default"])(object.v), ", not string");
          }

          break;
        // Byte Arrays must have t and v keys, the latter of which is a `Uint8Array`.

        case 'ba':
          if (reason = checkKeys('v')) {
            return reason;
          }

          if (!(object.v instanceof Uint8Array)) {
            return "Value for ba type was not an instance of Uint8Array";
          }

          break;
        // Symbols must have t, n, and cd keys, with an optional uri key, all of which
        // must be strings.  The n key (for "name") must be a valid identifier, in that
        // it must match the regular expression defined above.

        case 'sy':
          if (reason = checkKeys('n', 'cd', 'uri')) {
            return reason;
          }

          if (typeof object.n !== 'string') {
            return "Name for sy type was ".concat((0, _typeof2["default"])(object.n), ", not string");
          }

          if (typeof object.cd !== 'string') {
            return "CD for sy type was ".concat((0, _typeof2["default"])(object.cd), ", not string");
          }

          if (object.uri != null && typeof object.uri !== 'string') {
            return "URI for sy type was ".concat((0, _typeof2["default"])(object.uri), ", not string");
          }

          if (!identRE.test(object.n)) {
            return "Invalid identifier as symbol name: ".concat(object.n);
          }

          if (!identRE.test(object.cd)) {
            return "Invalid identifier as symbol CD: ".concat(object.cd);
          }

          break;
        // Variables must have t and n keys, the latter of which must be a valid
        // identifier, matching the same regular expression as above.

        case 'v':
          if (reason = checkKeys('n')) {
            return reason;
          }

          if (typeof object.n !== 'string') {
            return "Name for v type was ".concat((0, _typeof2["default"])(object.n), ", not string");
          }

          if (!identRE.test(object.n)) {
            return "Invalid identifier as variable name: ".concat(object.n);
          }

          break;
        // Applications must have t and c keys, the latter of which must be an array of
        // objects that pass this same validity test, applied recursively.  It may not
        // be empty.

        case 'a':
          if (reason = checkKeys('c')) {
            return reason;
          }

          if (!(object.c instanceof Array)) {
            return "Children of application object was not an array";
          }

          if (object.c.length === 0) {
            return "Application object must have at least one child";
          }

          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = object.c[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              child = _step.value;

              if (reason = this.checkJSON(child)) {
                return reason;
              }
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          break;
        // Bindings must have t, s, v, and b keys, where s is a symbol, v an array of
        // variables, and b any OpenMath node.

        case 'bi':
          if (reason = checkKeys('s', 'v', 'b')) {
            return reason;
          }

          if (reason = this.checkJSON(object.s)) {
            return reason;
          }

          if (object.s.t !== 'sy') {
            return "Head of a binding must be a symbol";
          }

          if (!(object.v instanceof Array)) {
            return "In a binding, the v value must be an array";
          }

          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = object.v[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var variable = _step2.value;

              if (reason = this.checkJSON(variable)) {
                return reason;
              }

              if (variable.t !== 'v') {
                return "In a binding, all values in the v array must have type v";
              }
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
                _iterator2["return"]();
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2;
              }
            }
          }

          if (reason = this.checkJSON(object.b)) {
            return reason;
          }

          break;
        // Errors must have t, s, and c keys, with s a symbol and c an array of child
        // nodes.

        case 'e':
          if (reason = checkKeys('s', 'c')) {
            return reason;
          }

          if (reason = this.checkJSON(object.s)) {
            return reason;
          }

          if (object.s.t !== 'sy') {
            return "Head of an error must be a symbol";
          }

          if (!(object.c instanceof Array)) {
            return "In an error, the c key must be an array";
          }

          var _iteratorNormalCompletion3 = true;
          var _didIteratorError3 = false;
          var _iteratorError3 = undefined;

          try {
            for (var _iterator3 = object.c[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              child = _step3.value;

              if (reason = this.checkJSON(child)) {
                return reason;
              }
            }
          } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
                _iterator3["return"]();
              }
            } finally {
              if (_didIteratorError3) {
                throw _iteratorError3;
              }
            }
          }

          break;
        // If the object's type is not on that list, it's not valid.

        default:
          return "Invalid type: ".concat(object.t);
      } // If all of the above checks pass then we return null, meaning the object is
      // valid (no errors).


      return null;
    } // The following function converts a string encoding of an OpenMath structure
    // and creates an instance of `OMNode` for the corresponding structure.
    //  * If the string contains invalid JSON, this routine will return an
    //    error message string rather than an OMNode object.
    //  * If it contains JSON for a structure that doesn't pass `checkJSON`, above,
    //    again, an error message string is returned.
    //  * Otherwise it adds appropriate parent pointers to the nodes in the
    //    resulting tree, then wraps it in an instance of OMNode and returns it.
    // The function can also take an object that has been parsed from such JSON
    // text.

  }, {
    key: "decode",
    value: function decode(json) {
      var reason;

      if (typeof json === 'string') {
        try {
          json = JSON.parse(json);
        } catch (e) {
          return e.message;
        }
      }

      var fixByteArrays = function fixByteArrays(node) {
        if (node.t === 'ba' && node.v instanceof Array) node.v = new Uint8Array(node.v);
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = (node.c != null ? node.c : [])[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var c = _step4.value;
            // children, if any
            fixByteArrays(c);
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
              _iterator4["return"]();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }

        var object = node.a != null ? node.a : {};

        for (var _i3 = 0, _Object$keys3 = Object.keys(object); _i3 < _Object$keys3.length; _i3++) {
          var k = _Object$keys3[_i3];
          // attribute values, if any
          fixByteArrays(object[k]);
        }

        if (node.b != null) {
          fixByteArrays(node.b);
        } // body, if any

      };

      fixByteArrays(json);

      if (reason = this.checkJSON(json)) {
        return reason;
      }

      var setParents = function setParents(node) {
        var v;
        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          for (var _iterator5 = (node.c != null ? node.c : [])[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var c = _step5.value;
            // children, if any
            c.p = node;
            setParents(c);
          }
        } catch (err) {
          _didIteratorError5 = true;
          _iteratorError5 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion5 && _iterator5["return"] != null) {
              _iterator5["return"]();
            }
          } finally {
            if (_didIteratorError5) {
              throw _iteratorError5;
            }
          }
        }

        if (node.t === 'bi') {
          var _iteratorNormalCompletion6 = true;
          var _didIteratorError6 = false;
          var _iteratorError6 = undefined;

          try {
            for (var _iterator6 = (node.v != null ? node.v : [])[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
              v = _step6.value;
              // bound variables, if any
              v.p = node;
              setParents(v);
            }
          } catch (err) {
            _didIteratorError6 = true;
            _iteratorError6 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion6 && _iterator6["return"] != null) {
                _iterator6["return"]();
              }
            } finally {
              if (_didIteratorError6) {
                throw _iteratorError6;
              }
            }
          }
        }

        var object = node.a != null ? node.a : {};

        for (var _i4 = 0, _Object$keys4 = Object.keys(object); _i4 < _Object$keys4.length; _i4++) {
          var k = _Object$keys4[_i4];
          // attribute values, if any
          v = object[k];
          v.p = node;
          setParents(v);
        } // head symbol and body object, if any


        if (node.s != null) {
          node.s.p = node;
          setParents(node.s);
        }

        if (node.b != null) {
          node.b.p = node;
          setParents(node.b);
        }
      };

      setParents(json);
      json.p = null;
      return new OMNode(json);
    } // ### Constructor
    //
    // The above factory function uses the following constructor.

  }]);

  function OMNode(tree) {
    (0, _classCallCheck2["default"])(this, OMNode);
    this.tree = tree;
  } // Define getters for the common attributes type, value, name, cd, uri, symbol, body,
  // children, and variables.  These all return undefined if they do not apply to the
  // current structure, except children and variables, which return empty arrays
  // in that case.


  (0, _createClass2["default"])(OMNode, [{
    key: "encode",
    // ### Serialization
    //
    // Unserializing an `OMNode` object from a string is done by the `decode`
    // method, above.  Serializing is done by its inverse, here, which simply uses
    // `JSON.stringify`, but filters out parent pointers.
    value: function encode() {
      return JSON.stringify(this.tree, function (k, v) {
        if (k === 'p') {
          return undefined;
        } else if (v instanceof Uint8Array) {
          return Array.from(v);
        } else {
          return v;
        }
      });
    } // ### Copies and equality
    //
    // Two instances will often want to be compared for equality, structurally.
    // This is essentially the same activity as comparing equality of two JSON
    // structures, except parent pointers should be ignored so that the recursion
    // remains acyclic.
    //
    // You can pass a second parameter indicating whether to pay attention to
    // attributes in the comparison.  By default it is true, meaning consider all
    // attributes.  If it is false, no attributes will be considered.  Other values
    // may be supported in the future.

  }, {
    key: "equals",
    value: function equals(other, attributes) {
      if (attributes == null) {
        attributes = true;
      }

      var recur = function recur(a, b) {
        // If they are atomically equal, we're done.
        var key, value;

        if (a === b) {
          return true;
        } // If they're arrays, ensure they have the same length, type, and contents.


        if (a instanceof Array || a instanceof Uint8Array) {
          if (a instanceof Array && !(b instanceof Array)) {
            return false;
          }

          if (a instanceof Uint8Array && !(b instanceof Uint8Array)) {
            return false;
          }

          if (a.length !== b.length) {
            return false;
          }

          for (var index = 0; index < a.length; index++) {
            var element = a[index];

            if (!recur(element, b[index])) {
              return false;
            }
          }

          return true;
        } // Otherwise, they must be objects, with all the same key-value pairs.
        // The one exception to this is that for OpenMath attributes (which are stored
        // under key "a"), it is the same if the "a" key is simply absent (meaning no
        // attributes) or if its value is the empty object `{ }` (also meaning no
        // attributes).


        if (!(a instanceof Object)) {
          return false;
        }

        if (!(b instanceof Object)) {
          return false;
        }

        for (var _i5 = 0, _Object$keys5 = Object.keys(a); _i5 < _Object$keys5.length; _i5++) {
          key = _Object$keys5[_i5];
          value = a[key];

          if (key === 'p' || !attributes && key === 'a') {
            continue;
          }

          if (!b.hasOwnProperty(key)) {
            if (key === 'a') {
              return recur(value, {});
            }

            return false;
          }

          if (!recur(value, b[key])) {
            return false;
          }
        }

        for (var _i6 = 0, _Object$keys6 = Object.keys(b); _i6 < _Object$keys6.length; _i6++) {
          key = _Object$keys6[_i6];
          value = b[key];

          if (key === 'p' || !attributes && key === 'a') {
            continue;
          }

          if (!a.hasOwnProperty(key)) {
            if (key === 'a') {
              return recur(value, {});
            }

            return false;
          }
        }

        return true;
      };

      return recur(this.tree, other.tree);
    } // There is also a much stricter notion of equality:  Do the two OMNode objects
    // actually wrap the same object underneath?  That is, are they pointing to the
    // same tree in memory?  This function can detect that.

  }, {
    key: "sameObjectAs",
    value: function sameObjectAs(other) {
      return this.tree === (other != null ? other.tree : undefined);
    } // On a similar note, you may want to create a distinct copy of any given
    // OMNode instance.  Here is a method for doing so.

  }, {
    key: "copy",
    value: function copy() {
      var recur = function recur(tree) {
        var result;

        switch (tree.t) {
          // Integers, floats, and strings are easy to copy; just duplicate type and
          // value.  Variables and symbols are easy for the same reason, but different
          // atomic members.
          case 'i':
          case 'f':
          case 'st':
            result = {
              t: tree.t,
              v: tree.v
            };
            break;

          case 'v':
            result = {
              t: 'v',
              n: tree.n
            };
            break;

          case 'sy':
            result = {
              t: 'sy',
              n: tree.n,
              cd: tree.cd
            };

            if (tree.hasOwnProperty('uri')) {
              result.uri = tree.uri;
            }

            break;
          // Byte arrays require making a copy of the byte array object, which can be
          // accomplished with the constructor.

          case 'ba':
            result = {
              t: 'ba',
              v: new Uint8Array(tree.v)
            };
            break;
          // For errors and applications, we copy the children array; for errors we also
          // include the symbol.

          case 'e':
          case 'a':
            result = {
              t: tree.t,
              c: tree.c.map(function (child) {
                return recur(child);
              })
            };

            if (tree.t === 'e') {
              result.s = recur(tree.s);
            }

            break;
          // Lastly, for bindings, we copy each sub-part: symbol, body, variable list.

          case 'bi':
            result = {
              t: 'bi',
              s: recur(tree.s),
              v: tree.v.map(function (variable) {
                return recur(variable);
              }),
              b: recur(tree.b)
            };
            break;
        } // Then no matter what we created, we copy the attributes over as well.


        var object = tree.a != null ? tree.a : {};

        for (var _i7 = 0, _Object$keys7 = Object.keys(object); _i7 < _Object$keys7.length; _i7++) {
          var key = _Object$keys7[_i7];
          var value = object[key];
          (result.a != null ? result.a : result.a = {})[key] = recur(value);
        }

        return result;
      }; // Apply the recursive function.


      return OMNode.decode(recur(this.tree));
    } // ### Factory functions
    //
    // We provide here functions for creating each type of OMNode, from integer to
    // error.  Each is a "static" (class) method, documented separately.  It
    // returns an error message as a string if there was an error, instead of the
    // desired OMNode instance.
    //
    // The integer factory function creates an OpenMath integer node, and must be
    // passed a single parameter containing either an integer or a string
    // representation of an integer, e.g., `OM.integer 100`.

  }, {
    key: "simpleEncode",
    value: function simpleEncode() {
      var recur = function recur(tree) {
        switch (tree != null ? tree.t : undefined) {
          case 'i':
          case 'f':
            return "".concat(tree.v);

          case 'v':
            return tree.n;

          case 'st':
            return "'".concat(tree.v.replace(/'/g, '\\\''), "'");

          case 'sy':
            return "".concat(tree.cd, ".").concat(tree.n);

          case 'ba':
            return "'byte array'";

          case 'e':
            return "'error'";

          case 'a':
            var children = tree.c.map(function (c) {
              return recur(c);
            });
            var head = children.shift();
            return "".concat(head, "(").concat(children.join(','), ")");

          case 'bi':
            var variables = tree.v.map(function (v) {
              return recur(v);
            });
            head = recur(tree.s);
            var body = recur(tree.b);
            return "".concat(head, "[").concat(variables.join(','), ",").concat(body, "]");

          default:
            return "Error: Invalid OpenMath type ".concat(tree != null ? tree.t : undefined);
        }
      };

      return recur(this.tree);
    } // ### Parent-child relationships
    //
    // The functions in this category make, break, or report the relationship of an
    // OMNode instance to its parents or children.
    //
    // This first function reports where the node is in its parent.  The return
    // value will be one of five types:
    //  * a string containing "c" followed by a number, as in 'c7' - this means
    //    that the node is in it's parent's `children` array, and is at index 7
    //  * a string containing "v" followed by a number, as in 'v0' - this is the
    //    same as the previous, but for the parent's `variables` array
    //  * the string "b" - this means that the node is the body and its parent is
    //    a binding
    //  * the string "s" - this means that the node is a symbol for its parent,
    //    which is either an error or a binding
    //  * a lengthier string beginning with "{" - this is the JSON encoded version
    //    of the attribute key for which the node is the corresponding value
    //  * undefined if none of the above apply (e.g., no parent, or invalid tree
    //    structure)

  }, {
    key: "findInParent",
    value: function findInParent() {
      var index;

      if (!this.parent) {
        return undefined;
      }

      for (index = 0; index < this.parent.children.length; index++) {
        var child = this.parent.children[index];

        if (this.sameObjectAs(child)) {
          return "c".concat(index);
        }
      }

      if (this.type === 'v') {
        for (index = 0; index < this.parent.variables.length; index++) {
          var variable = this.parent.variables[index];

          if (this.sameObjectAs(variable)) {
            return "v".concat(index);
          }
        }
      }

      if (this.sameObjectAs(this.parent.symbol)) {
        return 's';
      }

      if (this.sameObjectAs(this.parent.body)) {
        return 'b';
      }

      var object = this.parent.tree.a != null ? this.parent.tree.a : {};

      for (var _i8 = 0, _Object$keys8 = Object.keys(object); _i8 < _Object$keys8.length; _i8++) {
        var key = _Object$keys8[_i8];
        var value = object[key];

        if (this.tree === value) {
          return key;
        }
      }

      return undefined; // should not happen
    } // The inverse of the previous function takes a string output by that function
    // and returns the corresponding child/variables/symbol/body immediately inside
    // this node.  That is, `x.parent.findChild x.findInParent()` will give us back
    // the same tree as `x` itself.  An invalid input will return undefined.

  }, {
    key: "findChild",
    value: function findChild(indexInParent) {
      switch (indexInParent[0]) {
        case 'c':
          return this.children[parseInt(indexInParent.slice(1))];

        case 'v':
          return this.variables[parseInt(indexInParent.slice(1))];

        case 's':
          return this.symbol;

        case 'b':
          return this.body;

        case '{':
          return this.getAttribute(OMNode.decode(indexInParent));
      }
    } // The `findInParent()` function can be generalized to find a node in any of
    // its ancestors, the result being an array of `findInParent()` results as you
    // walk downward from the ancestor to the descendant.  For instance, the first
    // bound variable within the second child of an application would have the
    // address `[ 'c1', 'v0' ]` (since indices are zero-based).  The following
    // function computes the array in question, the node's "address" within the
    // given ancestor.
    //
    // If no ancestor is specified, the highest-level one is used.  If a value is
    // passed that is not an ancestor of this node, then it is treated as if no
    // value had been passed.  If this node has no parent, or if this node itself
    // is passed as the parameter, then the empty array is returned.

  }, {
    key: "address",
    value: function address(inThis) {
      if (!this.parent || this.sameObjectAs(inThis)) {
        return [];
      }

      return this.parent.address(inThis).concat([this.findInParent()]);
    } // The `address` function has the following inverse, which looks up in an
    // ancestor node a descendant that has the given address within that ancestor.
    // So, in particular, `x.index y.address( x )` should equal `y`.  Furthermore,
    // `x.index [ ]` will always yield `x`.  An invalid input will return
    // undefined.

  }, {
    key: "index",
    value: function index(address) {
      if (!(address instanceof Array)) {
        return undefined;
      }

      if (address.length === 0) {
        return this;
      }

      var child = this.findChild(address[0]);
      return typeof child === 'undefined' || child === null ? undefined : child.index(address.slice(1));
    } // The following function breaks the relationship of the object with its
    // parent.  In some cases, this can invalidate the parent (e.g., by giving a
    // binding or error object no head symbol, or a binding no body, or no bound
    // variables).  If the object has no parent or its position in that parent is
    // undefined (as determined by `@findInParent()`) then this does nothing.

  }, {
    key: "remove",
    value: function remove() {
      var index;

      if (!(index = this.findInParent())) {
        return;
      }

      switch (index[0]) {
        case 'c':
          this.parent.tree.c.splice(parseInt(index.slice(1)), 1);
          break;

        case 'v':
          this.parent.tree.v.splice(parseInt(index.slice(1)), 1);
          break;

        case 'b':
          delete this.parent.tree.b;
          break;

        case 's':
          delete this.parent.tree.s;
          break;

        case '{':
          delete this.parent.tree.a[index];
          break;
      }

      delete this.tree.p;
    } // It will also be useful in later functions in this class to be able to
    // replace a subtree in-place with a new one.  The following method
    // accomplishes this, replacing this object in its context with the parameter.
    // This works whether this tree is a child, variable, head symbol, body, or
    // attribute value of its parent.  If this object has no parent, then we make
    // no modifications to that parent, since it does not exist.
    //
    // In all other cases, the parameter is `remove()`d from its context, and this
    // node, if it has a parent, is `remove()`d from it as well.  Furthermore, this
    // OMNode instance becomes a wrapper to the given node instead of its current
    // contents.  The removed node is returned.

  }, {
    key: "replaceWith",
    value: function replaceWith(other) {
      if (this.sameObjectAs(other)) {
        return;
      }

      var index = this.findInParent(); // If you attempt to replace a binding's or error's head symbol with a
      // non-symbol, this routine does nothing.  If you attempt to replace one of a
      // binding's variables with a non-variable, this routine does nothing.  When
      // this routine does nothing, it returns undefined.

      if (index === 's' && other.type !== 'sy') {
        return;
      }

      if ((index != null ? index[0] : undefined) === 'v' && other.type !== 'v') {
        return;
      }

      other.remove();
      var original = new OMNode(this.tree);
      this.tree = other.tree;

      switch (index != null ? index[0] : undefined) {
        case 'c':
          original.parent.tree.c[parseInt(index.slice(1))] = this.tree;
          break;

        case 'v':
          original.parent.tree.v[parseInt(index.slice(1))] = this.tree;
          break;

        case 'b':
          original.parent.tree.b = this.tree;
          break;

        case 's':
          original.parent.tree.s = this.tree;
          break;

        case '{':
          original.parent.tree.a[index] = this.tree;
          break;

        default:
          return;
        // didn't have a parent
      }

      this.tree.p = original.tree.p;
      delete original.tree.p;
      return original;
    } // ### Attributes
    //
    // Here we have three functions that let us manipulate attributes without
    // worrying about the unpredictable ordering of keys in a JSON stringification
    // of an object.
    //
    // The first takes an OMNode instance as input and looks up the corresponding
    // key-value pair in this object's attributes, if there is one.  If so, it
    // returns the corresponding value as an OMNode instance.  Otherwise, it
    // returns undefined.
    //
    // For efficiency, this considers only the names and CDs of the key when
    // searching.  If that becomes a problem later, it could be changed here in
    // this function, as well as in the two that follow.

  }, {
    key: "getAttribute",
    value: function getAttribute(keySymbol) {
      if (!(keySymbol instanceof OMNode)) {
        return undefined;
      }

      if (keySymbol.type !== 'sy') {
        return undefined;
      }

      var nameRE = RegExp("\"n\":\"".concat(keySymbol.name, "\""));
      var cdRE = RegExp("\"cd\":\"".concat(keySymbol.cd, "\""));
      var object = this.tree.a != null ? this.tree.a : {};

      for (var _i9 = 0, _Object$keys9 = Object.keys(object); _i9 < _Object$keys9.length; _i9++) {
        var key = _Object$keys9[_i9];
        var value = object[key];

        if (nameRE.test(key) && cdRE.test(key)) {
          return new OMNode(value);
        }
      }
    } // The second takes an OMNode instance as input and looks up the corresponding
    // key-value pair in this object's attributes, if there is one.  If so, it
    // deletes that key-value pair, which includes calling `remove()` on the value.
    // Otherwise, it does nothing.
    //
    // The same efficiency comments apply to this function as to the previous.

  }, {
    key: "removeAttribute",
    value: function removeAttribute(keySymbol) {
      if (!(keySymbol instanceof OMNode)) {
        return;
      }

      if (keySymbol.type !== 'sy') {
        return;
      }

      var nameRE = RegExp("\"n\":\"".concat(keySymbol.name, "\""));
      var cdRE = RegExp("\"cd\":\"".concat(keySymbol.cd, "\""));
      var object = this.tree.a != null ? this.tree.a : {};

      for (var _i10 = 0, _Object$keys10 = Object.keys(object); _i10 < _Object$keys10.length; _i10++) {
        var key = _Object$keys10[_i10];
        var value = object[key];

        if (nameRE.test(key) && cdRE.test(key)) {
          new OMNode(value).remove();
          delete this.tree.a[key];
          return;
        }
      }
    } // The third and final function of the set takes two OMNode instances as input,
    // a key and a new value.  It looks up the corresponding key-value pair in this
    // object's attributes, if there is one.  If so, it replaces the original value
    // with the new value, including calling `remove()` on the old value.
    // Otherwise, it inserts a new key-value pair corresponding to the two
    // parameters.  In either case, `remove()` is called on the new value before it
    // is inserted into this tree, in case it is already in another tree.
    //
    // The same efficiency comments apply to this function as to the previous.

  }, {
    key: "setAttribute",
    value: function setAttribute(keySymbol, newValue) {
      if (!(keySymbol instanceof OMNode) || !(newValue instanceof OMNode)) {
        return;
      }

      if (keySymbol.type !== 'sy') {
        return;
      }

      this.removeAttribute(keySymbol);
      newValue.remove();
      (this.tree.a != null ? this.tree.a : this.tree.a = {})[keySymbol.encode()] = newValue.tree;
      return newValue.tree.p = this.tree;
    } // ### Free and bound variables and expressions
    //
    // The methods in this section are about variable binding and which expressions
    // are free to replace others.  There are also methods that do such
    // replacements.
    //
    // This method lists the free variables in an expression.  It returns an array
    // of strings, just containing the variables' names.  Variables appearing in
    // attributes do not count; only variables appearing as children of
    // applications or error nodes, or in the body of a binding expression can
    // appear on this list.

  }, {
    key: "freeVariables",
    value: function freeVariables() {
      switch (this.type) {
        case 'v':
          return [this.name];

        case 'a':
        case 'c':
          var result = [];
          var _iteratorNormalCompletion7 = true;
          var _didIteratorError7 = false;
          var _iteratorError7 = undefined;

          try {
            for (var _iterator7 = this.children[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
              var child = _step7.value;
              var _iteratorNormalCompletion8 = true;
              var _didIteratorError8 = false;
              var _iteratorError8 = undefined;

              try {
                for (var _iterator8 = child.freeVariables()[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                  var free = _step8.value;

                  if (!result.includes(free)) {
                    result.push(free);
                  }
                }
              } catch (err) {
                _didIteratorError8 = true;
                _iteratorError8 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion8 && _iterator8["return"] != null) {
                    _iterator8["return"]();
                  }
                } finally {
                  if (_didIteratorError8) {
                    throw _iteratorError8;
                  }
                }
              }
            }
          } catch (err) {
            _didIteratorError7 = true;
            _iteratorError7 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion7 && _iterator7["return"] != null) {
                _iterator7["return"]();
              }
            } finally {
              if (_didIteratorError7) {
                throw _iteratorError7;
              }
            }
          }

          return result;

        case 'bi':
          var boundByThis = this.variables.map(function (v) {
            return v.name;
          });
          return this.body.freeVariables().filter(function (varname) {
            return !boundByThis.includes(varname);
          });

        default:
          return [];
      }
    } // This method computes whether an expression is free by walking up its
    // ancestor chain and determining whether any of the variables free in the
    // expression are bound further up the ancestor chain.  If you pass an
    // ancestor as the parameter, then the computation will not look upward beyond
    // that ancestor; the default is to leave the parameter unspecified, meaning
    // that the algorithm should look all the way up the parent chain.

  }, {
    key: "isFree",
    value: function isFree(inThis) {
      var freeVariables = this.freeVariables();
      var walk = this;

      while (walk) {
        if (walk.type === 'bi') {
          var boundHere = walk.variables.map(function (v) {
            return v.name;
          });
          var _iteratorNormalCompletion9 = true;
          var _didIteratorError9 = false;
          var _iteratorError9 = undefined;

          try {
            for (var _iterator9 = freeVariables[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
              var variable = _step9.value;

              if (boundHere.includes(variable)) {
                return false;
              }
            }
          } catch (err) {
            _didIteratorError9 = true;
            _iteratorError9 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion9 && _iterator9["return"] != null) {
                _iterator9["return"]();
              }
            } finally {
              if (_didIteratorError9) {
                throw _iteratorError9;
              }
            }
          }
        }

        if (walk.sameObjectAs(inThis)) {
          break;
        }

        walk = walk.parent;
      }

      return true;
    } // This method returns true if there is a descendant of this structure that is
    // structurally equivalent to the parameter and, at that point in the tree,
    // passes the `isFree` test defined immediately above.  This algorithm only
    // looks downward through children, head symbols, and bodies of binding nodes,
    // not attribute keys or values.
    //
    // Later it would be easy to add an optional second parameter, `inThis`, which
    // would function like the parameter of the same name to `isFree()`, and would
    // be passed directly along to `isFree()`.  This change would require testing.

  }, {
    key: "occursFree",
    value: function occursFree(findThis) {
      if (this.equals(findThis) && this.isFree()) {
        return true;
      }

      if (this.symbol != null ? this.symbol.equals(findThis) : undefined) {
        return true;
      }

      if (this.body != null ? this.body.occursFree(findThis) : undefined) {
        return true;
      }

      var _iteratorNormalCompletion10 = true;
      var _didIteratorError10 = false;
      var _iteratorError10 = undefined;

      try {
        for (var _iterator10 = this.children[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
          var child = _step10.value;

          if (child.occursFree(findThis)) {
            return true;
          }
        }
      } catch (err) {
        _didIteratorError10 = true;
        _iteratorError10 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion10 && _iterator10["return"] != null) {
            _iterator10["return"]();
          }
        } finally {
          if (_didIteratorError10) {
            throw _iteratorError10;
          }
        }
      }

      return false;
    } // One subtree A is free to replace another B if no variable free in A becomes
    // bound when B is replaced by A.  Because we will be asking whether variables
    // are free/bound, we will need to know the ancestor context in which to make
    // those queries.  The default is the highest ancestor, but that default can be
    // changed with the optional final parameter.
    //
    // Note that this routine also returns false in those cases where it does not
    // make sense to replace the given subtree with this tree based simply on their
    // types, and not even taking free variables into account.  For example, a
    // binding or error node must have a head symbol, which cannot be replaced with
    // a non-symbol, and a binding node's variables must not be replaced with
    // non-variables.

  }, {
    key: "isFreeToReplace",
    value: function isFreeToReplace(subtreeToReplace, inThis) {
      if (this.sameObjectAs(subtreeToReplace)) {
        return true;
      }

      if (subtreeToReplace.parent == null) {
        return true;
      }

      var context = subtreeToReplace;

      while (context.parent) {
        context = context.parent;
      }

      var saved = new OMNode(subtreeToReplace.tree);

      if (!subtreeToReplace.replaceWith(this.copy())) {
        return false;
      }

      var result = subtreeToReplace.isFree(inThis);
      subtreeToReplace.replaceWith(saved);
      return result;
    } // This method replaces every free occurrence of one expression (original) with
    // a copy of the another expression (replacement).  The search-and-replace
    // recursion only proceeds through children, head symbols, and bodies of
    // binding nodes, not attribute keys or values.
    //
    // The optional third parameter, `inThis`, functions like the parameter of the
    // same name to `isFree()`, is passed directly along to `isFree()`.

  }, {
    key: "replaceFree",
    value: function replaceFree(original, replacement, inThis) {
      if (inThis == null) {
        inThis = this;
      }

      if (this.isFree(inThis) && this.equals(original)) {
        // Although the implementation here is very similar to the implementation of
        // `isFreeToReplace()`, we do not call that function, because it would require
        // making two copies and doing two replacements; this is more efficient.
        var save = new OMNode(this.tree);
        this.replaceWith(replacement.copy());

        if (!this.isFree(inThis)) {
          this.replaceWith(save);
        }

        return;
      }

      if (this.symbol != null) {
        this.symbol.replaceFree(original, replacement, inThis);
      }

      if (this.body != null) {
        this.body.replaceFree(original, replacement, inThis);
      }

      var _iteratorNormalCompletion11 = true;
      var _didIteratorError11 = false;
      var _iteratorError11 = undefined;

      try {
        for (var _iterator11 = this.variables[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
          var variable = _step11.value;
          variable.replaceFree(original, replacement, inThis);
        }
      } catch (err) {
        _didIteratorError11 = true;
        _iteratorError11 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion11 && _iterator11["return"] != null) {
            _iterator11["return"]();
          }
        } finally {
          if (_didIteratorError11) {
            throw _iteratorError11;
          }
        }
      }

      this.children.map(function (child) {
        return child.replaceFree(original, replacement, inThis);
      });
    } // ### Filtering children and descendants
    //
    // The following function returns an array of all children (immediate
    // subexpressions, actually, including head symbols, bound variables, etc.)
    // that pass the given criterion.  If no criterion is given, then all immediate
    // subexpressions are returned.  Order is preserved.
    //
    // Note that the actual subtrees are returned, not copies thereof.  Any
    // manipulation done to the elements of the result array will therefore impact
    // the original expression.

  }, {
    key: "childrenSatisfying",
    value: function childrenSatisfying(filter) {
      if (filter == null) {
        filter = function filter() {
          return true;
        };
      }

      var children = this.children;

      if (this.symbol != null) {
        children.push(this.symbol);
      }

      children = children.concat(this.variables);

      if (this.body != null) {
        children.push(this.body);
      }

      return children.filter(filter);
    } // The following function returns an array of all subexpressions (not just
    // immediate ones) that pass the given criterion, in tree order.  If no
    // criterion is given, then all subexpressions are returned.
    //
    // As with the previous function, the actual subtrees are returned, not copies
    // thereof.  Any manipulation done to the elements of the result array will
    // therefore impact the original expression.

  }, {
    key: "descendantsSatisfying",
    value: function descendantsSatisfying(filter) {
      if (filter == null) {
        filter = function filter() {
          return true;
        };
      }

      var results = [];

      if (filter(this)) {
        results.push(this);
      }

      var _iteratorNormalCompletion12 = true;
      var _didIteratorError12 = false;
      var _iteratorError12 = undefined;

      try {
        for (var _iterator12 = this.childrenSatisfying()[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
          var child = _step12.value;
          results = results.concat(child.descendantsSatisfying(filter));
        }
      } catch (err) {
        _didIteratorError12 = true;
        _iteratorError12 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion12 && _iterator12["return"] != null) {
            _iterator12["return"]();
          }
        } finally {
          if (_didIteratorError12) {
            throw _iteratorError12;
          }
        }
      }

      return results;
    } // A simpler function performs the same task as the previous, but does not
    // return a list of all descendants; it merely returns whether there are any,
    // as a boolean.  It is thus more efficient to use this than to run the
    // previous and compare its length to zero.

  }, {
    key: "hasDescendantSatisfying",
    value: function hasDescendantSatisfying(filter) {
      if (filter == null) {
        filter = function filter() {
          return true;
        };
      }

      if (filter(this)) {
        return true;
      }

      var _iteratorNormalCompletion13 = true;
      var _didIteratorError13 = false;
      var _iteratorError13 = undefined;

      try {
        for (var _iterator13 = this.childrenSatisfying()[Symbol.iterator](), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
          var child = _step13.value;

          if (child.hasDescendantSatisfying(filter)) {
            return true;
          }
        }
      } catch (err) {
        _didIteratorError13 = true;
        _iteratorError13 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion13 && _iterator13["return"] != null) {
            _iterator13["return"]();
          }
        } finally {
          if (_didIteratorError13) {
            throw _iteratorError13;
          }
        }
      }

      return false;
    }
  }, {
    key: "parent",
    get: function get() {
      if (this.tree.p) {
        return new OMNode(this.tree.p);
      } else {
        return undefined;
      }
    }
  }, {
    key: "type",
    get: function get() {
      return this.tree.t;
    }
  }, {
    key: "value",
    get: function get() {
      if (this.tree.t !== 'bi') {
        return this.tree.v;
      } else {
        return undefined;
      }
    }
  }, {
    key: "name",
    get: function get() {
      return this.tree.n;
    }
  }, {
    key: "cd",
    get: function get() {
      return this.tree.cd;
    }
  }, {
    key: "uri",
    get: function get() {
      return this.tree.uri;
    }
  }, {
    key: "symbol",
    get: function get() {
      if (this.tree.s) {
        return new OMNode(this.tree.s);
      } else {
        return undefined;
      }
    }
  }, {
    key: "body",
    get: function get() {
      if (this.tree.b) {
        return new OMNode(this.tree.b);
      } else {
        return undefined;
      }
    }
  }, {
    key: "children",
    get: function get() {
      return (this.tree.c != null ? this.tree.c : []).map(function (child) {
        return new OMNode(child);
      });
    }
  }, {
    key: "variables",
    get: function get() {
      if (this.tree.t === 'bi') {
        return this.tree.v.map(function (variable) {
          return new OMNode(variable);
        });
      } else {
        return [];
      }
    }
  }], [{
    key: "integer",
    value: function integer(value) {
      return OMNode.decode({
        t: 'i',
        v: value
      });
    } // The float factory function creates an OpenMath float node, and must be
    // passed a single parameter containing a number, e.g., `OM.integer 1.234`,
    // and that number cannot be infinite or NaN.

  }, {
    key: "float",
    value: function float(value) {
      return OMNode.decode({
        t: 'f',
        v: value
      });
    } // The string factory function creates an OpenMath string node, and must be
    // passed a single parameter containing a string, e.g., `OM.integer 'hi'`.

  }, {
    key: "string",
    value: function string(value) {
      return OMNode.decode({
        t: 'st',
        v: value
      });
    } // The byte array factory function creates an OpenMath byte array node, and
    // must be passed a single parameter that is an instance of `Uint8Array`.

  }, {
    key: "bytearray",
    value: function bytearray(value) {
      return OMNode.decode({
        t: 'ba',
        v: value
      });
    } // The symbol factory function creates an OpenMath symbol node, and must be
    // passed two or three parameters, in this order: symbol name (a string),
    // content dictionary name (a string), and optionally the CD's base URI (a
    // string).

  }, {
    key: "symbol",
    value: function symbol(name, cd, uri) {
      return OMNode.decode(uri != null ? {
        t: 'sy',
        n: name,
        cd: cd,
        uri: uri
      } : {
        t: 'sy',
        n: name,
        cd: cd
      });
    } // The variable factory function creates an OpenMath variable node, and must be
    // passed one parameter, the variable name (a string).

  }, {
    key: "variable",
    value: function variable(name) {
      return OMNode.decode({
        t: 'v',
        n: name
      });
    } // The application factory creates an OpenMath application node, and accepts a
    // variable number of arguments, each of which must be either an `OMNode`
    // instance or the JSON object that could function as the tree within such an
    // instance.  `OMNode` instances are copied, objects are used as-is.

  }, {
    key: "application",
    value: function application() {
      var result = {
        t: 'a',
        c: []
      };

      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      for (var _i11 = 0, _args = args; _i11 < _args.length; _i11++) {
        var arg = _args[_i11];
        result.c.push(arg instanceof OMNode ? JSON.parse(arg.encode()) // copy without parent pointers
        : arg);
      }

      return OMNode.decode(result);
    } // The attribution factory creates an OpenMath node from its first argument,
    // and attaches to it the attributes specified by the remaining arguments.
    // Those remaining arguments must come in pairs k1, v1, through kn, vn, and
    // each ki,vi pair must be an OpenMath symbol node followed by any OpenMath
    // node.  As in the case of applications, such nodes may be JSON objects or
    // `OMNode` instances; the former are used as-is and the latter copied.  The
    // first parameter can also be either a JSON object or an `OMNode` instance,
    // and in the latter case it, too, is copied.

  }, {
    key: "attribution",
    value: function attribution(node) {
      if (!(node instanceof Object)) {
        return 'Invalid first parameter to attribution';
      }

      for (var _len3 = arguments.length, attrs = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        attrs[_key3 - 1] = arguments[_key3];
      }

      if (attrs.length % 2 !== 0) {
        return 'Incomplete key-value pair in attribution';
      }

      if (node instanceof OMNode) {
        node = JSON.parse(node.encode());
      }

      while (attrs.length > 0) {
        if (node.a == null) {
          node.a = {};
        }

        var key = attrs.shift();
        key = key instanceof OMNode ? key.encode() : JSON.stringify(key);
        var value = attrs.shift();
        node.a[key] = value instanceof OMNode ? JSON.parse(value.encode()) // copy without parent pointers
        : value;
      }

      return OMNode.decode(node);
    } // The binding factory functions exactly like the application factory, except
    // that it has restrictions on the types of its arguments.  The first must be a
    // symbol (used as the head of the binding), the last can be any OpenMath node,
    // and all those in between must be variables.  Furthermore, there must be at
    // least two arguments, so that there is a head and a body.  Just as in the
    // case of applications, `OMNode` instances are copied, but straight JSON
    // objects are used as-is.

  }, {
    key: "binding",
    value: function binding(head) {
      for (var _len4 = arguments.length, rest = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        rest[_key4 - 1] = arguments[_key4];
      }

      var adjustedLength = Math.max(rest.length, 1),
          vars = rest.slice(0, adjustedLength - 1),
          body = rest[adjustedLength - 1];

      if (!(head instanceof Object)) {
        return 'Invalid first parameter to binding';
      }

      if (!(body instanceof Object)) {
        return 'Invalid last parameter to binding';
      }

      var result = {
        t: 'bi',
        s: head instanceof OMNode ? JSON.parse(head.encode()) : head,
        v: [],
        b: body instanceof OMNode ? JSON.parse(body.encode()) : body
      };
      var _iteratorNormalCompletion14 = true;
      var _didIteratorError14 = false;
      var _iteratorError14 = undefined;

      try {
        for (var _iterator14 = vars[Symbol.iterator](), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
          var variable = _step14.value;
          result.v.push(variable instanceof OMNode ? JSON.parse(variable.encode()) // copy w/o parent pointers
          : variable);
        }
      } catch (err) {
        _didIteratorError14 = true;
        _iteratorError14 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion14 && _iterator14["return"] != null) {
            _iterator14["return"]();
          }
        } finally {
          if (_didIteratorError14) {
            throw _iteratorError14;
          }
        }
      }

      return OMNode.decode(result);
    } // The error factory functions exactly like the application factory, except
    // that it has one restriction on the types of its arguments:  The first must
    // be a symbol.  Just as in the case of applications, `OMNode` instances are
    // copied, but straight JSON objects are used as-is.

  }, {
    key: "error",
    value: function error(head) {
      if (!(head instanceof Object)) {
        return 'Invalid first parameter to binding';
      }

      var result = {
        t: 'e',
        s: head instanceof OMNode ? JSON.parse(head.encode()) : head,
        c: []
      };

      for (var _len5 = arguments.length, others = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
        others[_key5 - 1] = arguments[_key5];
      }

      for (var _i12 = 0, _others = others; _i12 < _others.length; _i12++) {
        var other = _others[_i12];
        result.c.push(other instanceof OMNode ? JSON.parse(other.encode()) // copy without parent pointers
        : other);
      }

      return OMNode.decode(result);
    } // For documentation of this routine, refer to the simple encoding/decoding
    // entry in our API documentation.

  }, {
    key: "simpleDecode",
    value: function simpleDecode(input) {
      // Ensure the input is a string.
      if (typeof input !== 'string') {
        return 'Input was not a string';
      } // Tokenize it using the above token data.


      var tokens = [];

      while (input.length > 0) {
        var originally = input.length;
        var _iteratorNormalCompletion15 = true;
        var _didIteratorError15 = false;
        var _iteratorError15 = undefined;

        try {
          for (var _iterator15 = tokenTypes[Symbol.iterator](), _step15; !(_iteratorNormalCompletion15 = (_step15 = _iterator15.next()).done); _iteratorNormalCompletion15 = true) {
            var tokenType = _step15.value;
            var match = tokenType.pattern.exec(input);

            if (match != null && match.index === 0) {
              tokens.push({
                type: tokenType.name,
                text: match[0]
              });
              input = input.slice(match[0].length);
            }
          }
        } catch (err) {
          _didIteratorError15 = true;
          _iteratorError15 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion15 && _iterator15["return"] != null) {
              _iterator15["return"]();
            }
          } finally {
            if (_didIteratorError15) {
              throw _iteratorError15;
            }
          }
        }

        if (input.length === originally) {
          return "Could not understand from here: ".concat(input.slice(0, 11));
        }
      } // Parse tokens using two states: one for when an expression is about to start,
      // and one for when an expression just ended.  Maintain a stack of expressions
      // already parsed, for forming application and binding expressions.


      var state = 'expression about to start';
      var stack = [];

      while (tokens.length > 0) {
        var type;
        var expr, i, index;
        var asc, end;
        var asc1, end1;
        var next = tokens.shift();

        switch (state) {
          case 'expression about to start':
            switch (next.type) {
              case 'symbol':
                var halves = next.text.split('.');
                stack.unshift({
                  node: OMNode.symbol(halves[1], halves[0])
                });
                break;

              case 'variable':
                stack.unshift({
                  node: OMNode.variable(next.text)
                });
                break;

              case 'integer':
                var _int = parseInt(next.text);

                if (/\./.test(_int)) {
                  _int = next.text;
                }

                stack.unshift({
                  node: OMNode.integer(_int)
                });
                break;

              case 'float':
                stack.unshift({
                  node: OMNode["float"](parseFloat(next.text))
                });
                break;

              case 'string':
                type = next.text[0];
                next = next.text.slice(1, -1).replace(RegExp("\\\\".concat(type), 'g'), type);
                stack.unshift({
                  node: OMNode.string(next)
                });
                break;

              default:
                return "Unexpected ".concat(next.text);
            }

            state = 'expression ended';
            break;

          case 'expression ended':
            switch (next.type) {
              case 'comma':
                state = 'expression about to start';
                break;

              case 'openParen':
                stack[0].head = 'application';

                if (tokens && tokens[0] && tokens[0].type === 'closeParen') {
                  tokens.shift();
                  stack.unshift({
                    node: OMNode.application(stack.shift().node)
                  });
                  state = 'expression ended';
                } else {
                  state = 'expression about to start';
                }

                break;

              case 'openBracket':
                stack[0].head = 'binding';
                state = 'expression about to start';
                break;

              case 'closeParen':
                for (index = 0; index < stack.length; index++) {
                  expr = stack[index];

                  if (expr.head === 'application') {
                    break;
                  }

                  if (expr.head === 'binding') {
                    return "Mismatch: [ closed by )";
                  }
                }

                if (index === stack.length) {
                  return "Unexpected )";
                }

                var children = [];

                for (i = 0, end = index, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
                  children.unshift(stack.shift().node);
                }

                stack.unshift({
                  node: OMNode.application.apply(null, children)
                });
                break;

              case 'closeBracket':
                for (index = 0; index < stack.length; index++) {
                  expr = stack[index];

                  if (expr.head === 'binding') {
                    break;
                  }

                  if (expr.head === 'application') {
                    return "Mismatch: ( closed by ]";
                  }
                }

                if (index === stack.length) {
                  return "Unexpected ]";
                }

                children = [];

                for (i = 0, end1 = index, asc1 = 0 <= end1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
                  children.unshift(stack.shift().node);
                }

                stack.unshift({
                  node: OMNode.binding.apply(null, children)
                });
                break;

              default:
                return "Unexpected ".concat(next.text);
            }

            break;
        }

        if (typeof (stack != null ? stack[0].node : undefined) === 'string') {
          return stack[0].node; // error in building OMNode
        }
      } // Parsing complete so there should be just one node on the stack, the result.
      // If there is more than one, we have an error.


      if (stack.length > 1) {
        return "Unexpected end of input";
      } else {
        return stack[0].node;
      }
    }
  }]);
  return OMNode;
}();

exports.OMNode = OMNode;
var OM = OMNode; // ## Nicknames
//
// Here we copy each of the factory functions to a short version if its own
// name, so that they can be combined in more compact form when creating
// expressions.  Each short version is simply the first 3 letters of its long
// version, to make them easy to remember.

exports.OM = OM;
OM["int"] = OM.integer;
OM.flo = OM["float"];
OM.str = OM.string;
OM.byt = OM.bytearray;
OM.sym = OM.symbol;
OM["var"] = OM.variable;
OM.app = OM.application;
OM.att = OM.attribution;
OM.bin = OM.binding;
OM.err = OM.error;
OM.simple = OM.simpleDecode; // ## Creating valid identifiers
//
// Because OpenMath symbols and variables are restricted to have names that are
// valid OpenMath identifiers, not all strings can be used as variable or
// symbol names.  Sometimes, however, one wants to encode an arbitrary string
// as a symbol or variable.  Thus we create the following injection from the
// set of all strings into the set of valid OpenMath identifiers (together with
// its inverse, which goes in the other direction).

OM.encodeAsIdentifier = function (string) {
  var charTo4Digits = function charTo4Digits(index) {
    return ('000' + string.charCodeAt(index).toString(16)).slice(-4);
  };

  var result = 'id_';

  for (var i = 0, end = string.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
    result += charTo4Digits(i);
  }

  return result;
};

OM.decodeIdentifier = function (ident) {
  var result = '';

  if (ident.slice(0, 3) !== 'id_') {
    return result;
  }

  ident = ident.slice(3);

  while (ident.length > 0) {
    result += String.fromCharCode(parseInt(ident.slice(0, 4), 16));
    ident = ident.slice(4);
  }

  return result;
}; // ## Ancillary utilities
//
// The functions defined in this section are experimental and incomplete.  They
// are untested, and are just simple implementations present here primarly for
// their value to our demo apps.  Complete and tested implementations may come
// later, if these functions become more important.
//
// ### Converting mathematical expressions to XML
//
// This is an incomplete implementation of the XML encoding for OpenMath trees.
// It is piecemeal, spotty, and only partially tested, and even those tests
// were done manually and/or within a demo application, not automated.


OM.prototype.toXML = function () {
  var indent = function indent(text) {
    return "  ".concat(text.replace(RegExp('\n', 'g'), '\n  '));
  };

  switch (this.type) {
    case 'i':
      return "<OMI>".concat(this.value, "</OMI>");

    case 'sy':
      return "<OMS cd=\"".concat(this.cd, "\" name=\"").concat(this.name, "\"/>");

    case 'v':
      return "<OMV name=\"".concat(this.name, "\"/>");

    case 'f':
      return "<OMF dec=\"".concat(this.value, "\"/>");

    case 'st':
      var text = this.value.replace(/\&/g, '&amp;').replace(/</g, '&lt;');
      return "<OMSTR>".concat(text, "</OMSTR>");

    case 'a':
      var inside = this.children.map(function (c) {
        return indent(c.toXML());
      }).join('\n');
      return "<OMA>\n".concat(inside, "\n</OMA>");

    case 'bi':
      var head = indent(this.symbol.toXML());
      var vars = this.variables.map(function (v) {
        return v.toXML();
      }).join('');
      vars = indent("<OMBVAR>".concat(vars, "</OMBVAR>"));
      var body = indent(this.body.toXML());
      return "<OMBIND>\n".concat(head, "\n").concat(vars, "\n").concat(body, "\n</OMBIND>");

    default:
      throw "Cannot convert this to XML: ".concat(this.simpleEncode());
  }
}; // ### Evaluating mathematical expressions numerically
//
// The following is a very limited routine that evaluates mathematical
// expressions numerically when possible, and returns an explanation of why it
// could not evaluate them in cases where it could not.  The result is an
// object with `value` and `message` attributes.
//
// The `value` attribute is intended to be the result, but may be undefined if
// an error takes place during evaluation (such as division by zero, or many
// other possible mathematical mistakes).  In such cases, the `message`
// attribute will explain what went wrong.  It may be a newline-separated list
// of problems.  Even when the `value` exists, the `message` attribute may be
// nonempty, containing warnings such as when using decimal approximations to
// real numbers.


OM.prototype.evaluate = function () {
  var _this = this;

  var arg, result;

  var call = function call(func) {
    var value;
    var message = undefined;
    var args = [];

    for (var _len6 = arguments.length, indices = new Array(_len6 > 1 ? _len6 - 1 : 0), _key6 = 1; _key6 < _len6; _key6++) {
      indices[_key6 - 1] = arguments[_key6];
    }

    for (var _i13 = 0, _indices = indices; _i13 < _indices.length; _i13++) {
      var index = _indices[_i13];
      arg = _this.children[index].evaluate();

      if (arg.value == null) {
        return arg;
      }

      if (arg.message != null) {
        if (message == null) {
          message = '';
        } else {
          message += '\n';
        }

        message += arg.message;
      }

      args.push(arg.value);
    }

    try {
      value = func.apply(void 0, (0, _toConsumableArray2["default"])(args || []));
    } catch (e) {
      if (message == null) {
        message = '';
      } else {
        message += '\n';
      }

      message += e.message;
    }

    return {
      value: value,
      message: message
    };
  };

  switch (this.type) {
    case 'i':
    case 'f':
      result = {
        value: new Number(this.value)
      };
      break;

    case 'st':
    case 'ba':
      result = {
        value: this.value
      };
      break;

    case 'v':
      switch (this.name) {
        case "\u03C0":
          // pi
          result = {
            value: Math.PI,
            message: "The actual value of \u03C0 has been rounded."
          };
          break;

        case 'e':
          result = {
            value: Math.exp(1),
            message: 'The actual value of e has been rounded.'
          };
      }

      break;

    case 'sy':
      switch (this.simpleEncode()) {
        case 'units.degrees':
          result = {
            value: Math.PI / 180,
            message: "Converting to degrees used an approximation of \u03C0." // that is, pi

          };
          break;

        case 'units.percent':
          result = {
            value: 0.01
          };
          break;

        case 'units.dollars':
          result = {
            value: 1,
            message: 'Dollar units were dropped'
          };
      }

      break;

    case 'a':
      switch (this.children[0].simpleEncode()) {
        case 'arith1.plus':
          result = call(function (a, b) {
            return a + b;
          }, 1, 2);
          break;

        case 'arith1.minus':
          result = call(function (a, b) {
            return a - b;
          }, 1, 2);
          break;

        case 'arith1.times':
          result = call(function (a, b) {
            return a * b;
          }, 1, 2);
          break;

        case 'arith1.divide':
          result = call(function (a, b) {
            return a / b;
          }, 1, 2);
          break;

        case 'arith1.power':
          result = call(Math.pow, 1, 2);
          break;

        case 'arith1.root':
          result = call(function (a, b) {
            return Math.pow(b, 1 / a);
          }, 1, 2);
          break;

        case 'arith1.abs':
          result = call(Math.abs, 1);
          break;

        case 'arith1.unary_minus':
          result = call(function (a) {
            return -a;
          }, 1);
          break;

        case 'relation1.eq':
          result = call(function (a, b) {
            return a === b;
          }, 1, 2);
          break;

        case 'relation1.approx':
          var tmp = call(function (a, b) {
            return Math.abs(a - b) < 0.01;
          }, 1, 2);

          if ((tmp.message != null ? tmp.message : tmp.message = '').length) {
            tmp.message += '\n';
          }

          tmp.message += "Values were rounded to two decimal places for approximate comparison.";
          result = tmp;
          break;

        case 'relation1.neq':
          result = call(function (a, b) {
            return a !== b;
          }, 1, 2);
          break;

        case 'relation1.lt':
          result = call(function (a, b) {
            return a < b;
          }, 1, 2);
          break;

        case 'relation1.gt':
          result = call(function (a, b) {
            return a > b;
          }, 1, 2);
          break;

        case 'relation1.le':
          result = call(function (a, b) {
            return a <= b;
          }, 1, 2);
          break;

        case 'relation1.ge':
          result = call(function (a, b) {
            return a >= b;
          }, 1, 2);
          break;

        case 'logic1.not':
          result = call(function (a) {
            return !a;
          }, 1);
          break;

        case 'transc1.sin':
          result = call(Math.sin, 1);
          break;

        case 'transc1.cos':
          result = call(Math.cos, 1);
          break;

        case 'transc1.tan':
          result = call(Math.tan, 1);
          break;

        case 'transc1.cot':
          result = call(function (a) {
            return 1 / Math.tan(a);
          }, 1);
          break;

        case 'transc1.sec':
          result = call(function (a) {
            return 1 / Math.cos(a);
          }, 1);
          break;

        case 'transc1.csc':
          result = call(function (a) {
            return 1 / Math.sin(a);
          }, 1);
          break;

        case 'transc1.arcsin':
          result = call(Math.asin, 1);
          break;

        case 'transc1.arccos':
          result = call(Math.acos, 1);
          break;

        case 'transc1.arctan':
          result = call(Math.atan, 1);
          break;

        case 'transc1.arccot':
          result = call(function (a) {
            return Math.atan(1 / a);
          }, 1);
          break;

        case 'transc1.arcsec':
          result = call(function (a) {
            return Math.acos(1 / a);
          }, 1);
          break;

        case 'transc1.arccsc':
          result = call(function (a) {
            return Math.asin(1 / a);
          }, 1);
          break;

        case 'transc1.ln':
          result = call(Math.log, 1);
          break;

        case 'transc1.log':
          result = call(function (base, arg) {
            return Math.log(arg) / Math.log(base);
          }, 1, 2);
          break;

        case 'integer1.factorial':
          result = call(function (a) {
            if (a <= 1) {
              return 1;
            }

            if (a >= 20) {
              return Infinity;
            }

            result = 1;

            for (var i = 1, end = a | 0, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
              result *= i;
            }

            return result;
          }, 1);
        // Maybe later I will come back and implement these, but this
        // is just a demo app, so there is no need to get fancy.
        // when 'arith1.sum'
        // when 'calculus1.int'
        // when 'calculus1.defint'
        // when 'limit1.limit'
      }

  }

  if (result == null) {
    result = {
      value: undefined
    };
  }

  if (typeof result.value === 'undefined') {
    result.message = "Could not evaluate ".concat(this.simpleEncode());
  } // console.log "#{node.simpleEncode()} --> #{JSON.stringify result}"


  return result;
};