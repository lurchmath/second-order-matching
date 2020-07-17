"use strict"; // Import everything from the constraints module and expose it as well.

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "OM", {
  enumerable: true,
  get: function get() {
    return _constraints.OM;
  }
});
Object.defineProperty(exports, "isMetavariable", {
  enumerable: true,
  get: function get() {
    return _constraints.isMetavariable;
  }
});
Object.defineProperty(exports, "setMetavariable", {
  enumerable: true,
  get: function get() {
    return _constraints.setMetavariable;
  }
});
Object.defineProperty(exports, "clearMetavariable", {
  enumerable: true,
  get: function get() {
    return _constraints.clearMetavariable;
  }
});
Object.defineProperty(exports, "isGeneralExpressionFunction", {
  enumerable: true,
  get: function get() {
    return _constraints.isGeneralExpressionFunction;
  }
});
Object.defineProperty(exports, "makeGeneralExpressionFunction", {
  enumerable: true,
  get: function get() {
    return _constraints.makeGeneralExpressionFunction;
  }
});
Object.defineProperty(exports, "isGeneralExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _constraints.isGeneralExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "makeGeneralExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _constraints.makeGeneralExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "canApplyGeneralExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _constraints.canApplyGeneralExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "applyGeneralExpressionFunctionApplication", {
  enumerable: true,
  get: function get() {
    return _constraints.applyGeneralExpressionFunctionApplication;
  }
});
Object.defineProperty(exports, "getNewVariableRelativeTo", {
  enumerable: true,
  get: function get() {
    return _constraints.getNewVariableRelativeTo;
  }
});
Object.defineProperty(exports, "replaceWithoutCapture", {
  enumerable: true,
  get: function get() {
    return _constraints.replaceWithoutCapture;
  }
});
Object.defineProperty(exports, "alphaConvert", {
  enumerable: true,
  get: function get() {
    return _constraints.alphaConvert;
  }
});
Object.defineProperty(exports, "alphaEquivalent", {
  enumerable: true,
  get: function get() {
    return _constraints.alphaEquivalent;
  }
});
Object.defineProperty(exports, "betaReduce", {
  enumerable: true,
  get: function get() {
    return _constraints.betaReduce;
  }
});
Object.defineProperty(exports, "makeConstantExpression", {
  enumerable: true,
  get: function get() {
    return _constraints.makeConstantExpression;
  }
});
Object.defineProperty(exports, "makeProjectionExpression", {
  enumerable: true,
  get: function get() {
    return _constraints.makeProjectionExpression;
  }
});
Object.defineProperty(exports, "makeImitationExpression", {
  enumerable: true,
  get: function get() {
    return _constraints.makeImitationExpression;
  }
});
Object.defineProperty(exports, "CASES", {
  enumerable: true,
  get: function get() {
    return _constraints.CASES;
  }
});
Object.defineProperty(exports, "Constraint", {
  enumerable: true,
  get: function get() {
    return _constraints.Constraint;
  }
});
Object.defineProperty(exports, "ConstraintList", {
  enumerable: true,
  get: function get() {
    return _constraints.ConstraintList;
  }
});
exports.MatchingChallenge = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _constraints = require("./constraints.js");

// Used only for debugging.  Commented out for production.
//
// function DEBUG_CONSTRAINT(c) {
//     return '( ' + c.pattern.simpleEncode() + ', ' + c.expression.simpleEncode() + ' ):' + c.case;
// }
// function DEBUG_CONSTRAINTLIST(cl) {
//     return '{ ' +
//             cl.contents.map((c) =>
//                 '( ' + c.pattern.simpleEncode() + ', ' + c.expression.simpleEncode() + ' ):' + c.case
//             ).join(', ')
//         + ' }'
// }
// const DEBUG_ON = false//true
// const DEBUG = ( ...all ) => { if ( DEBUG_ON ) console.log( ...all ) }

/**
 * Represents a matching challenge.
 * A matching challenge is defined by two sets of constraints.
 * The first set is the challenge to be solved,
 * the second set contains the solutions found when solving the challenge.
 * Both sets may be empty upon construction of a matching challenge,
 * and the solution set may remain empty if the challenge has no solutions.
 */
