
/**
 * This module defines the two classes for working with constraints:
 * Constraint and ConstraintList.
 */

"use strict"

// Import everything from the language module and expose it as well.
import {
    OM, Exprs,
    isGeneralExpressionFunction, makeGeneralExpressionFunction,
    isGeneralExpressionFunctionApplication,
    makeGeneralExpressionFunctionApplication,
    canApplyGeneralExpressionFunctionApplication,
    applyGeneralExpressionFunctionApplication,
    getNewVariableRelativeTo, replaceWithoutCapture,
    alphaConvert, alphaEquivalent, betaReduce,
    checkVariable,
    makeConstantExpression, makeProjectionExpression, makeImitationExpression
} from './language.js';
export {
    OM, Exprs,
    isGeneralExpressionFunction, makeGeneralExpressionFunction,
    isGeneralExpressionFunctionApplication,
    makeGeneralExpressionFunctionApplication,
    canApplyGeneralExpressionFunctionApplication,
    applyGeneralExpressionFunctionApplication,
    getNewVariableRelativeTo, replaceWithoutCapture,
    alphaConvert, alphaEquivalent, betaReduce,
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
 * EFA represents the case in which the pattern is gEFA,
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
     * @param {OM} pattern - an OM expression which should contain a metavariable (but may not)
     * @param {OM} expression - an OM expression which must not contain a metavariable
     */
    constructor(pattern, expression) {
        if (!(pattern instanceof OM) || !(expression instanceof OM)) {
            throw Error( 'Both arguments must be instances of OMNode' );
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
        return Exprs.isMetavariable(this.pattern);
    }

    /**
     * Returns the case, as described in the corresponding paper
     * (and briefly in the case constant declarations)
     * @param {OM} pattern
     * @param {OM} expression
     */
    getCase(pattern, expression) {
        if (pattern.equals(expression)) {
            return CASES.IDENTITY;
        } else if (Exprs.isMetavariable(pattern)) {
            return CASES.BINDING;
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
            return CASES.SIMPLIFICATION;
        } else if (isGeneralExpressionFunctionApplication(pattern)
            || Exprs.isMetavariable(pattern.children[1])
            ) {
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
        var result = target.copy();
        replaceWithoutCapture(result, this.pattern, this.expression);
        result.descendantsSatisfying(canApplyGeneralExpressionFunctionApplication).forEach(x =>
            x.replaceWith(applyGeneralExpressionFunctionApplication(x))
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
        if (this.pattern.type == 'a' && this.expression.type == 'a') {
            let pattern_children = this.pattern.children;
            let expression_children = this.expression.children;
            // In getting the case, we checked that the length of children was the same
            for (let i = 0; i < pattern_children.length; i++) {
                arg_pairs.push(
                    new Constraint(
                        pattern_children[i].copy(),
                        expression_children[i].copy()
                    )
                );
            }
        } else if (this.pattern.type == 'bi' && this.expression.type == 'bi') {
            let pattern_vars = this.pattern.variables;
            let expression_vars = this.expression.variables;
            let pattern_body = this.pattern.body;
            let expression_body = this.expression.body;
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
                var p_vars = Exprs.getVariablesIn(constraint.pattern);
                for (let j = 0; j < p_vars.length; j++) {
                    this.nextNewVariableIndex = checkVariable(p_vars[j], this.nextNewVariableIndex);
                }
                var e_vars = Exprs.getVariablesIn(constraint.expression);
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
            Exprs.setMetavariable(variable);
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
                binding.descendantsSatisfying(Exprs.isMetavariable).forEach(innerMV => {
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
