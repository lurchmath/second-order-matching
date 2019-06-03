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


/*

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
        //
    });
});*/