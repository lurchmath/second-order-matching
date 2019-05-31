const M = require('./second-order-matching');
const OM = M.OM;

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