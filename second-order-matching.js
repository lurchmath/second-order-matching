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
////////////////////////////////////////////////////////////////////////////////

const expressionFunction = OM.symbol('EF', 'SecondOrderMatching');
const expressionFunctionApplication = OM.symbol('EFA', 'SecondOrderMatching');

/**
 * Makes a new expression function with the meaning λv.B, where v is a variable and B is any OpenMath expression.
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
 * This is the equivalent of a beta reduction. 
 * One important caveat is that no checking is done for variable capture.
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

// /**
//  * Returns true if and only if both functions are expression functions which are alpha equivalent.
//  * @param  {OM} func1 - an expression function
//  * @param  {OM} func2 - an expression function
//  */
// function alphaEquivalent(func1, func2) {
//     var index = 0;
//     function newVar() {
//         return OM.var("v" + index);
//     }
//     function isNewVar(expr) {
//         return expr.equals(newVar());
//     }
//     var pair = OM.app(func1, func2);
//     while (pair.hasDescendantSatisfying(isNewVar)) {
//         index++;
//     }
//     var apply1 = applyExpressionFunction(func1, newVar());
//     var apply2 = applyExpressionFunction(func2, newVar());
//     return isExpressionFunction(func1) && isExpressionFunction(func2) && apply1.equals(apply2);
// }

// /**
//  * Performs alpha conversion for the single variable case.
//  * That is, given a single variable expression function, the bound variable in this function is replaced
//  * by another OM var instance, given as replacement.
//  * @param {OM} func - a single variable expression function
//  * @param {OM} replacement - an OM variable
//  * @returns a new expression function, with the bound variable replaced.
//  */
// function alphaCovert(func, replacement) {
//     var result = func.copy();
//     var bound_variables = result.variables;
//     for (let i = 0; i < bound_variables.length; i++) {
//         result.body.replaceFree(bound_variables[i], replacement);
//         result.variables[i].replaceWith(replacement);
//     }
//     return result;
// }

////////////////////////////////////////////////////////////////////////////////
// * The following are generalised versions of the functions above.
// * This allows us to have expression functions with more than one variable.
// * TODO: When these functions work as intended, remove the section above and
// *       refactor any code relying on the old functions.
// *       To make this simpler, use same arguments structure (if possible).
////////////////////////////////////////////////////////////////////////////////

const generalExpressionFunction = OM.symbol('gEF', 'SecondOrderMatching');

/**
 * Makes a new expression function with the meaning
 * λv1,...,vk.B where v1,...,vk are the variables and B is any OM expression.
 * @param {OM[]} variables - a list of OM variables
 * @param {OM} body - any OM expression
 */
function makeGeneralExpressionFunction(variables, body) {
    for (let i = 0; i < variables.length; i++) {
        var variable = variables[i];
        if (variable.type !== 'v') {
            throw 'When making a general expression function,\
all elements of first argument must have type variable';
        }
    }
    return OM.bin(generalExpressionFunction, ...variables, body);
}

/**
 * Tests whether an expression is a general expression function.
 * @param {OM} expression - the expression to be checked
 */
function isGeneralExpressionFunction(expression) {
    return (
        expression instanceof OM
        && expression.type == 'bi'
        && expression.symbol.equals(generalExpressionFunction)
    );
}

function makeGeneralExpressionFunctionApplication() {
    //
}

function isGeneralExpressionFunctionApplication() {
    //
}

////////////////////////////////////////////////////////////////////////////////
// * The following are functions for manipulating expressions
// * and for checking certain properties of expressions.
////////////////////////////////////////////////////////////////////////////////

/**
 * Helper function for other expression manipulation functions.
 * @param {OM} expr - an OM expression
 * @returns the first variable of the form xN 
 * which appears nowhere in the supplied expression.
 */
