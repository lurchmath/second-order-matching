
/**
 * This test suite is for the classes that represent constraints and lists
 * thereof, and the functions related to those classes.
 */

import * as M from '../src/second-order-matching';
import {
    quick, ef, efa, CToString, CLToString, DEBUG_PRINT_CONSTRAINT,
    DEBUG_PRINT_CONSTRAINTLIST, DEBUG_PRINT_SOLS, newConstraintObject,
    newConstraints, newMC, lambdaString, newSolutions, checkSolutions
} from './utils';
const OM = M.OM;

describe('The Constraint class', () => {
    test('should construct new instances correctly', () => {
        var p1 = quick('_f(_x)');
        var e1 = quick('a(b)');
        var c = new M.Constraint(p1, e1);
        expect(c).toBeTruthy()
        expect(c instanceof M.Constraint).toBe(true)
        expect(c.pattern.sameObjectAs(p1)).toBe(true)
        expect(c.expression.sameObjectAs(e1)).toBe(true)

        expect(() => {
            new M.Constraint(p1, 'a');
        }).toThrow();
        expect(() => {
            new M.Constraint('a', e1);
        }).toThrow();
    });

    test('should correctly identify cases', () => {
        var c;

        // Test standard cases
        c = new M.Constraint(quick('a'), quick('a'));
        expect(c.case).toBe(M.CASES.IDENTITY);
        c = new M.Constraint(quick('neq(0,1)'), quick('neq(0,1)'));
        expect(c.case).toBe(M.CASES.IDENTITY);

        c = new M.Constraint(quick('_P'), quick('a'));
        expect(c.case).toBe(M.CASES.BINDING);

        c = new M.Constraint(quick('pl.us(X,Y)'), quick('pl.us(3,k)'));
        expect(c.case).toBe(M.CASES.SIMPLIFICATION);
        c = new M.Constraint(quick('neq(0,1)'), quick('neq(0,2)'));
        expect(c.case).toBe(M.CASES.SIMPLIFICATION);
        c = new M.Constraint(quick('for.all[_X,_X]'), quick('for.all[y,y]'));
        expect(c.case).toBe(M.CASES.SIMPLIFICATION);

        c = new M.Constraint(quick('_P_of_1'), quick('a'));
        expect(c.case).toBe(M.CASES.EFA);

        c = new M.Constraint(quick('k'), quick('p'));
        expect(c.case).toBe(M.CASES.FAILURE);
        c = new M.Constraint(quick('for.all[_X,_X]'), quick('there.exists[y,y]'));
        expect(c.case).toBe(M.CASES.FAILURE);

        // Test bindings
        c = new M.Constraint(
            quick('for.all[_x,_P]'),
            quick('for.all[r,greater.than(plus(sq(r),1),0)]')
        );
        expect(c.case).toBe(M.CASES.SIMPLIFICATION);

        c = new M.Constraint(
            quick('for.all[_x,_y,_P]'),
            quick('for.all[r,s,greater.than(plus(sq(r),1),0)]')
        );
        expect(c.case).toBe(M.CASES.SIMPLIFICATION);

        c = new M.Constraint(
            quick('for.all[_x,_y,_P]'),
            quick('for.all[r,greater.than(plus(sq(r),1),0)]')
        );
        expect(c.case).toBe(M.CASES.FAILURE);
    });

    test('should make copies correctly', () => {
        var p1 = quick('_f(_x)');
        var e1 = quick('a(b)');
        var c1 = new M.Constraint(p1, e1);
        var c2 = c1.copy();

        expect(c2).toBeTruthy();
        expect(c2).toBeInstanceOf(M.Constraint);

        expect(c2.pattern.sameObjectAs(p1)).toBe(false);
        expect(c2.expression.sameObjectAs(e1)).toBe(false);

        expect(c2.pattern.equals(p1)).toBe(true);
        expect(c2.expression.equals(e1)).toBe(true);
    });

    test('should check equality correctly', () => {
        var p1 = quick('_f(_x)');
        var e1 = quick('a(b)');
        var p2 = quick('_g(_x)');
        var e2 = quick('a(b)');
        var p3 = quick('_f(_x)');
        var e3 = quick('17');
        var c1 = new M.Constraint(p1, e1);
        var c2 = new M.Constraint(p2, e2);
        var c3 = new M.Constraint(p3, e3);

        expect(c1).toBeInstanceOf(M.Constraint);
        expect(c2).toBeInstanceOf(M.Constraint);
        expect(c3).toBeInstanceOf(M.Constraint);

        expect(c1.equals(c1)).toBe(true);
        expect(c2.equals(c2)).toBe(true);
        expect(c3.equals(c3)).toBe(true);

        expect(c1.equals(c2)).toBe(false);
        expect(c1.equals(c3)).toBe(false);
        expect(c2.equals(c1)).toBe(false);
        expect(c2.equals(c3)).toBe(false);
        expect(c3.equals(c1)).toBe(false);
        expect(c3.equals(c2)).toBe(false);

        var c3copy = c3.copy();
        expect(c3.equals(c3copy)).toBe(true);
        c3copy = new M.Constraint(p3.copy(), e3.copy());
        expect(c3.equals(c3copy)).toBe(true);
    });

    test('should check substiution property correctly`', () => {
        var p1 = quick('_X');
        var e1 = quick('a(b)');
        var p2 = quick('_g(_x)');
        var e2 = quick('a(b)');
        var e3 = quick('a');
        var c1 = new M.Constraint(p1, e1);
        var c2 = new M.Constraint(p2, e2);
        var c3 = new M.Constraint(e3, e3);

        expect(c1.isSubstitution()).toBe(true);
        expect(c2.isSubstitution()).toBe(false);
        expect(c3.isSubstitution()).toBe(false);
    });
});

