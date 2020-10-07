
/**
 * This module defines all the things for dealing with the first- and second-
 * order language in which we will be working.  This includes importing
 * OpenMath, defining metavariables and instantiation, defining expression
 * functions and application of them, alpha conversion, and beta reduction.
 */

"use strict"

// TODO: handle the case of this module running in the browser
// Import openmath-js for testing purposes
import { OM } from './openmath.js';
export { OM };

export const Exprs = {

    /**
     * Returns true if and only if the given object is an OpenMath expression
     * @param {object} expr - the object to test
     */
    isExpression : (expr) => expr instanceof OM,

    /**
     * Return an array of the expression's children, in the order in which they
     * appear as children
     * @param {OM} expr - the expression whose children should be returned
     */
    getChildren : (expr) => expr.children,

    ////////////////////////////////////////////////////////////////////////////////
    // * The following are functions and constants related to metavariables.
    // * A metavariable is a variable that will be used for substitution.
    ////////////////////////////////////////////////////////////////////////////////

    // Define the metavariable symbol to be used as an attribute key, and its corresponding value
    metavariableSymbol : OM.symbol('metavariable', 'SecondOrderMatching'),
    trueValue : OM.string('true'),

    /**
     * Marks a variable as a metavariable.
     * Does nothing if the given input is not an OMNode of type variable or type symbol.
     * @param {OM} variable - the variable to be marked
     */
    setMetavariable : (variable) => 
        Exprs.isExpression(variable) && ['v', 'sy'].includes(variable.type) ?
        variable.setAttribute(Exprs.metavariableSymbol, Exprs.trueValue.copy()) : null,

    /**
     * Removes the metavariable attribute if it is present.
     * @param {OM} metavariable - the metavariable to be unmarked
     */
    clearMetavariable : (metavariable) => metavariable.removeAttribute(Exprs.metavariableSymbol),

    /**
     * Tests whether the given variable has the metavariable attribute.
     * @param {OM} variable - the variable to be checked
     */
    isMetavariable : (variable) =>
        Exprs.isExpression(variable)
     && ['v', 'sy'].includes(variable.type)
     && variable.getAttribute(Exprs.metavariableSymbol) != undefined
     && variable.getAttribute(Exprs.metavariableSymbol).equals(Exprs.trueValue),

    ////////////////////////////////////////////////////////////////////////////////
    // * The following are generalised versions expression functions.
    // * When P: E -> E, P is an expression function.
    // * This generalisation allows us to have expression functions
    // * with more than one variable.
    ////////////////////////////////////////////////////////////////////////////////

    generalExpressionFunction : OM.symbol('gEF', 'SecondOrderMatching'),
    generalExpressionFunctionApplication : OM.symbol('gEFA', 'SecondOrderMatching'),

    /**
     * Return true iff the given expression is a variable, false otherwise.
     * @param {OM} expr - the expression to test
     */
    isVariable : (expr) => expr.type === 'v',

    /**
     * Helper function used when adding pairs to a constraint list.
     * Returns the list of variables that appear in a given expression.
     * @param {OM} expression - the expression to be checked
     * @returns a list containing any variables in the given expression
     */
    getVariablesIn : (expression) => expression.descendantsSatisfying(Exprs.isVariable),

    /**
     * Returns the variable's name, or null if it is not a variable.
     * @param {OM} variable - an OM instance of type variable
     */
    getVariableName : (variable) => Exprs.isVariable(variable) ? variable.name : null,

    /**
     * Construct an expression that is just a variable, with the given name
     * @param {string} name - the name of the new variable
     */
    variable : (name) => OM.var(name),

    /**
     * Returns a copy of an OpenMath expression
     * @param {OM} expr - the expression to copy
     */
    copy : (expr) => expr.copy(),

    /**
     * Return true iff the given expression is a function application, false
     * otherwise.
     * @param {OM} expr - the expression to test
     */
    isApplication : (expr) => expr.type === 'a',

    /**
     * Make a function application expression from the given children.  For example,
     * to create f(x,y), pass [f,x,y].  All arguments are used as-is, not copied
     * first; do not pass copies you need elsewhere.
     * @param {OM[]} children - the children of the resulting application, the first
     *   of which should be the operator and the rest the operands
     */
    application : (children) => OM.app(...children),

    /**
     * Return true iff the given expression is a binding expression, false
     * otherwise.
     * @param {OM} expr - the expression to test
     */
    isBinding : (expr) => expr.type === 'bi',

    /**
     * Make a binding expression from the given symbol, variables, and body.  For
     * example, to create Forall x, P, pass Forall, [x], and P.  All arguments are
     * used as-is, not copied first; do not pass copies you need elsewhere.
     * @param {OM} symbol - the binding operator
     * @param {OM[]} variables - the array of bound variables
     * @param {OM} body - the body of the binding
     */
    binding : (symbol,variables,body) => OM.bin(symbol,...variables,body),

    /**
     * Return the symbol/head/operator of the binding expression, if indeed the
     * given argument is a binding expression; return null otherwise.
     * @param {OM} expr - the expression whose operator is to be returned
     */
    bindingHead : (binding) => Exprs.isBinding(binding) ? binding.symbol : null,

    /**
     * Return a list of the bound variables in the given expression, or null if the
     * given expression is not a binding one.
     * @param {OM} binding - the expression whose bound variables are to be returned
     */
    bindingVariables : (binding) => Exprs.isBinding(binding) ? binding.variables : null,

    /**
     * Return the body bound by a binding expression, or null if the given
     * expression is not a binding one.
     * @param {OM} binding - the expression whose body is to be returned (the
     *   original body, not a copy)
     */
    bindingBody : (binding) => Exprs.isBinding(binding) ? binding.body : null,

    /**
     * Return true if a structural copy of the given inner (sub)expression occurs
     * free in the given outer expression.
     * @param {OM} outer - the expression in which to seek subexpressions
     * @param {OM} inner - the subexpression to seek
     */
    occursFreeIn : (inner,outer) => outer.occursFree(inner),

    /**
     * Compute whether the two expressions are structurally equal, and return true
     * or false.
     * @param {OM} expr1 - first expression
     * @param {OM} expr2 - second expression
     */
    equal : (expr1,expr2) => expr1.equals(expr2),

    /**
     * Replace one expression, wherever it sits in its parent tree, with another.
     * @param {OM} toReplace - the expression to be replaced
     * @param {OM} withThis - the expression with which to replace it
     */
    replace : (toReplace,withThis) => toReplace.replaceWith(withThis),

    /**
     * Return true iff the two expressions have the same type (e.g., both are
     * variables, or both are bindings, or both are function applications, etc.)
     * @param {OM} expr1 - first expression
     * @param {OM} expr2 - second expression
     */
    sameType : (expr1,expr2) => expr1.type === expr2.type

};

