
"use strict"

import { OM } from './openmath.js';
export const OpenMath = OM;

// Define the metavariable symbol to be used as an attribute key, and its corresponding value
const metavariableSymbol = OM.symbol('metavariable', 'SecondOrderMatching');
const trueValue = OM.string('true');

/**
 * <p>This namespace creates an API by which this package can use a simple JavaScript
 * implementation of OpenMath to store and manipulate mathematical expressions.</p>
 * 
 * <p>As documented on {@link index.html|the main page}, it is not necessary for you to
 * use OpenMath.  If you have your own class, you can create an object that wraps
 * your expression class in an API spoken by this module, so that you need not convert
 * your custom expression types to/from OpenMath.</p>
 * 
 * <p>To do so, create a single object that maps names of functions in this module's API
 * to their implementations using your custom expression class.  To see how to get
 * started, and how to connect the resulting object to this module, see the second code
 * example on {@link index.html|the main page} of this documentation.</p>
 * 
 * <p>Every function documented below is explained in two ways: First, the general
 * requirement of that element of the API is described without reference to OpenMath
 * specifically, so that those who are reading this for the purposes of writing their
 * own expression API have that information in general terms.  Secondly, the specifics
 * of the OpenMath implementation in this file is described.</p>
 * 
 * <p>To enable you to write an API like the one below, your custom expression class must
 * have the following features.</p>
 * 
 * <ul>
 * <li>It must be a hierarchical structure (as in
 *     {@link OpenMathAPI.filterSubexpressions filterSubexpressions}) of objects that can
 *     be variables (or at least identifiers more broadly), function applications,
 *     bindings (that is, the application of quantifiers or quantifier-like symbols),
 *     and optionally other atomic expressions as well.</li>
 * <li>It must be possible to tell when an instance is each of these things, so that you
 *     can write the essential functions
 *     {@link OpenMathAPI.isVariable isVariable},
 *     {@link OpenMathAPI.isApplication isApplication}, and
 *     {@link OpenMathAPI.isBinding isBinding}.</li>
 * <li>It must be possible to construct instances of each type, so that you can write
 *     the essential functions
 *     {@link OpenMathAPI.variable variable},
 *     {@link OpenMathAPI.application application}, and
 *     {@link OpenMathAPI.binding binding}.  You will also need to write the function
 *     {@link OpenMathAPI.symbol symbol}, but if your expressions do not distinguish
 *     variables from other types of symbols, but consider all identifiers equal, you
 *     can use some prefix internally to distinguish them without exposing that detail
 *     outside of the API.  See the documentation for {@link OpenMathAPI.symbol symbol} for
 *     more specifics on this idea.</li>
 * <li>It must be possible to mark a variable with the "is a metavariable" boolean flag.
 *     If your expression class does not support attributes on expressions, you can do
 *     this using, for example, a prefix used only internally, as in the previous point.
 *     See the documentation for {@link OpenMathAPI.setMetavariable setMetavariable} for
 *     more specifics on this idea.
 *     This enables you to write
 *     {@link OpenMathAPI.isMetavariable isMetavariable},
 *     {@link OpenMathAPI.setMetavariable setMetavariable}, and
 *     {@link OpenMathAPI.clearMetavariable clearMetavariable}.</li>
 * <li>It must be possible to query the essential details of each type of expression:
 *     <ul>
 *     <li>For a variable, you must be able to write
 *         {@link OpenMathAPI.getVariableName getVariableName}.
 *     <li>For an application, you must be able to write
 *         {@link OpenMathAPI.getChildren getChildren}.  This treates the function application
 *         like a LISP S-expression.  For example, <code>3+5</code> would be seen as <code>(+ 3 5)</code> and
 *         should therefore return three children.
 *     <li>For a binding, you must be able to write
 *        {@link OpenMathAPI.bindingHead bindingHead} (the quantifier or other head symbol),
 *        {@link OpenMathAPI.bindingVariables bindingVariables} (the array of bound variables),
 *        {@link OpenMathAPI.bindingBody bindingBody} (the body inside the expression).
 *        For example, in the expression "for all x and y, x+y=y+x," the head is the
 *        universal quantifier (the "for all" symbol), the bound variables are x and y,
 *        and the body is the expression x+y=y+x.
 *     </ul></li>
 * <li>You must be able to write a function that checks whether a given instance of a given
 *     variable appears free in an ancestor expression.  This should be do-able if your
 *     expression class can do all of the above things.  See the documentation for
 *     {@link OpenMathAPI.variableIsFree variableIsFree} for details.</li>
 * </ul>
 * 
 * @namespace OpenMathAPI
 */
