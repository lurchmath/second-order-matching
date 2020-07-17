/**
 * This module defines all the things for dealing with the first- and second-
 * order language in which we will be working.  This includes importing
 * OpenMath, defining metavariables and instantiation, defining expression
 * functions and application of them, alpha conversion, and beta reduction.
 */
"use strict"; // TODO: handle the case of this module running in the browser
// Import openmath-js for testing purposes

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setMetavariable = setMetavariable;
exports.clearMetavariable = clearMetavariable;
exports.isMetavariable = isMetavariable;
exports.makeGeneralExpressionFunction = makeGeneralExpressionFunction;
exports.isGeneralExpressionFunction = isGeneralExpressionFunction;
exports.makeGeneralExpressionFunctionApplication = makeGeneralExpressionFunctionApplication;
exports.isGeneralExpressionFunctionApplication = isGeneralExpressionFunctionApplication;
exports.canApplyGeneralExpressionFunctionApplication = canApplyGeneralExpressionFunctionApplication;
exports.applyGeneralExpressionFunctionApplication = applyGeneralExpressionFunctionApplication;
exports.getNewVariableRelativeTo = getNewVariableRelativeTo;
exports.alphaConvert = alphaConvert;
exports.replaceWithoutCapture = replaceWithoutCapture;
exports.alphaEquivalent = alphaEquivalent;
exports.betaReduce = betaReduce;
exports.checkVariable = checkVariable;
exports.getVariablesIn = getVariablesIn;
exports.makeConstantExpression = makeConstantExpression;
exports.makeProjectionExpression = makeProjectionExpression;
exports.makeImitationExpression = makeImitationExpression;
Object.defineProperty(exports, "OM", {
  enumerable: true,
  get: function get() {
    return _openmath.OM;
  }
});

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _openmath = require("./openmath.js");

////////////////////////////////////////////////////////////////////////////////
// * The following are functions and constants related to metavariables.
// * A metavariable is a variable that will be used for substitution.
////////////////////////////////////////////////////////////////////////////////
// Define the metavariable symbol to be used as an attribute key, and its corresponding value
var metavariableSymbol = _openmath.OM.symbol('metavariable', 'SecondOrderMatching');

var trueValue = _openmath.OM.string('true');
/**
 * Marks a variable as a metavariable.
 * Does nothing if the given input is not an OMNode of type variable or type symbol.
 * @param {OM} variable - the variable to be marked
 */


function setMetavariable(variable) {
  if (variable instanceof _openmath.OM && ['v', 'sy'].includes(variable.type)) {
    return variable.setAttribute(metavariableSymbol, trueValue.copy());
  } else return null;
}
/**
 * Removes the metavariable attribute if it is present.
 * @param {OM} metavariable - the metavariable to be unmarked
 */


function clearMetavariable(metavariable) {
  return metavariable.removeAttribute(metavariableSymbol);
}
/**
 * Tests whether the given variable has the metavariable attribute.
 * @param {OM} variable - the variable to be checked
 */


function isMetavariable(variable) {
  return variable instanceof _openmath.OM && ['v', 'sy'].includes(variable.type) && variable.getAttribute(metavariableSymbol) != undefined && variable.getAttribute(metavariableSymbol).equals(trueValue);
} ////////////////////////////////////////////////////////////////////////////////
// * The following are generalised versions expression functions.
// * When P: E -> E, P is an expression function.
// * This generalisation allows us to have expression functions
// * with more than one variable.
////////////////////////////////////////////////////////////////////////////////


var generalExpressionFunction = _openmath.OM.symbol('gEF', 'SecondOrderMatching');

var generalExpressionFunctionApplication = _openmath.OM.symbol('gEFA', 'SecondOrderMatching');
/**
 * Makes a new expression function with the meaning
 * λv1,...,vk.B where v1,...,vk are the variables and B is any OM expression.
 * @param {OM[]} variables - a list of OM variables
 * @param {OM} body - any OM expression
 */


