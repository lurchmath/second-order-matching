const M = require('./second-order-matching');
const OM = M.OM;

/**
 * Takes strings for OM.simple, any variable begginning with an underscore 
 * has the underscore removed and is flagged as a metavariable.
 * Supports symbols.
 * Supports the convention that `f_of_x` expands to `efa(quick('f'), quick('x'))`.
 * The 'f' and 'x' in the previous example could also be metavariables: `_f_of__x`.
 * @param string - the string for conversion
 */
function quick(string) {
    var tree = OM.simple(string);
    if (typeof tree === 'string') {
        throw ('Error calling quick on' + string + ' : ' + tree);
    }
    var variables = tree.descendantsSatisfying((x) => { return x.type == 'v'; });
    for (let i = 0; i < variables.length; i++) {
        var variable = variables[i];
        var match = /^(.+)_of_(.+)$/.exec(variable.name);
        if (match !== null) {
            variable.replaceWith(efa(quick(match[1]), quick(match[2])));
        } else if (/^_/.test(variable.name)) {
            variable.replaceWith(OM.simple(variable.name.slice(1)));
            M.setMetavariable(variable);
        }
    }
    var symbols = tree.descendantsSatisfying((x) => { return x.type == 'sy' });
    for (let i = 0; i < symbols.length; i++) {
        var sym = symbols[i];
        if (/^_/.test(sym.cd)) {
            var replacement_string = sym.cd.slice(1) + '.' + sym.name;
            sym.replaceWith(OM.simple(replacement_string));
            M.setMetavariable(sym);
        }
    }
    return tree;
}

/**
 * Helper function to quickly make expression functions.
 */
function ef(variable, body) {
    if (!(variable instanceof OM)) {
        variable = quick(variable);
    }
    if (!(body instanceof OM)) {
        body = quick(body);
    }
    return M.makeExpressionFunction(variable, body);
}

/**
 * Helper function to quickly make expression function applications.
 */
function efa(func, param) {
    if (!(func instanceof OM)) {
        func = quick(func);
    }
    if (!(param instanceof OM)) {
        param = quick(param);
    }
    return M.makeExpressionFunctionApplication(func, param);
}

