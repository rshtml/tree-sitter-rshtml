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
const FAT_ARROW = "=>";
const COMMA = ",";
const AT_COLON = "@:";

const STMT_HEAD_COND = /\s*[^@{}\s][^@{}]*/; // /\s*[^@{}\s][^@{}]*/; // /[^@{}]+/;

module.exports = grammar({
    name: 'rshtml',

    extras: $ => [/\s+/],

    conflicts: $ => [
        //"[$.while_stmt, $.for_stmt, $.if_stmt]
    ],

    rules: {
        source_file: $ => seq(optional('\u{FEFF}'), // BOM
            optional($.extends_directive), optional(repeat($._template))),

        // region tokens
        rust_identifier: _ => token(RUST_IDENTIFIER),
        string_line: _ => token(choice(DOUBLE_QUOTED_STRING, SINGLE_QUOTED_STRING)),
        _string_line: _ => token(choice(DOUBLE_QUOTED_STRING, SINGLE_QUOTED_STRING)),

        start_symbol: _ => token(START_SYMBOL),
        hash_symbol: _ => token(HASH_SYMBOL),
        open_brace: _ => token(OPEN_BRACE),
        close_brace: _ => token(CLOSE_BRACE),
        open_paren: _ => token(OPEN_PAREN),
        close_paren: _ => token(CLOSE_PAREN),
        open_bracket: _ => token(OPEN_BRACKET),
        close_bracket: _ => token(CLOSE_BRACKET),
        comma: _ => token(COMMA),
        fat_arrow: _ => token(FAT_ARROW),
        at_colon: _ => token(AT_COLON),

        open_comment: _ => token('@*'),
        close_comment: _ => token('*@'),

        _escaped: _ => token('@@'),

        _text: _ => token(prec(-1, /[^@]+/)), ///(@@|@@}|@@\{|[^@])+/
        _inner_text: _ => token(prec(-1, /[^@}]+/)), ///(@@|@@}|@@\{|[^@}])+/

        if_: _ => token(prec(2, seq('if', /\s+/, STMT_HEAD_COND))), ///\s*if\s+[^@{}]+/
        else_: _ => token(prec(3, 'else')), ///\s*else\s*/

        while_: _ => token(prec(2, seq('while', /\s+/, STMT_HEAD_COND))),
        for_: _ => token(prec(2, seq('for', /\s+/, STMT_HEAD_COND))),
        match_: _ => token(prec(2, seq('match', /\s+/, STMT_HEAD_COND))),

        _expr_simple: _ => token(prec(1, seq(
            repeat('&'),
            RUST_IDENTIFIER,
            repeat(seq(choice('&', '.', '::'), RUST_IDENTIFIER))
        ))),

        match_arm_pattern: _ => token(/[^=@}]([^=@]+|=([^>]))+/),
        _match_inner_text: _ => token(prec(-1, /([^\r\n@},]|(,[^\r\n}])+)+/)),
        match_arm_end: _ => token(/( \t)*,\s*/),

        continue_: _ => token(prec(2, 'continue')),
        break_: _ => token(prec(2, 'break')),

        extends_: _ => token(prec(2, 'extends')),
        raw_: _ => token(prec(2, 'raw')),
        _raw_text: $ => token(/[^{}]+/),

        _text_line: _ => token(repeat1(choice(/[^@\r\n]/, '@@'))),
        // region errors
        if_error: _ => token(prec(2, seq('if', /\s*/, '{'))),
        for_error: _ => token(prec(2, seq('for', /\s*/, '{'))),
        while_error: _ => token(prec(2, seq('while', /\s*/, '{'))),
        match_error: _ => token(prec(2, seq('match', /\s*/, '{'))),
        // endregion

        // endregion

        // region top_definition
        _template: $ => choice(
            $.comment_block,
            $._block,
            $.html_text
        ),

        _inner_template: $ => seq(
            $.open_brace,
            field('body', optional(repeat(choice(
                $.comment_block,
                $._block,
                $.html_inner_text,
            )))),
            $.close_brace
        ),

        html_text: $ => field('text', alias(choice(
                $._escaped,
                $._text
            ),
            $.source_file)),
        html_inner_text: $ => field('text', alias(choice(
                $._escaped,
                $._inner_text
            ),
            $.source_file)),

        extends_directive: $ => seq($.start_symbol, $.extends_, choice(seq($.open_paren, optional(field('path', $.string_line)), $.close_paren), /\s/,)),

        comment_block: $ => seq($.open_comment, token(/([^*]|\*+[^@])*/), $.close_comment), // endregion

        _block: $ => seq(
            $.start_symbol,
            choice(
                $.raw_block,
                $.rust_block,
                $._rust_stmt,
                $.rust_expr_paren,
                $.continue_,
                $.break_,
                $.rust_expr_simple
            ),
        ),

        // region rust_expr_simple
        rust_expr_simple: $ => seq(
            optional($.hash_symbol),
            field('expr', alias($.rust_expr_simple_content, $.source_file)),
        ),

        rust_expr_simple_content: $ =>
            seq($._expr_simple, optional(repeat1($._chain_segment))),

        _chain_segment: $ => prec(1, choice(
            seq('(', repeat(choice($._nested_content, /[^)]/)), ')'),
            seq('[', repeat(choice($._nested_content, /[^\]]/)), ']'),
        )),

        _nested_content: $ => choice(
            seq('(', repeat(choice($._nested_content, /[^)]/)), ')'),
            seq('[', repeat(choice($._nested_content, /[^\]]/)), ']'),
            $._string_line
        ),
        // endregion

        // region rust_expr_paren
        rust_expr_paren: $ => seq(
            optional($.hash_symbol),
            $.open_paren,
            optional(
                field('expr', alias($.rust_expr_paren_body, $.source_file))
            ),
            $.close_paren),
        rust_expr_paren_body: $ => repeat1(choice(
            $._nested_expression,
            /[^)]/
        )),
        _nested_expression: $ => choice(
            seq('(', repeat(choice($._nested_expression, /[^)]/)), ')'),
            seq('{', repeat(choice($._nested_expression, /[^}]/)), '}'),
            seq('[', repeat(choice($._nested_expression, /[^\]]/)), ']'),
        ),
        // endregion

        // region rust_stmt
        _rust_stmt: $ => choice(
            $.if_stmt,
            $.for_stmt,
            $.while_stmt,
            $.match_stmt,

            // errors
            alias($.if_error, $.ERROR),
            alias($.for_error, $.ERROR),
            alias($.while_error, $.ERROR),
            alias($.match_error, $.ERROR),
        ),

        if_stmt: $ => seq(
            field('head', alias($.if_, $.source_file)),
            $._inner_template,
            optional($.else_clause)
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

        match_stmt: $ => seq(
            field('head', alias($.match_, $.source_file)),
            $.open_brace,
            repeat1($.match_stmt_arm),
            $.close_brace
        ),
        match_stmt_arm: $ => seq(
            field('pattern', alias($.match_arm_pattern, $.source_file)),
            $.fat_arrow,
            field('expr', choice(
                $._inner_template,
                $.continue_,
                $.break_,
                $.rust_expr_paren,
                $.rust_expr_simple,
                $.match_text
            )),
            $.match_arm_end
        ),
        match_text: $ => field('text', alias(
            repeat1(choice($._escaped, $._match_inner_text)),
            $.source_file
        )),
        // endregion

        // region raw_block
        raw_block: $ => seq(
            $.raw_,
            $.open_brace,
            optional($.raw_content),
            $.close_brace
        ),
        raw_content: $ => field('content', alias(
            repeat1($._raw_nested_content),
            $.source_file
        )),
        _raw_nested_content: $ => choice(
            seq('{', optional(repeat1($._raw_nested_content)), '}'),
            $._raw_text
        ),
        // endregion

        // region rust_block  ** NOT COMPLETE **
        // html_text ve inner_text te @@ kaçışı kaçış olarak görünmelidir ayrıca @@{ ve @@}
        // kaçışları kaldırılmalıdır. tdl_text te de kaçış olarak görünmelidir.
        rust_block: $ => seq(
            $.open_brace,
            optional(repeat1($._rust_block_content)),
            $.close_brace
        ),

        _rust_block_content: $ => choice(
            $.text_line_directive,
            //$.text_block_tag,
            $.nested_block,
            $.rust_code,
        ),

        text_line_directive: $ => seq(
            $.at_colon,
            repeat(choice(
                $.text_line,
                $._tld_expr_simple,
            )),
            token.immediate(/[\r\n]/)
        ),
        _tld_expr_simple: $ => seq($.start_symbol, $.rust_expr_simple),
        text_line: $ => field('text',
            alias($._text_line, $.source_file)
        ),

        text_block_tag: $ => seq(),
        nested_block: $ => seq('{', repeat($._rust_block_content), '}'),
        rust_code: $ => prec(-1, /[^@{}]+/),
        // endregion

    }
});