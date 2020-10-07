
/**
 * This test suite is for the utility functions defined in utils.js, which are
 * designed to make the test suite easier to write and read.  But those, too,
 * must be tested.
 */

import * as M from '../index';
import {
    quick, ef, efa, CToString, CLToString, DEBUG_PRINT_CONSTRAINT,
    DEBUG_PRINT_CONSTRAINTLIST, DEBUG_PRINT_SOLS, newConstraintObject,
    newConstraints, newMC, lambdaString, newSolutions, checkSolutions
} from './utils';
const OM = M.OM;

describe('checkSolutions helper function', () => {
    test('should perform correctly on example tasks', () => {
        // Test empty case
        expect(
            checkSolutions([], [])
        ).toBe(true);

        // Test cases where length is different
        expect(
            checkSolutions(
                newSolutions(
                    [
                        ['_x', 'a'],
                    ],
                ),
                newSolutions(
                    [
                        ['_x', 'a'],
                    ],
                    [
                        ['_y', 'b'],
                    ],
                )
            )
        ).toBe(false);

        // Test simple correct case
        expect(
            checkSolutions(
                newSolutions(
                    [
                        ['_x', 'a'],
                    ],
                ),
                newSolutions(
                    [
                        ['_x', 'a'],
                    ],
                )
            )
        ).toBe(true);

        // Test alpha equivalent cases
        expect(
            checkSolutions(
                newSolutions(
                    [
                        ['_x', 'for.all[v,v]'],
                    ],
                ),
                newSolutions(
                    [
                        ['_x', 'for.all[m,m]'],
                    ],
                )
            )
        ).toBe(true);

        // Test different orderings case
        expect(
            checkSolutions(
                newSolutions(
                    [
                        ['_x', 'a'],
                    ],
                    [
                        ['_y', 'b'],
                    ],
                ),
                newSolutions(
                    [
                        ['_y', 'b'],
                    ],
                    [
                        ['_x', 'a'],
                    ],
                )
            )
        ).toBe(true);
    });
})

describe('Expression Function Creators', () => {
    test('should correctly create constant functions', () => {
        var e1 = quick('pl.us(41,1)');
        var nv1 = quick('v1');

        expect(e1.type).toBe('a');
        expect(nv1.type).toBe('v');
        expect(M.makeConstantExpression(nv1, e1).equals(ef('v1', 'pl.us(41,1)'))).toBe(true);

        var e2 = quick('pl.us(a,b,c,d)');
        var nv2 = quick('_X');
        expect(e2.type).toBe('a');
        expect(nv2.type).toBe('v');
        expect(M.Exprs.isMetavariable(nv2)).toBe(true);
        expect(M.makeConstantExpression(nv2, e2).equals(ef('_X', 'pl.us(a,b,c,d)'))).toBe(true);

        expect(M.makeConstantExpression('v1', 'pl.us(a,b)')).toBeNull();
    });

    test('should correctly create projections', () => {
        var vars1 = [quick('v1')];
        var p1 = quick('v1');
        var proj1 = M.makeProjectionExpression(vars1, p1);
        expect(proj1.equals(ef('v1','v1'))).toBe(true);
        expect(vars1[0] === proj1.variables[0]).toBe(false);
        expect(p1 === proj1.body).toBe(false);
        expect(vars1[0].equals(proj1.variables[0])).toBe(true);
        expect(p1.equals(proj1.body)).toBe(true);

        var vars2 = [quick('v1'), quick('v2'), quick('v3'), quick('v4')];
        var p2 = quick('v3');
        var p3 = quick('v4');
        var proj2 = M.makeProjectionExpression(vars2, p2);
        var proj3 = M.makeProjectionExpression(vars2, p3);
        expect(proj2.equals(ef(['v1','v2','v3','v4'],'v3'))).toBe(true);
        expect(proj3.equals(ef(['v1', 'v2', 'v3', 'v4'], 'v4'))).toBe(true);

        expect(() => {
            M.makeProjectionExpression(vars1, p2)
        }).toThrow();

        expect(M.makeProjectionExpression(['v1','v2'], 'v1')).toBeNull();
    });

    test('should correctly create imitations', () => {
        var vars, expr, temps, imit;
        vars = [quick('v1'), quick('v2'), quick('v3')];
        expr = quick('neq(0,1)');
        temps = [quick('_H1'), quick('_H2'), quick('_H3')];
        imit = M.makeImitationExpression(vars, expr, temps);
        expect(imit.equals(
            quick('SecondOrderMatching.gEF[v1,v2,v3,SecondOrderMatching.gEFA(_H1,v1,v2,v3)(SecondOrderMatching.gEFA(_H2,v1,v2,v3),SecondOrderMatching.gEFA(_H3,v1,v2,v3))]'))
        ).toBe(true);
    });
});
