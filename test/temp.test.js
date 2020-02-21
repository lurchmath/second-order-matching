
/**
 * This test suite is a holding pen for tests that need updating or that are
 * here for reference when doing other code updates.
 */

import * as M from '../index';
import {
    quick, ef, efa, CToString, CLToString, DEBUG_PRINT_CONSTRAINT,
    DEBUG_PRINT_CONSTRAINTLIST, DEBUG_PRINT_SOLS, newConstraintObject,
    newConstraints, newMC, lambdaString, newSolutions, checkSolutions
} from './utils';
const OM = M.OM;

describe( 'Temporary holding pen for miscellaneous tests', () => {
    test( 'Ensure this file gets run', () => {
        expect( true ).toBe( true )
    });

    test.skip('[LATER DELETE THIS] iterative vs recursive solve', () => {
        var constraints, mc, sols;

        /**
         * This challenge is designed to take a long time to solve,
         * in order to test the speed of the iterative and recursive solve functions.
         */
        constraints = newConstraints(
            ['_P_of__a', 'a(1)'],
            ['_Q_of__b', 'b(2)'],
            ['_R_of__c', 'c(3)'],
            ['_S_of__d', 'd(4)'],
            ['_T_of_x', 'e(5,6)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        console.log(sols.length) // 256

        /**
         * ===== RESULTS =====
         *
         * Iterative solve:
         *      18988ms
         *      20911ms
         *      17558ms
         *      17535ms
         *      17478ms
         *      --avg--
         *      18494ms (~18.5s)
         *
         * Recursive solve:
         *      18439ms
         *      21035ms
         *      23081ms
         *      18913ms
         *      22126ms
         *      --avg--
         *      20718ms (~20.7s)
         *
         * Iterative solve is roughly two seconds faster in this test,
         * but only about a second faster in other tests.
         * There are probably other optimisations to be made to `solve()`
         * that would cause a greater speedup than switching to a partly iterative implementation.
         */
    });

    test.skip('generator/iterator version of matching', () => {
        var constraints, mc, iterator, next;

        // No case 4, 1 solutions
        constraints = newConstraints(
            ['and(_P,_Q)', 'and(a,or(b,c))']
        );
        mc = newMC(constraints);
        iterator = mc.solveGenerator();
        next  = iterator.next();
        while(!next.done) {
            DEBUG_PRINT_CONSTRAINTLIST(next.value);
            next = iterator.next();
        }
        DEBUG_PRINT_SOLS(mc.solutions);

        // Case 4 simple, 1 solution
        constraints = newConstraints(
            ['and(_P_of_1,_P_of_2)', 'and(neq(0,1),neq(0,2))']
        );
        mc = newMC(constraints);
        iterator = mc.solveGenerator();
        next = iterator.next();
        while (!next.done) {
            DEBUG_PRINT_CONSTRAINTLIST(next.value);
            next = iterator.next();
        }
        DEBUG_PRINT_SOLS(mc.solutions)
        console.log(mc.solutions.length)

        // 16 solutions
        constraints = newConstraints(
            ['_P_of__a', 'a(1)'],
            ['_Q_of__b', 'b(2)'],
        );
        mc = newMC(constraints);
        iterator = mc.solveGenerator();
        var count = 0;
        next = iterator.next();
        while (!next.done) {
            next = iterator.next();
            count++;
        }
        console.log(count);
        console.log(mc.solutions.length)
    });
})