function makeGeneralExpressionFunction(variables, body) {
  if (!(variables instanceof Array)) {
    variables = [variables];
  }

  for (var i = 0; i < variables.length; i++) {
    var variable = variables[i];

    if (variable.type !== 'v') {
      throw 'When making a general expression function,\
all elements of first argument must have type variable';
    }
  }

  return _openmath.OM.bin.apply(_openmath.OM, [generalExpressionFunction].concat((0, _toConsumableArray2["default"])(variables), [body]));
}
/**
 * Tests whether an expression is a general expression function.
 * @param {OM} expression - the expression to be checked
 */


function isGeneralExpressionFunction(expression) {
  return expression instanceof _openmath.OM && expression.type == 'bi' && expression.symbol.equals(generalExpressionFunction);
}
/**
 * Makes a new expression function application with the meaning
 * F(arg) where F is either a general expression function (gEF), or a
 * metavariable which is expected to be replaced by a gEF.
 * In the case that F is a gEF, the expression function can be applied
 * to the argument see `applyGeneralExpressionFunctionApplication`.
 * @param {OM} func - either a gEF or something which can be instantiated as a gEF.
 * @param {OM[]} arguments - a list of OM expressions
 */


function makeGeneralExpressionFunctionApplication(func, args) {
  if (!(isGeneralExpressionFunction(func) || isMetavariable(func))) {
    throw 'When making gEFAs, the func must be either a EF or a metavariable';
  }

  if (!(args instanceof Array)) {
    args = [args];
  }

  return _openmath.OM.app.apply(_openmath.OM, [generalExpressionFunctionApplication, func].concat((0, _toConsumableArray2["default"])(args)));
}
/**
 * @returns true if the supplied expression is a gEFA
 */


function isGeneralExpressionFunctionApplication(expression) {
  return expression instanceof _openmath.OM && expression.type === 'a' && expression.children[0].equals(generalExpressionFunctionApplication);
}
/**
 * Tests whether a gEFA is of the form gEF(args).
 * If the gEFA is of this form, `applyGeneralExpressionFunctionApplication`
 * can be called with this gEFA as an argument.
 * @param {OM} gEFA - a general expression function application
 */


function canApplyGeneralExpressionFunctionApplication(gEFA) {
  if (isGeneralExpressionFunctionApplication(gEFA) && isGeneralExpressionFunction(gEFA.children[1])) {
    return true;
  }

  return false;
}
/**
 * If `canApplyGeneralExpressionFunctionApplication` is true,
 * returns the beta reduction of the gEF and the arguments it is applied to.
 * @param {OM} gEFA - a general expression function application
 */


function applyGeneralExpressionFunctionApplication(gEFA) {
  if (canApplyGeneralExpressionFunctionApplication(gEFA)) {
    return betaReduce(gEFA.children[1], gEFA.children.slice(2));
  }

  return null;
} ////////////////////////////////////////////////////////////////////////////////
// * The following are functions for manipulating expressions
// * and for checking certain properties of expressions.
////////////////////////////////////////////////////////////////////////////////

/**
 * Helper function for other expression manipulation functions.
 * @param {OM} expr - an OM expression, more expr arguments are accepted.
 * @returns the first variable of the form xN
 * which appears nowhere in the supplied expression(s).
 */


function getNewVariableRelativeTo(expr
/*, expr2, ... */
) {
  var all_vars = getVariablesIn(expr);

  for (var i = 1; i < arguments.length; i++) {
    all_vars.push.apply(all_vars, (0, _toConsumableArray2["default"])(getVariablesIn(arguments[i])));
  }

  var index = 0;

  for (var _i = 0; _i < all_vars.length; _i++) {
    var next_var = all_vars[_i];

    if (/^x[0-9]+$/.test(next_var.name)) {
      index = Math.max(index, parseInt(next_var.name.slice(1)) + 1);
    }
  }

  var var_name = 'x' + index;
  return _openmath.OM["var"](var_name);
}
/**
 * Takes a binding, a bound variable in that binding, and a replacement variable.
 * Returns the result of replacing (without capture) all instances of the bound
 * variable with the replacement variable.
 * @param {OM} binding - an OM binding
 * @param {OM} which_var - the bound variable to replace
 * @param {OM} replace_var - the replacement variable
 * @returns a copy of the alpha converted binding
 */


