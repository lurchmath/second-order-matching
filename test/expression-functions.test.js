
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
const OM = M.OM;

describe('Generalized Expression Functions', () => {
    test('should reliably make general expression functions', () => {
        var v1 = OM.var('v1');
        var v2 = OM.var('v2');
        var v3 = OM.var('v3');
        var b1 = OM.simple('f.f(v1,v2,v3)');
        var b2 = OM.simple('z.z(a)');

        var gef1 = M.makeGeneralExpressionFunction([v1, v2, v3], b1);
        var gef2 = M.makeGeneralExpressionFunction([v1], b1);
        var gef3 = M.makeGeneralExpressionFunction([v1], b2);

        expect(M.isGeneralExpressionFunction(gef1)).toBe(true);
        expect(M.isGeneralExpressionFunction(gef2)).toBe(true);
        expect(M.isGeneralExpressionFunction(gef3)).toBe(true);

        expect(gef1.freeVariables().length).toBe(0);
        expect(gef2.freeVariables().length).toBe(2);

        expect(() => {
            M.makeGeneralExpressionFunction([v1,v2,b2], b1);
        }).toThrow();
    });

    test('should reliably make general expression function applications', () => {
        var gEF1 = M.makeGeneralExpressionFunction(
            [OM.var('v1')],
            OM.simple('v1')
        );
        var gEFA1 = M.makeGeneralExpressionFunctionApplication(
            gEF1,
            OM.simple('sq.uare(v1)')
        );

        expect(M.isGeneralExpressionFunctionApplication(gEFA1)).toBe(true);

        var v1 = OM.var('P');
        M.setMetavariable(v1);
        var gEFA2 = M.makeGeneralExpressionFunctionApplication(
            v1,
            OM.simple('sq.uare(v1)')
        );

        expect(M.isGeneralExpressionFunctionApplication(gEFA2)).toBe(true);

        M.clearMetavariable(v1);

        expect(() => {
            M.makeGeneralExpressionFunctionApplication(v1, OM.simple('sq.uare(v1)'))
        }).toThrow();
    });

    test('should reliably detect whether a gEFA is applicable', () => {
        var gEF1 = M.makeGeneralExpressionFunction(
            [OM.var('v1')],
            OM.simple('v1')
        );
        var gEFA1 = M.makeGeneralExpressionFunctionApplication(
            gEF1,
            OM.simple('sq.uare(v1)')
        );

        expect(M.isGeneralExpressionFunction(gEF1)).toBe(true);
        expect(M.isGeneralExpressionFunctionApplication(gEFA1)).toBe(true);
        expect(M.canApplyGeneralExpressionFunctionApplication(gEFA1)).toBe(true);

        var gEFA2 = quick('_P_of_1');

        expect(M.isGeneralExpressionFunctionApplication(gEFA2)).toBe(true);
        expect(M.canApplyGeneralExpressionFunctionApplication(gEFA2)).toBe(false);
    });

    test('should correctly apply gEFAs to expressions', () => {
        var gEFA1 = efa(ef('v1', 'pl.us(v1,10)'), '1');
        var gEF1copy = gEFA1.copy();

        expect(M.applyGeneralExpressionFunctionApplication(gEFA1).equals(quick('pl.us(1,10)'))).toBe(true);
        expect(gEF1copy.equals(gEFA1)).toBe(true);

        var gEFA2 = efa(ef(['v1','v2','v3'], 'pl.us(v1,v2,v3)'), ['10','20','30']);
        var gEFA2copy = gEFA2.copy();

        expect(M.applyGeneralExpressionFunctionApplication(gEFA2).equals(quick('pl.us(10,20,30)'))).toBe(true);
        expect(gEFA2copy.equals(gEFA2)).toBe(true);
    });
});
