
/**
 * This test suite is for all different kinds of matching problems, which are
 * the main purpose of this entire repository/codebase.  Thus these are the main
 * tests, which are the lengthiest in both code and running time, in order to
 * ensure thorough testing.
 */

import * as M from '../index';
import {
    quick, ef, efa, CToString, CLToString, DEBUG_PRINT_CONSTRAINT,
    DEBUG_PRINT_CONSTRAINTLIST, DEBUG_PRINT_SOLS, newConstraintObject,
    newConstraints, newMC, lambdaString, newSolutions, checkSolutions
} from './utils';
const OM = M.OM;

describe('The MatchingChallenge class (basic functionality)', () => {
    test('should correctly create instances of a matching challenge', () => {
        var mc;

        // Test creating an empty instance
        mc = new M.MatchingChallenge()
        expect(mc).toBeInstanceOf(M.MatchingChallenge);
        expect(mc.challengeList.length).toBe(0);
        expect(mc.solutions.length).toBe(0);
        expect(mc.solvable).toBeUndefined();

        // Test calling constructor with args
        mc = new M.MatchingChallenge([quick('_X'), quick('a')]);
        expect(mc).toBeInstanceOf(M.MatchingChallenge);
        expect(mc.challengeList.length).toBe(1);
        expect(mc.solutions.length).toBe(0);
        expect(mc.solvable).toBeUndefined();

        var constraints = [
            [quick('_X'), quick('a')],
            [quick('_Y'), quick('b')],
            [quick('_Z'), quick('c')]
        ];
        mc = new M.MatchingChallenge(...constraints);
        expect(mc).toBeInstanceOf(M.MatchingChallenge);
        expect(mc.challengeList.length).toBe(3);
        expect(mc.solutions.length).toBe(0);
        expect(mc.solvable).toBeUndefined();
    });

    test('should correctly add a single constraint when there are no solutions', () => {
        // Test starting with an empty list
        var mc1 = new M.MatchingChallenge();
        mc1.addConstraint(quick('_X'), quick('a'));
        expect(mc1.challengeList.length).toBe(1);
        mc1.addConstraint(quick('_Y'), quick('b'));
        expect(mc1.challengeList.length).toBe(2);
        mc1.addConstraint(quick('_Z'), quick('c'));
        expect(mc1.challengeList.length).toBe(3);

        // Test starting with a list made using constructor
        var constraints = [
            [quick('_X'), quick('a')],
            [quick('_Y'), quick('b')],
            [quick('_Z'), quick('c')]
        ];
        var mc2 = new M.MatchingChallenge(...constraints);
        expect(mc2.challengeList.length).toBe(3);
        mc2.addConstraint(quick('_A'), quick('x'));
        expect(mc2.challengeList.length).toBe(4);
    });

    test('should correctly add multiple constraints when there are no solutions', () => {
        // Test starting with an empty list
        var mc1 = new M.MatchingChallenge();
        var constraints = [
            [quick('_X'), quick('a')],
            [quick('_Y'), quick('b')],
            [quick('_Z'), quick('c')]
        ];
        mc1.addConstraints(...constraints);
        expect(mc1.challengeList.length).toBe(3);

        // Test starting with a list made using constructor
        var mc2 = new M.MatchingChallenge(...constraints);
        mc2.addConstraints([quick('_A'), quick('x')], [quick('_B'), quick('y')]);
        expect(mc2.challengeList.length).toBe(5);
    });

    test('should correctly create clones of itself', () => {
        var mc, mc_clone;

        // Test cloning empty challenge
        mc = new M.MatchingChallenge();
        mc_clone = mc.clone();
        expect(mc.challengeList.equals(mc_clone.challengeList)).toBe(true);
        expect(mc.solutions.length == mc_clone.solutions.length).toBe(true);
        expect(mc.solvable).toEqual(mc_clone.solvable);
        for (let i = 0; i < mc.solutions.length; i++) {
            let original_sol = mc.solutions[i];
            let clones_sol = mc_clone.solutions[i];
            expect(original_sol.equals(clones_sol)).toBe(true);
        }

        // Test cloning with some constraints
        var constraints = [
            [quick('_X'), quick('a')],
            [quick('_Y'), quick('b')],
            [quick('_Z'), quick('c')]
        ];
        mc = new M.MatchingChallenge(...constraints);
        mc_clone = mc.clone();
        expect(mc.challengeList.equals(mc_clone.challengeList)).toBe(true);
        expect(mc.solutions.length == mc_clone.solutions.length).toBe(true);
        expect(mc.solvable).toEqual(mc_clone.solvable);
        for (let i = 0; i < mc.solutions.length; i++) {
            let original_sol = mc.solutions[i];
            let clones_sol = mc_clone.solutions[i];
            expect(original_sol.equals(clones_sol)).toBe(true);
        }

        // Test cloning with some constraints and solutions
        mc = new M.MatchingChallenge();
        var sub1 = new M.Constraint(quick('_P'), quick('a'));
        var sub2 = new M.Constraint(quick('_Q'), quick('l.or(b,c)'));
        var SL1 = [new M.ConstraintList(sub1, sub2)];
        mc.solutions = SL1;
        mc.addConstraints([quick('l.and(_P,_Q)'), quick('l.and(a,l.or(b,c))')]);
        mc_clone = mc.clone();
        expect(mc.challengeList.equals(mc_clone.challengeList)).toBe(true);
        expect(mc.solutions.length == mc_clone.solutions.length).toBe(true);
        expect(mc.solvable).toEqual(mc_clone.solvable);
        for (let i = 0; i < mc.solutions.length; i++) {
            let original_sol = mc.solutions[i];
            let clones_sol = mc_clone.solutions[i];
            expect(original_sol.equals(clones_sol)).toBe(true);
        }
    });

    test('should correctly identify solvability', () => {
        var constraints, mc;

        // This is solvable (by hand)
        constraints = [[quick('and(_P,_Q)'), quick('and(a,or(b,c))')]];
        mc = new M.MatchingChallenge(...constraints);
        expect(mc.isSolvable()).toBe(true);
    });

    test('should correctly return the number of solutions', () => {
        var constraints, mc;

        // This is solvable (by hand) and has 1 solution
        constraints = [[quick('and(_P,_Q)'), quick('and(a,or(b,c))')]];
        mc = new M.MatchingChallenge(...constraints);
        expect(mc.numSolutions()).toBe(1);
    });
});

