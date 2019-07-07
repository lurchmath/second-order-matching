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
// * The following are generalised versions expression functions.
// * When P: E -> E, P is an expression function.
// * This generalisation allows us to have expression functions 
// * with more than one variable.
////////////////////////////////////////////////////////////////////////////////

const generalExpressionFunction = OM.symbol('gEF', 'SecondOrderMatching');
const generalExpressionFunctionApplication = OM.symbol('gEFA', 'SecondOrderMatching');

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
        throw 'When making gEFAs, the func must be either a EF or a metavariable'
    }
    if (!(args instanceof Array)) {
        args = [args]
    }
    return OM.app(generalExpressionFunctionApplication, func, ...args);
}

/**
 * @returns true if the supplied expression is a gEFA
 */
function isGeneralExpressionFunctionApplication(expression) {
    return (
        expression instanceof OM
        && expression.type === 'a'
        && expression.children[0].equals(generalExpressionFunctionApplication)
    );
}

/**
 * Tests whether a gEFA is of the form gEF(args).
 * If the gEFA is of this form, `applyGeneralExpressionFunctionApplication`
 * can be called with this gEFA as an argument.
 * @param {OM} gEFA - a general expression function application
 */
function canApplyGeneralExpressionFunctionApplication(gEFA) {
    if (
        isGeneralExpressionFunctionApplication(gEFA)
        && isGeneralExpressionFunction(gEFA.children[1])
    ) {
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
}

////////////////////////////////////////////////////////////////////////////////
// * The following are functions for manipulating expressions
// * and for checking certain properties of expressions.
////////////////////////////////////////////////////////////////////////////////

/**
 * Helper function for other expression manipulation functions.
 * @param {OM} expr - an OM expression, more expr arguments are accepted.
 * @returns the first variable of the form xN 
 * which appears nowhere in the supplied expression(s).
 */
function getNewVariableRelativeTo(expr /*, expr2, ... */) {
    let all_vars = getVariablesIn(expr);
    for (let i = 1; i < arguments.length; i++) {
        all_vars.push(...getVariablesIn(arguments[i]));
    }
    let index = 0;
    for (let i = 0; i < all_vars.length; i++) {
        let next_var = all_vars[i];
        if (/^x[0-9]+$/.test(next_var.name)) {
            index = Math.max(
                index,
                parseInt(next_var.name.slice(1)) + 1
            );
        }
    }
    let var_name = 'x' + index;
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
function alphaConvert(binding, which_var, replace_var) {
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
    if (!(expr instanceof OM)
        || !(variable instanceof OM)
        || !(replacement instanceof OM)) {
        throw 'all arguments must be instances of OMNode';
    }
    if (expr.type != 'bi') {
        // Case 1: expr is a variable that we must replace, so do it
        if (expr.type == 'v' && expr.equals(variable)) {
            expr.replaceWith(replacement.copy());
        // Case 2: expr is any other non-binding, so recur on its
        // children (of which there may be none, meaning this is some
        // type of atomic other than a variable, which is fine; do nothing)
        } else {
            var children = expr.children;
            for (let i = 0; i < children.length; i++) {
                var ch = children[i];
                replaceWithoutCapture(ch, variable, replacement);
            }
        }
    } else {
        const varidx = expr.variables.map( v => v.name ).indexOf(variable.name);
        if (varidx > -1) {
            // Case 3: expr is a binding and it binds the variable to be replaced,
            // but the replacement is a non-variable.  This is illegal, because
            // OpenMath bound variable positions can be occupied only by variables.
            if (replacement.type != 'v') {
                throw 'Cannot replace a bound variable with a non-varible';
            // Case 4: expr is a binding and it binds the variable to be replaced,
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
                expr.variables.forEach(bound_var => {
                    if (replacement.occursFree(bound_var)) {
                        // FIXME: this doesn't seem like the best way to get new variables, but works for now.
                        //      need some way of generating global new variables
                        //      E.g. a class called new variable stream
                        expr.replaceWith(alphaConvert(expr, bound_var, getNewVariableRelativeTo(expr)));
                    }
                } );
            }
            // now after any needed alpha conversions have made it safe,
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
            if (!alphaEquivalent(ch1, ch2, false)) {
                return false;
            }
        }
        return true;
    } else if (expr1.type == 'bi') {
        if ((expr1.variables.length != expr2.variables.length)
            || !(expr1.symbol.equals(expr2.symbol))) {
            return false;
        }
        // Alpha convert all bound variables in both expressions to
        // new variables, which appear nowhere in either expression.
        // This avoids the problem of 'overwriting' a previous alpha conversion.
        var expr1conv = expr1.copy();
        var expr2conv = expr2.copy();
        for (let i = 0; i < expr1.variables.length; i++) {
            let new_var = getNewVariableRelativeTo(expr1conv, expr2conv);
            expr1conv = alphaConvert(expr1conv, expr1.variables[i], new_var);
            expr2conv = alphaConvert(expr2conv, expr2.variables[i], new_var);
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
        throw 'In beta reduction, the first argument must be a general expression function'
    }
    if (!(expr_list instanceof Array)) {
        throw 'In beta reduction,, the second argument must be a list of expressions'
    }
    if (gEF.variables.length != expr_list.length) {
        throw 'In beta reduction, the number of expressions must match number of variables'
    }

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
 * @constant CASE_IDENTITY represents the case in which the pattern 
 * and expression are equal (and hence the pattern contains no metavariables)
 */
const CASE_IDENTITY = 1

/**
 * @constant CASE_BINDING represents the case in which the pattern is 
 * just a metavariable
 */
const CASE_BINDING = 2

/**
 * @constant CASE_SIMPLIFICATION represents the case in which both the pattern
 * and the expression are functions and the 'head' of the pattern function is
 * not a metavariable
 */
const CASE_SIMPLIFICATION = 3

/**
 * @constant CASE_EFA represents the case in which the pattern is gEFA,
 * or a function with a metavariable as its 'head', and `CASE_SIMPLIFICATION`
 * does not hold
 */
const CASE_EFA = 4

/**
 * @constant CASE_FAILURE represents the case of failure, when no other cases apply
 */
const CASE_FAILURE = 6

/**
 * @constant CASES an enum-like object to easily access cases.
 */
const CASES = {
    CASE_IDENTITY: CASE_IDENTITY,
    CASE_BINDING: CASE_BINDING,
    CASE_SIMPLIFICATION: CASE_SIMPLIFICATION,
    CASE_EFA: CASE_EFA,
    CASE_FAILURE: CASE_FAILURE
}
Object.freeze(CASES);

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
        this.pattern = pattern;
        this.expression = expression;
        this.case = this.getCase(pattern, expression);
    }

    /**
     * @returns a deep copy
     */
    copy() {
        return new Constraint(this.pattern.copy(), this.expression.copy());
    }

    /**
     * @param {Constraint} other - another Constraint
     * @returns `true` if patterns and expressions are structurally equal 
     * OR alpha equivalent, `false` otherwise.
     */
    equals(other) {
        return (
            (this.pattern.equals(other.pattern) || alphaEquivalent(this.pattern, other.pattern))
            &&
            (this.expression.equals(other.expression) || alphaEquivalent(this.expression, other.expression))
        );
    }

    /**
     * @returns true if the pattern is a metavariable, false otherwise.
     */
    isSubstitution() {
        return isMetavariable(this.pattern);
    }

    /**
     * Returns the case, as described in the corresponding paper 
     * (and briefly in the case constant declarations)
     * @param {OM} pattern 
     * @param {OM} expression 
     */
    getCase(pattern, expression) {
        if (pattern.equals(expression)) {
            return CASE_IDENTITY;
        } else if (isMetavariable(pattern)) {
            return CASE_BINDING;
        } else if (
                (   
                    (
                        (
                            pattern.type == 'a' 
                            && !(isGeneralExpressionFunctionApplication(pattern))
                        )
                        && expression.type == 'a'
                    )
                    && pattern.children.length == expression.children.length
                )
                || 
                (
                    (   pattern.type == 'bi' 
                        && expression.type == 'bi'
                    )
                    && pattern.symbol.equals(expression.symbol)
                    && pattern.variables.length == expression.variables.length
                )
            ) {
            return CASE_SIMPLIFICATION;
        } else if (isGeneralExpressionFunctionApplication(pattern) 
            || isMetavariable(pattern.children[1])
            ) {
            return CASE_EFA;
        } else {
            return CASE_FAILURE;
        }
    }

    /**
     * Calls `getCase` again, in case pattern or expression have changes
     */
    reEvalCase() {
        this.case = this.getCase(this.pattern, this.expression);
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
 * except for a few cases in which we use indices.
 */
class ConstraintList {
    /**
     * Creates an array from arguments. 
     * Also computes the first variable from the list `v0, v1, v2,...` such that neither it nor 
     * any variable after it in that list appears in any of the constraints. 
     * Call this `vN`. See `nextNewVariable` for the use.
     * @param ...constraints - an arbitrary number of Constraints (can be zero)
     */
    constructor(...constraints) {
        this.contents = [];
        this.nextNewVariableIndex = 0;
        this.bindingConstraints = [];

        constraints.forEach(constraint => {
            this.add(constraint);
        });
    }

    /**
     * @returns the length of the array of constraints.
     */
    get length() {
        return this.contents.length;
    }

    /**
     * @returns a new variable starting at `vN` (see constructor for definition of `vN`).
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
        result.bindingConstraints = this.bindingConstraints.map(bc => {return {inner: bc.inner.copy(), outer: bc.outer.copy()}})
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
     * @returns the new contents
     */
    add(...constraints) {
        constraints.forEach(constraint => {
            // Don't add if it's already in the list
            if (this.indexAtWhich((c) => c.equals(constraint)) == -1) {
                // Set the next new var index
                var p_vars = getVariablesIn(constraint.pattern);
                for (let j = 0; j < p_vars.length; j++) {
                    this.nextNewVariableIndex = checkVariable(p_vars[j], this.nextNewVariableIndex);
                }
                var e_vars = getVariablesIn(constraint.expression);
                for (let k = 0; k < e_vars.length; k++) {
                    this.nextNewVariableIndex = checkVariable(e_vars[k], this.nextNewVariableIndex);
                }
                // Add the constraint
                this.contents.push(constraint);
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
    remove(...constraints) {
        for (let i = 0; i < constraints.length; i++) {
            var constraint = constraints[i];
            var index = this.indexAtWhich((c) => { return c.equals(constraint); });
            if (index > -1) {
                this.contents.splice(index, 1);
            }
        }
        return this.contents;
    }

    /**
     * Makes the list empty by removing all constraints
     */
    empty() {
        this.contents = [];
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
     * Returns the constraint with the 'best' case from the start of the list.
     * The cases are defined in the corresponding paper.
     * @returns {Constraint} the constraint with the best case
     */
    getBestCase() {
        var constraint;
        if ((constraint = this.firstSatisfying(c => c.case == CASE_FAILURE)) != null) {
            return constraint;
        } else if ((constraint = this.firstSatisfying(c => c.case == CASE_IDENTITY)) != null) {
            return constraint;
        } else if ((constraint = this.firstSatisfying(c => c.case == CASE_BINDING)) != null) {
            return constraint;
        } else if ((constraint = this.firstSatisfying(c => c.case == CASE_SIMPLIFICATION)) != null) {
            return constraint;
        } else if ((constraint = this.firstSatisfying(c => c.case == CASE_EFA)) != null) {
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

    /**
     * Extracts from each pattern a list of metavariable pairs (m1,m2). 
     * Such a pair means the restriction that a solution S cannot have S(m1) appearing free in S(m2).
     * Pairs are represented by an object with `inner: m1` and `outer m2` properties.
     */
    computeBindingConstraints() {
        this.contents.forEach(constraint =>
            constraint.pattern.descendantsSatisfying(d => d.type == 'bi').forEach(binding =>
                binding.descendantsSatisfying(isMetavariable).forEach(innerMV => {
                    if (innerMV.isFree(binding)) { 
                        binding.variables.forEach(outerMV => {
                            if (!this.bindingConstraints.find(existing =>
                                    existing.outer.equals(outerMV) && existing.inner.equals(innerMV))
                                ) {
                                this.bindingConstraints.push({ inner: innerMV, outer: outerMV });
                            }
                        });
                    } 
                })
            )
        );
    }
}

/**
 * Applies a singe instantiation (substitution) to a single pattern.
 * Used by instantiate to handle the list case.
 * @param {Constraint} substitution - a single substitution
 * @param {OM} pattern - a single pattern
 * @returns a copy of the pattern with any substitutions
 */
function applyInstantiation(substitution, pattern) {
    var result = pattern.copy();
    replaceWithoutCapture(result, substitution.pattern, substitution.expression);
    result.descendantsSatisfying(canApplyGeneralExpressionFunctionApplication).forEach(x =>
        x.replaceWith(applyGeneralExpressionFunctionApplication(x))
    );
    return result;
}

/**
 * Takes two ConstraintList objects, one representing a list of substitutions, 
 * the other containing the patterns that the substiutions will be applied to.
 * Each substitution is applied to the pattern satisfying the conditions described 
 * in the summary paper (section 3).
 * @param {ConstraintList} substitutions - a non empty constraint list satisfying isFunction()
 * @param {ConstraintList} patterns - a non empty constraint list
 */
function instantiate(substitutions, patterns) {
    for (let i = 0; i < substitutions.length; i++) {
        var substitution = substitutions.contents[i];
        for (let j = 0; j < patterns.length; j++) {
            var pattern = patterns.contents[j].pattern;
            patterns.contents[j].pattern = applyInstantiation(substitution, pattern);
            // Re-evaluate case
            patterns.contents[j].reEvalCase();
        }
    }
}

/**
 * Takes a constraint which should match the case where
 * the the pattern and expression are ordinary functions
 * and their 'heads' are equal
 * @param {Constraint} constraint - constraint with CASE_SIMPLIFICATION
 * @returns {Constraint[]} a list of constraints (but not a constraint list) which is the
 * result of 'zipping' the arguments of each function
 */
function breakIntoArgPairs(constraint) {
    var arg_pairs = [];
    if (constraint.pattern.type == 'a' && constraint.expression.type == 'a') {
        let pattern_children = constraint.pattern.children;
        let expression_children = constraint.expression.children;
        // In getting the case, we checked that the length of children was the same
        for (let i = 0; i < pattern_children.length; i++) {
            arg_pairs.push(
                new Constraint(
                    pattern_children[i].copy(), 
                    expression_children[i].copy()
                )
            );
        }
    } else if (constraint.pattern.type == 'bi' && constraint.expression.type == 'bi') {
        let pattern_vars = constraint.pattern.variables;
        let expression_vars = constraint.expression.variables;
        let pattern_body = constraint.pattern.body;
        let expression_body = constraint.expression.body;
        // In getting the case, we checked that the length of variables was the same
        for (let i = 0; i < pattern_vars.length; i++) {
            arg_pairs.push(
                new Constraint(
                    pattern_vars[i].copy(),
                    expression_vars[i].copy()
                )
            );
        }
        // Also push the body of each binding to arg pairs
        arg_pairs.push(
            new Constraint(
                pattern_body.copy(),
                expression_body.copy()
            )
        );
    }
    return arg_pairs;
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
    if (new_variable instanceof OM && expression instanceof OM) {
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
    if (variables.every((v) => v instanceof OM) && point instanceof OM) {
        if (!(variables.map((v) => v.name).includes(point.name))) {
            throw "When making a projection function, the point must occur in the list of variables"
        }
        return makeGeneralExpressionFunction(
            variables.map((v) => v.copy()),
            point.copy()
        );
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
        let args = [];
        for (let i = 0; i < temp_metavars.length; i++) {
            let temp_metavar = temp_metavars[i];
            args.push(
                makeGeneralExpressionFunctionApplication(
                    temp_metavar,
                    bound_vars
                )
            );
        }
        if (type == 'a') {
            return OM.app(...args);
        } else if (type == 'bi') {
            return OM.bin(head, ...binding_variables, ...args);
        }
    }

    var imitationExpr = null;

    if (variables.every((v) => v instanceof OM) && expr instanceof OM) {
        let type = expr.type;
        imitationExpr = makeGeneralExpressionFunction(
            variables,
            createBody(
                (type=='a' ? expr.children[0]: expr.symbol), 
                variables, 
                temp_metavars, 
                type,
                (type=='bi' ? expr.variables : null)
            )
        );
    }

    return imitationExpr;
}

// FIXME: DELETE LATER
// function DEBUG_PRINT_CONTRAINT(c) {
//     console.log(
//         '( ' + c.pattern.simpleEncode() + ', ' + c.expression.simpleEncode() + ' ):' + c.case
//     );
// }
// function DEBUG_PRINT_CONTRAINTLIST(cl) {
//     console.log(
//         '{ ' + 
//             cl.contents.map((c) =>
//                 '( ' + c.pattern.simpleEncode() + ', ' + c.expression.simpleEncode() + ' ):' + c.case
//             ).join(', ') 
//         + ' }'
//     )
// }

/**
 * Represents a matching challenge. 
 * A matching challenge is defined by two sets of constraints.
 * The first set is the challenge to be solved, 
 * the second set contains the solutions found when solving the challenge.
 * Both sets may be empty upon construction of a matching challenge,
 * and the solution set may remain empty if the challenge has no solutions.
 */
class MatchingChallenge {
    /**
     * Creates a new instance of MatchingChallenge by taking an arbitrary
     * number of arrays (including zero), creating constraints from them,
     * and then creating a constraints list out of them called challenge.
     * @param {...[OM, OM]} constraints - an arbitrary number of arguments each
     * of which is a length-2 array containing a pattern and an expression, 
     * i.e. containing two OM expressions.
     */
    constructor(...constraints) {
        this.challengeList = new ConstraintList();
        this.solutions = [ ];//new ConstraintList();
        this.solvable = undefined;

        for (let i = 0; i < constraints.length; i++) {
            let constraint = constraints[i];
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
    addConstraint(pattern, expr) {
        let constraint = new Constraint(pattern, expr);
        if (this.solutions.length > 0) {
            let temp_constraint_list = new ConstraintList(constraint);
            instantiate(temp_constraint_list, this.challengeList);
            constraint = temp_constraint_list.contents[0];
            // We've altered the state of the challenge list so we no longer know if it's solvable
            this.solvable = undefined;
        }
        this.challengeList.add(constraint);
    }

    /**
     * Adds an arbitrary number of constraints to the challenge,
     * each supplies by a length-2 array containing a pattern and an expression.
     * @param  {...[OM, OM]} constraints 
     */
    addConstraints(...constraints) {
        for (let i = 0; i < constraints.length; i++) {
            let constraint = constraints[i];
            this.addConstraint(constraint[0], constraint[1]);
        }
    }

    /**
     * @returns a deep copy of the matching challenge, including solutions
     */
    clone() {
        var challengeList_copy = this.challengeList.copy();
        var solutions_copy = this.solutions.map(sol => sol.copy());
        var result = new MatchingChallenge();
        result.challengeList = challengeList_copy;
        result.solutions = solutions_copy;
        result.solvable = this.solvable;
        return result;
    }

    /**
     * Tests whether a currently-in-progress solution satisfies all 
     * the challenge's already-computed binding constraints.
     */
    satisfiesBindingConstraints() {
        return this.solutionSatisfiesBindingConstraints(this.solutions[0]);
    }

    solutionSatisfiesBindingConstraints(solution) {
        return (
            this.challengeList.bindingConstraints.every(binding_constraint => {
                const inner = solution.lookup(binding_constraint.inner);
                if (!inner) return true; // metavariable not instantiated yet; can't violate any constraints
                const outer = isMetavariable(binding_constraint.outer) ? solution.lookup(binding_constraint.outer) : binding_constraint.outer;
                if (!outer) return true; // metavariable not instantiated yet; can't violate any constraints
                return !inner.occursFree(outer);
            })
        );
    }


    /**
     * Adds a solution, and checks that it passes `satisfiesBindingConstraints`. 
     * If it does not, empties the solutions list and sets variables in order to end the search.
     * @param {Constraint} constriant - either a Constraint, or an OM (meta)variable
     */
    addSolutionAndCheckBindingConstraints(constriant) {
        instantiate(new ConstraintList(constriant), this.challengeList);
        this.solutions[0].add(constriant);
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
    isSolvable() {
        return this.getSolutions().length > 0;
    }

    /**
     * @returns `this.solutions.length` by calling `getSolutions`, 
     * hence it solves if `getSolutions` has not been called.
     */
    numSolutions() {
        return this.getSolutions().length;
    }

    /**
     * If the matching challenge is unsolved, this finds any solutions.
     * @returns `this.solutions`
     */
    getSolutions() {
        if (this.solvable === undefined) {
            this.solve();
        }
        return this.solutions;
    }

    /**
     * Called by `getSolutions` to solve matching challenge.
     * Main implementation of the overall algorithm described in the corresponding paper.
     */
    solveRecursive() {
        // If this is a top-level call, create a brand-new solution we will evolve with recursion.
        if (this.solutions.length == 0) {
            this.solutions.push( new ConstraintList() );
        }
        // Success case occurs when the challenge list is empty
        if (this.challengeList.length == 0) {
            this.solvable = true;
            return;
        }
        // Get the constraint with the 'best' case first
        var current_constraint = this.challengeList.getBestCase();
        // For whichever case the current constraint has, do action described in paper
        switch (current_constraint.case) {
            case CASE_FAILURE:
                this.solutions = [ ];
                this.solvable = false;
                break;
            case CASE_IDENTITY:
                this.challengeList.remove(current_constraint);
                this.solve();
                break;
            case CASE_BINDING:
                this.challengeList.remove(current_constraint);
                // Apply metavariable substitution to constraints
                if(!this.addSolutionAndCheckBindingConstraints(current_constraint)) break;
                this.solve();
                break;
            case CASE_SIMPLIFICATION:
                this.challengeList.remove(current_constraint);
                // Do any necessary alpha conversion before breaking into argument paits
                if (current_constraint.pattern.type == 'bi' && current_constraint.expression.type == 'bi') {
                    let pattern_vars = current_constraint.pattern.variables;
                    let expression_vars = current_constraint.expression.variables;
                    // Get case checks number of arguments
                    for (let i = 0; i < pattern_vars.length; i++) {
                        let variable = pattern_vars[i];
                        if (!isMetavariable(variable)) {
                            var new_var = this.challengeList.nextNewVariable();
                            current_constraint.expression = alphaConvert(
                                current_constraint.expression,
                                expression_vars[i],
                                new_var
                            );
                            current_constraint.pattern = alphaConvert(
                                current_constraint.pattern,
                                pattern_vars[i],
                                new_var
                            );
                        }
                    }
                }
                var arg_pairs = breakIntoArgPairs(current_constraint);
                this.challengeList.add(...arg_pairs);
                this.solve();
                break;
            case CASE_EFA:
                var expression = current_constraint.expression;
                // Subcase A, the function may be a constant function
                var solutions_A = [];
                if (expression.type != 'a' && expression.type != 'bi') {
                    let temp_mc_A = this.clone();
                    let const_sub = new Constraint(
                        current_constraint.pattern.children[1],
                        makeConstantExpression(temp_mc_A.challengeList.nextNewVariable(), current_constraint.expression)
                    );
                    if(!temp_mc_A.addSolutionAndCheckBindingConstraints(const_sub)) break;
                    solutions_A = temp_mc_A.getSolutions();
                }

                // Subcase B, the function may be a projection function
                var solutions_B = [];
                var head = current_constraint.pattern.children[1];
                for (let i = 2; i < current_constraint.pattern.children.length; i++) {
                    let temp_mc_B = this.clone();
                    let new_vars = current_constraint.pattern.children.slice(2).map(()=>temp_mc_B.challengeList.nextNewVariable());
                    let proj_sub = new Constraint(
                        head,
                        makeProjectionExpression(new_vars, new_vars[i - 2])
                    );
                    if (!temp_mc_B.addSolutionAndCheckBindingConstraints(proj_sub)) break;
                    solutions_B = solutions_B.concat( temp_mc_B.getSolutions() );
                }

                // Subcase C, the function may be more complex
                var solutions_C = [ ];
                if (expression.type == 'a' || expression.type == 'bi') {
                    let temp_mc_C = this.clone();

                    let new_vars = current_constraint.pattern.children.slice(2).map(()=>temp_mc_C.challengeList.nextNewVariable());

                    // Get the temporary metavariables
                    let temp_metavars = [];
                    if (expression.type == 'a') {
                        temp_metavars = expression.children.map(() => {
                            let new_var = temp_mc_C.challengeList.nextNewVariable();
                            setMetavariable(new_var);
                            return new_var;
                        });
                    } else {
                        let new_var = temp_mc_C.challengeList.nextNewVariable();
                        setMetavariable(new_var);
                        temp_metavars.push(new_var);
                    }

                    // Get the imitation expression
                    let imitation_expr = makeImitationExpression(new_vars, expression, temp_metavars);

                    let imitation_sub = new Constraint(
                            current_constraint.pattern.children[1],
                            imitation_expr
                    );
                    if(!temp_mc_C.addSolutionAndCheckBindingConstraints(imitation_sub)) break;
                    solutions_C = temp_mc_C.getSolutions();

                    // Remove any temporary metavariables from the solutions, after making substitutions
                    solutions_C.forEach( sol => {
                        for (let i = 0; i < temp_metavars.length; i++) {
                            let metavar = temp_metavars[i];
                            let metavar_sub = sol.firstSatisfying(c => c.pattern.equals(metavar));
                            if (metavar_sub != null) {
                                sol.remove(metavar_sub);
                                for (let i = 0; i < sol.length; i++) {
                                    let constraint = sol.contents[i];
                                    constraint.expression.replaceWith(
                                        applyInstantiation(metavar_sub, constraint.expression)
                                    );
                                    constraint.reEvalCase();
                                }
                            }
                        }
                    } );
                    
                    // After making temporary metavar substitutions, do a final check for satisfy binding constraints
                    solutions_C = solutions_C.filter(sol => this.solutionSatisfiesBindingConstraints(sol));
                }

                // After all subcases are handled, return and record results
                this.solutions = solutions_A.concat( solutions_B, solutions_C );
                this.solvable = this.solutions.length > 0;
                return;
        }
    }

    /**
     * A version of solve that uses more iteration than the fully recursive verision.
     * It is therefore slightly faster.
     */
    solve() {
        // If this is a top-level call, create a brand-new solution we will evolve with recursion.
        if (this.solutions.length == 0) {
            this.solutions.push(new ConstraintList());
        }
        while (this.challengeList.length != 0) {
            // Get the constraint with the 'best' case first
            var current_constraint = this.challengeList.getBestCase();

            switch (current_constraint.case) {
                case CASE_FAILURE:
                    this.solutions = [];
                    this.solvable = false;
                    return;
                case CASE_IDENTITY:
                    this.challengeList.remove(current_constraint);
                    break;
                case CASE_BINDING:
                    this.challengeList.remove(current_constraint);
                    // Apply metavariable substitution to constraints
                    if (!this.addSolutionAndCheckBindingConstraints(current_constraint)) return;
                    break;
                case CASE_SIMPLIFICATION:
                    this.challengeList.remove(current_constraint);
                    // Do any necessary alpha conversion before breaking into argument paits
                    if (current_constraint.pattern.type == 'bi' && current_constraint.expression.type == 'bi') {
                        let pattern_vars = current_constraint.pattern.variables;
                        let expression_vars = current_constraint.expression.variables;
                        // Get case checks number of arguments
                        for (let i = 0; i < pattern_vars.length; i++) {
                            let variable = pattern_vars[i];
                            if (!isMetavariable(variable)) {
                                var new_var = this.challengeList.nextNewVariable();
                                current_constraint.expression = alphaConvert(
                                    current_constraint.expression,
                                    expression_vars[i],
                                    new_var
                                );
                                current_constraint.pattern = alphaConvert(
                                    current_constraint.pattern,
                                    pattern_vars[i],
                                    new_var
                                );
                            }
                        }
                    }
                    var arg_pairs = breakIntoArgPairs(current_constraint);
                    this.challengeList.add(...arg_pairs);
                    break;
                case CASE_EFA:
                    var expression = current_constraint.expression;
                    // Subcase A, the function may be a constant function
                    var solutions_A = [];
                    if (expression.type != 'a' && expression.type != 'bi') {
                        let temp_mc_A = this.clone();
                        let const_sub = new Constraint(
                            current_constraint.pattern.children[1],
                            makeConstantExpression(temp_mc_A.challengeList.nextNewVariable(), current_constraint.expression)
                        );
                        if (!temp_mc_A.addSolutionAndCheckBindingConstraints(const_sub)) return;
                        solutions_A = temp_mc_A.getSolutions();
                    }

                    // Subcase B, the function may be a projection function
                    var solutions_B = [];
                    var head = current_constraint.pattern.children[1];
                    for (let i = 2; i < current_constraint.pattern.children.length; i++) {
                        let temp_mc_B = this.clone();
                        let new_vars = current_constraint.pattern.children.slice(2).map(() => temp_mc_B.challengeList.nextNewVariable());
                        let proj_sub = new Constraint(
                            head,
                            makeProjectionExpression(new_vars, new_vars[i - 2])
                        );
                        if (!temp_mc_B.addSolutionAndCheckBindingConstraints(proj_sub)) return;
                        solutions_B = solutions_B.concat(temp_mc_B.getSolutions());
                    }

                    // Subcase C, the function may be more complex
                    var solutions_C = [];
                    if (expression.type == 'a' || expression.type == 'bi') {
                        let temp_mc_C = this.clone();

                        let new_vars = current_constraint.pattern.children.slice(2).map(() => temp_mc_C.challengeList.nextNewVariable());

                        // Get the temporary metavariables
                        let temp_metavars = [];
                        if (expression.type == 'a') {
                            temp_metavars = expression.children.map(() => {
                                let new_var = temp_mc_C.challengeList.nextNewVariable();
                                setMetavariable(new_var);
                                return new_var;
                            });
                        } else {
                            let new_var = temp_mc_C.challengeList.nextNewVariable();
                            setMetavariable(new_var);
                            temp_metavars.push(new_var);
                        }

                        // Get the imitation expression
                        let imitation_expr = makeImitationExpression(new_vars, expression, temp_metavars);

                        let imitation_sub = new Constraint(
                            current_constraint.pattern.children[1],
                            imitation_expr
                        );
                        if (!temp_mc_C.addSolutionAndCheckBindingConstraints(imitation_sub)) return;
                        solutions_C = temp_mc_C.getSolutions();

                        // Remove any temporary metavariables from the solutions, after making substitutions
                        solutions_C.forEach(sol => {
                            for (let i = 0; i < temp_metavars.length; i++) {
                                let metavar = temp_metavars[i];
                                let metavar_sub = sol.firstSatisfying(c => c.pattern.equals(metavar));
                                if (metavar_sub != null) {
                                    sol.remove(metavar_sub);
                                    for (let i = 0; i < sol.length; i++) {
                                        let constraint = sol.contents[i];
                                        constraint.expression.replaceWith(
                                            applyInstantiation(metavar_sub, constraint.expression)
                                        );
                                        constraint.reEvalCase();
                                    }
                                }
                            }
                        });

                        // After making temporary metavar substitutions, do a final check for satisfy binding constraints
                        solutions_C = solutions_C.filter(sol => this.solutionSatisfiesBindingConstraints(sol));
                    }

                    // After all subcases are handled, return and record results
                    this.solutions = solutions_A.concat(solutions_B, solutions_C);
                    this.solvable = this.solutions.length > 0;
                    return;
            }
        }
        // Success case occurs when the challenge list is empty
        this.solvable = true;
        return;
    }

    /**
     * A generator function version of solve
     */
    solveGenerator() {
        var mc = this;
        return (function* solveIterator() {
            // If this is a top-level call, create a brand-new solution we will evolve with recursion.
            if (mc.solutions.length == 0) {
                mc.solutions.push(new ConstraintList());
            }
            while (mc.challengeList.length != 0) {
                // Get the constraint with the 'best' case first
                var current_constraint = mc.challengeList.getBestCase();

                switch (current_constraint.case) {
                    case CASE_FAILURE:
                        mc.solutions = [];
                        mc.solvable = false;
                        return;
                    case CASE_IDENTITY:
                        mc.challengeList.remove(current_constraint);
                        break;
                    case CASE_BINDING:
                        mc.challengeList.remove(current_constraint);
                        // Apply metavariable substitution to constraints
                        if (!mc.addSolutionAndCheckBindingConstraints(current_constraint)) return;
                        break;
                    case CASE_SIMPLIFICATION:
                        mc.challengeList.remove(current_constraint);
                        // Do any necessary alpha conversion before breaking into argument paits
                        if (current_constraint.pattern.type == 'bi' && current_constraint.expression.type == 'bi') {
                            let pattern_vars = current_constraint.pattern.variables;
                            let expression_vars = current_constraint.expression.variables;
                            // Get case checks number of arguments
                            for (let i = 0; i < pattern_vars.length; i++) {
                                let variable = pattern_vars[i];
                                if (!isMetavariable(variable)) {
                                    var new_var = mc.challengeList.nextNewVariable();
                                    current_constraint.expression = alphaConvert(
                                        current_constraint.expression,
                                        expression_vars[i],
                                        new_var
                                    );
                                    current_constraint.pattern = alphaConvert(
                                        current_constraint.pattern,
                                        pattern_vars[i],
                                        new_var
                                    );
                                }
                            }
                        }
                        var arg_pairs = breakIntoArgPairs(current_constraint);
                        mc.challengeList.add(...arg_pairs);
                        break;
                    case CASE_EFA:
                        var expression = current_constraint.expression;
                        // Subcase A, the function may be a constant function
                        var solutions_A = [];
                        if (expression.type != 'a' && expression.type != 'bi') {
                            let temp_mc_A = mc.clone();
                            let const_sub = new Constraint(
                                current_constraint.pattern.children[1],
                                makeConstantExpression(temp_mc_A.challengeList.nextNewVariable(), current_constraint.expression)
                            );
                            if (!temp_mc_A.addSolutionAndCheckBindingConstraints(const_sub)) return;
                            // solutions_A = temp_mc_A.getSolutions();
                            yield* temp_mc_A.solveGenerator();
                        }

                        // Subcase B, the function may be a projection function
                        var solutions_B = [];
                        var head = current_constraint.pattern.children[1];
                        for (let i = 2; i < current_constraint.pattern.children.length; i++) {
                            let temp_mc_B = mc.clone();
                            let new_vars = current_constraint.pattern.children.slice(2).map(() => temp_mc_B.challengeList.nextNewVariable());
                            let proj_sub = new Constraint(
                                head,
                                makeProjectionExpression(new_vars, new_vars[i - 2])
                            );
                            if (!temp_mc_B.addSolutionAndCheckBindingConstraints(proj_sub)) return;
                            // solutions_B = solutions_B.concat(temp_mc_B.getSolutions());
                            yield* temp_mc_B.solveGenerator();
                        }

                        // Subcase C, the function may be more complex
                        var solutions_C = [];
                        if (expression.type == 'a' || expression.type == 'bi') {
                            let temp_mc_C = mc.clone();

                            let new_vars = current_constraint.pattern.children.slice(2).map(() => temp_mc_C.challengeList.nextNewVariable());

                            // Get the temporary metavariables
                            let temp_metavars = [];
                            if (expression.type == 'a') {
                                temp_metavars = expression.children.map(() => {
                                    let new_var = temp_mc_C.challengeList.nextNewVariable();
                                    setMetavariable(new_var);
                                    return new_var;
                                });
                            } else {
                                let new_var = temp_mc_C.challengeList.nextNewVariable();
                                setMetavariable(new_var);
                                temp_metavars.push(new_var);
                            }

                            // Get the imitation expression
                            let imitation_expr = makeImitationExpression(new_vars, expression, temp_metavars);

                            let imitation_sub = new Constraint(
                                current_constraint.pattern.children[1],
                                imitation_expr
                            );
                            if (!temp_mc_C.addSolutionAndCheckBindingConstraints(imitation_sub)) return;
                            solutions_C = temp_mc_C.getSolutions();

                            // Remove any temporary metavariables from the solutions, after making substitutions
                            solutions_C.forEach(sol => {
                                for (let i = 0; i < temp_metavars.length; i++) {
                                    let metavar = temp_metavars[i];
                                    let metavar_sub = sol.firstSatisfying(c => c.pattern.equals(metavar));
                                    if (metavar_sub != null) {
                                        sol.remove(metavar_sub);
                                        for (let i = 0; i < sol.length; i++) {
                                            let constraint = sol.contents[i];
                                            constraint.expression.replaceWith(
                                                applyInstantiation(metavar_sub, constraint.expression)
                                            );
                                            constraint.reEvalCase();
                                        }
                                    }
                                }
                            });

                            // After making temporary metavar substitutions, do a final check for satisfy binding constraints
                            solutions_C = solutions_C.filter(sol => mc.solutionSatisfiesBindingConstraints(sol));
                        }

                        // After all subcases are handled, return and record results
                        mc.solutions = solutions_A.concat(solutions_B, solutions_C);
                        mc.solvable = mc.solutions.length > 0;
                        for (let i = 0; i < mc.solutions.length; i++) {
                            let sol = mc.solutions[i];
                            yield sol;
                        }
                        return;
                }
            }
            // Success case occurs when the challenge list is empty
            mc.solvable = true;
            for (let i = 0; i < mc.solutions.length; i++) {
                let sol = mc.solutions[i];
                yield sol;
            }
            return;
        })();
    }
}

module.exports = {
    OM,
    setMetavariable, 
    clearMetavariable,
    isMetavariable,

    makeGeneralExpressionFunction,
    isGeneralExpressionFunction,
    makeGeneralExpressionFunctionApplication,
    isGeneralExpressionFunctionApplication,
    canApplyGeneralExpressionFunctionApplication,
    applyGeneralExpressionFunctionApplication,

    getNewVariableRelativeTo,
    alphaConvert,
    replaceWithoutCapture,
    alphaEquivalent,
    betaReduce,

    CASES,
    Constraint,
    ConstraintList,

    applyInstantiation,
    instantiate,

    breakIntoArgPairs,

    makeConstantExpression,
    makeProjectionExpression,
    makeImitationExpression,

    MatchingChallenge,
};