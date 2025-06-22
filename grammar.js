/**
 * @file RsHtml Template Parser
 * @author mehmetkesik
 * @license MIT & Apache-2.0
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const RUST_IDENTIFIER = /[a-zA-Z_][a-zA-Z0-9_]*/;
const DOUBLE_QUOTED_STRING = /"(\\.|[^"\\])*"/;
const SINGLE_QUOTED_STRING = /'(\\.|[^'\\])*'/;
const START_SYMBOL = "@";
const OPEN_BRACE = "{";
const CLOSE_BRACE = "}";
const OPEN_PAREN = "(";
const CLOSE_PAREN = ")";
const OPEN_BRACKET = "[";
const CLOSE_BRACKET = "]";

const STMT_HEAD_COND = /[^@{]*/;

module.exports = grammar({
    name: 'rshtml',

    extras: $ => [
        /\s+/,
    ],

    conflicts: $ => [
        //[$.text, $.extends_]
    ],

    rules: {
        source_file: $ => seq(
            optional('\u{FEFF}'), // BOM
            optional($.extends_directive),
            optional(repeat($._template))
        ),

        // region tokens
        rust_identifier: _ => token(RUST_IDENTIFIER),
        string_line: _ => token(choice(DOUBLE_QUOTED_STRING, SINGLE_QUOTED_STRING)),

        start_symbol: _ => token(START_SYMBOL),
        open_brace: _ => token(OPEN_BRACE),
        close_brace: _ => token(CLOSE_BRACE),
        open_paren: _ => token(OPEN_PAREN),
        close_paren: _ => token(CLOSE_PAREN),

        open_comment: _ => token('@*'),
        close_comment: _ => token('*@'),

        text: _ => token(/(@@|@@}|@@\{|[^@])+/),
        inner_text: _ => token(/(@@|@@}|@@\{|[^@}])+/),

        if_: _ => token(seq('if', STMT_HEAD_COND)),
        else_if_: _ => token(seq('else if', STMT_HEAD_COND)),
        else_: _ => token('else'),

        while_: _ => token(seq('while', STMT_HEAD_COND)),
        for_: _ => token(seq('for', STMT_HEAD_COND)),
        match_: _ => token(seq('match', STMT_HEAD_COND)),

        extends_: _ => token('extends'),

        // sonra kullanılacak
        component_tag_identifier: $ => token(/[A-Z][a-zA-Z0-9]*(\.[A-Z][a-zA-Z0-9]*)*/),
        // endregion

        _template: $ => choice(
            prec(1, $.comment_block),
            prec(1, $._block),
            prec(0, $.text)
        ),

        _inner_template: $ => choice(
            prec(1, $.comment_block),
            prec(1, $._block),
            prec(0, $.inner_text)
        ),

        extends_directive: $ => seq(
            $.start_symbol,
            $.extends_,
            choice(
                seq(
                    $.open_paren,
                    optional(field('path', $.string_line)),
                    $.close_paren
                ), /\s/,
            )
        ),

        _block: $ => seq($.start_symbol, $.rust_stmt),

        comment_block: $ => seq(
            $.open_comment,
            token(/([^*]|\*+[^@])*/),
            $.close_comment
        ),

        rust_stmt: $ => repeat1(seq(
            field('head', alias($.rust_stmt_head, $.source_file)),
            $.open_brace,
            field('body', optional(repeat1($._inner_template))),
            $.close_brace
        )),

        rust_stmt_head: $ => choice(
            $.if_,
            $.else_if_,
            $.else_,
            $.while_,
            $.for_,
            $.match_
        ),

    }
});