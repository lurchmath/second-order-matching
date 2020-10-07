
"use strict"

// TODO: handle the case of this module running in the browser
// Import openmath-js for testing purposes
import { OM } from './openmath.js';

// Define the metavariable symbol to be used as an attribute key, and its corresponding value
const metavariableSymbol = OM.symbol('metavariable', 'SecondOrderMatching');
const trueValue = OM.string('true');

const Exprs = {

    ////////////////////////////////////////////////////////////////////////////////
    // What is an expression?
    // Here are several basic functions for identifying, comparing, copying,
    // and doing basic manipulations of expressions.
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * Returns true if and only if the given object is an OpenMath expression
     * @param {object} expr - the object to test
     */
    isExpression : (expr) => expr instanceof OM,

    /**
     * Return true iff the two expressions have the same type (e.g., both are
     * variables, or both are bindings, or both are function applications, etc.)
     * @param {OM} expr1 - first expression
     * @param {OM} expr2 - second expression
     */
    sameType : (expr1,expr2) => expr1.type === expr2.type,

    /**
     * Returns a copy of an OpenMath expression
     * @param {OM} expr - the expression to copy
     */
    copy : (expr) => expr.copy(),

    /**
     * Compute whether the two expressions are structurally equal, and return true
     * or false.
     * @param {OM} expr1 - first expression
     * @param {OM} expr2 - second expression
     */
    equal : (expr1,expr2) => expr1.equals(expr2),

    /**
     * Replace one expression, wherever it sits in its parent tree, with another.
     * @param {OM} toReplace - the expression to be replaced
     * @param {OM} withThis - the expression with which to replace it
     */
    replace : (toReplace,withThis) => toReplace.replaceWith(withThis),

    ////////////////////////////////////////////////////////////////////////////////
    // Which expressions are variables?
    // How can I extract a variable's name, or build a variable from a name?
    // How can we find the variables inside another expression?
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * Return true iff the given expression is a variable, false otherwise.
     * @param {OM} expr - the expression to test
     */
    isVariable : (expr) => expr.type === 'v',

    /**
     * Returns the variable's name, or null if it is not a variable.
     * @param {OM} variable - an OM instance of type variable
     */
    getVariableName : (variable) => Exprs.isVariable(variable) ? variable.name : null,

    /**
     * Construct an expression that is just a variable, with the given name
     * @param {string} name - the name of the new variable
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
     * @param {string} name - the name to use for the symbol
     */
    symbol : (name) => OM.sym(name,'SecondOrderMatching'),

    /**
     * Helper function used when adding pairs to a constraint list.
     * Returns the list of variables that appear in a given expression.
     * @param {OM} expression - the expression to be checked
     * @returns a list containing any variables in the given expression
     */
    getVariablesIn : (expression) => expression.descendantsSatisfying(Exprs.isVariable),

    ////////////////////////////////////////////////////////////////////////////////
    // Which expressions are function applications?
    // How can I build a function application expression,
    // or extract the list of children from an existing function application?
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * Return true iff the given expression is a function application, false
     * otherwise.
     * @param {OM} expr - the expression to test
     */
    isApplication : (expr) => expr.type === 'a',

    /**
     * Make a function application expression from the given children.  For example,
     * to create f(x,y), pass [f,x,y].  All arguments are used as-is, not copied
     * first; do not pass copies you need elsewhere.
     * @param {OM[]} children - the children of the resulting application, the first
     *   of which should be the operator and the rest the operands
     */
    application : (children) => OM.app(...children),

    /**
     * Return an array of the expression's children, in the order in which they
     * appear as children
     * @param {OM} expr - the expression whose children should be returned
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
     * @param {OM} expr - the expression to test
     */
    isBinding : (expr) => expr.type === 'bi',

    /**
     * Make a binding expression from the given symbol, variables, and body.  For
     * example, to create Forall x, P, pass Forall, [x], and P.  All arguments are
     * used as-is, not copied first; do not pass copies you need elsewhere.
     * @param {OM} symbol - the binding operator
     * @param {OM[]} variables - the array of bound variables
     * @param {OM} body - the body of the binding
     */
    binding : (symbol,variables,body) => OM.bin(symbol,...variables,body),

    /**
     * Return the symbol/head/operator of the binding expression, if indeed the
     * given argument is a binding expression; return null otherwise.
     * @param {OM} expr - the expression whose operator is to be returned
     */
    bindingHead : (binding) => Exprs.isBinding(binding) ? binding.symbol : null,

    /**
     * Return a list of the bound variables in the given expression, or null if the
     * given expression is not a binding one.
     * @param {OM} binding - the expression whose bound variables are to be returned
     */
    bindingVariables : (binding) => Exprs.isBinding(binding) ? binding.variables : null,

    /**
     * Return the body bound by a binding expression, or null if the given
     * expression is not a binding one.
     * @param {OM} binding - the expression whose body is to be returned (the
     *   original body, not a copy)
     */
    bindingBody : (binding) => Exprs.isBinding(binding) ? binding.body : null,

    /**
     * Return true if a structural copy of the given inner (sub)expression occurs
     * free in the given outer expression.
     * @param {OM} outer - the expression in which to seek subexpressions
     * @param {OM} inner - the subexpression to seek
     */
    occursFreeIn : (inner,outer) => outer.occursFree(inner),

    ////////////////////////////////////////////////////////////////////////////////
    // A metavariable is a variable that will be used for substitution.
    // How can I tell which variables are metavariables?
    // How can I mark a variable as being a metavariable, or clear such a mark?
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * Tests whether the given variable has the metavariable attribute.
     * @param {OM} variable - the variable to be checked
     */
    isMetavariable : (variable) =>
        Exprs.isExpression(variable)
     && ['v', 'sy'].includes(variable.type)
     && variable.getAttribute(metavariableSymbol) != undefined
     && variable.getAttribute(metavariableSymbol).equals(trueValue),

    /**
     * Marks a variable as a metavariable.
     * Does nothing if the given input is not an OMNode of type variable or type symbol.
     * @param {OM} variable - the variable to be marked
     */
    setMetavariable : (variable) => 
        Exprs.isExpression(variable) && ['v', 'sy'].includes(variable.type) ?
        variable.setAttribute(metavariableSymbol, trueValue.copy()) : null,

    /**
     * Removes the metavariable attribute if it is present.
     * @param {OM} metavariable - the metavariable to be unmarked
     */
    clearMetavariable : (metavariable) => metavariable.removeAttribute(metavariableSymbol),

};

export { OM, Exprs };
