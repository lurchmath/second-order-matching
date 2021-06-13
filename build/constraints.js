/**
 * This module defines the two classes for working with constraints:
 * Constraint and ConstraintList.
 */
"use strict"; // Import everything from the language module and expose it as well.

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "isExpressionFunction", {
  enumerable: true,
  get: function get() {
    return _language.isExpressionFunction;
  }
});
Object.defineProperty(exports, "makeExpressionFunction", {
  enumerable: true,
  get: function get() {
    return _language.makeExpressionFunction;
  }
});
Object.defineProperty(exports, "isExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _language.isExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "makeExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _language.makeExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "canApplyExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _language.canApplyExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "getVariablesIn", {
  enumerable: true,
  get: function get() {
    return _language.getVariablesIn;
  }
});
Object.defineProperty(exports, "occursFree", {
  enumerable: true,
  get: function get() {
    return _language.occursFree;
  }
});
Object.defineProperty(exports, "isFree", {
  enumerable: true,
  get: function get() {
    return _language.isFree;
  }
});
Object.defineProperty(exports, "applyExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _language.applyExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "getNewVariableRelativeTo", {
  enumerable: true,
  get: function get() {
    return _language.getNewVariableRelativeTo;
  }
});
Object.defineProperty(exports, "replaceWithoutCapture", {
  enumerable: true,
  get: function get() {
    return _language.replaceWithoutCapture;
  }
});
Object.defineProperty(exports, "alphaConvert", {
  enumerable: true,
  get: function get() {
    return _language.alphaConvert;
  }
});
Object.defineProperty(exports, "alphaEquivalent", {
  enumerable: true,
  get: function get() {
    return _language.alphaEquivalent;
  }
});
Object.defineProperty(exports, "betaReduce", {
  enumerable: true,
  get: function get() {
    return _language.betaReduce;
  }
});
Object.defineProperty(exports, "makeConstantExpression", {
  enumerable: true,
  get: function get() {
    return _language.makeConstantExpression;
  }
});
Object.defineProperty(exports, "makeProjectionExpression", {
  enumerable: true,
  get: function get() {
    return _language.makeProjectionExpression;
  }
});
Object.defineProperty(exports, "makeImitationExpression", {
  enumerable: true,
  get: function get() {
    return _language.makeImitationExpression;
  }
});
Object.defineProperty(exports, "setAPI", {
  enumerable: true,
  get: function get() {
    return _language.setAPI;
  }
});
Object.defineProperty(exports, "getAPI", {
  enumerable: true,
  get: function get() {
    return _language.getAPI;
  }
});
exports.ConstraintList = exports.Constraint = exports.CASES = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _construct2 = _interopRequireDefault(require("@babel/runtime/helpers/construct"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _language = require("./language.js");

////////////////////////////////////////////////////////////////////////////////
// * The classes below allow us to represent constraints.
// * A constraint is an ordered pattern-expression pair.
// * A pattern is an expression containing metavariables.
// * A (plain) expression does not contain metavariables.
// * In some cases the pattern may not contain metavariables, but we would
// * look to remove this constraint from any lists it appeared in.
// * A special case of a constraint is a substitution.
// * In a substiution, the pattern is just a metavariable.
////////////////////////////////////////////////////////////////////////////////

/**
 * @constant CASES an enum-like object to easily access cases.
 *
 * IDENTITY represents the case in which the pattern
 * and expression are equal (and hence the pattern contains no metavariables)
 *
 * BINDING represents the case in which the pattern is
 * just a metavariable
 *
 * SIMPLIFICATION represents the case in which both the pattern
 * and the expression are functions and the 'head' of the pattern function is
 * not a metavariable
 *
 * EFA represents the case in which the pattern is an expression function application,
 * or a function with a metavariable as its 'head', and <code>SIMPLIFICATION</code>
 * does not hold
 *
 * FAILURE represents the case of failure, when no other cases apply
 */
var CASES = {
  IDENTITY: 1,
  BINDING: 2,
  SIMPLIFICATION: 3,
  EFA: 4,
  FAILURE: 5
};
exports.CASES = CASES;
Object.freeze(CASES);
/**
 * Represents a pattern-expression pair.
 */

var Constraint = /*#__PURE__*/function () {
  /**
   * Creates a new constraint with given pattern and expression.
   * @param {OM} pattern - an expression which should contain a metavariable (but may not)
   * @param {OM} expression - an expression which must not contain a metavariable
   */
  function Constraint(pattern, expression) {
    (0, _classCallCheck2["default"])(this, Constraint);

    if (!(0, _language.getAPI)().isExpression(pattern) || !(0, _language.getAPI)().isExpression(expression)) {
      throw Error('Both arguments must be expressions');
    }

    this.pattern = pattern;
    this.expression = expression;
    this["case"] = this.getCase(pattern, expression);
  }
  /**
   * @returns a deep copy
   */


  (0, _createClass2["default"])(Constraint, [{
    key: "copy",
    value: function copy() {
      return new Constraint((0, _language.getAPI)().copy(this.pattern), (0, _language.getAPI)().copy(this.expression));
    }
    /**
     * @param {Constraint} other - another Constraint
     * @returns <code>true</code> if patterns and expressions are structurally equal
     * OR alpha equivalent, <code>false</code> otherwise.
     */

  }, {
    key: "equals",
    value: function equals(other) {
      return ((0, _language.getAPI)().equal(this.pattern, other.pattern) || (0, _language.alphaEquivalent)(this.pattern, other.pattern)) && ((0, _language.getAPI)().equal(this.expression, other.expression) || (0, _language.alphaEquivalent)(this.expression, other.expression));
    }
    /**
     * @returns true if the pattern is a metavariable, false otherwise.
     */

  }, {
    key: "isSubstitution",
    value: function isSubstitution() {
      return (0, _language.getAPI)().isMetavariable(this.pattern);
    }
    /**
     * Returns the case, as described in the corresponding paper
     * (and briefly in the case constant declarations)
     * @param {OM} pattern
     * @param {OM} expression
     */

  }, {
    key: "getCase",
    value: function getCase(pattern, expression) {
      if ((0, _language.getAPI)().equal(pattern, expression)) {
        return CASES.IDENTITY;
      } else if ((0, _language.getAPI)().isMetavariable(pattern)) {
        return CASES.BINDING;
      } else if ((0, _language.getAPI)().isApplication(pattern) && !(0, _language.isExpressionFunctionApplication)(pattern) && (0, _language.getAPI)().isApplication(expression) && (0, _language.getAPI)().getChildren(pattern).length == (0, _language.getAPI)().getChildren(expression).length || (0, _language.getAPI)().isBinding(pattern) && (0, _language.getAPI)().isBinding(expression) && (0, _language.getAPI)().equal((0, _language.getAPI)().bindingHead(pattern), (0, _language.getAPI)().bindingHead(expression)) && (0, _language.getAPI)().bindingVariables(pattern).length == (0, _language.getAPI)().bindingVariables(expression).length) {
        return CASES.SIMPLIFICATION;
      } else if ((0, _language.isExpressionFunctionApplication)(pattern) || (0, _language.getAPI)().isApplication(pattern) && (0, _language.getAPI)().isMetavariable((0, _language.getAPI)().getChildren(pattern)[1])) {
        return CASES.EFA;
      } else {
        return CASES.FAILURE;
      }
    }
    /**
     * Calls <code>getCase</code> again, in case pattern or expression have changes
     */

  }, {
    key: "reEvalCase",
    value: function reEvalCase() {
      this["case"] = this.getCase(this.pattern, this.expression);
    }
    /**
     * Applies this constraint, like a substitution, to a single pattern.
     * Used by instantiate() in ConstraintList.
     * @param {OM} target - a single pattern
     * @returns a copy of the pattern with any substitutions
     */

  }, {
    key: "applyInstantiation",
    value: function applyInstantiation(target) {
      var result = (0, _language.getAPI)().copy(target);
      (0, _language.replaceWithoutCapture)(result, this.pattern, this.expression);

      var properSubExprToChange = function properSubExprToChange(x) {
        return x != result && (0, _language.canApplyExpressionFunctionApplication)(x);
      };

      (0, _language.getAPI)().filterSubexpressions(result, properSubExprToChange).forEach(function (x) {
        return (0, _language.getAPI)().replace(x, (0, _language.applyExpressionFunctionApplication)(x));
      });
      if ((0, _language.canApplyExpressionFunctionApplication)(result)) result = (0, _language.applyExpressionFunctionApplication)(result);
      return result;
    }
    /**
     * Applies only to constraints that match the case where the pattern and
     * expression are ordinary functions and their 'heads' are equal
     * (CASES.SIMPLIFICATION).  Calling it on other types of constraints
     * gives undefined behavior.
     * @returns {Constraint[]} a list of constraints (but not a constraint list) which is the
     * result of 'zipping' the arguments of each function
     */

  }, {
    key: "breakIntoArgPairs",
    value: function breakIntoArgPairs() {
      var arg_pairs = [];

      if ((0, _language.getAPI)().isApplication(this.pattern) && (0, _language.getAPI)().isApplication(this.expression)) {
        var pattern_children = (0, _language.getAPI)().getChildren(this.pattern);
        var expression_children = (0, _language.getAPI)().getChildren(this.expression); // In getting the case, we checked that the length of children was the same

        for (var i = 0; i < pattern_children.length; i++) {
          arg_pairs.push(new Constraint((0, _language.getAPI)().copy(pattern_children[i]), (0, _language.getAPI)().copy(expression_children[i])));
        }
      } else if ((0, _language.getAPI)().isBinding(this.pattern) && (0, _language.getAPI)().isBinding(this.expression)) {
        var pattern_vars = (0, _language.getAPI)().bindingVariables(this.pattern);
        var expression_vars = (0, _language.getAPI)().bindingVariables(this.expression);
        var pattern_body = (0, _language.getAPI)().bindingBody(this.pattern);
        var expression_body = (0, _language.getAPI)().bindingBody(this.expression); // In getting the case, we checked that the length of variables was the same

        for (var _i = 0; _i < pattern_vars.length; _i++) {
          arg_pairs.push(new Constraint((0, _language.getAPI)().copy(pattern_vars[_i]), (0, _language.getAPI)().copy(expression_vars[_i])));
        } // Also push the body of each binding to arg pairs


        arg_pairs.push(new Constraint((0, _language.getAPI)().copy(pattern_body), (0, _language.getAPI)().copy(expression_body)));
      }

      return arg_pairs;
    }
  }]);
  return Constraint;
}();
/**
 * Represents a list of constraints.
 * However, most of the behaviour of this class mimics a set,
 * except for a few cases in which we use indices.
 */


exports.Constraint = Constraint;

var ConstraintList = /*#__PURE__*/function () {
  /**
   * Creates an array from arguments.
   * Also computes the first variable from the list <code>v0, v1, v2,...</code> such that neither it nor
   * any variable after it in that list appears in any of the constraints.
   * Call this <code>vN</code>. See <code>nextNewVariable</code> for the use.
   * @param ...constraints - an arbitrary number of Constraints (can be zero)
   */
  function ConstraintList() {
    var _this = this;

    (0, _classCallCheck2["default"])(this, ConstraintList);
    this.contents = [];
    this.nextNewVariableIndex = 0;
    this.bindingConstraints = [];

    for (var _len = arguments.length, constraints = new Array(_len), _key = 0; _key < _len; _key++) {
      constraints[_key] = arguments[_key];
    }

    constraints.forEach(function (constraint) {
      _this.add(constraint);
    });
  }
  /**
   * @returns the length of the array of constraints.
   */


  (0, _createClass2["default"])(ConstraintList, [{
    key: "nextNewVariable",

    /**
     * @returns a new variable starting at <code>vN</code> (see constructor for definition of <code>vN</code>).
     */
    value: function nextNewVariable() {
      return (0, _language.getAPI)().variable('v' + this.nextNewVariableIndex++);
    }
    /**
     * @returns a deep copy of the list.
     */

  }, {
    key: "copy",
    value: function copy() {
      var contents_copy = this.contents.map(function (c) {
        return c.copy();
      });
      var result = (0, _construct2["default"])(ConstraintList, (0, _toConsumableArray2["default"])(contents_copy));
      result.bindingConstraints = this.bindingConstraints.map(function (bc) {
        return {
          inner: (0, _language.getAPI)().copy(bc.inner),
          outer: (0, _language.getAPI)().copy(bc.outer)
        };
      });
      result.nextNewVariableIndex = this.nextNewVariableIndex;
      return result;
    }
    /**
     * @returns the first index at which predicate is true when evaluated on contents, -1 otherwise.
     */

  }, {
    key: "indexAtWhich",
    value: function indexAtWhich(predicate) {
      for (var i = 0; i < this.contents.length; i++) {
        if (predicate(this.contents[i])) return i;
      }

      return -1;
    }
    /**
     * Adds constraints only if they are not in the current list (as if we had a set).
     * @param ...constraints - the constraints to be added
     * @returns the new contents
     */

  }, {
    key: "add",
    value: function add() {
      var _this2 = this;

      for (var _len2 = arguments.length, constraints = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        constraints[_key2] = arguments[_key2];
      }

      constraints.forEach(function (constraint) {
        // Don't add if it's already in the list
        if (_this2.indexAtWhich(function (c) {
          return c.equals(constraint);
        }) == -1) {
          // Set the next new var index
          var p_vars = (0, _language.getVariablesIn)(constraint.pattern);

          for (var j = 0; j < p_vars.length; j++) {
            _this2.nextNewVariableIndex = (0, _language.checkVariable)(p_vars[j], _this2.nextNewVariableIndex);
          }

          var e_vars = (0, _language.getVariablesIn)(constraint.expression);

          for (var k = 0; k < e_vars.length; k++) {
            _this2.nextNewVariableIndex = (0, _language.checkVariable)(e_vars[k], _this2.nextNewVariableIndex);
          } // Add the constraint


          _this2.contents.push(constraint);
        }
      });
      this.computeBindingConstraints();
      return this.contents;
    }
    /**
     * Removes constraints from the list and ignores any constraints not in the list.
     * @param ...constraints - the constraints to be removed
     * @returns the new contents
     */

  }, {
    key: "remove",
    value: function remove() {
      for (var i = 0; i < arguments.length; i++) {
        var constraint = i < 0 || arguments.length <= i ? undefined : arguments[i];
        var index = this.indexAtWhich(function (c) {
          return c.equals(constraint);
        });

        if (index > -1) {
          this.contents.splice(index, 1);
        }
      }

      return this.contents;
    }
    /**
     * Makes the list empty by removing all constraints
     */

  }, {
    key: "empty",
    value: function empty() {
      this.contents = [];
    }
    /**
     * @returns the first constraint in the list satisfying the given predicate, otherwise null.
     */

  }, {
    key: "firstSatisfying",
    value: function firstSatisfying(predicate) {
      var index = this.indexAtWhich(predicate);
      return index == -1 ? null : this.contents[index];
    }
    /**
     * @returns an array of length two containing the first two constraints satisfying the given binary predicate,
     * or null if there is not one.
     */

  }, {
    key: "firstPairSatisfying",
    value: function firstPairSatisfying(predicate) {
      for (var i = 0; i < this.contents.length; i++) {
        for (var j = 0; j < this.contents.length; j++) {
          if (i != j) {
            var constraint1 = this.contents[i];
            var constraint2 = this.contents[j];

            if (predicate(constraint1, constraint2)) {
              return [constraint1, constraint2];
            }
          }
        }
      }

      return null;
    }
    /**
     * Returns the constraint with the 'best' case from the start of the list.
     * The cases are defined in the corresponding paper.
     * @returns {Constraint} the constraint with the best case
     */

  }, {
    key: "getBestCase",
    value: function getBestCase() {
      var constraint;

      if ((constraint = this.firstSatisfying(function (c) {
        return c["case"] == CASES.FAILURE;
      })) != null) {
        return constraint;
      } else if ((constraint = this.firstSatisfying(function (c) {
        return c["case"] == CASES.IDENTITY;
      })) != null) {
        return constraint;
      } else if ((constraint = this.firstSatisfying(function (c) {
        return c["case"] == CASES.BINDING;
      })) != null) {
        return constraint;
      } else if ((constraint = this.firstSatisfying(function (c) {
        return c["case"] == CASES.SIMPLIFICATION;
      })) != null) {
        return constraint;
      } else if ((constraint = this.firstSatisfying(function (c) {
        return c["case"] == CASES.EFA;
      })) != null) {
        return constraint;
      } else {
        return null;
      }
    }
    /**
     * Some constraint lists are functions from the space of metavariables to the space of expressions.
     * To be such a function, the constraint list must contain only constraints
     * whose left hand sides are metavariables (called substitutions above),
     * and no metavariable must appear in more than one constraint.
     */

  }, {
    key: "isFunction",
    value: function isFunction() {
      var seen_so_far = [];

      for (var i = 0; i < this.contents.length; i++) {
        var constraint = this.contents[i];

        if (!constraint.isSubstitution()) {
          return false;
        }

        if (seen_so_far.includes((0, _language.getAPI)().getVariableName(constraint.pattern))) {
          return false;
        }

        seen_so_far.push((0, _language.getAPI)().getVariableName(constraint.pattern));
      }

      return true;
    }
    /**
     * If the constraint list is a function, this routine returns the expression associated with a given metavariable.
     * @param variable - a string or expression
     * @returns the expression of the constraint with the pattern that equals
     *   the variable, null otherwise.
     */

  }, {
    key: "lookup",
    value: function lookup(variable) {
      if (!(0, _language.getAPI)().isExpression(variable)) {
        variable = (0, _language.getAPI)().variable(variable);
        (0, _language.getAPI)().setMetavariable(variable);
      }

      for (var i = 0; i < this.contents.length; i++) {
        var constraint = this.contents[i];

        if ((0, _language.getAPI)().equal(constraint.pattern, variable)) {
          return constraint.expression;
        }
      }

      return null;
    }
    /**
     * @returns true only if both lists contain the same constraints.
     */

  }, {
    key: "equals",
    value: function equals(other) {
      var _this3 = this;

      var _loop = function _loop(i) {
        var constraint = _this3.contents[i];

        if (!other.firstSatisfying(function (c) {
          return c.equals(constraint);
        })) {
          return {
            v: false
          };
        }
      };

      for (var i = 0; i < this.contents.length; i++) {
        var _ret = _loop(i);

        if ((0, _typeof2["default"])(_ret) === "object") return _ret.v;
      }

      var _loop2 = function _loop2(_i2) {
        var constraint = other.contents[_i2];

        if (!_this3.firstSatisfying(function (c) {
          return c.equals(constraint);
        })) {
          return {
            v: false
          };
        }
      };

      for (var _i2 = 0; _i2 < other.contents.length; _i2++) {
        var _ret2 = _loop2(_i2);

        if ((0, _typeof2["default"])(_ret2) === "object") return _ret2.v;
      }

      return true;
    }
    /**
     * Extracts from each pattern a list of metavariable pairs (m1,m2).
     * Such a pair means the restriction that a solution S cannot have S(m1) appearing free in S(m2).
     * Pairs are represented by an object with <code>inner: m1</code> and <code>outer: m2</code> properties.
     */

  }, {
    key: "computeBindingConstraints",
    value: function computeBindingConstraints() {
      var _this4 = this;

      this.contents.forEach(function (constraint) {
        return (0, _language.getAPI)().filterSubexpressions(constraint.pattern, (0, _language.getAPI)().isBinding).forEach(function (binding) {
          return (0, _language.getAPI)().filterSubexpressions(binding, (0, _language.getAPI)().isMetavariable).forEach(function (innerMV) {
            if ((0, _language.getAPI)().variableIsFree(innerMV, binding)) {
              (0, _language.getAPI)().bindingVariables(binding).forEach(function (outerV) {
                if (!_this4.bindingConstraints.find(function (existing) {
                  return (0, _language.getAPI)().equal(existing.outer, outerV) && (0, _language.getAPI)().equal(existing.inner, innerMV);
                })) {
                  _this4.bindingConstraints.push({
                    inner: innerMV,
                    outer: outerV
                  });
                }
              });
            }
          });
        });
      });
    }
    /**
     * Takes a ConstraintList object containing the patterns that the
     * substiutions in this object will be applied to.  Each substitution is
     * applied to the pattern satisfying the conditions described in the summary
     * paper (section 3).
     * @param {ConstraintList} patterns - a non empty constraint list
     */

  }, {
    key: "instantiate",
    value: function instantiate(patterns) {
      for (var i = 0; i < this.length; i++) {
        var substitution = this.contents[i];

        for (var j = 0; j < patterns.length; j++) {
          var pattern = patterns.contents[j].pattern;
          patterns.contents[j].pattern = substitution.applyInstantiation(pattern); // Re-evaluate case

          patterns.contents[j].reEvalCase();
        }
      }
    }
  }, {
    key: "length",
    get: function get() {
      return this.contents.length;
    }
  }]);
  return ConstraintList;
}();

exports.ConstraintList = ConstraintList;