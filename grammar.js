/**
 * @file RsHtml Template Parser
 * @author mehmetkesik
 * @license MIT & Apache-2.0
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// commands
/*
tree-sitter query queries/injections.scm  views/if_else.rs.html
 */

const RUST_IDENTIFIER = /[a-zA-Z_][a-zA-Z0-9_]*/;
const DOUBLE_QUOTED_STRING = /"(\\.|[^"\\])*"/;
const SINGLE_QUOTED_STRING = /'(\\.|[^'\\])*'/;
const START_SYMBOL = "@";
const HASH_SYMBOL = "#";
const OPEN_BRACE = "{";
const CLOSE_BRACE = "}";
const OPEN_PAREN = "(";
const CLOSE_PAREN = ")";
const OPEN_BRACKET = "[";
const CLOSE_BRACKET = "]";

const STMT_HEAD_COND = /[^@{}]+/ // /\s*[^@{}\s][^@{}]*/; // /[^@{}]+/;
const COND_EXPR = /[^{]+/;

module.exports = grammar({
    name: 'rshtml',

    extras: $ => [/\s+/,],

    conflicts: $ => [
        //"[$.while_stmt, $.for_stmt, $.if_stmt]
    ],

    rules: {
        source_file: $ => seq(optional('\u{FEFF}'), // BOM
            optional($.extends_directive), optional(repeat($._template))),

        // region tokens
        rust_identifier: _ => token(RUST_IDENTIFIER),
        string_line: _ => token(choice(DOUBLE_QUOTED_STRING, SINGLE_QUOTED_STRING)),

        start_symbol: _ => token(START_SYMBOL),
        hash_symbol: _ => token(HASH_SYMBOL),
        open_brace: _ => token(OPEN_BRACE),
        close_brace: _ => token(CLOSE_BRACE),
        open_paren: _ => token(OPEN_PAREN),
        close_paren: _ => token(CLOSE_PAREN),
        open_bracket: _ => token(OPEN_BRACKET),
        close_bracket: _ => token(CLOSE_BRACKET),

        open_comment: _ => token('@*'),
        close_comment: _ => token('*@'),

        text: _ => token(/(@@|@@}|@@\{|[^@])+/),
        inner_text: $ => token(/(@@|@@}|@@\{|[^@}])+/),

        if_: _ => token(/\s*if\s+[^@{}]+/),
        else_: _ => token(prec(1, /\s*else\s*/)),

        while_: _ => token(seq('while', STMT_HEAD_COND)),
        for_: _ => token(seq('for', STMT_HEAD_COND)),
        match_: _ => token(seq('match', STMT_HEAD_COND)),

        extends_: _ => token('extends'),
        // endregion

        // region top_definition
        _template: $ => choice(
            $.comment_block,
            $._block,
            $.text
        ),

        _inner_template: $ => seq(
            $.open_brace,
            field('body', optional(repeat(choice(
                $.comment_block,
                $._block,
                $.inner_text
            )))),
            $.close_brace
        ),

        extends_directive: $ => seq($.start_symbol, $.extends_, choice(seq($.open_paren, optional(field('path', $.string_line)), $.close_paren), /\s/,)),

        comment_block: $ => seq($.open_comment, token(/([^*]|\*+[^@])*/), $.close_comment), // endregion

        _block: $ => seq(
            $.start_symbol,
            choice($.rust_stmt, $.rust_expr_paren)
        ),

        // region rust_expr_paren
        rust_expr_paren: $ => seq(optional($.hash_symbol), $.open_paren, optional(field('expr', alias($.rust_expr_paren_body, $.source_file))), $.close_paren),
        rust_expr_paren_body: $ => repeat1(choice($._nested_expression, /[^)]/)),
        _nested_expression: $ => choice(
            seq('(', repeat(choice($._nested_expression, /[^)]/)), ')'),
            seq('{', repeat(choice($._nested_expression, /[^}]/)), '}'),
            seq('[', repeat(choice($._nested_expression, /[^\]]/)), ']'),
        ),
        // endregion

        // region rust_stmt
        rust_stmt: $ => choice(
            $.if_stmt,
            $.for_stmt,
            $.while_stmt,
        ),

        if_stmt: $ => seq(
            field('head', alias($.if_, $.source_file)),
            $._inner_template,
            optional(prec(200, $.else_clause))
        ),
        else_clause: $ => seq(
            field('head', alias($.else_, $.source_file)),
            choice($._inner_template, $.if_stmt),
        ),

        for_stmt: $ => seq(
            field('head', alias($.for_, $.source_file)),
            $._inner_template
        ),

        while_stmt: $ => seq(
            field('head', alias($.while_, $.source_file)),
            $._inner_template
        ),
        // endregion

        // region rust_expr_simple

        // endregion

    }
});