describe('The ConstraintList class', () => {
    test('should construct instances with right new variable lists', () => {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        expect(CL1).toBeTruthy();
        expect(CL1 instanceof M.ConstraintList).toBe(true);
        let next = CL1.nextNewVariable();
        expect(next instanceof OM).toBe(true);
        expect(next.type).toBe('v');
        expect(next.name).toBe('v0');
        next = CL1.nextNewVariable();
        expect(next instanceof OM).toBe(true);
        expect(next.type).toBe('v');
        expect(next.name).toBe('v1');

        var CL2 = new M.ConstraintList(con1, con2, con3);
        expect(CL2).toBeTruthy();
        expect(CL2 instanceof M.ConstraintList).toBe(true);
        next = CL2.nextNewVariable();
        expect(next instanceof OM).toBe(true);
        expect(next.type).toBe('v');
        expect(next.name).toBe('v2');
        next = CL2.nextNewVariable();
        expect(next instanceof OM).toBe(true);
        expect(next.type).toBe('v');
        expect(next.name).toBe('v3');

        var CL3 = new M.ConstraintList(con1);
        expect(CL3).toBeTruthy();
        expect(CL3 instanceof M.ConstraintList).toBe(true);
        next = CL3.nextNewVariable();
        expect(next instanceof OM).toBe(true);
        expect(next.type).toBe('v');
        expect(next.name).toBe('v0');
        next = CL3.nextNewVariable();
        expect(next instanceof OM).toBe(true);
        expect(next.type).toBe('v');
        expect(next.name).toBe('v1');

        var CL4 = new M.ConstraintList(con3);
        expect(CL4).toBeTruthy();
        expect(CL4 instanceof M.ConstraintList).toBe(true);
        next = CL4.nextNewVariable();
        expect(next instanceof OM).toBe(true);
        expect(next.type).toBe('v');
        expect(next.name).toBe('v2');
        next = CL4.nextNewVariable();
        expect(next instanceof OM).toBe(true);
        expect(next.type).toBe('v');
        expect(next.name).toBe('v3');
    });

    test('should construct instances with right lengths', () => {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        expect(CL1).toBeTruthy();
        expect(CL1 instanceof M.ConstraintList).toBe(true);
        expect(CL1.length).toBe(0);
        var CL2 = new M.ConstraintList(con1, con2, con3);
        expect(CL2).toBeTruthy();
        expect(CL2 instanceof M.ConstraintList).toBe(true);
        expect(CL2.length).toBe(3);
        var CL3 = new M.ConstraintList(con1);
        expect(CL3).toBeTruthy();
        expect(CL3 instanceof M.ConstraintList).toBe(true);
        expect(CL3.length).toBe(1);
        var CL4 = new M.ConstraintList(con3);
        expect(CL4).toBeTruthy();
        expect(CL4 instanceof M.ConstraintList).toBe(true);
        expect(CL4.length).toBe(1);
    });

    test('should copy instances correctly', () => {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        var CL1copy = CL1.copy();
        expect(CL1).toBeTruthy();
        expect(CL1copy).toBeTruthy();
        expect(CL1 instanceof M.ConstraintList).toBe(true);
        expect(CL1copy instanceof M.ConstraintList).toBe(true);
        expect(CL1.length).toBe(CL1copy.length);
        expect(CL1.nextNewVariable().equals(CL1copy.nextNewVariable())).toBe(true);
        var CL2 = new M.ConstraintList(con1, con2, con3);
        var CL2copy = CL2.copy();
        expect(CL2).toBeTruthy();
        expect(CL2copy).toBeTruthy();
        expect(CL2 instanceof M.ConstraintList).toBe(true);
        expect(CL2copy instanceof M.ConstraintList).toBe(true);
        expect(CL2.length).toBe(CL2copy.length);
        expect(CL2.contents[0].equals(CL2copy.contents[0])).toBe(true);
        expect(CL2.contents[1].equals(CL2copy.contents[1])).toBe(true);
        expect(CL2.contents[2].equals(CL2copy.contents[2])).toBe(true);
        expect(CL2.nextNewVariable().equals(CL2copy.nextNewVariable())).toBe(true);
        var CL3 = new M.ConstraintList(con1);
        var CL3copy = CL3.copy();
        expect(CL3).toBeTruthy();
        expect(CL3copy).toBeTruthy();
        expect(CL3 instanceof M.ConstraintList).toBe(true);
        expect(CL3copy instanceof M.ConstraintList).toBe(true);
        expect(CL3.length).toBe(CL3copy.length);
        expect(CL3.contents[0].equals(CL3copy.contents[0])).toBe(true);
        expect(CL3.nextNewVariable().equals(CL3copy.nextNewVariable())).toBe(true);
        var CL4 = new M.ConstraintList(con3);
        var CL4copy = CL4.copy();
        expect(CL4).toBeTruthy();
        expect(CL4copy).toBeTruthy();
        expect(CL4 instanceof M.ConstraintList).toBe(true);
        expect(CL4copy instanceof M.ConstraintList).toBe(true);
        expect(CL4.length).toBe(CL4copy.length);
        expect(CL4.contents[0].equals(CL4copy.contents[0])).toBe(true);
        expect(CL4.nextNewVariable().equals(CL4copy.nextNewVariable())).toBe(true);
    });

    test('should add constraints correctly', () => {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        var CL2 = new M.ConstraintList(con1, con2, con3);

        expect(CL1.length).toBe(0);
        expect(CL2.length).toBe(3);

        var failedAdd = CL2.add(con1, con2, con3);
        expect(failedAdd.length).toBe(3);
        expect(CL2.contents.length).toBe(3);

        CL1.add(con1, con2, con3);
        expect(CL1.contents.length).toBe(3);
        expect(CL1.equals(CL2)).toBe(true);

        var CL3 = new M.ConstraintList(con1);
        expect(CL3.length).toBe(1);
        CL3.add(con2, con3)
        expect(CL3.length).toBe(3);
        expect(CL3.equals(CL2)).toBe(true);

        var CL4 = new M.ConstraintList(con3);
        expect(CL4.contents.length).toBe(1);
        CL4.add(con1, con2, con3);
        expect(CL4.contents.length).toBe(3);
        expect(CL4.equals(CL2)).toBe(true);
    });

    test('should subtract constraints correctly', () => {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        var CL2 = new M.ConstraintList(con1, con2, con3);

        expect(CL1.length).toBe(0);
        expect(CL2.length).toBe(3);

        CL2.remove(con1, con2, con3);
        expect(CL2.length).toBe(0);
        expect(CL2.equals(CL1)).toBe(true);

        var CL3 = new M.ConstraintList(con1);
        expect(CL3.contents.length).toBe(1);
        CL3.remove(con2);
        expect(CL3.contents.length).toBe(1);
        CL3.remove(con1);
        expect(CL3.contents.length).toBe(0);
        expect(CL3.equals(CL1)).toBe(true);
    });

    test('should empty contents correctly', () => {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        var CL2 = new M.ConstraintList(con1, con2, con3);

        expect(CL1.length).toBe(0);
        expect(CL2.length).toBe(3);

        CL1.empty();
        CL2.empty();

        expect(CL1.length).toBe(0);
        expect(CL2.length).toBe(0);
    });

    test('should find constraint indices correctly', () => {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        var CL2 = new M.ConstraintList(con1, con2, con3);
        var CL3 = new M.ConstraintList(con1);
        var CL4 = new M.ConstraintList(con3);
        expect(CL1.firstSatisfying(() => true)).toBeNull();
        expect(CL2.firstSatisfying(() => true)).toBe(con1);
        expect(CL2.firstSatisfying(c => c.pattern.type === 'v')).toBe(con3);
        expect(CL3.firstSatisfying(c => c.pattern.type === 'v')).toBeNull();
        expect(CL4.firstSatisfying(c => c.pattern.type === 'v')).toBe(con3);
        expect(CL2.firstSatisfying(c => c.expression.type === 'v')).toBe(con2);
        expect(CL4.firstSatisfying(c => c.expression.type === 'v')).toBe(con3);
        expect(CL3.firstSatisfying(c => c.expression.type === 'v')).toBeNull();
    });

    test('should find constraint pairs correctly', () => {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        var CL2 = new M.ConstraintList(con1, con2, con3);
        var CL3 = new M.ConstraintList(con1, con2);
        var CL4 = new M.ConstraintList(con3);
        expect(CL1.firstPairSatisfying(() => true)).toBeNull();
        var [a, b] = Array.from(CL2.firstPairSatisfying(() => true));
        expect(a).toBe(con1);
        expect(b).toBe(con2);
        var expressionTypesEqual = (constr1, constr2) => { return constr1.expression.type === constr2.expression.type; }
        expect(CL1.firstPairSatisfying(expressionTypesEqual)).toBeNull();
        expect(CL2.firstPairSatisfying(expressionTypesEqual)).toEqual([con2, con3]);
        expect(CL3.firstPairSatisfying(expressionTypesEqual)).toBeNull();
        expect(CL4.firstPairSatisfying(expressionTypesEqual)).toBeNull();
        var biggerPattern = (constr1, constr2) => {
            return constr1.pattern.simpleEncode().length > constr2.pattern.simpleEncode().length;
        }
        expect(CL1.firstPairSatisfying(biggerPattern)).toBeNull();
        expect(CL2.firstPairSatisfying(biggerPattern)).toEqual([con1, con3]);
        expect(CL3.firstPairSatisfying(biggerPattern)).toEqual([con2, con1]);
        expect(CL4.firstPairSatisfying(biggerPattern)).toBeNull();
    });

    test('should get best case correctly', () => {
        var failure_constraint = new M.Constraint(quick('k'), quick('p'));
        var identity_constraint = new M.Constraint(quick('a'), quick('a'));
        var binding_constraint = new M.Constraint(quick('_Y'), quick('k'));
        var simplification_constraint = new M.Constraint(quick('and(_P,_Q)'), quick('and(a,b)'));
        var efa_constraint = new M.Constraint(quick('_P_of_1'), quick('0'));
        var CL = new M.ConstraintList(
            efa_constraint,
            binding_constraint,
            simplification_constraint,
            failure_constraint,
            identity_constraint,
        );

        expect(CL.getBestCase()).toBe(failure_constraint);
        CL.remove(failure_constraint);
        expect(CL.getBestCase()).toBe(identity_constraint);
        CL.remove(identity_constraint);
        expect(CL.getBestCase()).toBe(binding_constraint);
        CL.remove(binding_constraint);
        expect(CL.getBestCase()).toBe(simplification_constraint);
        CL.remove(simplification_constraint);
        expect(CL.getBestCase()).toBe(efa_constraint);
        CL.remove(efa_constraint);
        expect(CL.getBestCase()).toBeNull();
    });

    test('should know if an instance is a function', () => {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var con4 = new M.Constraint(quick('_v0'), quick('thing(one,two)'));
        var con5 = new M.Constraint(quick('_yo'), quick('dawg'));
        var empty = new M.ConstraintList();
        var fun1 = new M.ConstraintList(con3);
        var fun2 = new M.ConstraintList(con4);
        var fun3 = new M.ConstraintList(con3, con5);
        var fun4 = new M.ConstraintList(con4, con5);
        var non1 = new M.ConstraintList(con1, con2);
        var non2 = new M.ConstraintList(con3, con4);
        expect(empty.isFunction()).toBe(true);
        expect(fun1.isFunction()).toBe(true);
        expect(fun2.isFunction()).toBe(true);
        expect(fun3.isFunction()).toBe(true);
        expect(fun4.isFunction()).toBe(true);
        expect(non1.isFunction()).toBe(false);
        expect(non2.isFunction()).toBe(false);
    });

    test('should correctly handle lookups', () => {
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var con4 = new M.Constraint(quick('_v0'), quick('thing(one,two)'));
        var con5 = new M.Constraint(quick('_yo'), quick('dawg'));
        var empty = new M.ConstraintList();
        var fun1 = new M.ConstraintList(con3);
        var fun2 = new M.ConstraintList(con4);
        var fun3 = new M.ConstraintList(con3, con5);
        var fun4 = new M.ConstraintList(con4, con5);
        expect(empty.lookup('v0')).toBeNull();
        expect(empty.lookup('yo')).toBeNull();
        expect(fun1.lookup('v0').equals(quick('v1'))).toBe(true);
        expect(fun1.lookup('yo')).toBeNull();
        expect(fun2.lookup('v0').equals(quick('thing(one,two)'))).toBe(true);
        expect(fun2.lookup('yo')).toBeNull();
        expect(fun3.lookup('v0').equals(quick('v1'))).toBe(true);
        expect(fun3.lookup('yo').equals(quick('dawg'))).toBe(true);
        expect(fun4.lookup('v0').equals(quick('thing(one,two)'))).toBe(true);
        expect(fun4.lookup('yo').equals(quick('dawg'))).toBe(true);
    });

    test('should check equality correctly', () => {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        var CL2 = new M.ConstraintList(con1, con2, con3);
        var CL3 = new M.ConstraintList(con1, con3);
        var CL4 = new M.ConstraintList(con3, con1, con2);

        expect(CL1.equals(CL1)).toBe(true);
        expect(CL1.equals(CL2)).toBe(false);
        expect(CL1.equals(CL3)).toBe(false);
        expect(CL1.equals(CL4)).toBe(false);

        expect(CL2.equals(CL1)).toBe(false);
        expect(CL2.equals(CL2)).toBe(true);
        expect(CL2.equals(CL3)).toBe(false);
        expect(CL2.equals(CL4)).toBe(true);

        expect(CL3.equals(CL1)).toBe(false);
        expect(CL3.equals(CL2)).toBe(false);
        expect(CL3.equals(CL3)).toBe(true);
        expect(CL3.equals(CL4)).toBe(false);

        expect(CL4.equals(CL1)).toBe(false);
        expect(CL4.equals(CL2)).toBe(true);
        expect(CL4.equals(CL3)).toBe(false);
        expect(CL4.equals(CL4)).toBe(true);

        var CL2copy = CL2.copy();
        expect(CL2copy.equals(CL1)).toBe(false);
        expect(CL2copy.equals(CL2)).toBe(true);
        expect(CL2copy.equals(CL3)).toBe(false);
        expect(CL2copy.equals(CL4)).toBe(true);
    });
});

