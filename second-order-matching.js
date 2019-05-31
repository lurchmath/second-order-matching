"use strict"

// Import openmath-js for testing purposes
const OM = require('openmath-js').OM;

// Define the metavariable symbol to be used as an attribute key, and its corresponding value
const metavariableSymbol = OM.symbol('metavariable', 'SecondOrderMatching');
const trueValue = OM.string('true');

/**
 * Allows the marking of a variable as a metavariable. 
 * Does nothing if the given input is not an OMNode of type variable or type symbol.
 * 
 * @param variable - the variable to be marked
 */
function setMetavariable(variable) {
    if (variable instanceof OM && ['v', 'sy'].includes(variable.type)) {
        return variable.setAttribute(metavariableSymbol, trueValue.copy());
    } else return null;
}

/**
 * Removes the metavariable attribute if it is present.
 * 
 * @param metavariable - the metavariable to be unmarked
 */
function clearMetavariable(metavariable) {
    return metavariable.removeAttribute(metavariableSymbol);
}

/**
 * Tests whether the given variable has the metavariable attribute.
 * 
 * @param variable - the variable to be checked
 */
function isMetavariable(variable) {
    return (
        (variable instanceof OM) 
        && (['v', 'sy'].includes(variable.type))
        && (variable.getAttribute(metavariableSymbol) != undefined)
        && (variable.getAttribute(metavariableSymbol).equals(trueValue))
    );
}

module.exports = {
    OM,
    setMetavariable, 
    clearMetavariable,
    isMetavariable,
};