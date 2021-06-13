
/**
 * This test suite is for the functions that deal with variables, including
 * metavariables, instantiations of them, alpha and beta conversion, and
 * creating new (unused) variable names.
 */

import * as M from '../index';
import {
    quick, ef, efa, CToString, CLToString, DEBUG_PRINT_CONSTRAINT,
    DEBUG_PRINT_CONSTRAINTLIST, DEBUG_PRINT_SOLS, newConstraintObject,
    newConstraints, newMC, lambdaString, newSolutions, checkSolutions
} from './utils';
import { OM } from '../src/openmath.js';

describe('Metavariables', () => {
    test('should reliably mark metavariables', () => {
        // Check that functions work correctly
        var x = OM.var('x');
        expect(M.API.isMetavariable(x)).toBe(false);
        M.API.setMetavariable(x);
        expect(M.API.isMetavariable(x)).toBe(true);
        M.API.clearMetavariable(x);
        expect(M.API.isMetavariable(x)).toBe(false);
        // We should only be able to mark variables and symbols
        var one = OM.int(1);
        var fofx = OM.simple('f(x)');
        expect(M.API.isMetavariable(one)).toBe(false);
        expect(M.API.isMetavariable(fofx)).toBe(false);
        expect(M.API.setMetavariable(one)).toBe(null);
        expect(M.API.setMetavariable(fofx)).toBe(null);
        expect(M.API.isMetavariable(one)).toBe(false);
        expect(M.API.isMetavariable(fofx)).toBe(false);
    });
});

