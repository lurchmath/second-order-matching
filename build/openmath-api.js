"use strict"; // TODO: handle the case of this module running in the browser
// Import openmath-js for testing purposes

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "OM", {
  enumerable: true,
  get: function get() {
    return _openmath.OM;
  }
});
exports.Exprs = void 0;

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _openmath = require("./openmath.js");

// Define the metavariable symbol to be used as an attribute key, and its corresponding value
var metavariableSymbol = _openmath.OM.symbol('metavariable', 'SecondOrderMatching');

var trueValue = _openmath.OM.string('true');
/**
 * This namespace creates an API by which this package can use a simple JavaScript
 * implementation of OpenMath to store and manipulate mathematical expressions.
 * @namespace OpenMathAPI
 */


var Exprs = {
  ////////////////////////////////////////////////////////////////////////////////
  // What is an expression?
  // Here are several basic functions for identifying, comparing, copying,
  // and doing basic manipulations of expressions.
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Returns true if and only if the given object is an OpenMath expression
   * @function isExpression
   * @param {object} expr - the object to test
   * @memberof OpenMathAPI
   */
  isExpression: function isExpression(expr) {
    return expr instanceof _openmath.OM;
  },

  /**
   * Return true iff the two expressions have the same type (e.g., both are
   * variables, or both are bindings, or both are function applications, etc.)
   * @function sameType
   * @param {OM} expr1 - first expression
   * @param {OM} expr2 - second expression
   * @memberof OpenMathAPI
   */
  sameType: function sameType(expr1, expr2) {
    return expr1.type === expr2.type;
  },

  /**
   * Returns a copy of an OpenMath expression
   * @function copy
   * @param {OM} expr - the expression to copy
   * @memberof OpenMathAPI
   */
  copy: function copy(expr) {
    return expr.copy();
  },

  /**
   * Compute whether the two expressions are structurally equal, and return true
   * or false.
   * @function equal
   * @param {OM} expr1 - first expression
   * @param {OM} expr2 - second expression
   * @memberof OpenMathAPI
   */
  equal: function equal(expr1, expr2) {
    return expr1.equals(expr2);
  },

  /**
   * Replace one expression, wherever it sits in its parent tree, with another.
   * @function replace
   * @param {OM} toReplace - the expression to be replaced
   * @param {OM} withThis - the expression with which to replace it
   * @memberof OpenMathAPI
   */
  replace: function replace(toReplace, withThis) {
    return toReplace.replaceWith(withThis);
  },
  ////////////////////////////////////////////////////////////////////////////////
  // Which expressions are variables?
  // How can I extract a variable's name, or build a variable from a name?
  // How can we find the variables inside another expression?
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Return true iff the given expression is a variable, false otherwise.
   * @function isVariable
   * @param {OM} expr - the expression to test
   * @memberof OpenMathAPI
   */
  isVariable: function isVariable(expr) {
    return expr.type === 'v';
  },

  /**
   * Returns the variable's name, or null if it is not a variable.
   * @function getVariableName
   * @param {OM} variable - an OM instance of type variable
   * @memberof OpenMathAPI
   */
  getVariableName: function getVariableName(variable) {
    return Exprs.isVariable(variable) ? variable.name : null;
  },

  /**
   * Construct an expression that is just a variable, with the given name
   * @function variable
   * @param {string} name - the name of the new variable
   * @memberof OpenMathAPI
   */
  variable: function variable(name) {
    return _openmath.OM["var"](name);
  },
  ////////////////////////////////////////////////////////////////////////////////
  // Sometimes we wish to create a new symbol in the language.
  // This may be a special type of expression, or a type of variable or string,
  // based on the language.  In OpenMath, it is a first-class citizen.
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an expression that is a symbol with the given name.
   * The Content Dictionary is set to the name of this package.
   * @function symbol
   * @param {string} name - the name to use for the symbol
   * @memberof OpenMathAPI
   */
  symbol: function symbol(name) {
    return _openmath.OM.sym(name, 'SecondOrderMatching');
  },

  /**
   * Helper function used when adding pairs to a constraint list.
   * Returns the list of variables that appear in a given expression.
   * @function getVariablesIn
   * @param {OM} expression - the expression to be checked
   * @returns a list containing any variables in the given expression
   * @memberof OpenMathAPI
   */
  getVariablesIn: function getVariablesIn(expression) {
    return expression.descendantsSatisfying(Exprs.isVariable);
  },
  ////////////////////////////////////////////////////////////////////////////////
  // Which expressions are function applications?
  // How can I build a function application expression,
  // or extract the list of children from an existing function application?
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Return true iff the given expression is a function application, false
   * otherwise.
   * @function isApplication
   * @param {OM} expr - the expression to test
   * @memberof OpenMathAPI
   */
  isApplication: function isApplication(expr) {
    return expr.type === 'a';
  },

  /**
   * Make a function application expression from the given children.  For example,
   * to create f(x,y), pass [f,x,y].  All arguments are used as-is, not copied
   * first; do not pass copies you need elsewhere.
   * @function application
   * @param {OM[]} children - the children of the resulting application, the first
   *   of which should be the operator and the rest the operands
   * @memberof OpenMathAPI
   */
  application: function application(children) {
    return _openmath.OM.app.apply(_openmath.OM, (0, _toConsumableArray2["default"])(children));
  },

  /**
   * Return an array of the expression's children, in the order in which they
   * appear as children
   * @function getChildren
   * @param {OM} expr - the expression whose children should be returned
   * @memberof OpenMathAPI
   */
  getChildren: function getChildren(expr) {
    return expr.children;
  },
  ////////////////////////////////////////////////////////////////////////////////
  // Which expressions bind variables?
  // How can I build such an expression?
  // If I have a binding expression, how can I extract its head, variables, or body?
  // How can I tell if one expression occurs free inside another?
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Return true iff the given expression is a binding expression, false
   * otherwise.
   * @function isBinding
   * @param {OM} expr - the expression to test
   * @memberof OpenMathAPI
   */
  isBinding: function isBinding(expr) {
    return expr.type === 'bi';
  },

  /**
   * Make a binding expression from the given symbol, variables, and body.  For
   * example, to create Forall x, P, pass Forall, [x], and P.  All arguments are
   * used as-is, not copied first; do not pass copies you need elsewhere.
   * @function binding
   * @param {OM} symbol - the binding operator
   * @param {OM[]} variables - the array of bound variables
   * @param {OM} body - the body of the binding
   * @memberof OpenMathAPI
   */
  binding: function binding(symbol, variables, body) {
    return _openmath.OM.bin.apply(_openmath.OM, [symbol].concat((0, _toConsumableArray2["default"])(variables), [body]));
  },

  /**
   * Return the symbol/head/operator of the binding expression, if indeed the
   * given argument is a binding expression; return null otherwise.
   * @function bindingHead
   * @param {OM} expr - the expression whose operator is to be returned
   * @memberof OpenMathAPI
   */
  bindingHead: function bindingHead(binding) {
    return Exprs.isBinding(binding) ? binding.symbol : null;
  },

  /**
   * Return a list of the bound variables in the given expression, or null if the
   * given expression is not a binding one.
   * @function bindingVariables
   * @param {OM} binding - the expression whose bound variables are to be returned
   * @memberof OpenMathAPI
   */
  bindingVariables: function bindingVariables(binding) {
    return Exprs.isBinding(binding) ? binding.variables : null;
  },

  /**
   * Return the body bound by a binding expression, or null if the given
   * expression is not a binding one.
   * @function bindingBody
   * @param {OM} binding - the expression whose body is to be returned (the
   *   original body, not a copy)
   * @memberof OpenMathAPI
   */
  bindingBody: function bindingBody(binding) {
    return Exprs.isBinding(binding) ? binding.body : null;
  },

  /**
   * Return true if a structural copy of the given inner (sub)expression occurs
   * free in the given outer expression.
   * @function occursFreeIn
   * @param {OM} outer - the expression in which to seek subexpressions
   * @param {OM} inner - the subexpression to seek
   * @memberof OpenMathAPI
   */
  occursFreeIn: function occursFreeIn(inner, outer) {
    return outer.occursFree(inner);
  },
  ////////////////////////////////////////////////////////////////////////////////
  // A metavariable is a variable that will be used for substitution.
  // How can I tell which variables are metavariables?
  // How can I mark a variable as being a metavariable, or clear such a mark?
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Tests whether the given variable has the metavariable attribute.
   * @function isMetavariable
   * @param {OM} variable - the variable to be checked
   * @memberof OpenMathAPI
   */
  isMetavariable: function isMetavariable(variable) {
    return Exprs.isExpression(variable) && ['v', 'sy'].includes(variable.type) && variable.getAttribute(metavariableSymbol) != undefined && variable.getAttribute(metavariableSymbol).equals(trueValue);
  },

  /**
   * Marks a variable as a metavariable.
   * Does nothing if the given input is not an OMNode of type variable or type symbol.
   * @function setMetavariable
   * @param {OM} variable - the variable to be marked
   * @memberof OpenMathAPI
   */
  setMetavariable: function setMetavariable(variable) {
    return Exprs.isExpression(variable) && ['v', 'sy'].includes(variable.type) ? variable.setAttribute(metavariableSymbol, trueValue.copy()) : null;
  },

  /**
   * Removes the metavariable attribute if it is present.
   * @function clearMetavariable
   * @param {OM} metavariable - the metavariable to be unmarked
   * @memberof OpenMathAPI
   */
  clearMetavariable: function clearMetavariable(metavariable) {
    return metavariable.removeAttribute(metavariableSymbol);
  }
};
exports.Exprs = Exprs;