describe('Constraint manipulation functions',  () => {
    test('should correctly break constraints into argument pairs', () => {
        var constr, arg_pairs;

        // Check for applications
        constr = new M.Constraint(quick('and(_P,_Q)'), quick('and(a,or(b,c))'));
        expect(constr.case).toBe(M.CASES.SIMPLIFICATION);
        arg_pairs = constr.breakIntoArgPairs();
        expect(arg_pairs.length).toBe(3);
        expect(arg_pairs[0].equals(new M.Constraint(quick('and'), quick('and')))).toBe(true);
        expect(arg_pairs[1].equals(new M.Constraint(quick('_P'), quick('a')))).toBe(true);
        expect(arg_pairs[2].equals(new M.Constraint(quick('_Q'), quick('or(b,c)')))).toBe(true);

        constr = new M.Constraint(
            quick('times(plus(_X,_Y),minus(_X,_Y))'),
            quick('times(plus(3,k),minus(3,p))')
        );
        arg_pairs = constr.breakIntoArgPairs();
        expect(arg_pairs.length).toBe(3);

        // Check for bindings
        constr = new M.Constraint(
            quick('for.all[_x,_P]'),
            quick('for.all[r,plus(0,1)]')
        );
        arg_pairs = constr.breakIntoArgPairs();
        expect(arg_pairs.length).toBe(2);
        expect(arg_pairs[0].equals(new M.Constraint(quick('_x'), quick('r')))).toBe(true);
        expect(arg_pairs[1].equals(new M.Constraint(quick('_P'), quick('plus(0,1)')))).toBe(true);

        constr = new M.Constraint(
            quick('for.all[_x,_y,_z,_P]'),
            quick('for.all[r,s,t,plus(0,1)]')
        );
        arg_pairs = constr.breakIntoArgPairs();
        expect(arg_pairs.length).toBe(4);
        expect(arg_pairs[0].equals(new M.Constraint(quick('_x'), quick('r')))).toBe(true);
        expect(arg_pairs[1].equals(new M.Constraint(quick('_y'), quick('s')))).toBe(true);
        expect(arg_pairs[2].equals(new M.Constraint(quick('_z'), quick('t')))).toBe(true);
        expect(arg_pairs[3].equals(new M.Constraint(quick('_P'), quick('plus(0,1)')))).toBe(true);
    });
});