/**
 * Makes a new expression function with the meaning
 * λv1,...,vk.B where v1,...,vk are the variables and B is any OM expression.
 * @param {OM[]} variables - a list of OM variables
 * @param {OM} body - any OM expression
 */
export function makeGeneralExpressionFunction(variables, body) {
    if (!(variables instanceof Array)) {
        variables = [variables];
    }
    for (let i = 0; i < variables.length; i++) {
        var variable = variables[i];
        if (!Exprs.isVariable(variable)) {
            throw 'When making a general expression function,\
all elements of first argument must have type variable';
        }
    }
    return Exprs.binding(Exprs.generalExpressionFunction, variables, body);
}

/**
 * Tests whether an expression is a general expression function.
 * @param {OM} expression - the expression to be checked
 */
export function isGeneralExpressionFunction(expression) {
    return (
        Exprs.isExpression(expression)
        && Exprs.isBinding(expression)
        && Exprs.equal(Exprs.bindingHead(expression),Exprs.generalExpressionFunction)
    );
}

/**
 * Makes a new expression function application with the meaning
 * F(arg) where F is either a general expression function (gEF), or a
 * metavariable which is expected to be replaced by a gEF.
 * In the case that F is a gEF, the expression function can be applied
 * to the argument see `applyGeneralExpressionFunctionApplication`.
 * @param {OM} func - either a gEF or something which can be instantiated as a gEF.
 * @param {OM[]} arguments - a list of OM expressions
 */
