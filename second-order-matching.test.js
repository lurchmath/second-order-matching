const M = require('./src/second-order-matching');
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
function ef(variables, body) {
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
    return M.makeGeneralExpressionFunction(variables, body);
}

/**
 * Helper function to quickly make expression function applications.
 */
function efa(func, params) {
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
    return M.makeGeneralExpressionFunctionApplication(func, params);
}

describe('Metavariables', () => {
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
});

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

describe('Expression manipluation', () => {
    test('should get new variables relative to expressions', () => {
        var e1 = OM.simple('v1');
        var e2 = OM.simple('f.a[v1,x0,x1,x2]')
        var e3 = OM.simple('F(x0,x1,x2,x3,x4)');
        var e4 = M.makeGeneralExpressionFunction(
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
        var gef1 = M.makeGeneralExpressionFunction([v1, v2], b1);
        var gef1copy = gef1.copy();

        expect(M.isGeneralExpressionFunction(gef1)).toBe(true);
        var ac1 = M.alphaConvert(gef1, v1, r1);
        expect(ac1.equals(M.makeGeneralExpressionFunction([r1, v2], b2))).toBe(true);
        var ac2 = M.alphaConvert(ac1, v2, r2);
        expect(ac2.equals(M.makeGeneralExpressionFunction([r1, r2], b3))).toBe(true);
        expect(gef1.equals(gef1copy)).toBe(true);

        var b4 = OM.simple('F(v1,v2,c)');
        var gef2 = M.makeGeneralExpressionFunction([v1, v2], b4);
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
        var gef1 = M.makeGeneralExpressionFunction([v1,v2], b1);
        var expected2 = M.makeGeneralExpressionFunction(
            [OM.var('x'), v2], 
            OM.simple('for.all[x0,pl.us(x0,x,v2)]')
        );
        var gef1copy = gef1.copy();

        expect(M.isGeneralExpressionFunction(gef1)).toBe(true);
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

        var gef1 = M.makeGeneralExpressionFunction(
            [OM.var('v1'), OM.var('v2')],
            OM.simple('for.all[v3,pl.us(v1,v2,v3,a)]')
        );
        var expected7 = M.makeGeneralExpressionFunction(
            [OM.var('x0'), OM.var('v2')],
            OM.simple('for.all[v3,pl.us(x0,v2,v3,v1)]')
        );
        var expected8 = M.makeGeneralExpressionFunction(
            [OM.var('x0'), OM.var('x1')],
            OM.simple('for.all[v3,pl.us(x0,x1,v3,v2)]')
        );
        var expected9 = M.makeGeneralExpressionFunction(
            [OM.var('x0'), OM.var('x1')],
            OM.simple('for.all[x2,pl.us(x0,x1,x2,v3)]')
        );
        var expected10 = M.makeGeneralExpressionFunction(
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
    });

    test('should implement alpha equivalence for expressions', () => {
        var v1 = OM.var('v1');
        var v2 = OM.var('v2');
        var v3 = OM.var('v3');

        expect(M.alphaEquivalent(v1,v2)).toBe(false);
        expect(M.alphaEquivalent(v2,v1)).toBe(false);
        expect(M.alphaEquivalent(v3,v1)).toBe(false);

        var gef1 = M.makeGeneralExpressionFunction([v1], v1);
        var gef2 = M.makeGeneralExpressionFunction([v2], v2);
        var gef3 = M.makeGeneralExpressionFunction([v1], OM.var('randomvar'));

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

        var gef4 = M.makeGeneralExpressionFunction(
            [v1,v2,v3], OM.simple('pl.us(v1,v2,v3)')
        );
        var gef5 = M.makeGeneralExpressionFunction(
            [v3,v2,v1], OM.simple('pl.us(v3,v2,v1)')
        );
        var gef6 = M.makeGeneralExpressionFunction(
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

        var gef7 = M.makeGeneralExpressionFunction(
            [v1],
            OM.simple('for.all[x,pl.us(x,v1)]')
        );
        var gef8 = M.makeGeneralExpressionFunction(
            [v2],
            OM.simple('for.all[x,pl.us(x,v2)]')
        );
        var gef9 = M.makeGeneralExpressionFunction(
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
        var gef1 = M.makeGeneralExpressionFunction([v1, v2], b1);

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
        var gef1 = M.makeGeneralExpressionFunction([v1, v2], b1);
        var gef1copy = gef1.copy();
        var expected1 = OM.simple('for.all[x0,pl.us(x,y,x0)]');
        var br1 = M.betaReduce(gef1, [OM.var('x'), OM.var('y')]);
        expect(br1.equals(expected1)).toBe(true);
        expect(gef1.equals(gef1copy)).toBe(true);

        var b2 = OM.simple('for.all[x,for.all[y,for.all[z,pl.us(x,y,z,v1,v2,v3)]]]');
        var gef2 = M.makeGeneralExpressionFunction([v1,v2,v3], b2);
        var gef2copy = gef2.copy();
        var expected2 = OM.simple('for.all[x0,for.all[x1,for.all[x2,pl.us(x0,x1,x2,x,y,z)]]]');
        var br2 = M.betaReduce(gef2, [OM.var('x'), OM.var('y'), OM.var('z')]);
        expect(br2.equals(expected2)).toBe(true);
        expect(gef2.equals(gef2copy)).toBe(true);
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
        }).toThrow();
        expect(() => {
            new M.Constraint('a', e1);
        }).toThrow();
    });

    test('should correctly identify cases', () => {
        var c;

        // Test standard cases
        c = new M.Constraint(quick('a'), quick('a'));
        expect(c.case).toBe(M.CASES.CASE_IDENTITY);
        c = new M.Constraint(quick('neq(0,1)'), quick('neq(0,1)'));
        expect(c.case).toBe(M.CASES.CASE_IDENTITY);

        c = new M.Constraint(quick('_P'), quick('a'));
        expect(c.case).toBe(M.CASES.CASE_BINDING);

        c = new M.Constraint(quick('pl.us(X,Y)'), quick('pl.us(3,k)'));
        expect(c.case).toBe(M.CASES.CASE_SIMPLIFICATION);
        c = new M.Constraint(quick('neq(0,1)'), quick('neq(0,2)'));
        expect(c.case).toBe(M.CASES.CASE_SIMPLIFICATION);
        c = new M.Constraint(quick('for.all[_X,_X]'), quick('for.all[y,y]'));
        expect(c.case).toBe(M.CASES.CASE_SIMPLIFICATION);

        c = new M.Constraint(quick('_P_of_1'), quick('a'));
        expect(c.case).toBe(M.CASES.CASE_EFA);

        c = new M.Constraint(quick('k'), quick('p'));
        expect(c.case).toBe(M.CASES.CASE_FAILURE);
        c = new M.Constraint(quick('for.all[_X,_X]'), quick('there.exists[y,y]'));
        expect(c.case).toBe(M.CASES.CASE_FAILURE);

        // Test bindings
        c = new M.Constraint(
            quick('for.all[_x,_P]'),
            quick('for.all[r,greater.than(plus(sq(r),1),0)]')
        );
        expect(c.case).toBe(M.CASES.CASE_SIMPLIFICATION);

        c = new M.Constraint(
            quick('for.all[_x,_y,_P]'),
            quick('for.all[r,s,greater.than(plus(sq(r),1),0)]')
        );
        expect(c.case).toBe(M.CASES.CASE_SIMPLIFICATION);

        c = new M.Constraint(
            quick('for.all[_x,_y,_P]'),
            quick('for.all[r,greater.than(plus(sq(r),1),0)]')
        );
        expect(c.case).toBe(M.CASES.CASE_FAILURE);
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

describe('Instantiation', () => {
    test('should correctly apply a single instantiation', () => {
        // Test the simplest case of insantiating a metavariable
        var sub1 = new M.Constraint(quick('_P'), quick('a'));
        var sub2 = new M.Constraint(quick('_Q'), quick('o.r(b,c)'));
        var p1 = quick('_P');
        var p1copy = p1.copy();
        var p2 = quick('_Q');
        var p2copy = p2.copy();

        expect(M.applyInstantiation(sub1, p1).equals(quick('a'))).toBe(true);
        expect(M.applyInstantiation(sub2, p2).equals(quick('o.r(b,c)'))).toBe(true);
        // Check that the original patterns were not altered
        expect(p1.equals(p1copy)).toBe(true);
        expect(p2.equals(p2copy)).toBe(true);

        // Test the cases where instantiation does nothing
        var p3 = quick('p');
        var p3copy = p3.copy();

        expect(M.applyInstantiation(sub1, p3).equals(p3copy)).toBe(true);
        expect(p3.equals(p3copy)).toBe(true);
        expect(M.applyInstantiation(sub2, p1).equals(p1copy)).toBe(true);
        expect(M.applyInstantiation(sub1, p2).equals(p2copy)).toBe(true);

        // Test the case where the pattern is an application
        var sub3 = new M.Constraint(quick('_P'), ef('v1', '1'));
        var p4 = quick('_P_of_a');
        var p4copy = p4.copy();

        expect(M.applyInstantiation(sub3, p4).equals(quick('1'))).toBe(true);
        expect(p4.equals(p4copy)).toBe(true);

        var sub4 = new M.Constraint(quick('_P'), ef('v1', '_H(v1)'));

        expect(M.applyInstantiation(sub4, p4).equals(quick('_H(a)'))).toBe(true);
        expect(p4.equals(p4copy)).toBe(true);

        // Test the case where the pattern is a binding
        var p6 = quick('for.all[y,gr.th(sq.uare(x),y)]');
        var p6copy = p6.copy();
        var sub6 = new M.Constraint(quick('x'), quick('a'));
        expect(M.applyInstantiation(sub6, p6).equals(quick('for.all[y,gr.th(sq.uare(a),y)]'))).toBe(true);
        expect(p6.equals(p6copy)).toBe(true);

        // Test the case where replacement can cause variable capture
        var p7 = quick('for.all[x,gr.th(sq.uare(x),c)]');
        var p7copy = p7.copy();
        var sub7 = new M.Constraint(quick('c'), quick('x'));
        expect(M.applyInstantiation(sub7, p7).equals(quick('for.all[x0,gr.th(sq.uare(x0),x)]'))).toBe(true);
        expect(p7.equals(p7copy)).toBe(true);
    });

    test('should correctly apply a list of instantiations', () => {
        // Check the case where the substitutions transform a pattern into an expression
        var con1 = new M.Constraint(quick('l.and(_P,_Q)'), quick('l.and(a,l.or(b,c))'));
        var sub1 = new M.Constraint(quick('_P'), quick('a'));
        var sub2 = new M.Constraint(quick('_Q'), quick('l.or(b,c)'));

        var CL1 = new M.ConstraintList(con1);
        var SL1 = new M.ConstraintList(sub1, sub2);

        M.instantiate(SL1, CL1);
        expect(CL1.contents[0].pattern.equals(quick('l.and(a,l.or(b,c))'))).toBe(true);
        expect(CL1.contents[0].pattern.equals(CL1.contents[0].expression)).toBe(true);
        // Check that the order of the subs list does not matter
        var CL1new = new M.ConstraintList(con1);
        SL1 = new M.ConstraintList(sub2, sub1);
        M.instantiate(SL1,CL1new);
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

        M.instantiate(SL2, CL2);
        expect(CL2.contents[0].pattern.equals(quick('m.ply(p.lus(3,k),mi.nus(3,k))'))).toBe(true);
        expect(CL2.equals(
            new M.ConstraintList(
                new M.Constraint(
                    quick('m.ply(p.lus(3,k),mi.nus(3,k))'),
                    con2.expression
                )
            )
        )).toBe(true);

        // Check the case where substiutions contain gEFs as expressions
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

        M.instantiate(SL3, CL3);
        expect(CL3.contents[0].pattern.equals(con3.expression)).toBe(true);
        expect(CL3.contents[0].pattern.equals(CL3.contents[0].expression)).toBe(true);

        // In this case, the order of substitutions does matter. 
        // But, replacing the temporary variables should give the same result.
        var sub8 = sub5.copy();
        sub8.expression.replaceWith(M.applyInstantiation(sub6, sub8.expression));
        sub8.expression.replaceWith(M.applyInstantiation(sub7, sub8.expression));
        var CL4 = new M.ConstraintList(con3)
        M.instantiate(new M.ConstraintList(sub8), CL4);
        expect(CL4.contents[0].pattern.equals(con3.expression)).toBe(true);
        expect(CL4.contents[0].pattern.equals(CL4.contents[0].expression)).toBe(true);
    });
});

describe('Constraint manipulation functions',  () => {
    test('should correctly break constraints into argument pairs', () => {
        var constr, arg_pairs;

        // Check for applications
        constr = new M.Constraint(quick('and(_P,_Q)'), quick('and(a,or(b,c))'));
        expect(constr.case).toBe(M.CASES.CASE_SIMPLIFICATION);
        arg_pairs = M.breakIntoArgPairs(constr);
        expect(arg_pairs.length).toBe(3);
        expect(arg_pairs[0].equals(new M.Constraint(quick('and'), quick('and')))).toBe(true);
        expect(arg_pairs[1].equals(new M.Constraint(quick('_P'), quick('a')))).toBe(true);
        expect(arg_pairs[2].equals(new M.Constraint(quick('_Q'), quick('or(b,c)')))).toBe(true);

        constr = new M.Constraint(
            quick('times(plus(_X,_Y),minus(_X,_Y))'),
            quick('times(plus(3,k),minus(3,p))')
        );
        arg_pairs = M.breakIntoArgPairs(constr);
        expect(arg_pairs.length).toBe(3);

        // Check for bindings
        constr = new M.Constraint(
            quick('for.all[_x,_P]'),
            quick('for.all[r,plus(0,1)]')
        );
        arg_pairs = M.breakIntoArgPairs(constr);
        expect(arg_pairs.length).toBe(2);
        expect(arg_pairs[0].equals(new M.Constraint(quick('_x'), quick('r')))).toBe(true);
        expect(arg_pairs[1].equals(new M.Constraint(quick('_P'), quick('plus(0,1)')))).toBe(true);

        constr = new M.Constraint(
            quick('for.all[_x,_y,_z,_P]'),
            quick('for.all[r,s,t,plus(0,1)]')
        );
        arg_pairs = M.breakIntoArgPairs(constr);
        expect(arg_pairs.length).toBe(4);
        expect(arg_pairs[0].equals(new M.Constraint(quick('_x'), quick('r')))).toBe(true);
        expect(arg_pairs[1].equals(new M.Constraint(quick('_y'), quick('s')))).toBe(true);
        expect(arg_pairs[2].equals(new M.Constraint(quick('_z'), quick('t')))).toBe(true);
        expect(arg_pairs[3].equals(new M.Constraint(quick('_P'), quick('plus(0,1)')))).toBe(true);
    });
});

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
        expect(M.isMetavariable(nv2)).toBe(true);
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
    const CToString = (c) => {
        return '( ' + c.pattern.simpleEncode() + ', ' + c.expression.simpleEncode() + ' )';
    };
    const CLToString = (cl) => {
        if (cl === null) { return null; }
        return '{ ' + cl.contents.map((c) => CToString(c)).join(',\n')  + ' }'
    };
    const DEBUG_PRINT_CONSTRAINT = (c) => {
        c instanceof M.Constraint ? console.log(CToString(c)) : console.log(c);
    }
    const DEBUG_PRINT_CONSTRAINTLIST = (cl) => {
        cl instanceof M.ConstraintList ? console.log(CLToString(cl)) : console.log(cl);
    }
    const DEBUG_PRINT_SOLS = (sol) => {
        sol instanceof Array ? console.log('[\n' + sol.map(s => CLToString(s)).join(',\n\n') + '\n]') : console.log(sol);
    }

    const newConstraintObject = (pattern_string, expression_string) => {
        return new M.Constraint(
            quick(pattern_string),
            quick(expression_string)
        );
    }
    const newConstraints = (...string_pairs) => {
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
    const newMC = (constraints) => {
        return new M.MatchingChallenge(...constraints);
    }

    /**
     * Helper to use notation similar to test paper.
     * Takes a string like `'v.f(1,2)'`, splits it
     * on the first `.`, and makes a corresponding gEF.
     * @param {string} s
     */
    const lambdaString = (s) => {
        let [v, body] = s.split(/\.(.+)/);
        return ('SecondOrderMatching.gEF[' + v + "," + body + ']');
    }

    const newSolutions = (...solutions) => {
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
    const checkSolutions = (actual_solutions, expected_solutions) => {
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

    test('(test for checkSolutions helper function)', () => {
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
        M.instantiate(subs, mc.challengeList);
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
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.gEFA(_P,plus(_k,1)))]', 
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
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.gEFA(_P,plus(_k,1)))]',
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
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.gEFA(_P,plus(_k,1)))]',
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
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.gEFA(_P,plus(_k,1)))]',
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
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.gEFA(_P,plus(_k,1)))]',
             'for.all[m,implies(R(m,1),R(plus(m,1),1))]'],
            ['for.all[_n,_P_of__n]', 'for.all[m,R(m,1)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 61 //////////
        constraints = newConstraints(
            ['_P_of_0', 'gte(k,0)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.gEFA(_P,plus(_k,1)))]',
             'for.all[k,implies(gte(k,k),gte(k,plus(k,1)))]'],
            ['for.all[_n,_P_of__n]', 'for.all[n,gte(n,k)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 62 //////////
        constraints = newConstraints(
            ['_P_of_0', 'gte(n,0)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.gEFA(_P,plus(_k,1)))]',
                'for.all[k,implies(gte(n,k),gte(n,plus(k,1)))]'],
            ['for.all[_n,_P_of__n]', 'for.all[n,gte(n,n)]'],
        );
        mc = newMC(constraints);
        sols = mc.getSolutions();
        expect(sols.length).toBe(0);

        ////////// Test 63 //////////
        constraints = newConstraints(
            ['_P_of_0', 'gte(0,0)'],
            ['for.all[_k,implies(_P_of__k,SecondOrderMatching.gEFA(_P,plus(_k,1)))]',
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

    test.skip('[SKIP AND LATER DELETE] the speed of iterative vs recursive solve', () => {
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

    test.skip('solve with yield', () => {
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
});