export const API = {

    ////////////////////////////////////////////////////////////////////////////////
    // What is an expression?
    // Here are several basic functions for identifying, comparing, copying,
    // and doing basic manipulations of expressions.
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * <p>The <code>isExpression</code> function must return true if and only if the one input
     * is an instance of the class of expressions.</p>
     * 
     * <p>In the OpenMath case, we provide a function
     * that returns true if and only if the given object is an OpenMath expression.</p>
     * @function isExpression
     * @param {object} expr - the object to test
     * @memberof OpenMathAPI
     */
    isExpression : (expr) => expr instanceof OM,

    /**
     * <p>The <code>filterSubexpressions</code> function must return the set of subexpressions
     * of a given expression that satisfy a given predicate (the "filter").
     * The result must be an array.  An expression does count as its own subexpression,
     * and should be returned if it passes the filter.</p>
     * 
     * <p>The OpenMath library used by this package provides a function called
     * <code>descendantsSatisfying</code> that fulfills this need.</p>
     * @param {OM} expr - the expression in which to search
     * @param {function} filter - the unary boolean function to use as the
     *   filtering predicate
     */
    filterSubexpressions : (expr,filter) => expr.descendantsSatisfying(filter),

    /**
     * <p>The <code>sameType</code> function must return true if and only if two expressions have
     * the same type.  This does not require an expression class to have an extensive
     * type system, but it must at least distinguish three broad types of expressions:
     * atomic expressions must be different from function applications, which are both
     * different from bindings (that is, the application of a quantifier or other
     * binding symbol, such as a summation or integral).  Any type system that is at
     * least as granular as this basic minimum is sufficient.</p>
     * 
     * <p>Here we simply look up the OpenMath <code>type</code> of each object and compare them,
     * because OpenMath has types for application, binding, and several different
     * types of atomic expressions (among other things).</p>
     * @function sameType
     * @param {OM} expr1 - first expression
     * @param {OM} expr2 - second expression
     * @memberof OpenMathAPI
     */
    sameType : (expr1,expr2) => expr1.type === expr2.type,

    /**
     * <p>The <code>copy</code> function must create a deep copy of an expression and return the
     * new copy.</p>
     * 
     * <p>The OpenMath library provides a copy function that we use here.</p>
     * @function copy
     * @param {OM} expr - the expression to copy
     * @memberof OpenMathAPI
     */
    copy : (expr) => expr.copy(),

    /**
     * <p>The <code>equal</code> function computes deep structural equality, which can be true even
     * if the two objects are not the same in memory.  Any two expressions that have
     * the same hierarchical structure should be considered equal.</p>
     * 
     * <p>The OpenMath library provides a structural equality function, and we defer
     * to that.</p>
     * @function equal
     * @param {OM} expr1 - first expression
     * @param {OM} expr2 - second expression
     * @memberof OpenMathAPI
     */
    equal : (expr1,expr2) => expr1.equals(expr2),

    /**
     * <p>The <code>replace</code> function should find where its first argument sits inside any
     * parent structure, remove it from that location, and then place the second
     * parameter in that place instead.  No specific return value is required.
     * If the first parameter does not have a parent, this function is permitted to
     * do nothing.</p>
     * 
     * <p>The OpenMath library has a function that does this.  While it also updates the
     * internal references of the parameters, this extra behavior does not harm the
     * results of this function.</p>
     * @function replace
     * @param {OM} toReplace - the expression to be replaced
     * @param {OM} withThis - the expression with which to replace it
     * @memberof OpenMathAPI
     */
    replace : (toReplace,withThis) => toReplace.replaceWith(withThis),

    ////////////////////////////////////////////////////////////////////////////////
    // Which expressions are variables?
    // How can I extract a variable's name, or build a variable from a name?
    // How can we find the variables inside another expression?
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * <p>The <code>isVariable</code> function must return true if and only if the given expression
     * is a variable.  That is, the expression class for which we are defining an API
     * must have a notion of variable (or at least "identifier") and this function
     * must return true if and only if the given expression is that kind.</p>
     * 
     * <p>The OpenMath implementation here looks up the OpenMath type and checks to see
     * if it is the "variable" type defined in
     * {@link https://www.openmath.org/standard/om20-2019-07-01/|the OpenMath standard}.</p>
     * @function isVariable
     * @param {OM} expr - the expression to test
     * @memberof OpenMathAPI
     */
    isVariable : (expr) => expr.type === 'v',

    /**
     * <p>The <code>getVariableName</code> function must return, as a string, the name of the
     * variable stored in the given expression.  If the given expression does not
     * pass the {@link OpenMathAPI.isVariable isVariable} check, this function should
     * return null.</p>
     * 
     * <p>The OpenMath implementation uses the built-in <code>.name</code> attribute of OpenMath
     * variable instances.</p>
     * @function getVariableName
     * @param {OM} variable - an OM instance of type variable
     * @memberof OpenMathAPI
     */
    getVariableName : (variable) => API.isVariable(variable) ? variable.name : null,

    /**
     * <p>The <code>variable</code> function constructs an instance of your expression class that
     * is a variable with the given name.</p>
     * 
     * <p>The OpenMath implementation uses a constructor with a similar purpose that is
     * built into the OpenMath module.</p>
     * @function variable
     * @param {string} name - the name of the new variable
     * @memberof OpenMathAPI
     */
    variable : (name) => OM.var(name),

    ////////////////////////////////////////////////////////////////////////////////
    // Sometimes we wish to create a new symbol in the language.
    // This may be a special type of expression, or a type of variable or string,
    // based on the language.  In OpenMath, it is a first-class citizen.
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * <p>The <code>symbol</code> function constructs an instance of your expression class that
     * is a symbol with the given name, which should be distinct from a variable with
     * the same name.</p>
     * 
     * <p>If your class does not support more than one type of identifier, simply use a
     * prefix.  For example, you can:</p>
     * 
     * <ul>
     * <li>Make the variable contructor for the name <code>N</code> create a variable named <code>"v"+N</code>.</li>
     * <li>Make the symbol contructor for the name <code>N</code> create a variable named <code>"s"+N</code>.</li>
     * <li>Make the variable name function drop the one-letter prefix.</li>
     * </ul>
     * 
     * <p>The OpenMath implementation uses a constructor with a similar purpose that is
     * built into the OpenMath module.</p>
     * @function symbol
     * @param {string} name - the name to use for the symbol
     * @memberof OpenMathAPI
     */
    symbol : (name) => OM.sym(name,'SecondOrderMatching'),

    ////////////////////////////////////////////////////////////////////////////////
    // Which expressions are function applications?
    // How can I build a function application expression,
    // or extract the list of children from an existing function application?
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * <p>The <code>isApplication</code> function should return true if and only if the given
     * expression is a function application.  This excludes other compound expression
     * types, particularly binding expressions (that is, applications of quantifiers).</p>
     * 
     * <p>The OpenMath implementation relies on the fact that "application" is a built-in
     * OpenMath type.</p>
     * @function isApplication
     * @param {OM} expr - the expression to test
     * @memberof OpenMathAPI
     */
    isApplication : (expr) => expr.type === 'a',

    /**
     * <p>The <code>application</code> function should construct a function application expression
     * whose children are in the array passed as the one parameter to this function.
     * The first child is the operator and the rest are its operands, as in an a LISP
     * S-expression, such as <code>(* 3 5)</code> for "3 times 5."  The exact objects in the
     * list given should be used; this function should not make copies.</p>
     * 
     * <p>The OpenMath implementation uses a constructor with a similar purpose that is
     * built into the OpenMath module.</p>
     * @function application
     * @param {OM[]} children - the children of the resulting application, the first
     *   of which should be the operator and the rest the operands
     * @memberof OpenMathAPI
     */
    application : (children) => OM.app(...children),

    /**
     * <p>The <code>getChildren</code> function can expect that the input object is a function
     * application expression, as one might construct using the
     * {@link OpenMathAPI.application application} function.  This function should
     * return all of its children, that is, the array passed to the
     * {@link OpenMathAPI.application application} constructor, in the same order
     * (operator first, operands in order thereafter).  The exact children must be
     * returned, not copies, and they should be in a JavaScript array.  If the given
     * expression does not pass the {@link OpenMathAPI.isApplication isApplication} check,
     * this function should return an empty array.</p>
     * 
     * <p>The OpenMath implementation stores the children in an array internally, so we
     * can simply return that array here.  Although we could slice it to ensure it
     * will not get corrupted, the other code in this module does not alter child
     * arrays that it has queried from expressions, so this implementation is safe
     * for our purposes.</p>
     * @function getChildren
     * @param {OM} expr - the expression whose children should be returned
     * @memberof OpenMathAPI
     */
    getChildren : (expr) => expr.children,

    ////////////////////////////////////////////////////////////////////////////////
    // Which expressions bind variables?
    // How can I build such an expression?
    // If I have a binding expression, how can I extract its head, variables, or body?
    // How can I tell if one expression occurs free inside another?
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * <p>The <code>isBinding</code> function should return true if and only if the given
     * expression is a binding expression, that is, the application of a quantifier,
     * such as "there exists x such that x-1=0".  This excludes other compound expression
     * types, particularly function application (that is, where no dummy variables are
     * used/bound, like the x in the example just given).</p>
     * 
     * <p>The OpenMath implementation relies on the fact that "binding" is a built-in
     * OpenMath type.</p>
     * @function isBinding
     * @param {OM} expr - the expression to test
     * @memberof OpenMathAPI
     */
    isBinding : (expr) => expr.type === 'bi',

    /**
     * <p>The <code>binding</code> function should construct a binding expression whose head is the
     * given symbol (typically the quantifier if that's what type of expression it is),
     * whose bound variables are in the array given as the second parameter, and whose
     * body is the third expression given.  For example, to construct the expression
     * "for all x, P" (for any expression P), pass three arguments:  The "for all"
     * symbol, the JavaScript array containing just the variable expression x, and
     * finally the expression P.  The exact objects in the arguments should be used;
     * this function should not make copies.</p>
     * 
     * <p>The OpenMath implementation uses a constructor with a similar purpose that is
     * built into the OpenMath module.</p>
     * @function binding
     * @param {OM} symbol - the binding operator
     * @param {OM[]} variables - the array of bound variables
     * @param {OM} body - the body of the binding
     * @memberof OpenMathAPI
     */
    binding : (symbol,variables,body) => OM.bin(symbol,...variables,body),

    /**
     * <p>The <code>bindingHead</code> function will typically be called with a binding
     * expression, as one might construct using the
     * {@link OpenMathAPI.binding binding} function.  This function should
     * return its head symbol, that is, the first argument given to the
     * {@link OpenMathAPI.binding binding} constructor, which is typically the quantifier
     * (if the expression is a quantification).  The original symbol must be
     * returned, not a copy.  If the given expression does not
     * pass the {@link OpenMathAPI.isBinding isBinding} check, this function should
     * return null.</p>
     * 
     * <p>The OpenMath implementation stores the symbol internally, so we
     * can simply return that here.</p>
     * @function bindingHead
     * @param {OM} expr - the expression whose operator is to be returned
     * @memberof OpenMathAPI
     */
    bindingHead : (binding) => API.isBinding(binding) ? binding.symbol : null,

    /**
     * <p>The <code>bindingVariables</code> function is typically called with a binding
     * expression, as one might construct using the
     * {@link OpenMathAPI.binding binding} function.  This function should
     * return all of its bound variables, that is, the array passed as second
     * parameter to the
     * {@link OpenMathAPI.binding binding} constructor.  The exact objects must be
     * returned, not copies, and they should be in a JavaScript array.  If the given
     * expression does not pass the {@link OpenMathAPI.isBinding isBinding} check, this
     * function should return null.</p>
     * 
     * <p>The OpenMath implementation stores the bound variables in an array internally,
     * so we can simply return that array here.  Although we could slice it to ensure
     * it will not get corrupted, the other code in this module does not alter bound
     * variable arrays that it has queried from expressions, so this implementation
     * is safe for our purposes.</p>
     * @function bindingVariables
     * @param {OM} binding - the expression whose bound variables are to be returned
     * @memberof OpenMathAPI
     */
    bindingVariables : (binding) => API.isBinding(binding) ? binding.variables : null,

    /**
     * <p>The <code>bindingBody</code> function is typically called with a binding
     * expression, as one might construct using the
     * {@link OpenMathAPI.binding binding} function.  This function should
     * return its body, that is, the last argument given to the
     * {@link OpenMathAPI.binding binding} constructor, which is typically the main
     * expression in the binding.  The original body expression must be
     * returned, not a copy.  If the given expression does not
     * pass the {@link OpenMathAPI.isBinding isBinding} check, this function should
     * return null.</p>
     * 
     * <p>The OpenMath implementation stores the body internally, so we
     * can simply return that here.</p>
     * @function bindingBody
     * @param {OM} binding - the expression whose body is to be returned (the
     *   original body, not a copy)
     * @memberof OpenMathAPI
     */
    bindingBody : (binding) => API.isBinding(binding) ? binding.body : null,

    /**
     * <p>The <code>variableIsFree</code> function will be called with a variable expression
     * as the first argument and some other expression as its second argument.
     * (If the second argument is null or omitted, the topmost ancestor should
     * be treated as the default value.)  It should return true if and only if
     * the variable (not a copy of the variable, but the given instance) appears
     * in the given expression, not within the scope of a binding expression that
     * binds the variable (that is, whose list of bound variables includes a
     * variable of the same name).</p>
     * 
     * <p>The OpenMath implementation has a more general <code>isFree</code> function that works
     * for variables or larger expressions, and we can simply defer to that.</p>
     * @function variableIsFree
     * @param {OM} variable - the variable (not its name, but the actual
     *   instance) whose freeness will be tested
     * @param {OM} expression - the ancestor expression containing the variable,
     *   and in which we are asking whether it is free
     * @memberof OpenMathAPI
     */
    variableIsFree : (variable,expression) => variable.isFree(expression),

    ////////////////////////////////////////////////////////////////////////////////
    // A metavariable is a variable that will be used for substitution.
    // How can I tell which variables are metavariables?
    // How can I mark a variable as being a metavariable, or clear such a mark?
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * <p>The <code>setMetavariable</code> function takes an expression as input.  If it is not
     * a variable or symbol, this function does nothing.  But if it is, then this
     * function adds to it an attribute (or any kind of mark) that will distinguish
     * the variable as a metavariable.  Note these important attributes of this mark:</p>
     * 
     * <ol>
     * <li>It affects only this instance of the variable.  Other variables with the
     *     same name are not marked.</li>
     * <li>It affects copies made later of this instance.  That is, copying this
     *     instance should copy the mark as well.</li>
     * <li>A test of equality between two variables of the same name, but one being
     *     a metavariable and the other not, should yield a false result (not equal).
     *     But two non-metavariables with the same name are equal,
     *     as are two metavariables with the same name.</li>
     * </ol>
     * 
     * <p>The purpose of metavariables need not be documented here, but briefly,
     * they are used when pattern matching, to distinguish a variable
     * that can match against any expression from a variable that can match only
     * other instances of itself.</p>
     * 
     * <p>If your expression class doesn't support adding attributes to expressions,
     * you could use prefixes, as documented in {@link OpenMathAPI.symbol symbol},
     * and simply change the "v" prefix to an "m" for metavariables.</p>
     * 
     * <p>The OpenMath implementation uses the fact that OpenMath expressions can be
     * decorated with an arbitrary number of attributes.  We use one whose key is
     * a special symbol defined earlier and whose value is the constant "true."</p>
     * @function setMetavariable
     * @param {OM} variable - the variable to be marked
     * @memberof OpenMathAPI
     */
    setMetavariable : (variable) => 
        API.isExpression(variable) && ['v', 'sy'].includes(variable.type) ?
        variable.setAttribute(metavariableSymbol, trueValue.copy()) : null,

    /**
     * <p>The <code>isMetavariable</code> function returns true if and only if the given argument
     * is a variable or symbol and the attribute or mark described in
     * {@link OpenMathAPI.setMetavariable setMetavariable} is present on it.</p>
     * 
     * <p>The OpenMath implementation checks whether there is an attribute with the same
     * key-value pair used in {@link OpenMathAPI.setMetavariable setMetavariable}.</p>
     * @function isMetavariable
     * @param {OM} variable - the variable to be checked
     * @memberof OpenMathAPI
     */
    isMetavariable : (variable) =>
        API.isExpression(variable)
     && ['v', 'sy'].includes(variable.type)
     && variable.getAttribute(metavariableSymbol) != undefined
     && variable.getAttribute(metavariableSymbol).equals(trueValue),

    /**
     * <p>The <code>clearMetavariable</code> function removes the attribute or mark set in
     * {@link OpenMathAPI.setMetavariable setMetavariable}, if indeed such an attribute
     * exists on the given expression.  This should restore the variable to its
     * original condition.</p>
     * 
     * <p>The OpenMath implementation removes any attribute with the same
     * key used in {@link OpenMathAPI.setMetavariable setMetavariable}.</p>
     * @function clearMetavariable
     * @param {OM} metavariable - the metavariable to be unmarked
     * @memberof OpenMathAPI
     */
    clearMetavariable : (metavariable) => metavariable.removeAttribute(metavariableSymbol),

};
