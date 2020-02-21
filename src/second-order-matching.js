
"use strict"

// Import everything from the metavariables module and expose it as well.
import {
    OM, isMetavariable, setMetavariable, clearMetavariable,
    isGeneralExpressionFunction, makeGeneralExpressionFunction,
    isGeneralExpressionFunctionApplication,
    makeGeneralExpressionFunctionApplication,
    canApplyGeneralExpressionFunctionApplication,
    applyGeneralExpressionFunctionApplication,
    getNewVariableRelativeTo, replaceWithoutCapture,
    alphaConvert, alphaEquivalent, betaReduce,
    checkVariable, getVariablesIn,
    makeConstantExpression, makeProjectionExpression, makeImitationExpression
} from './language';
export {
    OM, isMetavariable, setMetavariable, clearMetavariable,
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
export const CASES = {
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
export class Constraint {
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
     * (CASE_SIMPLIFICATION).  Calling it on other types of constraints gives
     * undefined behavior.
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

// FIXME: DELETE LATER
// function DEBUG_PRINT_CONSTRAINT(c) {
//     console.log(
//         '( ' + c.pattern.simpleEncode() + ', ' + c.expression.simpleEncode() + ' ):' + c.case
//     );
// }
// function DEBUG_PRINT_CONSTRAINTLIST(cl) {
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
export class MatchingChallenge {
    /**
     * Creates a new instance of MatchingChallenge by taking an arbitrary
     * number of arrays (including zero), creating constraints from them,
     * and then creating a constraints list out of them called challenge.
     * @param {Array} constraints - an arbitrary number of arguments each
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
            temp_constraint_list.instantiate(this.challengeList);
            constraint = temp_constraint_list.contents[0];
            // We've altered the state of the challenge list so we no longer know if it's solvable
            this.solvable = undefined;
        }
        this.challengeList.add(constraint);
    }

    /**
     * Adds an arbitrary number of constraints to the challenge,
     * each supplies by a length-2 array containing a pattern and an expression.
     * @param {Array} constraints
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
     * @param {Constraint} constraint - either a Constraint, or an OM (meta)variable
     */
    addSolutionAndCheckBindingConstraints(constraint) {
        new ConstraintList(constraint).instantiate(this.challengeList);
        this.solutions[0].add(constraint);
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
                this.challengeList.add(...current_constraint.breakIntoArgPairs());
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
                                        metavar_sub.applyInstantiation(constraint.expression)
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
                    this.challengeList.add(...current_constraint.breakIntoArgPairs());
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
                                            metavar_sub.applyInstantiation(constraint.expression)
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
                        mc.challengeList.add(...current_constraint.breakIntoArgPairs());
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
                                                metavar_sub.applyInstantiation(constraint.expression)
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
