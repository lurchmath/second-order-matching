
"use strict"

// Import everything from the constraints module and expose it as well.
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
    makeConstantExpression, makeProjectionExpression, makeImitationExpression,
    CASES, Constraint, ConstraintList
} from './constraints';
export {
    OM, isMetavariable, setMetavariable, clearMetavariable,
    isGeneralExpressionFunction, makeGeneralExpressionFunction,
    isGeneralExpressionFunctionApplication,
    makeGeneralExpressionFunctionApplication,
    canApplyGeneralExpressionFunctionApplication,
    applyGeneralExpressionFunctionApplication,
    getNewVariableRelativeTo, replaceWithoutCapture,
    alphaConvert, alphaEquivalent, betaReduce,
    makeConstantExpression, makeProjectionExpression, makeImitationExpression,
    CASES, Constraint, ConstraintList
};

// Used only for debugging.  Commented out for production.
//
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
     * Tests whether the first currently-in-progress solution satisfies all
     * the challenge's already-computed binding constraints.
     */
    satisfiesBindingConstraints() {
        return this.solutionSatisfiesBindingConstraints(this.solutions[0]);
    }

    /**
     * Tests whether a solution satisfies all
     * the challenge's already-computed binding constraints.
     */
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
            case CASES.FAILURE:
                this.solutions = [ ];
                this.solvable = false;
                break;
            case CASES.IDENTITY:
                this.challengeList.remove(current_constraint);
                this.solve();
                break;
            case CASES.BINDING:
                this.challengeList.remove(current_constraint);
                // Apply metavariable substitution to constraints
                if(!this.addSolutionAndCheckBindingConstraints(current_constraint)) break;
                this.solve();
                break;
            case CASES.SIMPLIFICATION:
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
            case CASES.EFA:
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
                case CASES.FAILURE:
                    this.solutions = [];
                    this.solvable = false;
                    return;
                case CASES.IDENTITY:
                    this.challengeList.remove(current_constraint);
                    break;
                case CASES.BINDING:
                    this.challengeList.remove(current_constraint);
                    // Apply metavariable substitution to constraints
                    if (!this.addSolutionAndCheckBindingConstraints(current_constraint)) return;
                    break;
                case CASES.SIMPLIFICATION:
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
                case CASES.EFA:
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
                    case CASES.FAILURE:
                        mc.solutions = [];
                        mc.solvable = false;
                        return;
                    case CASES.IDENTITY:
                        mc.challengeList.remove(current_constraint);
                        break;
                    case CASES.BINDING:
                        mc.challengeList.remove(current_constraint);
                        // Apply metavariable substitution to constraints
                        if (!mc.addSolutionAndCheckBindingConstraints(current_constraint)) return;
                        break;
                    case CASES.SIMPLIFICATION:
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
                    case CASES.EFA:
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
