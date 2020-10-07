
/**
 * This test suite is for the functions that surround expression functions and
 * applications of them.
 */

import * as M from '../index';
import {
    quick, ef, efa, CToString, CLToString, DEBUG_PRINT_CONSTRAINT,
    DEBUG_PRINT_CONSTRAINTLIST, DEBUG_PRINT_SOLS, newConstraintObject,
    newConstraints, newMC, lambdaString, newSolutions, checkSolutions
} from './utils';
import { OM } from '../src/openmath.js';

describe('Generalized Expression Functions', () => {
    test('should reliably make general expression functions', () => {
        var v1 = OM.var('v1');
        var v2 = OM.var('v2');
        var v3 = OM.var('v3');
        var b1 = OM.simple('f.f(v1,v2,v3)');
        var b2 = OM.simple('z.z(a)');

        var gef1 = M.makeExpressionFunction([v1, v2, v3], b1);
        var gef2 = M.makeExpressionFunction([v1], b1);
        var gef3 = M.makeExpressionFunction([v1], b2);

        expect(M.isExpressionFunction(gef1)).toBe(true);
        expect(M.isExpressionFunction(gef2)).toBe(true);
        expect(M.isExpressionFunction(gef3)).toBe(true);

        expect(gef1.freeVariables().length).toBe(0);
        expect(gef2.freeVariables().length).toBe(2);

        expect(() => {
            M.makeExpressionFunction([v1,v2,b2], b1);
        }).toThrow();
    });

    test('should reliably make general expression function applications', () => {
        var EF1 = M.makeExpressionFunction(
            [OM.var('v1')],
            OM.simple('v1')
        );
        var EFA1 = M.makeExpressionFunctionApplication(
            EF1,
            OM.simple('sq.uare(v1)')
        );

        expect(M.isExpressionFunctionApplication(EFA1)).toBe(true);

        var v1 = OM.var('P');
        M.Exprs.setMetavariable(v1);
        var EFA2 = M.makeExpressionFunctionApplication(
            v1,
            OM.simple('sq.uare(v1)')
        );

        expect(M.isExpressionFunctionApplication(EFA2)).toBe(true);

        M.Exprs.clearMetavariable(v1);

        expect(() => {
            M.makeExpressionFunctionApplication(v1, OM.simple('sq.uare(v1)'))
        }).toThrow();
    });

    test('should reliably detect whether an EFA is applicable', () => {
        var EF1 = M.makeExpressionFunction(
            [OM.var('v1')],
            OM.simple('v1')
        );
        var EFA1 = M.makeExpressionFunctionApplication(
            EF1,
            OM.simple('sq.uare(v1)')
        );

        expect(M.isExpressionFunction(EF1)).toBe(true);
        expect(M.isExpressionFunctionApplication(EFA1)).toBe(true);
        expect(M.canApplyExpressionFunctionApplication(EFA1)).toBe(true);

        var EFA2 = quick('_P_of_1');

        expect(M.isExpressionFunctionApplication(EFA2)).toBe(true);
        expect(M.canApplyExpressionFunctionApplication(EFA2)).toBe(false);
    });

    test('should correctly apply EFAs to expressions', () => {
        var EFA1 = efa(ef('v1', 'pl.us(v1,10)'), '1');
        var EF1copy = EFA1.copy();

        expect(M.applyExpressionFunctionApplication(EFA1).equals(quick('pl.us(1,10)'))).toBe(true);
        expect(EF1copy.equals(EFA1)).toBe(true);

        var EFA2 = efa(ef(['v1','v2','v3'], 'pl.us(v1,v2,v3)'), ['10','20','30']);
        var EFA2copy = EFA2.copy();

        expect(M.applyExpressionFunctionApplication(EFA2).equals(quick('pl.us(10,20,30)'))).toBe(true);
        expect(EFA2copy.equals(EFA2)).toBe(true);
    });
});