function alphaConvert(binding, which_var, replace_var) {
  var result = binding.copy();
  var bound_vars = result.variables;

  if (!bound_vars.map(function (x) {
    return x.name;
  }).includes(which_var.name)) {
    throw 'which_var must be bound in binding';
  }

  for (var i = 0; i < bound_vars.length; i++) {
    var variable = bound_vars[i];

    if (variable.equals(which_var)) {
      variable.replaceWith(replace_var.copy());
    }
  }

  replaceWithoutCapture(result.body, which_var, replace_var);
  return result;
}
/**
 * Takes an expression, a variable, and a replacement expression.
 * Manipulates the expression in place in order to replace all occurences
 * of the variable with the expression in such a way that variable capture
 * will not occur.
 *
 * Because this function will be called whenever a metavariable's instantiation
 * is discovered by the solve() routine in MatchingChallenge, it must guarantee
 * that NO occurrences of the variable remain after the function is complete.
 *
 * Note that this function addresses only variable capture that would occur
 * from a binding expression inside expr; it does not address any binders that
 * may sit in a parent above expr.
 *
 * @param {OM} expr - an OM expression
 * @param {OM} variable - an OM variable
 * @param {OM} replacement - an OM expression
 */


function replaceWithoutCapture(expr, variable, replacement) {
  if (!(expr instanceof _openmath.OM) || !(variable instanceof _openmath.OM) || !(replacement instanceof _openmath.OM)) {
    throw 'all arguments must be instances of OMNode';
  }

  if (expr.type != 'bi') {
    // Case 1: expr is a variable that we must replace, so do it
    if (expr.type == 'v' && expr.equals(variable)) {
      expr.replaceWith(replacement.copy()); // Case 2: expr is any other non-binding, so recur on its
      // children (of which there may be none, meaning this is some
      // type of atomic other than a variable, which is fine; do nothing)
    } else {
      var children = expr.children;

      for (var i = 0; i < children.length; i++) {
        var ch = children[i];
        replaceWithoutCapture(ch, variable, replacement);
      }
    }
  } else {
    var varidx = expr.variables.map(function (v) {
      return v.name;
    }).indexOf(variable.name);

    if (varidx > -1) {
      // Case 3: expr is a binding and it binds the variable to be replaced,
      // but the replacement is a non-variable.  This is illegal, because
      // OpenMath bound variable positions can be occupied only by variables.
      if (replacement.type != 'v') {
        throw 'Cannot replace a bound variable with a non-varible'; // Case 4: expr is a binding and it binds the variable to be replaced,
        // and the replacement is also a variable.  We can go ahead and replace
        // as requested, knowing that this is just a special case of alpha
        // conversion.
      } else {
        expr.variables[varidx].replaceWith(replacement.copy());
        replaceWithoutCapture(expr.body, variable, replacement);
      }
    } else {
      // Case 5: expr is a binding and it does not bind the variable to be replaced,
      // but the replacement may include capture, so we prevent that.
      // If any bound var would capture the replacement, apply alpha conversion
      // so that the bound var in question becomes an entirely new bound var.
      if (expr.body.occursFree(variable)) {
        expr.variables.forEach(function (bound_var) {
          if (replacement.occursFree(bound_var)) {
            // FIXME: this doesn't seem like the best way to get new variables, but works for now.
            //      need some way of generating global new variables
            //      E.g. a class called new variable stream
            expr.replaceWith(alphaConvert(expr, bound_var, getNewVariableRelativeTo(expr)));
          }
        });
      } // now after any needed alpha conversions have made it safe,
      // we can actually do the replacement in the body.


      replaceWithoutCapture(expr.body, variable, replacement);
    }
  }
}
/**
 * Checks if two expressions are alpha equivalent.
 * Two expresssions are alpha equivalent if one can be transformed into the other
 * by the renaming of bound variables.
 * If called when neither expr1 nor expr2 are applications or bindings, this function
 * returns false because alpha equivalence is not defined for free variables or constants.
 * @param {OM} expr1 - an OM expression (must be application or binding on first call)
 * @param {OM} expr2 - an OM expression (must be application or binding on first call)gef
 * @returns true if the two expressions are alpha equivalent, false otherwise
 */