describe('Instantiation', () => {
    test('should correctly apply a single instantiation', () => {
        // Test the simplest case of instantiating a metavariable
        var sub1 = new M.Constraint(quick('_P'), quick('a'));
        var sub2 = new M.Constraint(quick('_Q'), quick('o.r(b,c)'));
        var p1 = quick('_P');
        var p1copy = p1.copy();
        var p2 = quick('_Q');
        var p2copy = p2.copy();

        expect(sub1.applyInstantiation(p1).equals(quick('a'))).toBe(true);
        expect(sub2.applyInstantiation(p2).equals(quick('o.r(b,c)'))).toBe(true);
        // Check that the original patterns were not altered
        expect(p1.equals(p1copy)).toBe(true);
        expect(p2.equals(p2copy)).toBe(true);

        // Test the cases where instantiation does nothing
        var p3 = quick('p');
        var p3copy = p3.copy();

        expect(sub1.applyInstantiation(p3).equals(p3copy)).toBe(true);
        expect(p3.equals(p3copy)).toBe(true);
        expect(sub2.applyInstantiation(p1).equals(p1copy)).toBe(true);
        expect(sub1.applyInstantiation(p2).equals(p2copy)).toBe(true);

        // Test the case where the pattern is an application
        var sub3 = new M.Constraint(quick('_P'), ef('v1', '1'));
        var p4 = quick('_P_of_a');
        var p4copy = p4.copy();

        expect(sub3.applyInstantiation(p4).equals(quick('1'))).toBe(true);
        expect(p4.equals(p4copy)).toBe(true);

        var sub4 = new M.Constraint(quick('_P'), ef('v1', '_H(v1)'));

        expect(sub4.applyInstantiation(p4).equals(quick('_H(a)'))).toBe(true);
        expect(p4.equals(p4copy)).toBe(true);

        // Test the case where the pattern is a binding
        var p6 = quick('for.all[y,gr.th(sq.uare(x),y)]');
        var p6copy = p6.copy();
        var sub6 = new M.Constraint(quick('x'), quick('a'));
        expect(sub6.applyInstantiation(p6).equals(quick('for.all[y,gr.th(sq.uare(a),y)]'))).toBe(true);
        expect(p6.equals(p6copy)).toBe(true);

        // Test the case where replacement can cause variable capture
        var p7 = quick('for.all[x,gr.th(sq.uare(x),c)]');
        var p7copy = p7.copy();
        var sub7 = new M.Constraint(quick('c'), quick('x'));
        expect(sub7.applyInstantiation(p7).equals(quick('for.all[x0,gr.th(sq.uare(x0),x)]'))).toBe(true);
        expect(p7.equals(p7copy)).toBe(true);
    });

    test('should correctly apply a list of instantiations', () => {
        // Check the case where the substitutions transform a pattern into an expression
        var con1 = new M.Constraint(quick('l.and(_P,_Q)'), quick('l.and(a,l.or(b,c))'));
        var sub1 = new M.Constraint(quick('_P'), quick('a'));
        var sub2 = new M.Constraint(quick('_Q'), quick('l.or(b,c)'));

        var CL1 = new M.ConstraintList(con1);
        var SL1 = new M.ConstraintList(sub1, sub2);

        SL1.instantiate(CL1);
        expect(CL1.contents[0].pattern.equals(quick('l.and(a,l.or(b,c))'))).toBe(true);
        expect(CL1.contents[0].pattern.equals(CL1.contents[0].expression)).toBe(true);
        // Check that the order of the subs list does not matter
        var CL1new = new M.ConstraintList(con1);
        SL1 = new M.ConstraintList(sub2, sub1);
        SL1.instantiate(CL1new);
        expect(CL1new.equals(CL1)).toBe(true);

        // Check the case where the substitutions do not make the pattern exactly match the expression
        var con2 = new M.Constraint(
            quick('m.ply(p.lus(_X,_Y),mi.nus(_X,_Y))'),
            quick('m.ply(p.lus(3,k),mi.nus(3,p))')
        );
        var sub3 = new M.Constraint(quick('_X'), quick('3'));
        var sub4 = new M.Constraint(quick('_Y'), quick('k'));

        var CL2 = new M.ConstraintList(con2);
        var SL2 = new M.ConstraintList(sub3, sub4);

        SL2.instantiate(CL2);
        expect(CL2.contents[0].pattern.equals(quick('m.ply(p.lus(3,k),mi.nus(3,k))'))).toBe(true);
        expect(CL2.equals(
            new M.ConstraintList(
                new M.Constraint(
                    quick('m.ply(p.lus(3,k),mi.nus(3,k))'),
                    con2.expression
                )
            )
        )).toBe(true);

        // Check the case where substiutions contain EFs as expressions
        var con3 = new M.Constraint(
            quick('l.and(_P_of_1,_P_of_2)'),
            quick('l.and(n.eq(0,1),n.eq(0,2))')
        );
        var sub5 = new M.Constraint(
            quick('_P'),
            ef(quick('v1'), quick('n.eq(_H1_of_v1,_H2_of_v1)'))
        );
        var sub6 = new M.Constraint(
            quick('_H1'),
            ef(quick('v1'), quick('0'))
        );
        var sub7 = new M.Constraint(
            quick('_H2'),
            ef(quick('v1'), quick('v1'))
        );

        var CL3 = new M.ConstraintList(con3);
        var SL3 = new M.ConstraintList(sub5, sub6, sub7);

        SL3.instantiate(CL3);
        expect(CL3.contents[0].pattern.equals(con3.expression)).toBe(true);
        expect(CL3.contents[0].pattern.equals(CL3.contents[0].expression)).toBe(true);

        // In this case, the order of substitutions does matter.
        // But, replacing the temporary variables should give the same result.
        var sub8 = sub5.copy();
        sub8.expression.replaceWith(sub6.applyInstantiation(sub8.expression));
        sub8.expression.replaceWith(sub7.applyInstantiation(sub8.expression));
        var CL4 = new M.ConstraintList(con3)
        new M.ConstraintList(sub8).instantiate(CL4);
        expect(CL4.contents[0].pattern.equals(con3.expression)).toBe(true);
        expect(CL4.contents[0].pattern.equals(CL4.contents[0].expression)).toBe(true);
    });
});

