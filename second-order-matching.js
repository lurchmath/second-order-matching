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
// * A special case of a constraint is a substitution. In a substiution,
// * the pattern is just a metavariable.
////////////////////////////////////////////////////////////////////////////////

/**
 * Represents a pattern-expression pair.
 */
class Constraint {
    /**
     * Creates a new constraint with given pattern and expression.
     * @param {OM} pattern - an OM expression which should contain a metavariable (but may not)
     * @param {OM} expression - an OM expression which must not contain a metavariable
     */
    constructor(pattern, expression) {
        if (!(pattern instanceof OM) || !(expression instanceof OM)) {
            throw 'Both arguments must be instances of OMNode';
        }
        if (expression.hasDescendantSatisfying((x) => { return isMetavariable(x); })) {
            throw 'Expression must not contain metavariables';
        }
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

    /**
     * @returns true if the pattern is a metavariable, false otherwise.
     */
    isSubstitution() {
        return isMetavariable(this.pattern);
    }
}

/**
 * Represents a list of constraints. 
 * However, most of the behaviour of this class mimics a set, 
 * except for a few cases in which we use indexes.
 */
class ConstraintList {
    /**
     * Creates an array from arguments. 
     * Also computes the first variable from the list `v0, v1, v2,...` such that neither it nor 
     * any variable after it in that list appears in any of the constraints. 
     * Call this `vn`. See `nextNewVariable` for the use.
     * @param ...constraints - an arbitrary number of Constraints (can be zero)
     */
    constructor(...constraints) {
        this.contents = constraints;
        this.nextNewVariableIndex = 0;

        function checkVariable(variable) {
            if (/^v[0-9]+$/.test(variable.name)) {
                this.nextNewVariableIndex = Math.max(
                    this.nextNewVariableIndex,
                    parseInt(variable.name.slice(1)) + 1
                );
            }
        }

        function getVariablesIn(expression) {
            return expression.descendantsSatisfying((d) => { return d.type == 'v'; });
        }

        for (let i = 0; i < this.contents.length; i++) {
            var constraint = this.contents[i];
            var p_vars = getVariablesIn(constraint.pattern);
            for (let j = 0; j < p_vars.length; j++) {
                checkVariable(p_vars[j]);
            }
            var e_vars = getVariablesIn(constraint.expression);
            for (let k = 0; k < e_vars.length; k++) {
                checkVariable(e_vars[k]);
            }
        }
    }

    /**
     * @returns a new variable starting at `vn` (see constructor for definition of `vn`).
     */
    get nextNewVariable() {
        return OM.simple('v' + this.nextNewVariableIndex++);
    }

    /**
     * @returns the length of the array of constraints.
     */
    get length() {
        return this.contents.length;
    }

    /**
     * @returns a deep copy of the list.
     */
    copy() {
        var contents_copy = this.contents.map(c => c.copy());
        var result = new ConstraintList(...contents_copy);
        result.nextNewVariableIndex = this.nextNewVariableIndex;
        return result;
    }
    /**
     * @returns the first index at which predicate is true when evaluated on contents, -1 otherwise.
     */
    indexAtWhich(predicate) {
        for (let i = 0; i < this.contents.length; i++) {
            if (predicate(this.contents[i])) return i;
        }
        return -1;
    }

    /**
     * Adds constraints only if they are not in the current list (as if we had a set). 
     * @param ...constraints - the constraints to be added
     * @returns a copy of this list with any added constraints
     */
    add(...constraints) {
        var result = this.copy();
        for (let i = 0; i < constraints.length; i++) {
            var constraint = constraints[i];
            var index = this.indexAtWhich((c) => { return c.equals(constraint); });
            if (index == -1) {
                result.contents.push(constraint);
            }
        }
        return result;
    }

    /**
     * Removes constraints from the list and ignores any constraints not in the list.
     * @param ...constraints - the constraints to be removed
     * @returns a copy of this list with constraints removed
     */
    remove(...constraints) {
        var result = this.copy();
        for (let i = 0; i < constraints.length; i++) {
            var constraint = constraints[i];
            var index = this.indexAtWhich((c) => { return c.equals(constraint); });
            if (index !== -1) {
                result.contents.splice(index, 1);
            }
        }
        return result;
    }

    /**
     * @returns the first constraint in the list satisfying the given predicate, otherwise null.
     */
    firstSatisfying(predicate) {
        var index = this.indexAtWhich(predicate);
        return (index == -1 ? null : this.contents[index]);
    }

    /**
     * @returns an array of length two containing the first two constraints satisfying the given binary predicate, 
     * or null if there is not one.
     */
    firstPairSatisfying(predicate) {
        for (let i = 0; i < this.contents.length; i++) {
            for (let j = 0; j < this.contents.length; j++) {
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
     * Some constraint lists are functions from the space of metavariables to the space of expressions. 
     * To be such a function, the constraint list must contain only constraints 
     * whose left hand sides are metavariables (called substitutions above), 
     * and no metavariable must appear in more than one constraint.
     */
    isFunction() {
        var seen_so_far = [];
        for (let i = 0; i < this.contents.length; i++) {
            var constraint = this.contents[i];
            if (!constraint.isSubstitution()) {
                return false;
            }
            if (seen_so_far.includes(constraint.pattern.name)) {
                return false;
            }
            seen_so_far.push(constraint.pattern.name);
        }
        return true;
    }

    /**
     * If the constraint list is a function, this routine returns the expression associated with a given metavariable.
     * @param variable - a string or OM object
     * @returns the OM object that is the expression of the constraint 
     * with the pattern that equals the variable, null otherwise.
     */
    lookup(variable) {
        if (!(variable instanceof OM)) {
            variable = OM.var(variable);
            setMetavariable(variable);
        }
        for (let i = 0; i < this.contents.length; i++) {
            var constraint = this.contents[i]; 
            if (constraint.pattern.equals(variable)) {
                return constraint.expression;
            }
        }
        return null;
    }
}

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
    ConstraintList
};