var MatchingChallenge = /*#__PURE__*/function () {
  /**
   * Creates a new instance of MatchingChallenge by taking an arbitrary
   * number of arrays (including zero), creating constraints from them,
   * and then creating a constraints list out of them called challenge.
   * @param {Array} constraints - an arbitrary number of arguments each
   * of which is a length-2 array containing a pattern and an expression,
   * i.e. containing two OM expressions.
   */
  function MatchingChallenge() {
    (0, _classCallCheck2["default"])(this, MatchingChallenge);
    this.challengeList = new _constraints.ConstraintList();
    this.solutions = []; //new ConstraintList();

    this.solvable = undefined;

    for (var i = 0; i < arguments.length; i++) {
      var constraint = i < 0 || arguments.length <= i ? undefined : arguments[i];
      this.addConstraint(constraint[0], constraint[1]);
    }
  }
  /**
   * Takes two OM expressions, creates a Constraint object from them,
   * and adds it to `this.challengeList`.
   * If any solutions have been found already,
   * they are applied to the constraint before it is added.
   * @param {OM} pattern - An OM expression
   * @param {OM} expr - An OM expression
   */


  (0, _createClass2["default"])(MatchingChallenge, [{
    key: "addConstraint",
    value: function addConstraint(pattern, expr) {
      var constraint = new _constraints.Constraint(pattern, expr);

      if (this.solutions.length > 0) {
        var temp_constraint_list = new _constraints.ConstraintList(constraint);
        temp_constraint_list.instantiate(this.challengeList);
        constraint = temp_constraint_list.contents[0]; // We've altered the state of the challenge list so we no longer know if it's solvable

        this.solvable = undefined;
      }

      this.challengeList.add(constraint);
    }
    /**
     * Adds an arbitrary number of constraints to the challenge,
     * each supplies by a length-2 array containing a pattern and an expression.
     * @param {Array} constraints
     */

  }, {
    key: "addConstraints",
    value: function addConstraints() {
      for (var i = 0; i < arguments.length; i++) {
        var constraint = i < 0 || arguments.length <= i ? undefined : arguments[i];
        this.addConstraint(constraint[0], constraint[1]);
      }
    }
    /**
     * @returns a deep copy of the matching challenge, including solutions
     */

  }, {
    key: "clone",
    value: function clone() {
      var result = new MatchingChallenge();
      result.challengeList = this.challengeList.copy();
      result.solutions = this.solutions === undefined ? undefined : this.solutions.map(function (sol) {
        return sol.copy();
      });
      result.solvable = this.solvable;
      return result;
    }
    /**
     * Tests whether the first currently-in-progress solution satisfies all
     * the challenge's already-computed binding constraints.
     */

  }, {
    key: "satisfiesBindingConstraints",
    value: function satisfiesBindingConstraints() {
      return this.solutionSatisfiesBindingConstraints(this.solutions[0]);
    }
    /**
     * Tests whether a solution satisfies all
     * the challenge's already-computed binding constraints.
     */

  }, {
    key: "solutionSatisfiesBindingConstraints",
    value: function solutionSatisfiesBindingConstraints(solution) {
      return this.challengeList.bindingConstraints.every(function (binding_constraint) {
        var inner = solution.lookup(binding_constraint.inner);
        if (!inner) return true; // metavariable not instantiated yet; can't violate any constraints

        var outer = (0, _constraints.isMetavariable)(binding_constraint.outer) ? solution.lookup(binding_constraint.outer) : binding_constraint.outer;
        if (!outer) return true; // metavariable not instantiated yet; can't violate any constraints

        return !inner.occursFree(outer);
      });
    }
    /**
     * Adds a solution, and checks that it passes `satisfiesBindingConstraints`.
     * If it does not, empties the solutions list and sets variables in order to end the search.
     * @param {Constraint} constraint - either a Constraint, or an OM (meta)variable
     */

  }, {
    key: "addSolutionAndCheckBindingConstraints",
    value: function addSolutionAndCheckBindingConstraints(constraint) {
      new _constraints.ConstraintList(constraint).instantiate(this.challengeList);
      this.solutions[0].add(constraint);

      if (this.satisfiesBindingConstraints()) {
        return true;
      } else {
        this.solutions = [];
        this.solvable = false;
        return this.solvable;
      }
    }
    /**
     * @returns `this.solvable` if it is defined.
     * If it is undefined, then `getSolutions` has not been called.
     * This function will call `getSolutions` in that case.
     */

  }, {
    key: "isSolvable",
    value: function isSolvable() {
      if (this.solvable === undefined) this.getOneSolution();
      return this.solvable;
    }
    /**
     * Computes just one solution to this matching problem and returns it, or
     * returns undefined if there are none.  Uses the cache if possible.
     * @returns The first solution or `undefined`.
     *
     * State when this is done:
     * `this.solvable` will be true or false
     * but `this.solutions` will be undefined, to indicate we have not
     * computed all of them.
     */

  }, {
    key: "getOneSolution",
    value: function getOneSolution() {
      if (this.solvable === false) return undefined;
      if (this.solvable === true && this.solutions !== undefined && this.solutions.length > 0) return this.solutions[0]; // then, to ensure that later this class doesn't get confused and think
      // that we've computed all solutions just because we've computed
      // this.solvable, we set it to be undefined:

      this.solutions = undefined;
      var first = this.solutionsIterator().next().value;
      this.solvable = first !== undefined;
      return first;
    }
    /**
     * @returns `this.solutions.length` by calling `getSolutions`,
     * hence it solves if `getSolutions` has not been called.
     */

  }, {
    key: "numSolutions",
    value: function numSolutions() {
      return this.getSolutions().length;
    }
    /**
     * If the matching challenge is unsolved, this finds all solutions,
     * then returns them.  It will guarantee that `this.solvable` is true/false
     * and that `this.solutions` is fully populated with all solutions.
     * @returns `this.solutions`
     */

  }, {
    key: "getSolutions",
    value: function getSolutions() {
      if (this.solvable === undefined || this.solutions === undefined) {
        // try {
        var solutions = [];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.solutionsIterator()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var solution = _step.value;
            solutions.push(solution);
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

        this.solutions = solutions;
        this.solvable = solutions.length > 0; // } catch ( e ) { DEBUG( 'ERROR! -->', e ) }
      } // DEBUG( `LOOKUP (${this.solutions.length} SOL):\n`,
      //     this.solutions.map( DEBUG_CONSTRAINTLIST ).join( '\n' ) )


      return this.solutions;
    }
  }, {
    key: "solutionsIterator",
    value: function solutionsIterator()
    /*indent=''*/
    {
      var _marked = /*#__PURE__*/_regenerator["default"].mark(recur);

      // const tab = '\t'
      var mc = this; // if needed, create a brand-new solution we will evolve with recursion

      if (mc.solutions === undefined || mc.solutions.length == 0) mc.solutions = [new _constraints.ConstraintList()];

      function recur() {
        var _mc$challengeList;

        var current_constraint, pattern_vars, expression_vars, i, variable, new_var, expression, temp_mc_A, const_sub, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, sol, head, _loop, _i, _ret, temp_mc_C, new_vars, temp_metavars, _new_var, imitation_expr, imitation_sub, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, _sol, _loop2, _i2;

        return _regenerator["default"].wrap(function recur$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(mc.challengeList.length == 0)) {
                  _context2.next = 4;
                  break;
                }

                _context2.next = 3;
                return mc.solutions[0];

              case 3:
                return _context2.abrupt("return");

              case 4:
                // Get the constraint with the 'best' case first
                current_constraint = mc.challengeList.getBestCase(); // For whichever case the current constraint has, do action described in paper

                _context2.t0 = current_constraint["case"];
                _context2.next = _context2.t0 === _constraints.CASES.FAILURE ? 8 : _context2.t0 === _constraints.CASES.IDENTITY ? 10 : _context2.t0 === _constraints.CASES.BINDING ? 13 : _context2.t0 === _constraints.CASES.SIMPLIFICATION ? 18 : _context2.t0 === _constraints.CASES.EFA ? 23 : 104;
                break;

              case 8:
                // DEBUG( indent+'FAILURE' )
                mc.solutions = [];
                return _context2.abrupt("break", 104);

              case 10:
                // DEBUG( indent+'IDENTITY' )
                mc.challengeList.remove(current_constraint);
                return _context2.delegateYield(recur(), "t1", 12);

              case 12:
                return _context2.abrupt("break", 104);

              case 13:
                // DEBUG( indent+'BINDING' )
                mc.challengeList.remove(current_constraint); // Apply metavariable substitution to constraints

                if (mc.addSolutionAndCheckBindingConstraints(current_constraint)) {
                  _context2.next = 16;
                  break;
                }

                return _context2.abrupt("break", 104);

              case 16:
                return _context2.delegateYield(recur(), "t2", 17);

              case 17:
                return _context2.abrupt("break", 104);

              case 18:
                // DEBUG( indent+'SIMPLIFICATION' )
                mc.challengeList.remove(current_constraint); // Do any necessary alpha conversion before breaking into argument paits

                if (current_constraint.pattern.type == 'bi' && current_constraint.expression.type == 'bi') {
                  pattern_vars = current_constraint.pattern.variables;
                  expression_vars = current_constraint.expression.variables; // Get case checks number of arguments

                  for (i = 0; i < pattern_vars.length; i++) {
                    variable = pattern_vars[i];

                    if (!(0, _constraints.isMetavariable)(variable)) {
                      new_var = mc.challengeList.nextNewVariable();
                      current_constraint.expression = (0, _constraints.alphaConvert)(current_constraint.expression, expression_vars[i], new_var);
                      current_constraint.pattern = (0, _constraints.alphaConvert)(current_constraint.pattern, pattern_vars[i], new_var);
                    }
                  }
                }

                (_mc$challengeList = mc.challengeList).add.apply(_mc$challengeList, (0, _toConsumableArray2["default"])(current_constraint.breakIntoArgPairs()));

                return _context2.delegateYield(recur(), "t3", 22);

              case 22:
                return _context2.abrupt("break", 104);

              case 23:
                // DEBUG( indent+'EFA' )
                expression = current_constraint.expression; // Subcase A, the function may be a constant function
                // DEBUG( indent+'EFA-1: constant function' )

                temp_mc_A = mc.clone();
                const_sub = new _constraints.Constraint(current_constraint.pattern.children[1], (0, _constraints.makeConstantExpression)(temp_mc_A.challengeList.nextNewVariable(), current_constraint.expression)); // DEBUG( indent+'maybe add:', DEBUG_CONSTRAINT( const_sub ) )

                if (!temp_mc_A.addSolutionAndCheckBindingConstraints(const_sub)) {
                  _context2.next = 53;
                  break;
                }

                _iteratorNormalCompletion2 = true;
                _didIteratorError2 = false;
                _iteratorError2 = undefined;
                _context2.prev = 30;
                _iterator2 = temp_mc_A.solutionsIterator()[Symbol.iterator]();

              case 32:
                if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                  _context2.next = 39;
                  break;
                }

                sol = _step2.value;
                _context2.next = 36;
                return sol;

              case 36:
                _iteratorNormalCompletion2 = true;
                _context2.next = 32;
                break;

              case 39:
                _context2.next = 45;
                break;

              case 41:
                _context2.prev = 41;
                _context2.t4 = _context2["catch"](30);
                _didIteratorError2 = true;
                _iteratorError2 = _context2.t4;

              case 45:
                _context2.prev = 45;
                _context2.prev = 46;

                if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
                  _iterator2["return"]();
                }

              case 48:
                _context2.prev = 48;

                if (!_didIteratorError2) {
                  _context2.next = 51;
                  break;
                }

                throw _iteratorError2;

              case 51:
                return _context2.finish(48);

              case 52:
                return _context2.finish(45);

              case 53:
                // Subcase B, the function may be a projection function
                // DEBUG( indent+'EFA-2: projection function' )
                head = current_constraint.pattern.children[1];
                _loop = /*#__PURE__*/_regenerator["default"].mark(function _loop(_i) {
                  var temp_mc_B, new_vars, proj_sub, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, _sol2;

                  return _regenerator["default"].wrap(function _loop$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          temp_mc_B = mc.clone();
                          new_vars = current_constraint.pattern.children.slice(2).map(function () {
                            return temp_mc_B.challengeList.nextNewVariable();
                          });
                          proj_sub = new _constraints.Constraint(head, (0, _constraints.makeProjectionExpression)(new_vars, new_vars[_i - 2])); // DEBUG( indent+'maybe add:', DEBUG_CONSTRAINT( proj_sub ) )

                          if (temp_mc_B.addSolutionAndCheckBindingConstraints(proj_sub)) {
                            _context.next = 5;
                            break;
                          }

                          return _context.abrupt("return", "break");

                        case 5:
                          _iteratorNormalCompletion4 = true;
                          _didIteratorError4 = false;
                          _iteratorError4 = undefined;
                          _context.prev = 8;
                          _iterator4 = temp_mc_B.solutionsIterator()[Symbol.iterator]();

                        case 10:
                          if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
                            _context.next = 17;
                            break;
                          }

                          _sol2 = _step4.value;
                          _context.next = 14;
                          return _sol2;

                        case 14:
                          _iteratorNormalCompletion4 = true;
                          _context.next = 10;
                          break;

                        case 17:
                          _context.next = 23;
                          break;

                        case 19:
                          _context.prev = 19;
                          _context.t0 = _context["catch"](8);
                          _didIteratorError4 = true;
                          _iteratorError4 = _context.t0;

                        case 23:
                          _context.prev = 23;
                          _context.prev = 24;

                          if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
                            _iterator4["return"]();
                          }

                        case 26:
                          _context.prev = 26;

                          if (!_didIteratorError4) {
                            _context.next = 29;
                            break;
                          }

                          throw _iteratorError4;

                        case 29:
                          return _context.finish(26);

                        case 30:
                          return _context.finish(23);

                        case 31:
                        case "end":
                          return _context.stop();
                      }
                    }
                  }, _loop, null, [[8, 19, 23, 31], [24,, 26, 30]]);
                });
                _i = 2;

              case 56:
                if (!(_i < current_constraint.pattern.children.length)) {
                  _context2.next = 64;
                  break;
                }

                return _context2.delegateYield(_loop(_i), "t5", 58);

              case 58:
                _ret = _context2.t5;

                if (!(_ret === "break")) {
                  _context2.next = 61;
                  break;
                }

                return _context2.abrupt("break", 64);

              case 61:
                _i++;
                _context2.next = 56;
                break;

              case 64:
                if (!(expression.type == 'a' || expression.type == 'bi')) {
                  _context2.next = 104;
                  break;
                }

                temp_mc_C = mc.clone();
                new_vars = current_constraint.pattern.children.slice(2).map(function () {
                  return temp_mc_C.challengeList.nextNewVariable();
                }); // Get the temporary metavariables

                temp_metavars = [];

                if (expression.type == 'a') {
                  temp_metavars = expression.children.map(function () {
                    var new_var = temp_mc_C.challengeList.nextNewVariable();
                    (0, _constraints.setMetavariable)(new_var);
                    return new_var;
                  });
                } else {
                  _new_var = temp_mc_C.challengeList.nextNewVariable();
                  (0, _constraints.setMetavariable)(_new_var);
                  temp_metavars.push(_new_var);
                } // Get the imitation expression


                imitation_expr = (0, _constraints.makeImitationExpression)(new_vars, expression, temp_metavars);
                imitation_sub = new _constraints.Constraint(current_constraint.pattern.children[1], imitation_expr); // DEBUG( indent+'maybe add:', DEBUG_CONSTRAINT( imitation_expr ) )

                if (temp_mc_C.addSolutionAndCheckBindingConstraints(imitation_sub)) {
                  _context2.next = 73;
                  break;
                }

                return _context2.abrupt("break", 104);

              case 73:
                // Remove any temporary metavariables from the solutions, after making substitutions
                _iteratorNormalCompletion3 = true;
                _didIteratorError3 = false;
                _iteratorError3 = undefined;
                _context2.prev = 76;
                _iterator3 = temp_mc_C.solutionsIterator()[Symbol.iterator]();

              case 78:
                if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
                  _context2.next = 90;
                  break;
                }

                _sol = _step3.value;

                _loop2 = function _loop2(_i2) {
                  var metavar = temp_metavars[_i2];

                  var metavar_sub = _sol.firstSatisfying(function (c) {
                    return c.pattern.equals(metavar);
                  });

                  if (metavar_sub != null) {
                    _sol.remove(metavar_sub);

                    for (var _i3 = 0; _i3 < _sol.length; _i3++) {
                      var constraint = _sol.contents[_i3];
                      constraint.expression.replaceWith(metavar_sub.applyInstantiation(constraint.expression));
                      constraint.reEvalCase();
                    }
                  }
                };

                for (_i2 = 0; _i2 < temp_metavars.length; _i2++) {
                  _loop2(_i2);
                }

                if (!mc.solutionSatisfiesBindingConstraints(_sol)) {
                  _context2.next = 87;
                  break;
                }

                _context2.next = 85;
                return _sol;

              case 85:
                _context2.next = 87;
                break;

              case 87:
                _iteratorNormalCompletion3 = true;
                _context2.next = 78;
                break;

              case 90:
                _context2.next = 96;
                break;

              case 92:
                _context2.prev = 92;
                _context2.t6 = _context2["catch"](76);
                _didIteratorError3 = true;
                _iteratorError3 = _context2.t6;

              case 96:
                _context2.prev = 96;
                _context2.prev = 97;

                if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
                  _iterator3["return"]();
                }

              case 99:
                _context2.prev = 99;

                if (!_didIteratorError3) {
                  _context2.next = 102;
                  break;
                }

                throw _iteratorError3;

              case 102:
                return _context2.finish(99);

              case 103:
                return _context2.finish(96);

              case 104:
              case "end":
                return _context2.stop();
            }
          }
        }, _marked, null, [[30, 41, 45, 53], [46,, 48, 52], [76, 92, 96, 104], [97,, 99, 103]]);
      }

      function uniqueIterator(nonUniqueIterator, comparator) {
        var _marked2 = /*#__PURE__*/_regenerator["default"].mark(result);

        var seenSoFar = [];

        function result() {
          var _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _loop3, _iterator5, _step5;

          return _regenerator["default"].wrap(function result$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
                case 0:
                  _iteratorNormalCompletion5 = true;
                  _didIteratorError5 = false;
                  _iteratorError5 = undefined;
                  _context4.prev = 3;
                  _loop3 = /*#__PURE__*/_regenerator["default"].mark(function _loop3() {
                    var element;
                    return _regenerator["default"].wrap(function _loop3$(_context3) {
                      while (1) {
                        switch (_context3.prev = _context3.next) {
                          case 0:
                            element = _step5.value;

                            if (seenSoFar.some(function (x) {
                              return comparator(x, element);
                            })) {
                              _context3.next = 5;
                              break;
                            }

                            seenSoFar.push(element);
                            _context3.next = 5;
                            return element;

                          case 5:
                          case "end":
                            return _context3.stop();
                        }
                      }
                    }, _loop3);
                  });
                  _iterator5 = nonUniqueIterator[Symbol.iterator]();

                case 6:
                  if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
                    _context4.next = 11;
                    break;
                  }

                  return _context4.delegateYield(_loop3(), "t0", 8);

                case 8:
                  _iteratorNormalCompletion5 = true;
                  _context4.next = 6;
                  break;

                case 11:
                  _context4.next = 17;
                  break;

                case 13:
                  _context4.prev = 13;
                  _context4.t1 = _context4["catch"](3);
                  _didIteratorError5 = true;
                  _iteratorError5 = _context4.t1;

                case 17:
                  _context4.prev = 17;
                  _context4.prev = 18;

                  if (!_iteratorNormalCompletion5 && _iterator5["return"] != null) {
                    _iterator5["return"]();
                  }

                case 20:
                  _context4.prev = 20;

                  if (!_didIteratorError5) {
                    _context4.next = 23;
                    break;
                  }

                  throw _iteratorError5;

                case 23:
                  return _context4.finish(20);

                case 24:
                  return _context4.finish(17);

                case 25:
                case "end":
                  return _context4.stop();
              }
            }
          }, _marked2, null, [[3, 13, 17, 25], [18,, 20, 24]]);
        }

        return result();
      }

      return uniqueIterator(recur(), function (sol1, sol2) {
        return sol1.equals(sol2);
      });
    }
  }]);
  return MatchingChallenge;
}();

exports.MatchingChallenge = MatchingChallenge;