describe('Expression manipluation', () => {
    test('should get new variables relative to expressions', () => {
        var e1 = OM.simple('v1');
        var e2 = OM.simple('f.a[v1,x0,x1,x2]')
        var e3 = OM.simple('F(x0,x1,x2,x3,x4)');
        var e4 = M.makeExpressionFunction(
            [OM.var('x1'), OM.var('a')], OM.simple('plus(x1,a)')
        );
        var e5 = OM.simple('x');

        var x0 = M.getNewVariableRelativeTo(e1);
        var x3 = M.getNewVariableRelativeTo(e2);
        var x5 = M.getNewVariableRelativeTo(e3);
        var x2 = M.getNewVariableRelativeTo(e4);
        var x0two = M.getNewVariableRelativeTo(e5);

        expect(x0 instanceof OM).toBe(true);
        expect(x3 instanceof OM).toBe(true);
        expect(x5 instanceof OM).toBe(true);
        expect(x3 instanceof OM).toBe(true);
        expect(x0two instanceof OM).toBe(true);

        expect(x0.equals(OM.var('x0'))).toBe(true);
        expect(x3.equals(OM.var('x3'))).toBe(true);
        expect(x5.equals(OM.var('x5'))).toBe(true);
        expect(x2.equals(OM.var('x2'))).toBe(true);
        expect(x0two.equals(OM.var('x0'))).toBe(true);

        var x3two = M.getNewVariableRelativeTo(e1, e2);
        var x5two = M.getNewVariableRelativeTo(e1, e2, e3, e4, e5);

        expect(x3two instanceof OM).toBe(true);
        expect(x5two instanceof OM).toBe(true);

        expect(x3two.equals(OM.var('x3'))).toBe(true);
        expect(x5two.equals(OM.var('x5'))).toBe(true);

        expect(x3two.equals(M.getNewVariableRelativeTo(e2,e1))).toBe(true);
        expect(x5two.equals(M.getNewVariableRelativeTo(e5, e3))).toBe(true);
    });

    test('should implement alpha coversion for cases with no capture', () => {
        var v1 = OM.var('v1');
        var v2 = OM.var('v2');
        var b1 = OM.simple('F(v1,v2)');
        var b2 = OM.simple('F(r1,v2)');
        var b3 = OM.simple('F(r1,r2)');
        var r1 = OM.simple('r1');
        var r2 = OM.simple('r2');
        var gef1 = M.makeExpressionFunction([v1, v2], b1);
        var gef1copy = gef1.copy();

        expect(M.isExpressionFunction(gef1)).toBe(true);
        var ac1 = M.alphaConvert(gef1, v1, r1);
        expect(ac1.equals(M.makeExpressionFunction([r1, v2], b2))).toBe(true);
        var ac2 = M.alphaConvert(ac1, v2, r2);
        expect(ac2.equals(M.makeExpressionFunction([r1, r2], b3))).toBe(true);
        expect(gef1.equals(gef1copy)).toBe(true);

        var b4 = OM.simple('F(v1,v2,c)');
        var gef2 = M.makeExpressionFunction([v1, v2], b4);
        expect(() => {
            M.alphaConvert(gef2, OM.var('c'), v1);
        }).toThrow();
    });

    test('should implement alpha conversion for cases with capture', () => {
        var bind1 = OM.simple('lamb.da[z,for.all[y,plus(y,z)]]')
        var ac1 = M.alphaConvert(bind1, OM.var('z'), OM.var('y'));
        var expected1 = OM.simple('lamb.da[y,for.all[x0,plus(x0,y)]]')
        expect(ac1.equals(expected1)).toBe(true);

        var v1 = OM.var('v1');
        var v2 = OM.var('v2');
        var b1 = OM.simple('for.all[x,pl.us(x,v1,v2)]');
        var gef1 = M.makeExpressionFunction([v1,v2], b1);
        var expected2 = M.makeExpressionFunction(
            [OM.var('x'), v2],
            OM.simple('for.all[x0,pl.us(x0,x,v2)]')
        );
        var gef1copy = gef1.copy();

        expect(M.isExpressionFunction(gef1)).toBe(true);
        var ac2 = M.alphaConvert(gef1, v1, OM.var('x'));
        expect(ac2.equals(expected2)).toBe(true);
        expect(gef1.equals(gef1copy)).toBe(true);
    });

    test('should implement variable replacement without capture', () => {
        var e1 = OM.simple('F(a,b,c,d)');
        var expected1 = OM.simple('F(R,b,c,d)');
        M.replaceWithoutCapture(e1, OM.var('a'), OM.var('R'));
        expect(e1.equals(expected1)).toBe(true);

        var bind1 = OM.simple('for.all[z,plus(z,a)]');
        var expected2 = OM.simple('for.all[x0,plus(x0,z)]');
        M.replaceWithoutCapture(bind1, OM.var('a'), OM.var('z'));
        expect(bind1.equals(expected2)).toBe(true);

        var bind2 = OM.simple('for.all[x,for.all[y,for.all[z,pl.us(x,y,z,a)]]]');
        var expected3 = OM.simple('for.all[x0,for.all[y,for.all[z,pl.us(x0,y,z,x)]]]');
        var bind3 = bind2.copy();
        var expected4 = OM.simple('for.all[x,for.all[x0,for.all[z,pl.us(x,x0,z,y)]]]');
        var bind4 = bind2.copy();
        var expected5 = OM.simple('for.all[x,for.all[y,for.all[x0,pl.us(x,y,x0,z)]]]');
        M.replaceWithoutCapture(bind2, OM.var('a'), OM.var('x'));
        expect(bind2.equals(expected3)).toBe(true);
        M.replaceWithoutCapture(bind3, OM.var('a'), OM.var('y'));
        expect(bind3.equals(expected4)).toBe(true);
        M.replaceWithoutCapture(bind4, OM.var('a'), OM.var('z'));
        expect(bind4.equals(expected5)).toBe(true);
        M.replaceWithoutCapture(bind2, OM.var('x'), OM.var('y'));
        M.replaceWithoutCapture(bind2, OM.var('y'), OM.var('z'));
        var expected6 = OM.simple('for.all[x0,for.all[x1,for.all[x2,pl.us(x0,x1,x2,z)]]]');
        expect(bind2.equals(expected6)).toBe(true);

        var gef1 = M.makeExpressionFunction(
            [OM.var('v1'), OM.var('v2')],
            OM.simple('for.all[v3,pl.us(v1,v2,v3,a)]')
        );
        var expected7 = M.makeExpressionFunction(
            [OM.var('x0'), OM.var('v2')],
            OM.simple('for.all[v3,pl.us(x0,v2,v3,v1)]')
        );
        var expected8 = M.makeExpressionFunction(
            [OM.var('x0'), OM.var('x1')],
            OM.simple('for.all[v3,pl.us(x0,x1,v3,v2)]')
        );
        var expected9 = M.makeExpressionFunction(
            [OM.var('x0'), OM.var('x1')],
            OM.simple('for.all[x2,pl.us(x0,x1,x2,v3)]')
        );
        var expected10 = M.makeExpressionFunction(
            [OM.var('x3'), OM.var('x1')],
            OM.simple('for.all[x2,pl.us(x3,x1,x2,x0)]')
        );
        M.replaceWithoutCapture(gef1, OM.var('a'), OM.var('v1'));
        expect(gef1.equals(expected7)).toBe(true);
        M.replaceWithoutCapture(gef1, OM.var('v1'), OM.var('v2'));
        expect(gef1.equals(expected8)).toBe(true);
        M.replaceWithoutCapture(gef1, OM.var('v2'), OM.var('v3'));
        expect(gef1.equals(expected9)).toBe(true);
        M.replaceWithoutCapture(gef1, OM.var('v3'), OM.var('x0'));
        expect(gef1.equals(expected10)).toBe(true);

        var bind3 = OM.simple('for.all[x,P(x,y)]');
        M.replaceWithoutCapture(bind3, OM.var('x'), OM.var('z'));
        expect(bind3.equals(OM.simple('for.all[z,P(z,y)]'))).toBe(true);
        var bind3 = OM.simple('for.all[a,b,c,R(f(a),g(b),h(c))]');
        M.replaceWithoutCapture(bind3, OM.var('b'), OM.var('B'));
        expect(bind3.equals(OM.simple('for.all[a,B,c,R(f(a),g(B),h(c))]'))).toBe(true);

        var bind3 = OM.simple('for.all[x,P(x,y)]');
        M.replaceWithoutCapture(bind3,OM.var('y'),OM.simple('Q(x,y,x0)'))
        expect(bind3.equals(OM.simple('for.all[x1,P(x1,Q(x,y,x0))]'))).toBe(true);
    });

    test('should implement alpha equivalence for expressions', () => {
        var v1 = OM.var('v1');
        var v2 = OM.var('v2');
        var v3 = OM.var('v3');

        expect(M.alphaEquivalent(v1,v2)).toBe(false);
        expect(M.alphaEquivalent(v2,v1)).toBe(false);
        expect(M.alphaEquivalent(v3,v1)).toBe(false);

        var gef1 = M.makeExpressionFunction([v1], v1);
        var gef2 = M.makeExpressionFunction([v2], v2);
        var gef3 = M.makeExpressionFunction([v1], OM.var('randomvar'));

        var gef1copy = gef1.copy();
        var gef2copy = gef2.copy();
        var gef3copy = gef3.copy();

        expect(M.alphaEquivalent(gef1, gef1)).toBe(true);
        expect(M.alphaEquivalent(gef1, gef2)).toBe(true);
        expect(M.alphaEquivalent(gef1, gef3)).toBe(false);
        expect(M.alphaEquivalent(gef2, gef1)).toBe(true);
        expect(M.alphaEquivalent(gef2, gef2)).toBe(true);
        expect(M.alphaEquivalent(gef2, gef3)).toBe(false);
        expect(M.alphaEquivalent(gef3, gef1)).toBe(false);
        expect(M.alphaEquivalent(gef3, gef2)).toBe(false);
        expect(M.alphaEquivalent(gef3, gef3)).toBe(true);
        expect(M.alphaEquivalent(gef1, v1)).toBe(false);
        expect(M.alphaEquivalent(v1, gef1)).toBe(false);

        expect(gef1copy.equals(gef1)).toBe(true);
        expect(gef2copy.equals(gef2)).toBe(true);
        expect(gef3copy.equals(gef3)).toBe(true);

        var gef4 = M.makeExpressionFunction(
            [v1,v2,v3], OM.simple('pl.us(v1,v2,v3)')
        );
        var gef5 = M.makeExpressionFunction(
            [v3,v2,v1], OM.simple('pl.us(v3,v2,v1)')
        );
        var gef6 = M.makeExpressionFunction(
            [OM.var('a'), OM.var('b'), OM.var('c')], OM.simple('pl.us(a,b,c)')
        );

        expect(M.alphaEquivalent(gef4,gef1)).toBe(false);
        expect(M.alphaEquivalent(gef5,gef2)).toBe(false);
        expect(M.alphaEquivalent(gef6,gef3)).toBe(false);

        expect(M.alphaEquivalent(gef4,gef4)).toBe(true);
        expect(M.alphaEquivalent(gef4,gef5)).toBe(true);
        expect(M.alphaEquivalent(gef4,gef6)).toBe(true);
        expect(M.alphaEquivalent(gef5,gef4)).toBe(true);
        expect(M.alphaEquivalent(gef5,gef5)).toBe(true);
        expect(M.alphaEquivalent(gef5,gef6)).toBe(true);
        expect(M.alphaEquivalent(gef6,gef4)).toBe(true);
        expect(M.alphaEquivalent(gef6,gef5)).toBe(true);
        expect(M.alphaEquivalent(gef6,gef6)).toBe(true);

        var gef7 = M.makeExpressionFunction(
            [v1],
            OM.simple('for.all[x,pl.us(x,v1)]')
        );
        var gef8 = M.makeExpressionFunction(
            [v2],
            OM.simple('for.all[x,pl.us(x,v2)]')
        );
        var gef9 = M.makeExpressionFunction(
            [v3],
            OM.simple('for.all[x,pl.us(x,randomvar)]')
        );

        expect(M.alphaEquivalent(gef7,gef4)).toBe(false);
        expect(M.alphaEquivalent(gef8,gef5)).toBe(false);
        expect(M.alphaEquivalent(gef9,gef6)).toBe(false);

        expect(M.alphaEquivalent(gef7,gef7)).toBe(true);
        expect(M.alphaEquivalent(gef7,gef8)).toBe(true);
        expect(M.alphaEquivalent(gef7,gef9)).toBe(false);
        expect(M.alphaEquivalent(gef8,gef7)).toBe(true);
        expect(M.alphaEquivalent(gef8,gef8)).toBe(true);
        expect(M.alphaEquivalent(gef8,gef9)).toBe(false);
        expect(M.alphaEquivalent(gef9,gef7)).toBe(false);
        expect(M.alphaEquivalent(gef9,gef8)).toBe(false);
        expect(M.alphaEquivalent(gef9,gef9)).toBe(true);
    });

    test('should implement beta reduction for expressions in cases with no capture', () => {
        var v1 = OM.var('v1');
        var v2 = OM.var('v2');
        var b1 = OM.simple('F(v1,v2)');
        var e1 = OM.simple('G(X)');
        var e2 = OM.simple('Y');
        var gef1 = M.makeExpressionFunction([v1, v2], b1);

        expect(() => {
            M.betaReduce(b1, [e1]);
        }).toThrow();
        expect(() => {
            M.betaReduce(gef1, e1);
        }).toThrow();
        expect(() => {
            M.betaReduce(gef1, [e1])
        }).toThrow();

        var br1 = M.betaReduce(gef1, [e1, e2]);
        expect(br1.equals(OM.simple('F(G(X),Y)'))).toBe(true);
        var br2 = M.betaReduce(gef1, [e2, e1]);
        expect(br2.equals(OM.simple('F(Y,G(X))'))).toBe(true);
        expect(br1.equals(gef1.body)).toBe(false);
        expect(br2.equals(gef1.body)).toBe(false);
    });

    test('should implement beta reduction for expressions in cases with capture', () => {
        var v1 = OM.var('v1');
        var v2 = OM.var('v2');
        var v3 = OM.var('v3');

        var b1 = OM.simple('for.all[x,pl.us(v1,v2,x)]')
        var gef1 = M.makeExpressionFunction([v1, v2], b1);
        var gef1copy = gef1.copy();
        var expected1 = OM.simple('for.all[x0,pl.us(x,y,x0)]');
        var br1 = M.betaReduce(gef1, [OM.var('x'), OM.var('y')]);
        expect(br1.equals(expected1)).toBe(true);
        expect(gef1.equals(gef1copy)).toBe(true);

        var b2 = OM.simple('for.all[x,for.all[y,for.all[z,pl.us(x,y,z,v1,v2,v3)]]]');
        var gef2 = M.makeExpressionFunction([v1,v2,v3], b2);
        var gef2copy = gef2.copy();
        var expected2 = OM.simple('for.all[x0,for.all[x1,for.all[x2,pl.us(x0,x1,x2,x,y,z)]]]');
        var br2 = M.betaReduce(gef2, [OM.var('x'), OM.var('y'), OM.var('z')]);
        expect(br2.equals(expected2)).toBe(true);
        expect(gef2.equals(gef2copy)).toBe(true);
    });
});