function alphaEquivalent(expr1, expr2) {
  var firstcall = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  var possible_types = ['a', 'bi'];

  if (expr1.type != expr2.type) {
    return false;
  }

  if (firstcall && (!possible_types.includes(expr1.type) || !possible_types.includes(expr2.type))) {
    return false;
  }

  if (expr1.type == 'a') {
    var expr1_children = expr1.children;
    var expr2_children = expr2.children;

    if (expr1_children.length != expr2_children.length) {
      return false;
    }

    for (var i = 0; i < expr1_children.length; i++) {
      var ch1 = expr1_children[i];
      var ch2 = expr2_children[i];

      if (!alphaEquivalent(ch1, ch2, false)) {
        return false;
      }
    }

    return true;
  } else if (expr1.type == 'bi') {
    if (expr1.variables.length != expr2.variables.length || !expr1.symbol.equals(expr2.symbol)) {
      return false;
    } // Alpha convert all bound variables in both expressions to
    // new variables, which appear nowhere in either expression.
    // This avoids the problem of 'overwriting' a previous alpha conversion.


    var expr1conv = expr1.copy();
    var expr2conv = expr2.copy();

    for (var _i2 = 0; _i2 < expr1.variables.length; _i2++) {
      var new_var = getNewVariableRelativeTo(expr1conv, expr2conv);
      expr1conv = alphaConvert(expr1conv, expr1.variables[_i2], new_var);
      expr2conv = alphaConvert(expr2conv, expr2.variables[_i2], new_var);
    }

    return alphaEquivalent(expr1conv.body, expr2conv.body, false);
  } else {
    return expr1.equals(expr2);
  }
}
/**
 * Takes a general expression function representing λv_1,...,v_k.B
 * and a list of expressions e_1,...,e_k and returns the beta reduction
 * of ((λv_1,...,v_k.B)(e_1,...,e_k)) which is the expression B
 * with all v_i replaced by the corresponding e_i.
 *
 * This beta reduction is capture avoiding.
 * See `replaceWithoutCapture` for details.
 * @param {OM} gEF - a general expression function with n variables
 * @param {OM[]} expr_list - a list of expressions of length n
 * @returns an expression manipulated as described above
 */


function betaReduce(gEF, expr_list) {
  // Check we can actually do a beta reduction
  if (!isGeneralExpressionFunction(gEF)) {
    throw 'In beta reduction, the first argument must be a general expression function';
  }

  if (!(expr_list instanceof Array)) {
    throw 'In beta reduction,, the second argument must be a list of expressions';
  }

  if (gEF.variables.length != expr_list.length) {
    throw 'In beta reduction, the number of expressions must match number of variables';
  }

  var variables = gEF.variables;
  var result = gEF.body.copy();

  for (var i = 0; i < expr_list.length; i++) {
    var v_i = variables[i];
    var e_i = expr_list[i];
    replaceWithoutCapture(result, v_i, e_i);
  }

  return result;
}
/**
 * Helper function used when adding pairs to a constraint list.
 * Takes a variable and checks if it of the form, `vX` where `X` is some number.
 * If it is of this form, it returns X + 1 if it is greater than the given index.
 * @param {OM} variable - the variable to be checked
 * @param {Number} nextNewVariableIndex - the number to check against
 */