export function makeGeneralExpressionFunctionApplication(func, args) {
    if (!(isGeneralExpressionFunction(func) || Exprs.isMetavariable(func))) {
        throw 'When making gEFAs, the func must be either a EF or a metavariable'
    }
    if (!(args instanceof Array)) {
        args = [args]
    }
    return Exprs.application([Exprs.generalExpressionFunctionApplication, func, ...args]);
}

/**
 * @returns true if the supplied expression is a gEFA
 */
export function isGeneralExpressionFunctionApplication(expression) {
    return (
        Exprs.isExpression(expression)
        && Exprs.isApplication(expression)
        && Exprs.equal(Exprs.getChildren(expression)[0],Exprs.generalExpressionFunctionApplication)
    );
}

/**
 * Tests whether a gEFA is of the form gEF(args).
 * If the gEFA is of this form, `applyGeneralExpressionFunctionApplication`
 * can be called with this gEFA as an argument.
 * @param {OM} gEFA - a general expression function application
 */
export function canApplyGeneralExpressionFunctionApplication(gEFA) {
    if (
        isGeneralExpressionFunctionApplication(gEFA)
        && isGeneralExpressionFunction(Exprs.getChildren(gEFA)[1])
    ) {
        return true;
    }
    return false;
}

/**
 * If this is a gEFA, extract and return the expression function application
 * that is to be applied.  Otherwise return null.
 * @param {OM} gEFA - a general expression function application
 */
export function getGeneralExpressionFunctionFromApplication(gEFA) {
    if (canApplyGeneralExpressionFunctionApplication(gEFA)) {
        return Exprs.getChildren(gEFA)[1];
    }
    return null;
}

/**
 * If this is a gEFA, extract and return the array of arguments to which the
 * function is to be applied.  Otherwise return null.
 * @param {OM} gEFA - a general expression function application
 */
export function getGeneralExpressionArgumentsFromApplication(gEFA) {
    if (canApplyGeneralExpressionFunctionApplication(gEFA)) {
        return Exprs.getChildren(gEFA).slice(2);
    }
    return null;
}

/**
 * If `canApplyGeneralExpressionFunctionApplication` is true,
 * returns the beta reduction of the gEF and the arguments it is applied to.
 * @param {OM} gEFA - a general expression function application
 */
export function applyGeneralExpressionFunctionApplication(gEFA) {
    if (canApplyGeneralExpressionFunctionApplication(gEFA)) {
        return betaReduce(
            getGeneralExpressionFunctionFromApplication(gEFA),
            getGeneralExpressionArgumentsFromApplication(gEFA)
        );
    }
    return null;
}

////////////////////////////////////////////////////////////////////////////////
// * The following are functions for manipulating expressions
// * and for checking certain properties of expressions.
////////////////////////////////////////////////////////////////////////////////

/**
 * Helper function for other expression manipulation functions.
 * @param {OM} expr - an OM expression, more expr arguments are accepted.
 * @returns the first variable of the form xN
 * which appears nowhere in the supplied expression(s).
 */
export function getNewVariableRelativeTo(...exprs) {
    let all_vars = [ ]
    for (let i = 0; i < exprs.length; i++) {
        all_vars.push(...Exprs.getVariablesIn(exprs[i]));
    }
    let index = 0;
    for (let i = 0; i < all_vars.length; i++) {
        let next_var = all_vars[i];
        if (/^x[0-9]+$/.test(Exprs.getVariableName(next_var))) {
            index = Math.max(
                index,
                parseInt(Exprs.getVariableName(next_var).slice(1)) + 1
            );
        }
    }
    let var_name = 'x' + index;
    return Exprs.variable(var_name);
}

/**
 * Takes a binding, a bound variable in that binding, and a replacement variable.
 * Returns the result of replacing (without capture) all instances of the bound
 * variable with the replacement variable.
 * @param {OM} binding - an OM binding
 * @param {OM} which_var - the bound variable to replace
 * @param {OM} replace_var - the replacement variable
 * @returns a copy of the alpha converted binding
 */