describe('Global functions', () => {
    test('should reliably mark metavariables', () => {
        // Check that functions work correctly
        var x = OM.var('x');
        expect(M.isMetavariable(x)).toBe(false);
        M.setMetavariable(x);
        expect(M.isMetavariable(x)).toBe(true);
        M.clearMetavariable(x);
        expect(M.isMetavariable(x)).toBe(false);
        // We should only be able to mark variables and symbols
        var one = OM.int(1);
        var fofx = OM.simple('f(x)');
        expect(M.isMetavariable(one)).toBe(false);
        expect(M.isMetavariable(fofx)).toBe(false);
        expect(M.setMetavariable(one)).toBe(null);
        expect(M.setMetavariable(fofx)).toBe(null);
        expect(M.isMetavariable(one)).toBe(false);
        expect(M.isMetavariable(fofx)).toBe(false);
    });

    test('should reliably make expression functions', () => {
        var x = OM.simple('x');
        var body1 = OM.simple('x(1,2)');
        var body2 = OM.simple('z.z(x,y.y)');
        expect(M.isExpressionFunction(x)).toBe(false);
        expect(M.isExpressionFunction(body1)).toBe(false);
        expect(M.isExpressionFunction(body2)).toBe(false);

        var f = M.makeExpressionFunction(x, body1);
        var g = M.makeExpressionFunction(x, body2);
        expect(M.isExpressionFunction(f)).toBe(true);
        return expect(M.isExpressionFunction(g)).toBe(true);
    });

    test('should reliably make expression function applications', () => {
        var F = OM.simple('F');
        var x = OM.simple('x');
        var y = OM.simple('y');
        expect(M.isExpressionFunctionApplication(F)).toBe(false);
        expect(M.isExpressionFunctionApplication(x)).toBe(false);
        expect(M.isExpressionFunctionApplication(y)).toBe(false);

        var Fx = M.makeExpressionFunctionApplication(F, x);
        expect(M.isExpressionFunctionApplication(Fx)).toBe(true);
        var Fx2 = OM.app(F, x);
        expect(M.isExpressionFunctionApplication(Fx2)).toBe(false);
        var Fx3 = OM.app(Fx.symbol, ...Fx.variables, Fx.body, y);
        expect(M.isExpressionFunctionApplication(Fx3)).toBe(false);
    });

    test('should correctly apply expression functions to arguments', () => {
        var f = M.makeExpressionFunction(OM.var('v'), OM.simple('plus(v,2)'));
        var x = OM.simple('minus(3,k)');
        var result = M.applyExpressionFunction(f, x);
        expect(result.equals(OM.simple('plus(minus(3,k),2)'))).toBe(true);

        f = M.makeExpressionFunction(OM.var('t'), OM.simple('t(t(tt))'));
        x = OM.simple('for.all[x,P(x)]');
        result = M.applyExpressionFunction(f, x);
        expect(result.equals(OM.app(x, OM.app(x, OM.var('tt'))))).toBe(true);

        // Check that we do not replace bound variables
        f = M.makeExpressionFunction(OM.var('var'), OM.simple('two(free(var),bou.nd[var,f(var)])'));
        x = OM.simple('10');
        result = M.applyExpressionFunction(f, x);
        expect(result.equals(OM.simple('two(free(10),bou.nd[var,f(var)])'))).toBe(true);
    });

    test('should implement alpha equivalence of expression functions', () => {
        // Create four similar functions, only two of which are alpha equivalent.
        // Tests all pairings, in both directions, to ensure symmetry of the relation.
        var f = M.makeExpressionFunction(OM.var('v'), OM.simple('plus(v,2)'));
        expect(M.alphaEquivalent(f, f)).toBe(true);

        var g = M.makeExpressionFunction(OM.var('w'), OM.simple('plus(w,2)'));
        expect(M.alphaEquivalent(g, g)).toBe(true);
        expect(M.alphaEquivalent(f, g)).toBe(true);
        expect(M.alphaEquivalent(g, f)).toBe(true);

        var h = M.makeExpressionFunction(OM.var('v'), OM.simple('plus(w,2)'));
        expect(M.alphaEquivalent(h, h)).toBe(true);
        expect(M.alphaEquivalent(f, h)).toBe(false);
        expect(M.alphaEquivalent(h, f)).toBe(false);
        expect(M.alphaEquivalent(g, h)).toBe(false);
        expect(M.alphaEquivalent(h, g)).toBe(false);

        var k = M.makeExpressionFunction(OM.var('w'), OM.simple('plus(w,w)'));
        expect(M.alphaEquivalent(k, k)).toBe(true);
        expect(M.alphaEquivalent(f, k)).toBe(false);
        expect(M.alphaEquivalent(k, f)).toBe(false);
        expect(M.alphaEquivalent(g, k)).toBe(false);
        expect(M.alphaEquivalent(k, g)).toBe(false);
        expect(M.alphaEquivalent(h, k)).toBe(false);
        expect(M.alphaEquivalent(k, h)).toBe(false);
    });
});

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
        }).toThrowError('Both arguments must be instances of OMNode');
        expect(() => {
            new M.Constraint('a', e1);
        }).toThrowError('Both arguments must be instances of OMNode');
        expect(() => {
            new M.Constraint(p1, p1)
        }).toThrowError('Expression must not contain metavariables');
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
});

