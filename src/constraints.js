
/**
 * This module defines the two classes for working with constraints:
 * Constraint and ConstraintList.
 */

"use strict"

// Import everything from the language module and expose it as well.
import {
    isExpressionFunction, makeExpressionFunction,
    isExpressionFunctionApplication, makeExpressionFunctionApplication,
    canApplyExpressionFunctionApplication, getVariablesIn, occursFree, isFree,
    applyExpressionFunctionApplication, getNewVariableRelativeTo,
    replaceWithoutCapture, alphaConvert, alphaEquivalent, betaReduce,
    checkVariable, makeConstantExpression, makeProjectionExpression,
    makeImitationExpression, setAPI, getAPI
} from './language.js';
export {
    setAPI, getAPI, isExpressionFunction, makeExpressionFunction,
    isExpressionFunctionApplication, makeExpressionFunctionApplication,
    canApplyExpressionFunctionApplication, getVariablesIn, occursFree, isFree,
    applyExpressionFunctionApplication, getNewVariableRelativeTo,
    replaceWithoutCapture, alphaConvert, alphaEquivalent, betaReduce,
    makeConstantExpression, makeProjectionExpression, makeImitationExpression
};

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
 * or a function with a metavariable as its 'head', and `SIMPLIFICATION`
 * does not hold
 *
 * FAILURE represents the case of failure, when no other cases apply
 */
export const CASES = {
    IDENTITY: 1,
    BINDING: 2,
    SIMPLIFICATION: 3,
    EFA: 4,
    FAILURE: 5
}
Object.freeze(CASES);

/**
 * Represents a pattern-expression pair.
 */
export class Constraint {
    /**
     * Creates a new constraint with given pattern and expression.
     * @param {OM} pattern - an expression which should contain a metavariable (but may not)
     * @param {OM} expression - an expression which must not contain a metavariable
     */
    constructor(pattern, expression) {
        if (!getAPI().isExpression(pattern) || !getAPI().isExpression(expression)) {
            throw Error( 'Both arguments must be expressions' );
        }
        this.pattern = pattern;
        this.expression = expression;
        this.case = this.getCase(pattern, expression);
    }

    /**
     * @returns a deep copy
     */
    copy() {
        return new Constraint(getAPI().copy(this.pattern),
                              getAPI().copy(this.expression));
    }

    /**
     * @param {Constraint} other - another Constraint
     * @returns `true` if patterns and expressions are structurally equal
     * OR alpha equivalent, `false` otherwise.
     */
    equals(other) {
        return (
            (
                getAPI().equal(this.pattern,other.pattern)
             || alphaEquivalent(this.pattern,other.pattern)
            ) && (
                getAPI().equal(this.expression,other.expression)
             || alphaEquivalent(this.expression,other.expression)
            )
        );
    }

    /**
     * @returns true if the pattern is a metavariable, false otherwise.
     */
    isSubstitution() {
        return getAPI().isMetavariable(this.pattern);
    }

    /**
     * Returns the case, as described in the corresponding paper
     * (and briefly in the case constant declarations)
     * @param {OM} pattern
     * @param {OM} expression
     */
    getCase(pattern, expression) {
        if (getAPI().equal(pattern,expression)) {
            return CASES.IDENTITY;
        } else if (getAPI().isMetavariable(pattern)) {
            return CASES.BINDING;
        } else if (
                (
                    (
                        (
                            getAPI().isApplication(pattern)
                            && !(isExpressionFunctionApplication(pattern))
                        )
                        && getAPI().isApplication(expression)
                    )
                    && getAPI().getChildren(pattern).length == getAPI().getChildren(expression).length
                )
                ||
                (
                    ( getAPI().isBinding(pattern) && getAPI().isBinding(expression) )
                    && getAPI().equal(pattern.symbol,expression.symbol)
                    && getAPI().bindingVariables(pattern).length == getAPI().bindingVariables(expression).length
                )
            ) {
            return CASES.SIMPLIFICATION;
        } else if (isExpressionFunctionApplication(pattern)
                || getAPI().isMetavariable(getAPI().getChildren(pattern)[1])) {
            return CASES.EFA;
        } else {
            return CASES.FAILURE;
        }
    }

    /**
     * Calls `getCase` again, in case pattern or expression have changes
     */
    reEvalCase() {
        this.case = this.getCase(this.pattern, this.expression);
    }