export function alphaConvert(binding, which_var, replace_var) {
    var result = Exprs.copy(binding);
    var bound_vars = Exprs.bindingVariables(result);

    if (!bound_vars.map(Exprs.getVariableName).includes(Exprs.getVariableName(which_var))) {
        throw 'which_var must be bound in binding'
    }

    for (let i = 0; i < bound_vars.length; i++) {
        var variable = bound_vars[i];
        if (Exprs.equal(variable,which_var)) {
            Exprs.replace(variable,Exprs.copy(replace_var));
        }
    }
    replaceWithoutCapture(Exprs.bindingBody(result), which_var, replace_var);
    return result;
}

/**
 * Takes an expression, a variable, and a replacement expression.
 * Manipulates the expression in place in order to replace all occurences
 * of the variable with the expression in such a way that variable capture
 * will not occur.
 *
 * Because this function will be called whenever a metavariable's instantiation
 * is discovered by the solve() routine in MatchingChallenge, it must guarantee
 * that NO occurrences of the variable remain after the function is complete.
 *
 * Note that this function addresses only variable capture that would occur
 * from a binding expression inside expr; it does not address any binders that
 * may sit in a parent above expr.
 *
 * @param {OM} expr - an OM expression
 * @param {OM} variable - an OM variable
 * @param {OM} replacement - an OM expression
 */
export function replaceWithoutCapture(expr, variable, replacement) {
    if (!Exprs.isExpression(expr)
        || !Exprs.isExpression(variable)
        || !Exprs.isExpression(replacement)) {
        throw 'all arguments must be expressions';
    }
    if (!Exprs.isBinding(expr)) {
        // Case 1: expr is a variable that we must replace, so do it
        if (Exprs.isVariable(expr) && Exprs.equal(expr,variable)) {
            Exprs.replace(expr,Exprs.copy(replacement));
        // Case 2: expr is any other non-binding, so recur on its
        // children (of which there may be none, meaning this is some
        // type of atomic other than a variable, which is fine; do nothing)
        } else {
            var children = Exprs.getChildren(expr);
            for (let i = 0; i < children.length; i++) {
                var ch = children[i];
                replaceWithoutCapture(ch, variable, replacement);
            }
        }
    } else {
        const variables = Exprs.bindingVariables(expr);
        const varidx = variables.map(Exprs.getVariableName).indexOf(Exprs.getVariableName(variable));
        if (varidx > -1) {
            // Case 3: expr is a binding and it binds the variable to be replaced,
            // but the replacement is a non-variable.  This is illegal, because
            // OpenMath bound variable positions can be occupied only by variables.
            if (!Exprs.isVariable(replacement)) {
                throw 'Cannot replace a bound variable with a non-varible';
            // Case 4: expr is a binding and it binds the variable to be replaced,
            // and the replacement is also a variable.  We can go ahead and replace
            // as requested, knowing that this is just a special case of alpha
            // conversion.
            } else {
                Exprs.replace(variables[varidx],Exprs.copy(replacement));
                replaceWithoutCapture(Exprs.bindingBody(expr), variable, replacement);
            }
        } else {
            // Case 5: expr is a binding and it does not bind the variable to be replaced,
            // but the replacement may include capture, so we prevent that.
            // If any bound var would capture the replacement, apply alpha conversion
            // so that the bound var in question becomes an entirely new bound var.
            if (Exprs.occursFreeIn(variable,Exprs.bindingBody(expr))) {
                variables.forEach(bound_var => {
                    if (Exprs.occursFreeIn(bound_var,replacement)) {
                        // FIXME: this doesn't seem like the best way to get new variables, but works for now.
                        //      need some way of generating global new variables
                        //      E.g. a class called new variable stream
                        Exprs.replace(expr,alphaConvert(expr, bound_var,
                            getNewVariableRelativeTo(expr)));
                    }
                } );
            }
            // now after any needed alpha conversions have made it safe,
            // we can actually do the replacement in the body.
            replaceWithoutCapture(Exprs.bindingBody(expr), variable, replacement);
        }
    }
}