function getNewVariableRelativeTo(expr) {
    var vars = getVariablesIn(expr);
    var index = 0;
    for (let i = 0; i < vars.length; i++) {
        var next_var = vars[i];
        if (/^x[0-9]+$/.test(next_var.name)) {
            index = Math.max(
                index,
                parseInt(next_var.name.slice(1)) + 1
            );
        }
    }
    var var_name = 'x' + index;
    return OM.var(var_name);
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
function alphaCovert(binding, which_var, replace_var) {
    var result = binding.copy();
    var bound_vars = result.variables

    if (!bound_vars.map(x => x.name).includes(which_var.name)) {
        throw 'which_var must be bound in binding'
    }

    for (let i = 0; i < bound_vars.length; i++) {
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
 * @param {OM} expr - an OM expression 
 * @param {OM} variable - an OM variable
 * @param {OM} replacement - an OM expression
 */
function replaceWithoutCapture(expr, variable, replacement) {
    if (!(expr instanceof OM) 
        || !(variable instanceof OM) 
        || !(replacement instanceof OM)) {
        throw 'all arguments must be instances of OMNode';
    }

    if (expr.type != 'bi') {
        if (expr.type == 'v' && expr.equals(variable)) {
            expr.replaceWith(replacement.copy());
        } else {
            var children = expr.children;
            for (let i = 0; i < children.length; i++) {
                var ch = children[i];
                replaceWithoutCapture(ch, variable, replacement);
            }
        }
    } else {
        var bound_vars = expr.variables;
        for (let i = 0; i < bound_vars.length; i++) {
            var bound_var = bound_vars[i];
            // variable capture will occur in the following case
            if (expr.body.occursFree(variable) && replacement.occursFree(bound_var)) { 
                // FIXME: this doesn't seem like the best way to get new variables, but works for now.
                expr.replaceWith(alphaCovert(expr, bound_var, getNewVariableRelativeTo(expr)));
            }
        }
        replaceWithoutCapture(expr.body, variable, replacement);
    }
}

/**
 * Checks if two expressions are alpha equivalent.
 * Two expresssions are alpha equivalent if one can be transformed into the other
 * by the renaming of bound variables.
 * If called when neither expr1 nor expr2 are applications or bindings, this function
 * returns false because alpha equivalence is not defined for free variables or constants.
 * @param {OM} expr1 - an OM expression
 * @param {OM} expr2 - an OM expression
 * @returns true if the two expressions are alpha equivalent, false otherwise
 */
function alphaEquivalent(expr1, expr2, firstcall=true) {
    var possible_types = ['a', 'bi'];
    if (expr1.type != expr2.type) {
        return false;
    }
    if (firstcall && 
        (!possible_types.includes(expr1.type) || !possible_types.includes(expr2.type))) {
        return false;
    }
    if (expr1.type == 'a') {
        var expr1_children = expr1.children;
        var expr2_children = expr2.children;
        if (expr1_children.length != expr2_children.length) {
            return false;
        }
        for (let i = 0; i < expr1_children.length; i++) {
            var ch1 = expr1_children[i];
            var ch2 = expr2_children[i];
            if (ch1.type == 'bi' && ch2.type == 'bi') {
                var equal = alphaEquivalent(ch1, ch2, false);
                if (!equal) {
                    return false;
                }
            }
        }
        return true;
    } else if (expr1.type == 'bi') {
        if ((expr1.variables.length != expr2.variables.length)
            || !(expr1.symbol.equals(expr2.symbol))) {
            return false;
        }
        for (let i = 0; i < expr1.variables.length; i++) {
            var expr2conv = alphaCovert(expr2, expr2.variables[i], expr1.variables[i]);
        }
        return alphaEquivalent(expr1.body, expr2conv.body, false);
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
 * @param {OM[]} expr_list - a list of _listessions of length n
 * @returns an expression manipulated as described above
 */
function betaReduce(gEF, expr_list) {
    // Check we can actually do a beta reduction
    if (!isGeneralExpressionFunction(gEF)) {
        throw 'In beta reduction, the first argument must be a general expression function'
    }
    if (!(expr_list instanceof Array)) {
        throw 'In beta reduction,, the second argument must be a list of expressions'
    }
    if (gEF.variables.length != expr_list.length) {
        throw 'In beta reduction, the number of expressions must match number of variables'
    }
    // }

    var variables = gEF.variables
    var result = gEF.body.copy();
    for (let i = 0; i < expr_list.length; i++) {
        var v_i = variables[i];
        var e_i = expr_list[i];
        replaceWithoutCapture(result, v_i, e_i);
    }
    return result;
}

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
 * Helper function for ConstraintList constructor. 
 * Takes a variable and checks if it of the form, `vX` where `X` is some number.
 * If it is of this form, it returns X + 1 if it is greater than the given index.
 * @param {OM} variable - the variable to be checked
 * @param {Number} nextNewVariableIndex - the number to check against
 */
function checkVariable(variable, nextNewVariableIndex) {
    if (/^v[0-9]+$/.test(variable.name)) {
        nextNewVariableIndex = Math.max(
            nextNewVariableIndex,
            parseInt(variable.name.slice(1)) + 1
        );
    }
    return nextNewVariableIndex;
}

/**
 * Helper function for ConstraintList constructor.
 * @param {OM} expression - the expression to be checked
 * @returns a list containing any variables in the given expression
 */
function getVariablesIn(expression) {
    return expression.descendantsSatisfying((d) => { return d.type == 'v'; });
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

        for (let i = 0; i < this.contents.length; i++) {
            var constraint = this.contents[i];
            var p_vars = getVariablesIn(constraint.pattern);
            for (let j = 0; j < p_vars.length; j++) {
                this.nextNewVariableIndex = checkVariable(p_vars[j], this.nextNewVariableIndex);
            }
            var e_vars = getVariablesIn(constraint.expression);
            for (let k = 0; k < e_vars.length; k++) {
                this.nextNewVariableIndex = checkVariable(e_vars[k], this.nextNewVariableIndex);
            }
        }
    }

    /**
     * @returns the length of the array of constraints.
     */
    get length() {
        return this.contents.length;
    }

    /**
     * @returns a new variable starting at `vn` (see constructor for definition of `vn`).
     */
    nextNewVariable() {
        return OM.simple('v' + this.nextNewVariableIndex++);
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
            var index = result.indexAtWhich((c) => { return c.equals(constraint); });
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
            var index = result.indexAtWhich((c) => { return c.equals(constraint); });
            if (index > -1) {
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

    /**
     * @returns true only if both lists contain the same constraints.
     */
    equals(other) {
        for (let i = 0; i < this.contents.length; i++) {
            let constraint = this.contents[i];
            if (!other.firstSatisfying((c) => { return c.equals(constraint) })) {
                return false;
            }
        }
        for (let i = 0; i < other.contents.length; i++) {
            let constraint = other.contents[i];
            if (!this.firstSatisfying((c) => { return c.equals(constraint) })) {
                return false;
            }
        }
        return true;
    }
}

/**
 * Applies a singe instantiation (substitution) to a single pattern.
 * Used by instantiate to handle the list case.
 * @param {OM} substitution - a single substitution
 * @param {OM} pattern - a single pattern
 * @returns a copy of the pattern with any substitutions
 */
function applyInstantiation(substitution, pattern) {
    var result = pattern.copy();
    return result;
}

/**
 * Takes two ConstraintList objects, one representing a list of substiutions, 
 * the other containing the patterns that the substiutions will be applied to.
 * Each substitution is applied to the pattern satisfying the conditions described 
 * in the summary paper (section 3).
 * @param {ConstraintList} substitutions - a non empty constraint list satisfying isFunction()
 * @param {ConstraintList} patterns - a non empty constraint list
 * @returns a copy of the constraints list containing the patterns with any substitutions
 */
function instantiate(substitutions, patterns) {
    var result = patterns.copy()
    for (let i = 0; i < substitutions.length; i++) {
        var substitution = substitutions.contents[i];
        for (let j = 0; j < patterns.length; j++) {
            var pattern = patterns.contents[j].pattern;
            result.contents[j].pattern.replaceWith(
                applyInstantiation(substitution, pattern)
            );
        }
    }
    return result;
}

function makeConstantExpression(new_variable, expression) {
    // TODO: take a new variable vn (relative to some constraint list)
    // return an expression of the form:
    // CF = λvn.expression
}

function makeProjectionExpression(variables, point) {
    // TODO: take in a list of variables v1,...,vk and a single point vi
    // return an expression function of the form:
    // π_{k,i} = λv1,...,vk.vi
}

function makeImitationExpression(variables, exoression) {
    // TODO: take in a list of variables and an expression of the form:
    // expr = g(e1,...,em)
    // return an expression function of the form:
    // EF = λv1,...,vk.g(H1(v1,...,vk),...,Hm(v1,...,vk))
    // where the v1,...,vk are the given variables
}

class MatchingChallenge {
    //TODO: implement this class
}


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

    makeGeneralExpressionFunction,
    isGeneralExpressionFunction,

    getNewVariableRelativeTo,
    alphaCovert,
    replaceWithoutCapture,
    alphaEquivalent,
    betaReduce,

    Constraint,
    ConstraintList,

    applyInstantiation,
    instantiate,
};