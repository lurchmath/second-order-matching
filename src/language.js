
/**
 * This module defines all the things for dealing with the first- and second-
 * order language in which we will be working.  This includes importing
 * OpenMath, defining metavariables and instantiation, defining expression
 * functions and application of them, alpha conversion, and beta reduction.
 */

"use strict"

import { OM, Exprs } from './openmath-api.js';
export { OM, Exprs };

////////////////////////////////////////////////////////////////////////////////
// An expression function is a type of expression that is intended to be
// applied as a function mapping expressions to expressions.
// We define here two symbols that will be used to represent such things.
////////////////////////////////////////////////////////////////////////////////

const expressionFunctionSymbol = Exprs.symbol('EF');
const expressionFunctionApplicationSymbol = Exprs.symbol('EFA');

/**
 * Makes a new expression function with the meaning
 * λv1,...,vk.B where v1,...,vk are the variables and B is any OM expression.
 * @param {OM[]} variables - a list of OM variables
 * @param {OM} body - any OM expression
 */
export function makeExpressionFunction(variables, body) {
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
    return Exprs.binding(expressionFunctionSymbol, variables, body);
}

/**
 * Tests whether an expression is a general expression function.
 * @param {OM} expression - the expression to be checked
 */
export function isExpressionFunction(expression) {
    return (
        Exprs.isExpression(expression)
        && Exprs.isBinding(expression)
        && Exprs.equal(Exprs.bindingHead(expression),expressionFunctionSymbol)
    );
}

/**
 * Makes a new expression function application with the meaning
 * F(arg) where F is either an expression function (EF), or a
 * metavariable which is expected to be replaced by an EF.
 * In the case that F is an EF, the expression function can be applied
 * to the argument see `applyExpressionFunctionApplication`.
 * @param {OM} func - either an EF or something which can be instantiated as an EF.
 * @param {OM[]} arguments - a list of OM expressions
 */
export function makeExpressionFunctionApplication(func, args) {
    if (!(isExpressionFunction(func) || Exprs.isMetavariable(func))) {
        throw 'When making EFAs, the func must be either an EF or a metavariable'
    }
    if (!(args instanceof Array)) {
        args = [args]
    }
    return Exprs.application([expressionFunctionApplicationSymbol, func, ...args]);
}

/**
 * @returns true if the supplied expression is an EFA
 */
export function isExpressionFunctionApplication(expression) {
    return (
        Exprs.isExpression(expression)
        && Exprs.isApplication(expression)
        && Exprs.equal(Exprs.getChildren(expression)[0],expressionFunctionApplicationSymbol)
    );
}

/**
 * Tests whether an EFA is of the form EF(args).
 * If the EFA is of this form, `applyExpressionFunctionApplication`
 * can be called with this EFA as an argument.
 * @param {OM} EFA - an expression function application
 */
export function canApplyExpressionFunctionApplication(EFA) {
    if (
        isExpressionFunctionApplication(EFA)
        && isExpressionFunction(Exprs.getChildren(EFA)[1])
    ) {
        return true;
    }
    return false;
}

/**
 * If this is an EFA, extract and return the expression function application
 * that is to be applied.  Otherwise return null.
 * @param {OM} EFA - an expression function application
 */
export function getExpressionFunctionFromApplication(EFA) {
    if (canApplyExpressionFunctionApplication(EFA)) {
        return Exprs.getChildren(EFA)[1];
    }
    return null;
}

/**
 * If this is an EFA, extract and return the array of arguments to which the
 * function is to be applied.  Otherwise return null.
 * @param {OM} EFA - an expression function application
 */
export function getGeneralExpressionArgumentsFromApplication(EFA) {
    if (canApplyExpressionFunctionApplication(EFA)) {
        return Exprs.getChildren(EFA).slice(2);
    }
    return null;
}

/**
 * If `canApplyExpressionFunctionApplication` is true,
 * returns the beta reduction of the EF and the arguments it is applied to.
 * @param {OM} EFA - an expression function application
 */
export function applyExpressionFunctionApplication(EFA) {
    if (canApplyExpressionFunctionApplication(EFA)) {
        return betaReduce(
            getExpressionFunctionFromApplication(EFA),
            getGeneralExpressionArgumentsFromApplication(EFA)
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
 * @param {OM} EF - an expression function with n variables
 * @param {OM[]} expr_list - a list of expressions of length n
 * @returns an expression manipulated as described above
 */
export function betaReduce(EF, expr_list) {
    // Check we can actually do a beta reduction
    if (!isExpressionFunction(EF)) {
        throw 'In beta reduction, the first argument must be a general expression function'
    }
    if (!(expr_list instanceof Array)) {
        throw 'In beta reduction,, the second argument must be a list of expressions'
    }
    const variables = Exprs.bindingVariables(EF);
    if (variables.length != expr_list.length) {
        throw 'In beta reduction, the number of expressions must match number of variables'
    }

    var result = Exprs.copy(Exprs.bindingBody(EF));
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
 * and returns an EF which has the meaning λv_n.expr where v_n is the new
 * variable and expr is the expression.
 * I.e. creates a constant expression function.
 * @param {OM} new_variable - an OM variable
 * @param {OM} expression - an OM expression
 */
export function makeConstantExpression(new_variable, expression) {
    if (Exprs.isExpression(new_variable) && Exprs.isExpression(expression)) {
        return makeExpressionFunction(
            Exprs.copy(new_variable),Exprs.copy(expression));
    }
    return null;
}

/**
 * Takes a list of variables v_1,...,v_k and a single variable (a point)
 * v_i and returns an EF with the meaning λv_1,...,v_k.v_i.
 * I.e. returns a projection expression function for v_i with k arguments.
 * @param {OM[]} variables - a list of OM variables
 * @param {OM} point -  a single OM variable
 */
export function makeProjectionExpression(variables, point) {
    if (variables.every(Exprs.isExpression) && Exprs.isExpression(point)) {
        if (!(variables.map(Exprs.getVariableName).includes(Exprs.getVariableName(point)))) {
            throw "When making a projection function, the point must occur in the list of variables"
        }
        return makeExpressionFunction(
            variables.map(Exprs.copy),Exprs.copy(point));
    }
    return null;
}

/**
 * Takes a list of variables, denoted `v1,...,vk`, an expression
 * which is denoted `g(e1,...,em)`, and a list of temporary
 * metavariables.
 *
 * For an application, returns an EF with the meaning
 * `λv_1,...,v_k.g(H_1(v_1,...,v_k),...,H_m(v_1,...,v_k))`
 * where each `H_i` denotes a temporary EFA as well as a list of the
 * newly created temporary metavariables `[H_1,...,H_m]`.
 *
 * I.e. it returns an 'imitation' expression function where
 * the body is the original expression with each argument
 * replaced by a temporary EFA.
 * @param {OM} variables - a list of OM variables
 * @param {OM} expr - an OM application
 * @returns an EF which is the imitation expression described above
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
                makeExpressionFunctionApplication(
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
        imitationExpr = makeExpressionFunction(
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