describe('The MatchingChallenge class (solving)', () => {
    test('should correctly solve example challenges from the paper', () => {
        var constraints, mc, sols;

        // Example 1
        constraints = newConstraints(
            ['and(_P,_Q)', 'and(a,or(b,c))']
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', 'a'],
                        ['_Q', 'or(b,c)'],
                    ],
                )
            )
        ).toBe(true);

        // Example 2
        constraints = newConstraints(
            ['multiply(plus(_X,_Y),minus(_X,_Y))', 'multiply(plus(3,k),minus(3,p))']
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        // Example 3
        constraints = newConstraints(
            ['and(_P_of_1,_P_of_2)', 'and(neq(0,1),neq(0,2))']
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', lambdaString('v.neq(0,v)')],
                    ],
                )
            )
        ).toBe(true);
    });

    test('should correctly solve complex challenges from the paper', () => {
        var constraints, mc, sols;

        // These come from section 6 of the summary paper

        // Example 1
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[r,gt(plus(sq(r),1),0)]'],
            ['_P_of__T', 'gt(plus(sq(-9),1),0)']
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_T', '-9'],
                        ['_x', 'r'],
                        ['_P', lambdaString('v.gt(plus(sq(v),1),0)')],
                    ],
                )
            )
        ).toBe(true);

        // Example 2
        constraints = newConstraints(
            ['w(w(_X,_P_of__X),for.all[x,_P_of_x])',
             'w(w(k,lt(plus(k,1),5)),for.all[s,lt(plus(s,1),5)])'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                       ['_X', 'k'],
                       ['_P', lambdaString('v.lt(plus(v,1),5)')],
                    ],
                )
            )
        ).toBe(true);

        // Example 3
        constraints = newConstraints(
            ['w(exi.sts[x,_P_of_x],for.all[y,implies(_P_of_y,_Q)],_Q)',
             'w(exi.sts[x,eq(cubed(x),-1)],for.all[x,implies(eq(cubed(x),-1),lt(x,5))],lt(x,5))']
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);
    });

    ////////////////////////////////////////////////////////////////////////////////
    // * In the tests that follow, the comments marking test numbers
    // * correspond to the document "Tests of the Matching Algorithm"
    ////////////////////////////////////////////////////////////////////////////////

    test('should correctly solve small challenges', () => {
        var constraints, mc, sols;

        ////////// Test 1 //////////
        constraints = newConstraints(
            ['_P_of__x', 'b(2)'],
            ['_P_of__y', 'b(3)']
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'b(2)'],
                        ['_y', 'b(3)'],
                        ['_P', lambdaString('v.v')]
                    ],
                    [
                        ['_x', '2'],
                        ['_y', '3'],
                        ['_P', lambdaString('v.b(v)')]
                    ]
                )
            )
        ).toBe(true);

        ////////// Test 2 //////////
        constraints = newConstraints(
            ['_P_of__x', 'equ.als(pl.us(2,3),5)'],
            ['_P_of__y', 'equ.als(5,5)']
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'pl.us(2,3)'],
                        ['_y', '5'],
                        ['_P', lambdaString('v.equ.als(v,5)')]
                    ],
                    [
                        ['_x', 'equ.als(pl.us(2,3),5)'],
                        ['_y', 'equ.als(5,5)'],
                        ['_P', lambdaString('v.v')]
                    ]
                )
            )
        ).toBe(true);

        ////////// Test 3 //////////
        constraints = newConstraints(
            ['_P_of__x', 'A(1,2,3)'],
            ['_P_of__y', 'A(2,1,3)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'A(1,2,3)'],
                        ['_y', 'A(2,1,3)'],
                        ['_P', lambdaString('v.v')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 4 //////////
        constraints = newConstraints(
            ['_P_of__x', 'A(1,2,3)'],
            ['_P_of__x', 'A(2,1,3)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 5 //////////
        constraints = newConstraints(
            ['_P_of__x', 'f(1,2)'],
            ['_P_of__y', 'f(1,2)']
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'f'],
                        ['_y', 'f'],
                        ['_P', lambdaString('v.v(1,2)')]
                    ],
                    [
                        ['_x', '1'],
                        ['_y', '1'],
                        ['_P', lambdaString('v.f(v,2)')]
                    ],
                    [
                        ['_x', '2'],
                        ['_y', '2'],
                        ['_P', lambdaString('v.f(1,v)')]
                    ],
                    [
                        ['_x', 'f(1,2)'],
                        ['_y', 'f(1,2)'],
                        ['_P', lambdaString('v.v')]
                    ],
                    [
                        ['_P', lambdaString('v.f(1,2)')]
                    ]
                )
            )
        ).toBe(true);

        ////////// Test 6 //////////
        constraints = newConstraints(
            ['_P_of__x', 'g(k,e(2))'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'g(k,e(2))'],
                        ['_P', lambdaString('v.v')],
                    ],
                    [
                        ['_x', 'g'],
                        ['_P', lambdaString('v.v(k,e(2))')],
                    ],
                    [
                        ['_x', 'k'],
                        ['_P', lambdaString('v.g(v,e(2))')],
                    ],
                    [
                        ['_x', 'e(2)'],
                        ['_P', lambdaString('v.g(k,v)')],
                    ],
                    [
                        ['_x', 'e'],
                        ['_P', lambdaString('v.g(k,v(2))')],
                    ],
                    [
                        ['_x', '2'],
                        ['_P', lambdaString('v.g(k,e(v))')],
                    ],
                    [
                        ['_P', lambdaString('v.g(k,e(2))')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 7 //////////
        constraints = newConstraints(
            ['_P_of__x', 'f(a,a)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'f(a,a)'],
                        ['_P', lambdaString('v.v')],
                    ],
                    [
                        ['_x', 'f'],
                        ['_P', lambdaString('v.v(a,a)')],
                    ],
                    [
                        ['_x', 'a'],
                        ['_P', lambdaString('v.f(a,v)')],
                    ],
                    [
                        ['_x', 'a'],
                        ['_P', lambdaString('v.f(v,a)')],
                    ],
                    [
                        ['_x', 'a'],
                        ['_P', lambdaString('v.f(v,v)')],
                    ],
                    [
                        ['_P', lambdaString('v.f(a,a)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 8 //////////
        constraints = newConstraints(
            ['_P_of__x', 'f(a,a)'],
            ['_x', 'b'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'b'],
                        ['_P', lambdaString('v.f(a,a)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 9 //////////
        constraints = newConstraints(
            ['_P_of__x', 'f(a,a)'],
            ['_x', 'f'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'f'],
                        ['_P', lambdaString('v.v(a,a)')],
                    ],
                    [
                        ['_x', 'f'],
                        ['_P', lambdaString('v.f(a,a)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 10 //////////
        constraints = newConstraints(
            ['_P_of__a', 'eq(3,3)'],
            ['_Q_of__b', 'gt(5,4)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    // Row 1
                    [
                        ['_a', 'eq(3,3)'],
                        ['_P', lambdaString('v.v')],
                        ['_b', 'gt(5,4)'],
                        ['_Q', lambdaString('v.v')],
                    ],
                    [
                        ['_a', 'eq'],
                        ['_P', lambdaString('v.v(3,3)')],
                        ['_b', 'gt(5,4)'],
                        ['_Q', lambdaString('v.v')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(v,v)')],
                        ['_b', 'gt(5,4)'],
                        ['_Q', lambdaString('v.v')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(v,3)')],
                        ['_b', 'gt(5,4)'],
                        ['_Q', lambdaString('v.v')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(3,v)')],
                        ['_b', 'gt(5,4)'],
                        ['_Q', lambdaString('v.v')],
                    ],
                    [
                        ['_P', lambdaString('v.eq(3,3)')],
                        ['_b', 'gt(5,4)'],
                        ['_Q', lambdaString('v.v')],
                    ],
                    // Row 2
                    [
                        ['_a', 'eq(3,3)'],
                        ['_P', lambdaString('v.v')],
                        ['_b', 'gt'],
                        ['_Q', lambdaString('v.v(5,4)')],
                    ],
                    [
                        ['_a', 'eq'],
                        ['_P', lambdaString('v.v(3,3)')],
                        ['_b', 'gt'],
                        ['_Q', lambdaString('v.v(5,4)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(v,v)')],
                        ['_b', 'gt'],
                        ['_Q', lambdaString('v.v(5,4)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(v,3)')],
                        ['_b', 'gt'],
                        ['_Q', lambdaString('v.v(5,4)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(3,v)')],
                        ['_b', 'gt'],
                        ['_Q', lambdaString('v.v(5,4)')],
                    ],
                    [
                        ['_P', lambdaString('v.eq(3,3)')],
                        ['_b', 'gt'],
                        ['_Q', lambdaString('v.v(5,4)')],
                    ],
                    // Row 3
                    [
                        ['_a', 'eq(3,3)'],
                        ['_P', lambdaString('v.v')],
                        ['_b', '5'],
                        ['_Q', lambdaString('v.gt(v,4)')],
                    ],
                    [
                        ['_a', 'eq'],
                        ['_P', lambdaString('v.v(3,3)')],
                        ['_b', '5'],
                        ['_Q', lambdaString('v.gt(v,4)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(v,v)')],
                        ['_b', '5'],
                        ['_Q', lambdaString('v.gt(v,4)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(v,3)')],
                        ['_b', '5'],
                        ['_Q', lambdaString('v.gt(v,4)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(3,v)')],
                        ['_b', '5'],
                        ['_Q', lambdaString('v.gt(v,4)')],
                    ],
                    [
                        ['_P', lambdaString('v.eq(3,3)')],
                        ['_b', '5'],
                        ['_Q', lambdaString('v.gt(v,4)')],
                    ],
                    // Row 4
                    [
                        ['_a', 'eq(3,3)'],
                        ['_P', lambdaString('v.v')],
                        ['_b', '4'],
                        ['_Q', lambdaString('v.gt(5,v)')],
                    ],
                    [
                        ['_a', 'eq'],
                        ['_P', lambdaString('v.v(3,3)')],
                        ['_b', '4'],
                        ['_Q', lambdaString('v.gt(5,v)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(v,v)')],
                        ['_b', '4'],
                        ['_Q', lambdaString('v.gt(5,v)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(v,3)')],
                        ['_b', '4'],
                        ['_Q', lambdaString('v.gt(5,v)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(3,v)')],
                        ['_b', '4'],
                        ['_Q', lambdaString('v.gt(5,v)')],
                    ],
                    [
                        ['_P', lambdaString('v.eq(3,3)')],
                        ['_b', '4'],
                        ['_Q', lambdaString('v.gt(5,v)')],
                    ],
                    // Row 5
                    [
                        ['_a', 'eq(3,3)'],
                        ['_P', lambdaString('v.v')],
                        ['_Q', lambdaString('v.gt(5,4)')],
                    ],
                    [
                        ['_a', 'eq'],
                        ['_P', lambdaString('v.v(3,3)')],
                        ['_Q', lambdaString('v.gt(5,4)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(v,v)')],
                        ['_Q', lambdaString('v.gt(5,4)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(v,3)')],
                        ['_Q', lambdaString('v.gt(5,4)')],
                    ],
                    [
                        ['_a', '3'],
                        ['_P', lambdaString('v.eq(3,v)')],
                        ['_Q', lambdaString('v.gt(5,4)')],
                    ],
                    [
                        ['_P', lambdaString('v.eq(3,3)')],
                        ['_Q', lambdaString('v.gt(5,4)')],
                    ],
                )
            )
        ).toBe(true);
    });

    test('should correctly solve challenges involving the equality elimination rule', () => {
        var constraints, mc, sols;

        ////////// Test 11 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(t,1)'],
            ['_P_of__a', 'gt(t,0)'],
            ['_P_of__b', 'gt(1,0)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_a', 't'],
                        ['_b', '1'],
                        ['_P', lambdaString('v.gt(v,0)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 12 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(t,1)'],
            ['_P_of__a', 'gt(1,0)'],
            ['_P_of__b', 'gt(t,0)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 13 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(t,1)'],
            ['_P_of__a', 'eq(plus(t,1),2)'],
            ['_P_of__b', 'eq(plus(1,1),2)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_a', 't'],
                        ['_b', '1'],
                        ['_P', lambdaString('v.eq(plus(v,1),2)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 14 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(t,1)'],
            ['_P_of__a', 'eq(plus(1,1),2)'],
            ['_P_of__b', 'eq(plus(t,1),2)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 15 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(1,2)'],
            ['_P_of__a', 'eq(plus(1,1),2)'],
            ['_P_of__b', 'eq(plus(2,2),2)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_a', '1'],
                        ['_b', '2'],
                        ['_P', lambdaString('v.eq(plus(v,v),2)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 16 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(1,2)'],
            ['_P_of__a', 'eq(plus(1,1),2)'],
            ['_P_of__b', 'eq(plus(2,1),2)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_a', '1'],
                        ['_b', '2'],
                        ['_P', lambdaString('v.eq(plus(v,1),2)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 17 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(1,2)'],
            ['_P_of__a', 'eq(plus(1,1),2)'],
            ['_P_of__b', 'eq(plus(1,2),2)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_a', '1'],
                        ['_b', '2'],
                        ['_P', lambdaString('v.eq(plus(1,v),2)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 18 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(1,2)'],
            ['_P_of__a', 'eq(plus(1,1),2)'],
            ['_P_of__b', 'eq(plus(1,1),2)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_a', '1'],
                        ['_b', '2'],
                        ['_P', lambdaString('v.eq(plus(1,1),2)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 19 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(1,2)'],
            ['_P_of__a', 'eq(plus(1,1),2)'],
            ['_P_of__b', 'eq(plus(2,2),1)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 20 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(1,2)'],
            ['_P_of__a', 'eq(plus(1,1),2)'],
            ['_P_of__b', 'eq(plus(1,1),1)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 21 //////////
        constraints = newConstraints(
            ['eq(_a,_b)', 'eq(x,y)'],
            ['_P_of__a', 'exi.sts[y,neq(y,x)]'],
            ['_P_of__b', 'exi.sts[y,neq(y,y)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

    });

    test('should correctly solve challenges involving the universal elimination rule', () => {
        var constraints, mc, sols;

        ////////// Test 22 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,gte(x,0)]'],
            ['_P_of__t', 'gte(7,0)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'x'],
                        ['_t', '7'],
                        ['_P', lambdaString('v.gte(v,0)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 23 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,gte(x,0)]'],
            ['_P_of__t', 'gte(7,7)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 24 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,Q]'],
            ['_P_of__t', 'Q'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'x'],
                        ['_P', lambdaString('v.Q')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 25 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[s,eq(sq(s),s)]'],
            ['_P_of__t', 'eq(sq(1),1)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 's'],
                        ['_P', lambdaString('v.eq(sq(v),v)')],
                        ['_t', '1'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 26 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,R(x,y)]'],
            ['_P_of__t', 'R(x,3)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 27 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,R(x,y)]'],
            ['_P_of__t', 'R(3,y)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'x'],
                        ['_P', lambdaString('v.R(v,y)')],
                        ['_t', '3'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 28 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,R(x,x)]'],
            ['_P_of__t', 'R(3,3)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'x'],
                        ['_P', lambdaString('v.R(v,v)')],
                        ['_t', '3'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 29 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,R(x,x)]'],
            ['_P_of__t', 'R(3,x)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 30 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,R(x,x)]'],
            ['_P_of__t', 'R(x,3)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 31 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,R(x,x)]'],
            ['_P_of__t', 'R(x,x)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'x'],
                        ['_P', lambdaString('v.R(v,v)')],
                        ['_t', 'x'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 32 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[s,eq(plus(s,s),r)]'],
            ['_P_of__t', 'eq(plus(t,s),r)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 33 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,eq(x,x)]'],
            ['_P_of__t', 'eq(iff(P,Q),iff(P,Q))'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'x'],
                        ['_P', lambdaString('v.eq(v,v)')],
                        ['_t', 'iff(P,Q)'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 34 //////////
        constraints = newConstraints(
            ['for.all[_x,_P_of__x]', 'for.all[x,exi.sts[y,lt(x,y)]]'],
            ['_P_of__t', 'exi.sts[y,lt(y,y)]'],
        );
        mc = newMC(constraints);
        var subs = newSolutions(
            [
                ['_x', 'x'],
                ['_P', lambdaString('v.exi.sts[y,lt(v,y)]')],
                ['_t', 'y'],
            ],
        )[0];
        subs.instantiate(mc.challengeList);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

    });

    test('should correctly solve challenges involving the universal introduction rule', () => {
        var constraints, mc, sols;

        ////////// Test 35 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[a,r(a,a)]'],
            ['for.all[_x,_P_of__x]', 'for.all[b,r(b,b)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'a'],
                        ['_P', lambdaString('v.r(v,v)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 35 variant //////////
        constraints = newConstraints(
            ['Sub.proof[x,_P_of_x]', 'Sub.proof[a,r(a,a)]'],
            ['for.all[x,_P_of_x]', 'for.all[b,r(b,b)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', lambdaString('v.r(v,v)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 36 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[a,r(a,a)]'],
            ['for.all[_y,_P_of__y]', 'for.all[b,r(b,b)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'a'],
                        ['_P', lambdaString('v.r(v,v)')],
                        ['_y', 'b'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 36 variant //////////
        constraints = newConstraints(
            ['Sub.proof[x,_P_of_x]', 'Sub.proof[a,r(a,a)]'],
            ['for.all[y,_P_of_y]', 'for.all[b,r(b,b)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', lambdaString('v.r(v,v)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 37 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[a,gt(a,3)]'],
            ['for.all[_y,_P_of__y]', 'for.all[a,gt(a,3)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'a'],
                        ['_P', lambdaString('v.gt(v,3)')],
                        ['_y', 'a'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 38 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[a,gt(a,3)]'],
            ['for.all[_y,_P_of__y]', 'for.all[x,gt(x,3)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'a'],
                        ['_P', lambdaString('v.gt(v,3)')],
                        ['_y', 'x'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 39 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[T,R(T,T)]'],
            ['for.all[_y,_P_of__y]', 'for.all[T,R(T,T)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'T'],
                        ['_P', lambdaString('v.R(v,v)')],
                        ['_y', 'T'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 40 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[T,R(T,T)]'],
            ['for.all[_y,_P_of__y]', 'for.all[x,R(T,x)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 41 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[y,neq(0,1)]'],
            ['for.all[_y,_P_of__y]', 'for.all[z,neq(0,1)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'y'],
                        ['_P', lambdaString('v.neq(0,1)')],
                        ['_y', 'z'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 42 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[b,eq(minus(b,b),0)]'],
            ['for.all[_y,_P_of__y]', 'for.all[c,eq(minus(b,c),0)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 43 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[a,gt(a,3)]'],
            ['for.all[_x,_P_of__x]', 'for.all[a,gt(a,3)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'a'],
                        ['_P', lambdaString('v.gt(v,3)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 44 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[a,gt(a,3)]'],
            ['for.all[_x,_P_of__x]', 'for.all[x,gt(x,3)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'a'],
                        ['_P', lambdaString('v.gt(v,3)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 45 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[T,R(T,T)]'],
            ['for.all[_x,_P_of__x]', 'for.all[T,R(T,T)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'T'],
                        ['_P', lambdaString('v.R(v,v)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 46 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[T,R(T,T)]'],
            ['for.all[_x,_P_of__x]', 'for.all[x,R(T,x)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 47 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[y,neq(0,1)]'],
            ['for.all[_x,_P_of__x]', 'for.all[y,neq(0,1)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'y'],
                        ['_P', lambdaString('v.neq(0,1)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 48 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[x,eq(x,x)]'],
            ['for.all[_y,_P_of__y]', 'for.all[x,eq(x,x)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'x'],
                        ['_y', 'x'],
                        ['_P', lambdaString('v.eq(v,v)')],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 49 //////////
        constraints = newConstraints(
            ['Sub.proof[_x,_P_of__x]', 'Sub.proof[x,exi.sts[y,lt(x,y)]]'],
            ['for.all[_x,_P_of__x]', 'for.all[y,exi.sts[y,lt(y,y)]]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);
    });

    test('should correctly solve challenges involving the existential introduction rule', () => {
        var constraints, mc, sols;

        ////////// Test 50 //////////
        constraints = newConstraints(
            ['_P_of__t', 'gt(1,0)'],
            ['exi.sts[_x,_P_of__x]', 'exi.sts[x,gt(x,0)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', lambdaString('v.gt(v,0)')],
                        ['_t', '1'],
                        ['_x', 'x'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 51 //////////
        constraints = newConstraints(
            ['_P_of__t', 'eq(choose(6,3),20)'],
            ['exi.sts[_x,_P_of__x]', 'exi.sts[n,eq(choose(6,n),20)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', lambdaString('v.eq(choose(6,v),20)')],
                        ['_t', '3'],
                        ['_x', 'n'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 52 //////////
        constraints = newConstraints(
            ['_P_of__t', 'lt(pow(t,x),5)'],
            ['exi.sts[_x,_P_of__x]', 'exi.sts[x,lt(pow(x,x),5)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 53 //////////
        constraints = newConstraints(
            ['_P_of__t', 'neq(x,t)'],
            ['exi.sts[_x,_P_of__x]', 'exi.sts[y,neq(y,t)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', lambdaString('v.neq(v,t)')],
                        ['_t', 'x'],
                        ['_x', 'y'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 54 //////////
        constraints = newConstraints(
            ['_P_of__t', 'neq(x,t)'],
            ['exi.sts[_x,_P_of__x]', 'exi.sts[x,neq(x,x)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 55 //////////
        constraints = newConstraints(
            ['_P_of__t', 'for.all[t,eq(t,t)]'],
            ['exi.sts[_x,_P_of__x]', 'exi.sts[x,for.all[t,eq(x,t)]]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);
    });

    test('should correctly solve challenges involving induction on the natural numbers', () => {
        var constraints, mc, sols;

        ////////// Test 56 //////////
        constraints = newConstraints(
            ['_P_of_0', 'gte(0,0)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.EFA(_P,plus(_k,1)))]',
             'for.all[n,implies(gte(n,0),gte(plus(n,1),0))]'],
            ['for.all[_n,_P_of__n]', 'for.all[n,gte(n,0)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', lambdaString('v.gte(v,0)')],
                        ['_k', 'n'],
                        ['_n', 'n'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 57 //////////
        constraints = newConstraints(
            ['_P_of_0', 'eq(plus(0,0),0)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.EFA(_P,plus(_k,1)))]',
             'for.all[m,implies(eq(plus(m,0),m),eq(plus(plus(m,1),0),plus(m,1)))]'],
            ['for.all[_n,_P_of__n]', 'for.all[k,eq(plus(k,0),k)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', lambdaString('v.eq(plus(v,0),v)')],
                        ['_k', 'm'],
                        ['_n', 'k'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 58 //////////
        constraints = newConstraints(
            ['_P_of_0', 'P(0)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.EFA(_P,plus(_k,1)))]',
             'for.all[k,implies(P(k),P(plus(k,1)))]'],
            ['for.all[_n,_P_of__n]', 'for.all[n,P(n)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', lambdaString('v.P(v)')],
                        ['_k', 'k'],
                        ['_n', 'n'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 59 //////////
        constraints = newConstraints(
            ['_P_of_0', 'eq(7,5)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.EFA(_P,plus(_k,1)))]',
             'for.all[n,implies(eq(7,5),eq(7,5))]'],
            ['for.all[_n,_P_of__n]', 'for.all[n,eq(7,5)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_P', lambdaString('v.eq(7,5)')],
                        ['_k', 'n'],
                        ['_n', 'n'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 60 //////////
        constraints = newConstraints(
            ['_P_of_0', 'R(n,1)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.EFA(_P,plus(_k,1)))]',
             'for.all[m,implies(R(m,1),R(plus(m,1),1))]'],
            ['for.all[_n,_P_of__n]', 'for.all[m,R(m,1)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 61 //////////
        constraints = newConstraints(
            ['_P_of_0', 'gte(k,0)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.EFA(_P,plus(_k,1)))]',
             'for.all[k,implies(gte(k,k),gte(k,plus(k,1)))]'],
            ['for.all[_n,_P_of__n]', 'for.all[n,gte(n,k)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 62 //////////
        constraints = newConstraints(
            ['_P_of_0', 'gte(n,0)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.EFA(_P,plus(_k,1)))]',
                'for.all[k,implies(gte(n,k),gte(n,plus(k,1)))]'],
            ['for.all[_n,_P_of__n]', 'for.all[n,gte(n,n)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 63 //////////
        constraints = newConstraints(
            ['_P_of_0', 'gte(0,0)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.EFA(_P,plus(_k,1)))]',
                'for.all[n,implies(gte(n,0),gte(0,plus(n,1)))]'],
            ['for.all[_n,_P_of__n]', 'for.all[n,gte(0,0)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

    });

    test('should correctly solve challenges involving the existential elimination rule', () => {
        var constraints, mc, sols;

        ////////// Test 64 //////////
        constraints = newConstraints(
            ['exi.sts[_x,_P_of__x]', 'exi.sts[x,eq(sq(x),1)]'],
            ['for.all[_x,implies(_P_of__x,_Q)]', 'for.all[x,implies(eq(sq(x),1),gte(1,0))]'],
            ['_Q', 'gte(1,0)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'x'],
                        ['_P', lambdaString('v.eq(sq(v),1)')],
                        ['_Q', 'gte(1,0)'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 65 //////////
        constraints = newConstraints(
            ['exi.sts[_x,_P_of__x]', 'exi.sts[x,eq(sq(x),1)]'],
            ['for.all[_x,implies(_P_of__x,_Q)]', 'for.all[x,implies(eq(sq(x),1),lte(x,1))]'],
            ['_Q', 'lte(x,1)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 66 //////////
        constraints = newConstraints(
            ['exi.sts[_x,_P_of__x]', 'exi.sts[x,gt(x,0)]'],
            ['for.all[_x,implies(_P_of__x,_Q)]', 'implies(for.all[x,gt(x,0)],gt(-1,0))'],
            ['_Q', 'gt(-1,0)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 67 //////////
        constraints = newConstraints(
            ['exi.sts[_x,_P_of__x]', 'exi.sts[x,gt(x,0)]'],
            ['for.all[_x,implies(_P_of__x,_Q)]', 'for.all[x,implies(gt(x,0),gt(-1,0))]'],
            ['_Q', 'gt(-1,0)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'x'],
                        ['_P', lambdaString('v.gt(v,0)')],
                        ['_Q', 'gt(-1,0)'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 68 //////////
        constraints = newConstraints(
            ['exi.sts[_x,_P_of__x]', 'exi.sts[m,gt(m,0)]'],
            ['for.all[_x,implies(_P_of__x,_Q)]', 'for.all[n,implies(gt(n,0),gt(-1,0))]'],
            ['_Q', 'gt(-1,0)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                       ['_x', 'm'],
                       ['_P', lambdaString('v.gt(v,0)')],
                       ['_Q', 'gt(-1,0)'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 69 //////////
        constraints = newConstraints(
            ['exi.sts[_x,_P_of__x]', 'exi.sts[x,gt(x,0)]'],
            ['for.all[_y,implies(_P_of__y,_Q)]', 'for.all[x,implies(gt(x,0),gt(-1,0))]'],
            ['_Q', 'gt(-1,0)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'x'],
                        ['_y', 'x'],
                        ['_P', lambdaString('v.gt(v,0)')],
                        ['_Q', 'gt(-1,0)'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 70 //////////
        constraints = newConstraints(
            ['exi.sts[_x,_P_of__x]', 'exi.sts[m,gt(m,0)]'],
            ['for.all[_y,implies(_P_of__y,_Q)]', 'for.all[n,implies(gt(n,0),gt(-1,0))]'],
            ['_Q', 'gt(-1,0)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(
            checkSolutions(
                sols,
                newSolutions(
                    [
                        ['_x', 'm'],
                        ['_y', 'n'],
                        ['_P', lambdaString('v.gt(v,0)')],
                        ['_Q', 'gt(-1,0)'],
                    ],
                )
            )
        ).toBe(true);

        ////////// Test 71 //////////
        constraints = newConstraints(
            ['exi.sts[_x,_P_of__x]', 'exi.sts[n,lt(n,a)]'],
            ['for.all[_y,implies(_P_of__y,_Q)]', 'for.all[a,implies(lt(a,a),lt(a,a))]'],
            ['_Q', 'lt(a,a)'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);
    });

});
