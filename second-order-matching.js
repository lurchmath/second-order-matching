"use strict"

// TODO: handle the case of this module running in the browser
// Import openmath-js for testing purposes
const OM = require('openmath-js').OM;

////////////////////////////////////////////////////////////////////////////////
// * The following are functions and constants related to metavariables.
// * A metavariable is a variable that will be used for substitution.
////////////////////////////////////////////////////////////////////////////////

// Define the metavariable symbol to be used as an attribute key, and its corresponding value
const metavariableSymbol = OM.symbol('metavariable', 'SecondOrderMatching');
const trueValue = OM.string('true');

/**
 * Marks a variable as a metavariable. 
 * Does nothing if the given input is not an OMNode of type variable or type symbol.
 * @param {OM} variable - the variable to be marked
 */
function setMetavariable(variable) {
    if (variable instanceof OM && ['v', 'sy'].includes(variable.type)) {
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
    return (
        variable instanceof OM
        && ['v', 'sy'].includes(variable.type)
        && variable.getAttribute(metavariableSymbol) != undefined
        && variable.getAttribute(metavariableSymbol).equals(trueValue)
    );
}

////////////////////////////////////////////////////////////////////////////////
// * The following are functions and constants related to expression functions.
// * When P: E -> E, P is an expression function.
// * If P is a metavariable, then P is an expression function application.
////////////////////////////////////////////////////////////////////////////////

const expressionFunction = OM.symbol('EF', 'SecondOrderMatching');
const expressionFunctionApplication = OM.symbol('EFA', 'SecondOrderMatching');

/**
 * Makes a new expression function with the meaning λv.b, where v is a variable and b is any OpenMath expression.
 * The variable will be bound in the resulting expression.
 * @param {OM} variable - the variable to be bound
 * @param {OM} body - the expression which may bind the variable
 */
function makeExpressionFunction(variable, body) {
    if (variable.type !== 'v') {
        throw 'When creating an expression function, its parameter must be a variable';
    }
    return OM.bin(expressionFunction, variable, body);
}

/**
 * Tests whether an expression is an expression function.
 * @param {OM} expression - the expression to be checked
 */
function isExpressionFunction(expression) {
    return (
        expression instanceof OM
        && expression.type === 'bi' 
        && expression.variables.length === 1 
        && expression.symbol.equals(expressionFunction)
    );
}

/**
 * Makes an expression whose meaning is the application of an expression function to an argument. 
 * Does not verify that func is an expression function; it need not be one, but can be a metavariable, for example. 
 * @param {OM} func - the function (or otherwise) which is applied
 * @param {OM} argument - the argument that the expression function is applied to
 */
function makeExpressionFunctionApplication(func, argument) {
    return OM.app(expressionFunctionApplication, func, argument);
}

/**
 * Tests whether an expression is an expression function application.
 * @param {OM} expression - the expression to be tested
 */
function isExpressionFunctionApplication(expression) {
    return (
        expression instanceof OM
        && expression.type === 'a' 
        && expression.children.length === 3 
        && expression.children[0].equals(expressionFunctionApplication)
    );
}

/**
 * Applies an expression function to an expression.
 * @param  {OM} func - the expression function to be applied
 * @param  {OM} expression - the expression to which the expression function is applied
 */
function applyExpressionFunction(func, expression) {
    if (isExpressionFunction(func)) {
        var result = func.body.copy();
        result.replaceFree(func.variables[0], expression);
        return result;
    } else return null;
}

/**
 * Returns true if and only if both functions are expression functions which are alpha equivalent.
 * @param  {OM} func1 - an expression function
 * @param  {OM} func2 - an expression function
 */
function alphaEquivalent(func1, func2) {
    var index = 0;
    function newVar() {
        return OM.var("v" + index);
    }
    function isNewVar(expr) {
        return expr.equals(newVar());
    }
    var pair = OM.app(func1, func2);
    while (pair.hasDescendantSatisfying(isNewVar)) {
        index++;
    }
    var apply1 = applyExpressionFunction(func1, newVar());
    var apply2 = applyExpressionFunction(func2, newVar());
    return isExpressionFunction(func1) && isExpressionFunction(func2) && apply1.equals(apply2);
}

////////////////////////////////////////////////////////////////////////////////
// * The classes below allow us to represent constraints.
// * A constraint is an ordered pattern-expression pair.
// * A pattern is an expression containing metavariables.
// * A (plain) expression does not contain metavariables. 
////////////////////////////////////////////////////////////////////////////////

/**
 * Represents a pattern-expression pair.
 */
class Constraint {
    /**
     * Creates a new constraint with given pattern and expression.
     * @param {OM} pattern - an OM expression which must contain a metavariable
     * @param {OM} expression - an OM expression with no metavariables
     */
    constructor(pattern, expression) {
        this.pattern = pattern;
        this.expression = expression;
    }

    /**
     * @returns a deep copy
     */
    copy() {
        return new Constraint(this.pattern.copy(), this.expression.copy());
    }

    /**
     * Returns true if and only if constraints are structurally equal as pairs.
     * Ignores any OpenMath attributes.
     * @param {Constraint} other - another Constraint
     */
    equals(other) {
        return this.pattern.equals(other.pattern, false) && this.expression.equals(other.expression, false);
    }
}

// TODO: Class - ConstraintList
    // TODO: Function - .equals()
//

// TODO: Function - instantiate

// TODO: Function - applySubs


// TODO: Function - makeConstantExpression

// TODO: Function - makeProjectionExpression

// TODO: Function - makeImitationExpression

// TODO: Class - MatchingChallenge


module.exports = {
    OM,
    setMetavariable, 
    clearMetavariable,
    isMetavariable,
    makeExpressionFunction,
    isExpressionFunction,
    makeExpressionFunctionApplication,
    isExpressionFunctionApplication,
    applyExpressionFunction,
    alphaEquivalent,
    Constraint,
};