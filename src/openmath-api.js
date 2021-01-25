
"use strict"

// TODO: handle the case of this module running in the browser
// Import openmath-js for testing purposes
import { OM } from './openmath.js';

// Define the metavariable symbol to be used as an attribute key, and its corresponding value
const metavariableSymbol = OM.symbol('metavariable', 'SecondOrderMatching');
const trueValue = OM.string('true');

/**
 * This namespace creates an API by which this package can use a simple JavaScript
 * implementation of OpenMath to store and manipulate mathematical expressions.
 * @namespace OpenMathAPI
 */
export const API = {

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
    isExpression : (expr) => expr instanceof OM,

    /**
     * Return an array of all subexpressions of the given expression (including
     * that expression itself, possibly) that satisfy the predicate provided in
     * the second parameter.
     * @param {OM} expr - the expression in which to search
     * @param {function} filter - the unary binary function to use as the
     *   filtering predicate
     */
    filterSubexpressions : (expr,filter) => expr.descendantsSatisfying(filter),

    /**
     * Return true iff the two expressions have the same type (e.g., both are
     * variables, or both are bindings, or both are function applications, etc.)
     * @function sameType
     * @param {OM} expr1 - first expression
     * @param {OM} expr2 - second expression
     * @memberof OpenMathAPI
     */
    sameType : (expr1,expr2) => expr1.type === expr2.type,

    /**
     * Returns a copy of an OpenMath expression
     * @function copy
     * @param {OM} expr - the expression to copy
     * @memberof OpenMathAPI
     */
    copy : (expr) => expr.copy(),

    /**
     * Compute whether the two expressions are structurally equal, and return true
     * or false.
     * @function equal
     * @param {OM} expr1 - first expression
     * @param {OM} expr2 - second expression
     * @memberof OpenMathAPI
     */
    equal : (expr1,expr2) => expr1.equals(expr2),

    /**
     * Replace one expression, wherever it sits in its parent tree, with another.
     * @function replace
     * @param {OM} toReplace - the expression to be replaced
     * @param {OM} withThis - the expression with which to replace it
     * @memberof OpenMathAPI
     */
    replace : (toReplace,withThis) => toReplace.replaceWith(withThis),

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
    isVariable : (expr) => expr.type === 'v',

    /**
     * Returns the variable's name, or null if it is not a variable.
     * @function getVariableName
     * @param {OM} variable - an OM instance of type variable
     * @memberof OpenMathAPI
     */
    getVariableName : (variable) => API.isVariable(variable) ? variable.name : null,

    /**
     * Construct an expression that is just a variable, with the given name
     * @function variable
     * @param {string} name - the name of the new variable
     * @memberof OpenMathAPI
     */
    variable : (name) => OM.var(name),

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
    symbol : (name) => OM.sym(name,'SecondOrderMatching'),

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
    isApplication : (expr) => expr.type === 'a',

    /**
     * Make a function application expression from the given children.  For example,
     * to create f(x,y), pass [f,x,y].  All arguments are used as-is, not copied
     * first; do not pass copies you need elsewhere.
     * @function application
     * @param {OM[]} children - the children of the resulting application, the first
     *   of which should be the operator and the rest the operands
     * @memberof OpenMathAPI
     */
    application : (children) => OM.app(...children),

    /**
     * Return an array of the expression's children, in the order in which they
     * appear as children
     * @function getChildren
     * @param {OM} expr - the expression whose children should be returned
     * @memberof OpenMathAPI
     */
    getChildren : (expr) => expr.children,

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
    isBinding : (expr) => expr.type === 'bi',

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
    binding : (symbol,variables,body) => OM.bin(symbol,...variables,body),

    /**
     * Return the symbol/head/operator of the binding expression, if indeed the
     * given argument is a binding expression; return null otherwise.
     * @function bindingHead
     * @param {OM} expr - the expression whose operator is to be returned
     * @memberof OpenMathAPI
     */
    bindingHead : (binding) => API.isBinding(binding) ? binding.symbol : null,

    /**
     * Return a list of the bound variables in the given expression, or null if the
     * given expression is not a binding one.
     * @function bindingVariables
     * @param {OM} binding - the expression whose bound variables are to be returned
     * @memberof OpenMathAPI
     */
    bindingVariables : (binding) => API.isBinding(binding) ? binding.variables : null,

    /**
     * Return the body bound by a binding expression, or null if the given
     * expression is not a binding one.
     * @function bindingBody
     * @param {OM} binding - the expression whose body is to be returned (the
     *   original body, not a copy)
     * @memberof OpenMathAPI
     */
    bindingBody : (binding) => API.isBinding(binding) ? binding.body : null,

    /**
     * Return true if the given variable is free in the given expression.
     * @function variableIsFree
     * @param {OM} variable - the variable (not its name, but the actual
     *   instance) whose freeness will be tested
     * @param {OM} expression - the ancestor expression containing the variable,
     *   and in which we are asking whether it is free
     * @memberof OpenMathAPI
     */
    variableIsFree : (variable,expression) => variable.isFree(expression),

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
    isMetavariable : (variable) =>
        API.isExpression(variable)
     && ['v', 'sy'].includes(variable.type)
     && variable.getAttribute(metavariableSymbol) != undefined
     && variable.getAttribute(metavariableSymbol).equals(trueValue),

    /**
     * Marks a variable as a metavariable.
     * Does nothing if the given input is not an OMNode of type variable or type symbol.
     * @function setMetavariable
     * @param {OM} variable - the variable to be marked
     * @memberof OpenMathAPI
     */
    setMetavariable : (variable) => 
        API.isExpression(variable) && ['v', 'sy'].includes(variable.type) ?
        variable.setAttribute(metavariableSymbol, trueValue.copy()) : null,

    /**
     * Removes the metavariable attribute if it is present.
     * @function clearMetavariable
     * @param {OM} metavariable - the metavariable to be unmarked
     * @memberof OpenMathAPI
     */
    clearMetavariable : (metavariable) => metavariable.removeAttribute(metavariableSymbol),

};