/**
 * Checks if two expressions are alpha equivalent.
 * Two expresssions are alpha equivalent if one can be transformed into the other
 * by the renaming of bound variables.
 * If called when neither expr1 nor expr2 are applications or bindings, this function
 * returns false because alpha equivalence is not defined for free variables or constants.
 * @param {OM} expr1 - an OM expression (must be application or binding on first call)
 * @param {OM} expr2 - an OM expression (must be application or binding on first call)gef
 * @returns true if the two expressions are alpha equivalent, false otherwise
 */
export function alphaEquivalent(expr1, expr2, firstcall=true) {
    var possible_types = ['a', 'bi'];
    if (!Exprs.sameType(expr1,expr2)) {
        return false;
    }
    if (
        firstcall && (
            !(Exprs.isApplication(expr1) || Exprs.isBinding(expr1))
         || !(Exprs.isApplication(expr1) || Exprs.isBinding(expr2))
        )
    ) {
        return false;
    }
    if (Exprs.isApplication(expr1)) {
        var expr1_children = Exprs.getChildren(expr1);
        var expr2_children = Exprs.getChildren(expr2);
        if (expr1_children.length != expr2_children.length) {
            return false;
        }
        for (let i = 0; i < expr1_children.length; i++) {
            var ch1 = expr1_children[i];
            var ch2 = expr2_children[i];
            if (!alphaEquivalent(ch1, ch2, false)) {
                return false;
            }
        }
        return true;
    } else if (Exprs.isBinding(expr1)) {
        const expr1_vars = Exprs.bindingVariables(expr1);
        const expr2_vars = Exprs.bindingVariables(expr2);
        if ((expr1_vars.length != expr2_vars.length)
            || !(Exprs.bindingHead(expr1).equals(Exprs.bindingHead(expr2)))) {
            return false;
        }
        // Alpha convert all bound variables in both expressions to
        // new variables, which appear nowhere in either expression.
        // This avoids the problem of 'overwriting' a previous alpha conversion.
        var expr1conv = Exprs.copy(expr1);
        var expr2conv = Exprs.copy(expr2);
        for (let i = 0; i < expr1_vars.length; i++) {
            let new_var = getNewVariableRelativeTo(expr1conv, expr2conv);
            expr1conv = alphaConvert(expr1conv, expr1_vars[i], new_var);
            expr2conv = alphaConvert(expr2conv, expr2_vars[i], new_var);
        }
        return alphaEquivalent(Exprs.bindingBody(expr1conv), Exprs.bindingBody(expr2conv), false);
    } else {
        return Exprs.equal(expr1,expr2);
    }
}

/**
 * Takes a general expression function representing λv_1,...,v_k.B
 * and a list of expressions e_1,...,e_k and returns the beta reduction
 * of ((λv_1,...,v_k.B)(e_1,...,e_k)) which is the expression B
 * with all v_i replaced by the corresponding e_i.
 *
 * This beta reduction is capture avoiding.
 * See `replaceWithoutCapture` for details.
 * @param {OM} gEF - a general expression function with n variables
 * @param {OM[]} expr_list - a list of expressions of length n
 * @returns an expression manipulated as described above
 */
export function betaReduce(gEF, expr_list) {
    // Check we can actually do a beta reduction
    if (!isGeneralExpressionFunction(gEF)) {
        throw 'In beta reduction, the first argument must be a general expression function'
    }
    if (!(expr_list instanceof Array)) {
        throw 'In beta reduction,, the second argument must be a list of expressions'
    }
    const variables = Exprs.bindingVariables(gEF);
    if (variables.length != expr_list.length) {
        throw 'In beta reduction, the number of expressions must match number of variables'
    }

    var result = Exprs.copy(Exprs.bindingBody(gEF));
    for (let i = 0; i < expr_list.length; i++) {
        var v_i = variables[i];
        var e_i = expr_list[i];
        replaceWithoutCapture(result, v_i, e_i);
    }
    return result;
}