    /**
     * Applies this constraint, like a substitution, to a single pattern.
     * Used by instantiate() in ConstraintList.
     * @param {OM} pattern - a single pattern
     * @returns a copy of the pattern with any substitutions
     */
    applyInstantiation(target) {
        var result = getAPI().copy(target);
        replaceWithoutCapture(result, this.pattern, this.expression);
        getAPI().filterSubexpressions(result,canApplyExpressionFunctionApplication).forEach(x =>
            getAPI().replace(x,applyExpressionFunctionApplication(x))
        );
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
    breakIntoArgPairs() {
        var arg_pairs = [];
        if (getAPI().isApplication(this.pattern) && getAPI().isApplication(this.expression)) {
            let pattern_children = getAPI().getChildren(this.pattern);
            let expression_children = getAPI().getChildren(this.expression);
            // In getting the case, we checked that the length of children was the same
            for (let i = 0; i < pattern_children.length; i++) {
                arg_pairs.push(
                    new Constraint(
                        getAPI().copy(pattern_children[i]),
                        getAPI().copy(expression_children[i])
                    )
                );
            }
        } else if (getAPI().isBinding(this.pattern) && getAPI().isBinding(this.expression)) {
            let pattern_vars = getAPI().bindingVariables(this.pattern);
            let expression_vars = getAPI().bindingVariables(this.expression);
            let pattern_body = getAPI().bindingBody(this.pattern);
            let expression_body = getAPI().bindingBody(this.expression);
            // In getting the case, we checked that the length of variables was the same
            for (let i = 0; i < pattern_vars.length; i++) {
                arg_pairs.push(
                    new Constraint(
                        getAPI().copy(pattern_vars[i]),
                        getAPI().copy(expression_vars[i])
                    )
                );
            }
            // Also push the body of each binding to arg pairs
            arg_pairs.push(
                new Constraint(
                    getAPI().copy(pattern_body),
                    getAPI().copy(expression_body)
                )
            );
        }
        return arg_pairs;
    }

}

/**
 * Represents a list of constraints.
 * However, most of the behaviour of this class mimics a set,
 * except for a few cases in which we use indices.
 */
export class ConstraintList {
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
        return getAPI().variable('v' + this.nextNewVariableIndex++);
    }

    /**
     * @returns a deep copy of the list.
     */
    copy() {
        var contents_copy = this.contents.map(c=>c.copy());
        var result = new ConstraintList(...contents_copy);
        result.bindingConstraints = this.bindingConstraints.map(bc => {
            return { inner: getAPI().copy(bc.inner),
                     outer: getAPI().copy(bc.outer) };
        } )
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
            var index = this.indexAtWhich((c) => c.equals(constraint));
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
        if ((constraint = this.firstSatisfying(c => c.case == CASES.FAILURE)) != null) {
            return constraint;
        } else if ((constraint = this.firstSatisfying(c => c.case == CASES.IDENTITY)) != null) {
            return constraint;
        } else if ((constraint = this.firstSatisfying(c => c.case == CASES.BINDING)) != null) {
            return constraint;
        } else if ((constraint = this.firstSatisfying(c => c.case == CASES.SIMPLIFICATION)) != null) {
            return constraint;
        } else if ((constraint = this.firstSatisfying(c => c.case == CASES.EFA)) != null) {
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
            if (seen_so_far.includes(getAPI().getVariableName(constraint.pattern))) {
                return false;
            }
            seen_so_far.push(getAPI().getVariableName(constraint.pattern));
        }
        return true;
    }

    /**
     * If the constraint list is a function, this routine returns the expression associated with a given metavariable.
     * @param variable - a string or expression
     * @returns the expression of the constraint with the pattern that equals
     *   the variable, null otherwise.
     */
    lookup(variable) {
        if (!getAPI().isExpression(variable)) {
            variable = getAPI().variable(variable);
            getAPI().setMetavariable(variable);
        }
        for (let i = 0; i < this.contents.length; i++) {
            var constraint = this.contents[i];
            if (getAPI().equal(constraint.pattern,variable)) {
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
            if (!other.firstSatisfying((c) => c.equals(constraint))) {
                return false;
            }
        }
        for (let i = 0; i < other.contents.length; i++) {
            let constraint = other.contents[i];
            if (!this.firstSatisfying((c) => c.equals(constraint))) {
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
            getAPI().filterSubexpressions(constraint.pattern,getAPI().isBinding).forEach(binding =>
                getAPI().filterSubexpressions(binding,getAPI().isMetavariable).forEach(innerMV => {
                    if (getAPI().variableIsFree(innerMV,binding)) {
                        getAPI().bindingVariables(binding).forEach(outerMV => {
                            if (!this.bindingConstraints.find(existing =>
                                    getAPI().equal(existing.outer,outerMV)
                                 && getAPI().equal(existing.inner,innerMV))
                                ) {
                                this.bindingConstraints.push({ inner: innerMV, outer: outerMV });
                            }
                        });
                    }
                })
            )
        );
    }

    /**
     * Takes a ConstraintList object containing the patterns that the
     * substiutions in this object will be applied to.  Each substitution is
     * applied to the pattern satisfying the conditions described in the summary
     * paper (section 3).
     * @param {ConstraintList} patterns - a non empty constraint list
     */
    instantiate(patterns) {
        for (let i = 0; i < this.length; i++) {
            var substitution = this.contents[i];
            for (let j = 0; j < patterns.length; j++) {
                var pattern = patterns.contents[j].pattern;
                patterns.contents[j].pattern = substitution.applyInstantiation(pattern);
                // Re-evaluate case
                patterns.contents[j].reEvalCase();
            }
        }
    }
}
