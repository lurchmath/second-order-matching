
"use strict"

// Import everything from the constraints module and expose it as well.
import {
    OM, Exprs,
    isExpressionFunction, makeExpressionFunction,
    isExpressionFunctionApplication,
    makeExpressionFunctionApplication,
    canApplyExpressionFunctionApplication,
    applyExpressionFunctionApplication,
    getNewVariableRelativeTo, replaceWithoutCapture,
    alphaConvert, alphaEquivalent, betaReduce,
    makeConstantExpression, makeProjectionExpression, makeImitationExpression,
    CASES, Constraint, ConstraintList
} from './constraints.js';
export {
    OM, Exprs,
    isExpressionFunction, makeExpressionFunction,
    isExpressionFunctionApplication,
    makeExpressionFunctionApplication,
    canApplyExpressionFunctionApplication,
    applyExpressionFunctionApplication,
    getNewVariableRelativeTo, replaceWithoutCapture,
    alphaConvert, alphaEquivalent, betaReduce,
    makeConstantExpression, makeProjectionExpression, makeImitationExpression,
    CASES, Constraint, ConstraintList
};

// Used only for debugging.  Commented out for production.
//
// function DEBUG_CONSTRAINT(c) {
//     return '( ' + c.pattern.simpleEncode() + ', ' + c.expression.simpleEncode() + ' ):' + c.case;
// }
// function DEBUG_CONSTRAINTLIST(cl) {
//     return '{ ' +
//             cl.contents.map((c) =>
//                 '( ' + c.pattern.simpleEncode() + ', ' + c.expression.simpleEncode() + ' ):' + c.case
//             ).join(', ')
//         + ' }'
// }
// const DEBUG_ON = false//true
// const DEBUG = ( ...all ) => { if ( DEBUG_ON ) console.log( ...all ) }

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
        var result = new MatchingChallenge();
        result.challengeList = this.challengeList.copy();
        result.solutions = this.solutions === undefined ? undefined :
            this.solutions.map(sol => sol.copy());
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
                const outer = Exprs.isMetavariable(binding_constraint.outer) ? solution.lookup(binding_constraint.outer) : binding_constraint.outer;
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
        if ( this.solvable === undefined ) this.getOneSolution()
        return this.solvable
    }

    /**
     * Computes just one solution to this matching problem and returns it, or
     * returns undefined if there are none.  Uses the cache if possible.
     * @returns The first solution or `undefined`.
     *
     * State when this is done:
     * `this.solvable` will be true or false
     * but `this.solutions` will be undefined, to indicate we have not
     * computed all of them.
     */
    getOneSolution() {
        if ( this.solvable === false ) return undefined
        if ( this.solvable === true && this.solutions !== undefined
          && this.solutions.length > 0 )
            return this.solutions[0]
        // then, to ensure that later this class doesn't get confused and think
        // that we've computed all solutions just because we've computed
        // this.solvable, we set it to be undefined:
        this.solutions = undefined
        const first = this.solutionsIterator().next().value
        this.solvable = first !== undefined
        return first
    }

    /**
     * @returns `this.solutions.length` by calling `getSolutions`,
     * hence it solves if `getSolutions` has not been called.
     */
    numSolutions() {
        return this.getSolutions().length;
    }

    /**
     * If the matching challenge is unsolved, this finds all solutions,
     * then returns them.  It will guarantee that `this.solvable` is true/false
     * and that `this.solutions` is fully populated with all solutions.
     * @returns `this.solutions`
     */
    getSolutions() {
        if (this.solvable === undefined || this.solutions === undefined) {
            // try {
            let solutions = [ ];
            for ( let solution of this.solutionsIterator() )
                solutions.push( solution )
            this.solutions = solutions
            this.solvable = solutions.length > 0;
            // } catch ( e ) { DEBUG( 'ERROR! -->', e ) }
        }
        // DEBUG( `LOOKUP (${this.solutions.length} SOL):\n`,
        //     this.solutions.map( DEBUG_CONSTRAINTLIST ).join( '\n' ) )
        return this.solutions;
    }

    solutionsIterator(/*indent=''*/) {
        // const tab = '\t'
        let mc = this;
        // if needed, create a brand-new solution we will evolve with recursion
        if ( mc.solutions === undefined || mc.solutions.length == 0 )
            mc.solutions = [ new ConstraintList() ];
        function* recur () {
            // DEBUG( indent, DEBUG_CONSTRAINTLIST( mc.challengeList ),
            //     ' --> ', DEBUG_CONSTRAINTLIST( mc.solutions[0] ) )
            // Success case occurs when the challenge list is empty
            if (mc.challengeList.length == 0) {
                // DEBUG( indent+'SUCCESS' )
                yield mc.solutions[0]
                return
            }
            // Get the constraint with the 'best' case first
            var current_constraint = mc.challengeList.getBestCase();
            // For whichever case the current constraint has, do action described in paper
            switch (current_constraint.case) {
                case CASES.FAILURE:
                    // DEBUG( indent+'FAILURE' )
                    mc.solutions = [ ];
                    break;
                case CASES.IDENTITY:
                    // DEBUG( indent+'IDENTITY' )
                    mc.challengeList.remove(current_constraint);
                    yield* recur()
                    break;
                case CASES.BINDING:
                    // DEBUG( indent+'BINDING' )
                    mc.challengeList.remove(current_constraint);
                    // Apply metavariable substitution to constraints
                    if(!mc.addSolutionAndCheckBindingConstraints(current_constraint)) break;
                    yield* recur()
                    break;
                case CASES.SIMPLIFICATION:
                    // DEBUG( indent+'SIMPLIFICATION' )
                    mc.challengeList.remove(current_constraint);
                    // Do any necessary alpha conversion before breaking into argument paits
                    if (current_constraint.pattern.type == 'bi' && current_constraint.expression.type == 'bi') {
                        let pattern_vars = current_constraint.pattern.variables;
                        let expression_vars = current_constraint.expression.variables;
                        // Get case checks number of arguments
                        for (let i = 0; i < pattern_vars.length; i++) {
                            let variable = pattern_vars[i];
                            if (!Exprs.isMetavariable(variable)) {
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
                    yield* recur()
                    break;
                case CASES.EFA:
                    // DEBUG( indent+'EFA' )
                    var expression = current_constraint.expression;
                    // Subcase A, the function may be a constant function
                    // DEBUG( indent+'EFA-1: constant function' )
                    let temp_mc_A = mc.clone();
                    let const_sub = new Constraint(
                        current_constraint.pattern.children[1],
                        makeConstantExpression(temp_mc_A.challengeList.nextNewVariable(), current_constraint.expression)
                    );
                    // DEBUG( indent+'maybe add:', DEBUG_CONSTRAINT( const_sub ) )
                    if (temp_mc_A.addSolutionAndCheckBindingConstraints(const_sub)) {
                        for ( let sol of temp_mc_A.solutionsIterator(/*indent+tab*/) ) {
                            // DEBUG( indent+'EFA-1 result:', DEBUG_CONSTRAINTLIST( sol ) )
                            yield sol
                        }
                    }

                    // Subcase B, the function may be a projection function
                    // DEBUG( indent+'EFA-2: projection function' )
                    var head = current_constraint.pattern.children[1];
                    for (let i = 2; i < current_constraint.pattern.children.length; i++) {
                        let temp_mc_B = mc.clone();
                        let new_vars = current_constraint.pattern.children.slice(2).map(()=>temp_mc_B.challengeList.nextNewVariable());
                        let proj_sub = new Constraint(
                            head,
                            makeProjectionExpression(new_vars, new_vars[i - 2])
                        );
                        // DEBUG( indent+'maybe add:', DEBUG_CONSTRAINT( proj_sub ) )
                        if (!temp_mc_B.addSolutionAndCheckBindingConstraints(proj_sub)) break;
                        for ( let sol of temp_mc_B.solutionsIterator(/*indent+tab*/) ) {
                            // DEBUG( indent+'EFA-2 result:', DEBUG_CONSTRAINTLIST( sol ) )
                            yield sol
                        }
                    }

                    // Subcase C, the function may be more complex
                    // DEBUG( indent+'EFA-3: imitation expression' )
                    if (expression.type == 'a' || expression.type == 'bi') {
                        let temp_mc_C = mc.clone();

                        let new_vars = current_constraint.pattern.children.slice(2).map(()=>temp_mc_C.challengeList.nextNewVariable());

                        // Get the temporary metavariables
                        let temp_metavars = [];
                        if (expression.type == 'a') {
                            temp_metavars = expression.children.map(() => {
                                let new_var = temp_mc_C.challengeList.nextNewVariable();
                                Exprs.setMetavariable(new_var);
                                return new_var;
                            });
                        } else {
                            let new_var = temp_mc_C.challengeList.nextNewVariable();
                            Exprs.setMetavariable(new_var);
                            temp_metavars.push(new_var);
                        }

                        // Get the imitation expression
                        let imitation_expr = makeImitationExpression(new_vars, expression, temp_metavars);

                        let imitation_sub = new Constraint(
                                current_constraint.pattern.children[1],
                                imitation_expr
                        );
                        // DEBUG( indent+'maybe add:', DEBUG_CONSTRAINT( imitation_expr ) )
                        if(!temp_mc_C.addSolutionAndCheckBindingConstraints(imitation_sub)) break;

                        // Remove any temporary metavariables from the solutions, after making substitutions
                        for ( let sol of temp_mc_C.solutionsIterator(/*indent+tab*/) ) {
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
                            if ( mc.solutionSatisfiesBindingConstraints( sol ) ) {
                                // DEBUG( indent+'EFA-3 result:', DEBUG_CONSTRAINTLIST( sol ) )
                                yield sol
                            } else {
                                // DEBUG( indent+'EFA-3 ailed-binding:', DEBUG_CONSTRAINTLIST( sol ) )
                            }
                        }
                    }
            }
        }
        function uniqueIterator ( nonUniqueIterator, comparator ) {
            const seenSoFar = [ ]
            function* result () {
                for ( const element of nonUniqueIterator ) {
                    if ( !seenSoFar.some( x => comparator( x, element ) ) ) {
                        seenSoFar.push( element )
                        yield element
                    }
                }
            }
            return result()
        }
        return uniqueIterator( recur(), ( sol1, sol2 ) => sol1.equals( sol2 ) )
    }

}
