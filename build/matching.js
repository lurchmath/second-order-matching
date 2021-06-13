"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "setAPI", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.setAPI;
  }
});
Object.defineProperty(exports, "isExpressionFunction", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.isExpressionFunction;
  }
});
Object.defineProperty(exports, "makeExpressionFunction", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.makeExpressionFunction;
  }
});
Object.defineProperty(exports, "isExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.isExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "makeExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.makeExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "canApplyExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.canApplyExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "getVariablesIn", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.getVariablesIn;
  }
});
Object.defineProperty(exports, "occursFree", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.occursFree;
  }
});
Object.defineProperty(exports, "isFree", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.isFree;
  }
});
Object.defineProperty(exports, "applyExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.applyExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "getNewVariableRelativeTo", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.getNewVariableRelativeTo;
  }
});
Object.defineProperty(exports, "replaceWithoutCapture", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.replaceWithoutCapture;
  }
});
Object.defineProperty(exports, "alphaConvert", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.alphaConvert;
  }
});
Object.defineProperty(exports, "alphaEquivalent", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.alphaEquivalent;
  }
});
Object.defineProperty(exports, "betaReduce", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.betaReduce;
  }
});
Object.defineProperty(exports, "makeConstantExpression", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.makeConstantExpression;
  }
});
Object.defineProperty(exports, "makeProjectionExpression", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.makeProjectionExpression;
  }
});
Object.defineProperty(exports, "makeImitationExpression", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.makeImitationExpression;
  }
});
Object.defineProperty(exports, "CASES", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.CASES;
  }
});
Object.defineProperty(exports, "Constraint", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.Constraint;
  }
});
Object.defineProperty(exports, "ConstraintList", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.ConstraintList;
  }
});
Object.defineProperty(exports, "MatchingChallenge", {
  enumerable: true,
  get: function get() {
    return _matchingWithoutOm.MatchingChallenge;
  }
});
Object.defineProperty(exports, "API", {
  enumerable: true,
  get: function get() {
    return _openmathApi.API;
  }
});

var _matchingWithoutOm = require("./matching-without-om.js");

var _openmathApi = require("./openmath-api.js");

(0, _matchingWithoutOm.setAPI)(_openmathApi.API);