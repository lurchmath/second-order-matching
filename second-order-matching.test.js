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
    return M.makeGeneralExpressionFunction([variable], body);
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
    return M.makeGeneralExpressionFunctionApplication(func, param);
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

describe.skip('Expression Functions', () => {
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
        expect(M.isExpressionFunction(g)).toBe(true);
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
        expect(otherCL.contents[1]).toBe(con2);
    });

    test('should subtract constraints correctly', () => {
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
        expect(otherCL.contents[1].equals(con2)).toBe(true);
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
    });

    test('should correctly apply a list of instantiations', () => {
        // Check the case where the substitutions transform a pattern into an expression
        var con1 = new M.Constraint(quick('l.and(_P,_Q)'), quick('l.and(a,l.or(b,c))'));
        var con1copy = con1.copy();
        var sub1 = new M.Constraint(quick('_P'), quick('a'));
        var sub1copy = sub1.copy();
        var sub2 = new M.Constraint(quick('_Q'), quick('l.or(b,c)'));
        var sub2copy = sub2.copy();

        var CL1 = new M.ConstraintList(con1);
        var CL1copy = CL1.copy();
        var SL1 = new M.ConstraintList(sub1, sub2);

        var result1 = M.instantiate(SL1, CL1);
        expect(result1.contents[0].pattern.equals(quick('l.and(a,l.or(b,c))'))).toBe(true);
        expect(result1.contents[0].pattern.equals(result1.contents[0].expression)).toBe(true);
        // Check that instantiate leaves the originals untouched
        expect(CL1.equals(CL1copy)).toBe(true);
        expect(con1.equals(con1copy)).toBe(true);
        expect(sub1.equals(sub1copy)).toBe(true);
        expect(sub2.equals(sub2copy)).toBe(true);
        // Check that the order of the subs list does not matter
        SL1 = new M.ConstraintList(sub2, sub1);
        var result2 = M.instantiate(SL1,CL1);
        expect(result1.equals(result2)).toBe(true);

        // Check the case where the substitutions do not make the pattern exactly match the expression
        var con2 = new M.Constraint(
            quick('m.ply(p.lus(_X,_Y),mi.nus(_X,_Y))'), 
            quick('m.ply(p.lus(3,k),mi.nus(3,p))')
        );
        var sub3 = new M.Constraint(quick('_X'), quick('3'));
        var sub4 = new M.Constraint(quick('_Y'), quick('k'));

        var CL2 = new M.ConstraintList(con2);
        var SL2 = new M.ConstraintList(sub3, sub4);

        var result3 = M.instantiate(SL2, CL2);
        expect(result3.contents[0].pattern.equals(quick('m.ply(p.lus(3,k),mi.nus(3,k))'))).toBe(true);
        expect(result3.equals(
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

        var result4 = M.instantiate(SL3, CL3);
        expect(result4.contents[0].pattern.equals(con3.expression)).toBe(true);
        expect(result4.contents[0].pattern.equals(result4.contents[0].expression)).toBe(true);
        // In this case, the order of substitutions does matter. 
        // But, replacing the temporary variables should give the same result.
        var sub8 = sub5.copy();
        sub8.expression.replaceWith(M.applyInstantiation(sub6, sub8.expression));
        sub8.expression.replaceWith(M.applyInstantiation(sub7, sub8.expression));
        var result5 = M.instantiate(new M.ConstraintList(sub8), CL3);
        expect(result5.contents[0].pattern.equals(con3.expression)).toBe(true);
        expect(result5.contents[0].pattern.equals(result5.contents[0].expression)).toBe(true);
    });
});