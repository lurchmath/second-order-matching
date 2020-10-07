
/*
 *  Functions useful to have around when running tests
 */

import * as M from '../index';
import { OM } from '../src/openmath.js';

/**
 * Takes strings for OM.simple, any variable begginning with an underscore
 * has the underscore removed and is flagged as a metavariable.
 * Supports symbols.
 * Supports the convention that `f_of_x` expands to `efa(quick('f'), quick('x'))`.
 * The 'f' and 'x' in the previous example could also be metavariables: `_f_of__x`.
 * @param string - the string for conversion
 */
export function quick(string) {
    var tree = OM.simple(string);
    if (typeof tree === 'string') {
        throw ('Error calling quick on ' + string + ' : ' + tree);
    }
    var variables = tree.descendantsSatisfying((x) => { return x.type == 'v'; });
    for (let i = 0; i < variables.length; i++) {
        var variable = variables[i];
        var match = /^(.+)_of_(.+)$/.exec(variable.name);
        if (match !== null) {
            variable.replaceWith(efa(quick(match[1]), quick(match[2])));
        } else if (/^_/.test(variable.name)) {
            variable.replaceWith(OM.simple(variable.name.slice(1)));
            M.Exprs.setMetavariable(variable);
        }
    }
    var symbols = tree.descendantsSatisfying((x) => { return x.type == 'sy' });
    for (let i = 0; i < symbols.length; i++) {
        var sym = symbols[i];
        if (/^_/.test(sym.cd)) {
            var replacement_string = sym.cd.slice(1) + '.' + sym.name;
            sym.replaceWith(OM.simple(replacement_string));
            M.Exprs.setMetavariable(sym);
        }
    }
    return tree;
}

/**
 * Helper function to quickly make expression functions.
 */
export function ef(variables, body) {
    if (!(variables instanceof Array)) {
        variables = [variables];
    }
    for (let i = 0; i < variables.length; i++) {
        if (!(variables[i] instanceof OM)) {
            variables[i] = quick(variables[i]);
        }
    }
    if (!(body instanceof OM)) {
        body = quick(body);
    }
    return M.makeExpressionFunction(variables, body);
}

/**
 * Helper function to quickly make expression function applications.
 */
export function efa(func, params) {
    if (!(func instanceof OM)) {
        func = quick(func);
    }
    if (!(params instanceof Array)) {
        params = [params];
    }
    for (let i = 0; i < params.length; i++) {
        if (!(params[i] instanceof OM)) {
            params[i] = quick(params[i]);
        }
    }
    return M.makeExpressionFunctionApplication(func, params);
}

/**
 * Converts a constraint (a single pair) to a string for debugging output.
 */
export const CToString = (c) => {
    return '( ' + c.pattern.simpleEncode() + ', ' + c.expression.simpleEncode() + ' )';
};

/**
 * Converts a constraint list (a list of pairs) to a string for debugging output.
 */
export const CLToString = (cl) => {
    if (cl === null) { return null; }
    return '{ ' + cl.contents.map((c) => CToString(c)).join(',\n')  + ' }'
};

/**
 * Print a constraint to the console using CToString if possible.
 */
export const DEBUG_PRINT_CONSTRAINT = (c) => {
    c instanceof M.Constraint ? console.log(CToString(c)) : console.log(c);
}

/**
 * Print a constraint list to the console using CLToString if possible.
 */
export const DEBUG_PRINT_CONSTRAINTLIST = (cl) => {
    cl instanceof M.ConstraintList ? console.log(CLToString(cl)) : console.log(cl);
}

/**
 * Print a solution set (a list of constraint lists) to the console using
 * CLToString repeatedly if possible.
 */
export const DEBUG_PRINT_SOLS = (sol) => {
    sol instanceof Array ? console.log('[\n' + sol.map(s => CLToString(s)).join(',\n\n') + '\n]') : console.log(sol);
}

/**
 * Convenience function that combines the Constraint constructor with quick().
 */
export const newConstraintObject = (pattern_string, expression_string) => {
    return new M.Constraint(
        quick(pattern_string),
        quick(expression_string)
    );
}

/**
 * Given a list of string pairs [ [str1a,str1b], [str2a,str2b], ... ], apply
 * quick to each inner string, keeping the list structure the same.
 */
export const newConstraints = (...string_pairs) => {
    var constraints = [];
    for (let i = 0; i < string_pairs.length; i++) {
        let string_pair = string_pairs[i];
        constraints.push(
            string_pair.map(
                (s) => quick(s)
            )
        );
    }
    return constraints;
};

/**
 * Convenience function, makes the MatchingChallenge constructor more brief.
 */
export const newMC = (constraints) => {
    return new M.MatchingChallenge(...constraints);
}

/**
 * Helper to use notation similar to test paper.
 * Takes a string like `'v.f(1,2)'`, splits it
 * on the first `.`, and makes a corresponding EF.
 * @param {string} s
 */
export const lambdaString = (s) => {
    let [v, body] = s.split(/\.(.+)/);
    return ('SecondOrderMatching.EF[' + v + "," + body + ']');
}

/**
 * Provide a list of lists of string pairs, like:
 *   [ [ [str1a,str1b], [str2a,str2b], ... ], ... ]
 * and this calls quick() on each string, converts each pair to a Constraint,
 * converts the whole list to a ConstraintList, then the whole thing is a
 * solution set.
 */
export const newSolutions = (...solutions) => {
    let new_solutions = [];
    solutions.forEach(solution => {
        new_solutions.push(
            new M.ConstraintList(
                ...solution.map((pair) => {
                    return (new M.Constraint(
                        quick(pair[0]),
                        quick(pair[1])
                    ))
                })
            )
        );
    });
    return new_solutions;
}

/**
 * Returns a boolean of whether the actual solution set given is the same as the
 * expected solution set.  To pass this test, they must be of the same length,
 * and every solution in the actual solutions list must equal some solution in
 * the expected solutions list.
 */
export const checkSolutions = (actual_solutions, expected_solutions) => {
    if (actual_solutions.length != expected_solutions.length) {
        return false;
    }

    for (let i = 0; i < actual_solutions.length; i++) {
        const actual_solution = actual_solutions[i];
        if (!expected_solutions.some(expected_solution =>
            actual_solution.length == expected_solution.length
         && actual_solution.equals(expected_solution) )) {
            return false;
        }
    }
    return true;
}