/**
 * Helper function used when adding pairs to a constraint list.
 * Takes a variable and checks if it of the form, `vX` where `X` is some number.
 * If it is of this form, it returns X + 1 if it is greater than the given index.
 * @param {OM} variable - the variable to be checked
 * @param {Number} nextNewVariableIndex - the number to check against
 */
export function checkVariable(variable, nextNewVariableIndex) {
    const name = Exprs.getVariableName(variable);
    if (/^v[0-9]+$/.test(name)) {
        nextNewVariableIndex = Math.max(
            nextNewVariableIndex,
            parseInt(name.slice(1)) + 1
        );
    }
    return nextNewVariableIndex;
}

/**
 * Takes a new variable (relative to some constraint list) and an expression
 * and returns a gEF which has the meaning λv_n.expr where v_n is the new
 * variable and expr is the expression.
 * I.e. creates a constant expression function.
 * @param {OM} new_variable - an OM variable
 * @param {OM} expression - an OM expression
 */
export function makeConstantExpression(new_variable, expression) {
    if (Exprs.isExpression(new_variable) && Exprs.isExpression(expression)) {
        return makeGeneralExpressionFunction(
            Exprs.copy(new_variable),Exprs.copy(expression));
    }
    return null;
}

/**
 * Takes a list of variables v_1,...,v_k and a single variable (a point)
 * v_i and returns a gEF with the meaning λv_1,...,v_k.v_i.
 * I.e. returns a projection expression function for v_i with k arguments.
 * @param {OM[]} variables - a list of OM variables
 * @param {OM} point -  a single OM variable
 */
export function makeProjectionExpression(variables, point) {
    if (variables.every(Exprs.isExpression) && Exprs.isExpression(point)) {
        if (!(variables.map(Exprs.getVariableName).includes(Exprs.getVariableName(point)))) {
            throw "When making a projection function, the point must occur in the list of variables"
        }
        return makeGeneralExpressionFunction(
            variables.map(Exprs.copy),Exprs.copy(point));
    }
    return null;
}

/**
 * Takes a list of variables, denoted `v1,...,vk`, an expression
 * which is denoted `g(e1,...,em)`, and a list of temporary
 * metavariables.
 *
 * For an application, returns a gEF with the meaning
 * `λv_1,...,v_k.g(H_1(v_1,...,v_k),...,H_m(v_1,...,v_k))`
 * where each `H_i` denotes a temporary gEFA as well as a list of the
 * newly created temporary metavariables `[H_1,...,H_m]`.
 *
 * I.e. it returns an 'imitation' expression function where
 * the body is the original expression with each argument
 * replaced by a temporary gEFA.
 * @param {OM} variables - a list of OM variables
 * @param {OM} expr - an OM application
 * @returns a gEF which is the imitation expression described above
 */
export function makeImitationExpression(variables, expr, temp_metavars) {
    /**
     * Helper function which takes a head of a function,
     * a list of bound variables (i.e. the variables argument) of the
     * parent function, and a list of temporary metavariables.
     * Returns an expression which will become the body
     * of the imitation function. This is an application of the form:
     * `head(temp_metavars[0](bound_vars),...,temp_metavars[len-1](bound_vars))`
     */
    function createBody(head, bound_vars, temp_metavars, bind, binding_variables) {
        let args = [];
        for (let i = 0; i < temp_metavars.length; i++) {
            let temp_metavar = temp_metavars[i];
            args.push(
                makeGeneralExpressionFunctionApplication(
                    temp_metavar,
                    bound_vars
                )
            );
        }
        if (bind) {
            // should be only one arg in this case
            return Exprs.binding(head,binding_variables,args[0]);
        } else {
            return Exprs.application(args);
        }
    }

    var imitationExpr = null;

    if (variables.every(Exprs.isExpression) && Exprs.isExpression(expr)) {
        const bind = Exprs.isBinding(expr);
        imitationExpr = makeGeneralExpressionFunction(
            variables,
            createBody(
                (bind ? Exprs.bindingHead(expr) : Exprs.getChildren(expr)[0]),
                variables,
                temp_metavars,
                bind,
                (bind ? Exprs.bindingVariables(expr) : null)
            )
        );
    }

    return imitationExpr;
}