function checkVariable(variable, nextNewVariableIndex) {
  if (/^v[0-9]+$/.test(variable.name)) {
    nextNewVariableIndex = Math.max(nextNewVariableIndex, parseInt(variable.name.slice(1)) + 1);
  }

  return nextNewVariableIndex;
}
/**
 * Helper function used when adding pairs to a constraint list.
 * Returns the list of variables that appear in a given expression.
 * @param {OM} expression - the expression to be checked
 * @returns a list containing any variables in the given expression
 */


function getVariablesIn(expression) {
  return expression.descendantsSatisfying(function (d) {
    return d.type == 'v';
  });
}
/**
 * Takes a new variable (relative to some constraint list) and an expression
 * and returns a gEF which has the meaning λv_n.expr where v_n is the new
 * variable and expr is the expression.
 * I.e. creates a constant expression function.
 * @param {OM} new_variable - an OM variable
 * @param {OM} expression - an OM expression
 */


function makeConstantExpression(new_variable, expression) {
  if (new_variable instanceof _openmath.OM && expression instanceof _openmath.OM) {
    return makeGeneralExpressionFunction(new_variable.copy(), expression.copy());
  }

  return null;
}
/**
 * Takes a list of variables v_1,...,v_k and a single variable (a point)
 * v_i and returns a gEF with the meaning λv_1,...,v_k.v_i.
 * I.e. returns a projection expression function for v_i with k arguments.
 * @param {OM[]} variables - a list of OM variables
 * @param {OM} point -  a single OM variable
 */


function makeProjectionExpression(variables, point) {
  if (variables.every(function (v) {
    return v instanceof _openmath.OM;
  }) && point instanceof _openmath.OM) {
    if (!variables.map(function (v) {
      return v.name;
    }).includes(point.name)) {
      throw "When making a projection function, the point must occur in the list of variables";
    }

    return makeGeneralExpressionFunction(variables.map(function (v) {
      return v.copy();
    }), point.copy());
  }

  return null;
}
/**
 * Takes a list of variables, denoted `v1,...,vk`, an expression
 * which is denoted `g(e1,...,em)`, and a list of temporary
 * metavariables.
 *
 * For an application, returns a gEF with the meaning
 * `λv_1,...,v_k.g(H_1(v_1,...,v_k),...,H_m(v_1,...,v_k))`
 * where each `H_i` denotes a temporary gEFA as well as a list of the
 * newly created temporary metavariables `[H_1,...,H_m]`.
 *
 * I.e. it returns an 'imitation' expression function where
 * the body is the original expression with each argument
 * replaced by a temporary gEFA.
 * @param {OM} variables - a list of OM variables
 * @param {OM} expr - an OM application
 * @returns a gEF which is the imitation expression described above
 */


function makeImitationExpression(variables, expr, temp_metavars) {
  /**
   * Helper function which takes a head of a function,
   * a list of bound variables (i.e. the variables argument) of the
   * parent function, and a list of temporary metavariables.
   * Returns an expression which will become the body
   * of the imitation function. This is an application of the form:
   * `head(temp_metavars[0](bound_vars),...,temp_metavars[len-1](bound_vars))`
   */
  function createBody(head, bound_vars, temp_metavars, type, binding_variables) {
    var args = [];

    for (var i = 0; i < temp_metavars.length; i++) {
      var temp_metavar = temp_metavars[i];
      args.push(makeGeneralExpressionFunctionApplication(temp_metavar, bound_vars));
    }

    if (type == 'a') {
      return _openmath.OM.app.apply(_openmath.OM, args);
    } else if (type == 'bi') {
      return _openmath.OM.bin.apply(_openmath.OM, [head].concat((0, _toConsumableArray2["default"])(binding_variables), args));
    }
  }

  var imitationExpr = null;

  if (variables.every(function (v) {
    return v instanceof _openmath.OM;
  }) && expr instanceof _openmath.OM) {
    var type = expr.type;
    imitationExpr = makeGeneralExpressionFunction(variables, createBody(type == 'a' ? expr.children[0] : expr.symbol, variables, temp_metavars, type, type == 'bi' ? expr.variables : null));
  }

  return imitationExpr;
}