describe('The ConstraintList class', function () {
    it('should construct instances with right new variable lists', function () {
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
        return expect(next.name).toBe('v3');
    });
    it('should construct instances with right lengths', function () {
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
        return expect(CL4.length).toBe(1);
    });
    it('should copy instances correctly', function () {
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
        expect(CL1.nextNewVariable().equals(
            CL1copy.nextNewVariable())).toBe(true);
        var CL2 = new M.ConstraintList(con1, con2, con3);
        var CL2copy = CL2.copy();
        expect(CL2).toBeTruthy();
        expect(CL2copy).toBeTruthy();
        expect(CL2 instanceof M.ConstraintList).toBe(true);
        expect(CL2copy instanceof M.ConstraintList).toBe(true);
        expect(CL2.length).toBe(CL2copy.length);
        expect(CL2.contents[0].equals(
            CL2copy.contents[0])).toBe(true);
        expect(CL2.contents[1].equals(
            CL2copy.contents[1])).toBe(true);
        expect(CL2.contents[2].equals(
            CL2copy.contents[2])).toBe(true);
        expect(CL2.nextNewVariable().equals(
            CL2copy.nextNewVariable())).toBe(true);
        var CL3 = new M.ConstraintList(con1);
        var CL3copy = CL3.copy();
        expect(CL3).toBeTruthy();
        expect(CL3copy).toBeTruthy();
        expect(CL3 instanceof M.ConstraintList).toBe(true);
        expect(CL3copy instanceof M.ConstraintList).toBe(true);
        expect(CL3.length).toBe(CL3copy.length);
        expect(CL3.contents[0].equals(
            CL3copy.contents[0])).toBe(true);
        expect(CL3.nextNewVariable().equals(
            CL3copy.nextNewVariable())).toBe(true);
        var CL4 = new M.ConstraintList(con3);
        var CL4copy = CL4.copy();
        expect(CL4).toBeTruthy();
        expect(CL4copy).toBeTruthy();
        expect(CL4 instanceof M.ConstraintList).toBe(true);
        expect(CL4copy instanceof M.ConstraintList).toBe(true);
        expect(CL4.length).toBe(CL4copy.length);
        expect(CL4.contents[0].equals(
            CL4copy.contents[0])).toBe(true);
        return expect(CL4.nextNewVariable().equals(
            CL4copy.nextNewVariable())).toBe(true);
    });
    it('should add constraints correctly', function () {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        var CL2 = new M.ConstraintList(con1, con2, con3);
        expect(CL1.length).toBe(0);
        expect(CL2.length).toBe(3);
        expect(CL2.contents[0]).toBe(con1);
        expect(CL2.contents[1]).toBe(con2);
        expect(CL2.contents[2]).toBe(con3);
        var fakeCL2 = CL1.add(con1, con2, con3);
        expect(fakeCL2.length).toBe(3);
        expect(fakeCL2.contents[0]).toBe(con1);
        expect(fakeCL2.contents[1]).toBe(con2);
        expect(fakeCL2.contents[2]).toBe(con3);
        var CL3 = new M.ConstraintList(con1);
        var fakeCL3 = CL1.add(con1);
        expect(CL3.length).toBe(1);
        expect(CL3.contents[0]).toBe(con1);
        expect(fakeCL3.length).toBe(1);
        expect(fakeCL3.contents[0]).toBe(con1);
        var CL4 = new M.ConstraintList(con3);
        var fakeCL4 = CL1.add(con3);
        expect(CL4.length).toBe(1);
        expect(CL4.contents[0]).toBe(con3);
        expect(fakeCL4.length).toBe(1);
        expect(fakeCL4.contents[0]).toBe(con3);
        var otherCL = CL3.add(con2);
        expect(otherCL.length).toBe(2);
        expect(otherCL.contents[0]).not.toBe(con1);
        expect(otherCL.contents[0].equals(con1)).toBe(true);
        return expect(otherCL.contents[1]).toBe(con2);
    });
    it('should subtract constraints correctly', function () {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        var CL2 = new M.ConstraintList(con1, con2, con3);
        expect(CL1.length).toBe(0);
        expect(CL2.length).toBe(3);
        expect(CL2.contents[0]).toBe(con1);
        expect(CL2.contents[1]).toBe(con2);
        expect(CL2.contents[2]).toBe(con3);
        var fakeCL1 = CL2.remove(con1, con2, con3);
        expect(fakeCL1.length).toBe(0);
        var CL3 = new M.ConstraintList(con1);
        var fakeCL3 = CL2.remove(con3, con2);
        expect(CL2.length).toBe(3);
        expect(CL2.contents[0]).toBe(con1);
        expect(CL2.contents[1]).toBe(con2);
        expect(CL2.contents[2]).toBe(con3);
        expect(CL3.length).toBe(1);
        expect(fakeCL3.length).toBe(1);
        expect(fakeCL3.contents[0]).not.toBe(con1);
        expect(fakeCL3.contents[0].equals(con1)).toBe(true);
        var CL4 = new M.ConstraintList(con3);
        var fakeCL4 = CL2.remove(con1, con2);
        expect(CL4.length).toBe(1);
        expect(CL4.contents[0]).toBe(con3);
        expect(CL2.length).toBe(3);
        expect(CL2.contents[0]).toBe(con1);
        expect(CL2.contents[1]).toBe(con2);
        expect(CL2.contents[2]).toBe(con3);
        expect(fakeCL4.length).toBe(1);
        expect(fakeCL4.contents[0]).not.toBe(con3);
        expect(fakeCL4.contents[0].equals(con3)).toBe(true);
        var otherCL = CL2.remove(con3);
        expect(otherCL.length).toBe(2);
        expect(otherCL.contents[0]).not.toBe(con1);
        expect(otherCL.contents[0].equals(con1)).toBe(true);
        expect(otherCL.contents[1]).not.toBe(con2);
        return expect(otherCL.contents[1].equals(con2)).toBe(true);
    });
    it('should find constraint indices correctly', function () {
        var con1 = new M.Constraint(quick('and(_A,_B)'), quick('and(x,y)'));
        var con2 = new M.Constraint(quick('plus(_x,_x)'), quick('HELLO'));
        var con3 = new M.Constraint(quick('_v0'), quick('v1'));
        var CL1 = new M.ConstraintList();
        var CL2 = new M.ConstraintList(con1, con2, con3);
        var CL3 = new M.ConstraintList(con1);
        var CL4 = new M.ConstraintList(con3);
        expect(CL1.firstSatisfying(() => true)).toBeNull();
        expect(CL2.firstSatisfying(() => true)).toBe(con1);
        expect(CL2.firstSatisfying(c => c.pattern.type === 'v'))
            .toBe(con3);
        expect(CL3.firstSatisfying(c => c.pattern.type === 'v'))
            .toBeNull();
        expect(CL4.firstSatisfying(c => c.pattern.type === 'v'))
            .toBe(con3);
        expect(CL2.firstSatisfying(c => c.expression.type === 'v'))
            .toBe(con2);
        expect(CL4.firstSatisfying(c => c.expression.type === 'v'))
            .toBe(con3);
        return expect(CL3.firstSatisfying(c => c.expression.type === 'v'))
            .toBeNull();
    });
    it('should find constraint pairs correctly', function () {
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
        var expressionTypesEqual = (constr1, constr2) => constr1.expression.type === constr2.expression.type;
        expect(CL1.firstPairSatisfying(expressionTypesEqual))
            .toBeNull();
        expect(CL2.firstPairSatisfying(expressionTypesEqual)).toEqual(
            [con2, con3]);
        expect(CL3.firstPairSatisfying(expressionTypesEqual))
            .toBeNull();
        expect(CL4.firstPairSatisfying(expressionTypesEqual))
            .toBeNull();
        var biggerPattern = (constr1, constr2) =>
            constr1.pattern.simpleEncode().length >
            constr2.pattern.simpleEncode().length
            ;
        expect(CL1.firstPairSatisfying(biggerPattern)).toBeNull();
        expect(CL2.firstPairSatisfying(biggerPattern)).toEqual(
            [con1, con3]);
        expect(CL3.firstPairSatisfying(biggerPattern)).toEqual(
            [con2, con1]);
        return expect(CL4.firstPairSatisfying(biggerPattern)).toBeNull();
    });
    it('should know if an instance is a function', function () {
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
        return expect(non2.isFunction()).toBe(false);
    });
    it('should correctly handle lookups', function () {
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
        expect(fun2.lookup('v0').equals(quick('thing(one,two)')))
            .toBe(true);
        expect(fun2.lookup('yo')).toBeNull();
        expect(fun3.lookup('v0').equals(quick('v1'))).toBe(true);
        expect(fun3.lookup('yo').equals(quick('dawg'))).toBe(true);
        expect(fun4.lookup('v0').equals(quick('thing(one,two)')))
            .toBe(true);
        return expect(fun4.lookup('yo').equals(quick('dawg'))).toBe(true);
    });
});