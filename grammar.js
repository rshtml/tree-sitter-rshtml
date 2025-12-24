/**
 * @file RsHtml Template Parser
 * @author mehmetkesik
 * @license MIT & Apache-2.0
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-nocheck

// region constants
const RUST_IDENTIFIER = /[a-zA-Z_][a-zA-Z0-9_]*/;
const DOUBLE_QUOTED_STRING = /"(\\.|[^"\\])*"/;
const SINGLE_QUOTED_STRING = /'(\\.|[^'\\])*'/;
const SINGLE_QUOTED_CHAR = /'(\\.|[^'\\])'/;
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
const COLON = ":";
const SEMICOLON = ";";
const EQUALS = "=";

const STMT_HEAD_COND = /\s*[^@{}\s][^@{}]*/;
const ASCII_DIGITS = /[0-9]+/;
const COMPONENT_TAG_IDENTIFIER = /[A-Z][a-zA-Z0-9]*/;
// endregion

module.exports = grammar({
  name: "rshtml",

  extras: ($) => [/\s+/, $.comment_block],

  conflicts: $ => [
    [$._params, $.rust_expr_paren],
  ],

  rules: {
    source_file: ($) =>
      seq(
        optional(prec(1, $.template_params)),
        repeat($._template),
      ),

    // region tokens
    rust_identifier: (_) => token(RUST_IDENTIFIER),
    _rust_identifier: (_) => token(RUST_IDENTIFIER),
    string_line: (_) =>
      token(choice(DOUBLE_QUOTED_STRING, SINGLE_QUOTED_STRING)),
    _string_line: (_) =>
      token(choice(DOUBLE_QUOTED_STRING, SINGLE_QUOTED_STRING)),

    start_symbol: (_) => token(START_SYMBOL),
    hash_symbol: (_) => token(HASH_SYMBOL),
    open_brace: (_) => token(OPEN_BRACE),
    close_brace: (_) => token(CLOSE_BRACE),
    open_paren: (_) => token(OPEN_PAREN),
    close_paren: (_) => token(CLOSE_PAREN),
    open_bracket: (_) => token(OPEN_BRACKET),
    close_bracket: (_) => token(CLOSE_BRACKET),
    comma: (_) => token(COMMA),
    fat_arrow: (_) => token(FAT_ARROW),
    colon: (_) => token(COLON),
    semicolon: (_) => token(SEMICOLON),
    equals: (_) => token(EQUALS),

    open_comment: (_) => token("@*"),
    close_comment: (_) => token("*@"),

    _escaped: (_) => token("@@"),

    // _text: (_) => token(prec(-1, /[^@<\s]([^@<]*[^@<\s])?/)),
    _text: (_) =>
      token(
        prec(
          -1,
          /([^@<\s]|<[^A-Z/]|<\/[^A-Z])(([^@<]|<[^A-Z/]|<\/[^A-Z])*[^@<\s])?/,
        ),
      ),
    _inner_text: (_) =>
      token(
        prec(
          -1,
          /([^@<}\s]|<[^A-Z/]|<\/[^A-Z])(([^@<}]|<[^A-Z/]|<\/[^A-Z])*[^@}<\s])?/,
        ),
      ),

    if_: (_) => token(prec(5, seq("if", /\s+/, STMT_HEAD_COND))),
    else_: (_) => token(prec(6, "else")),

    while_: (_) => token(prec(5, seq("while", /\s+/, STMT_HEAD_COND))),
    for_: (_) => token(prec(5, seq("for", /\s+/, STMT_HEAD_COND))),
    match_: (_) => token(prec(5, seq("match", /\s+/, STMT_HEAD_COND))),

    match_arm_pattern: (_) => token(/[^=@}]([^=@]+|=([^>]))+/),
    _match_inner_text: (_) => token(prec(-1, /([^\r\n@},]|(,[^\r\n@}])|@@)+/)),
    match_arm_end: (_) => token(prec(-1, /( \t)*,?\s*/)),

    continue_: (_) => token(prec(5, "continue")),
    break_: (_) => token(prec(5, "break")),

    raw_: (_) => token(prec(5, "raw")),
    _raw_text: (_) => token(/[^{}]+/),

    child_content_: (_) => token(prec(0, "child_content")),
    use_: (_) => token(prec(0, "use")),
    as_: (_) => token("as"),

    tag_open: (_) => token(prec(-1, "<")),
    tag_self_close: (_) => token("/>"),
    tag_close: (_) => token(">"),
    tag_end_open: (_) => token(prec(-1, "</")),

    component_tag_identifier: (_) => token(COMPONENT_TAG_IDENTIFIER),

    fn_: (_) => token("fn"),

    // region errors
    if_error: (_) => token(prec(5, seq("if", /\s*/, "{"))),
    for_error: (_) => token(prec(5, seq("for", /\s*/, "{"))),
    while_error: (_) => token(prec(5, seq("while", /\s*/, "{"))),
    match_error: (_) => token(prec(5, seq("match", /\s*/, "{"))),
    // endregion

    // endregion

    // region top_definition

    _template: ($) => choice($._block, alias(choice($._escaped, $._text), $.html_text)),
    _inner_template: ($) =>
      seq($.open_brace, field("body", repeat(choice($._block, alias(choice($._escaped, $._inner_text), $.html_text)))), $.close_brace),


    template_params: ($) => seq($.start_symbol, $._params, optional($.semicolon)),
    _params: ($) => seq(
      $.open_paren,
      alias(
        optional(
          seq($.param, repeat(seq($.comma, $.param)), optional($.comma))
        ), $.rust_text),
      $.close_paren),
    param: ($) => seq(
      alias($.rust_identifier, $.param_name),
      optional(seq($.colon, $.param_type))
    ),
    param_type: ($) => repeat1(choice($._param_type_nested, /[^(\[{}<,)]/)),
    _param_type_nested: $ => choice(
      seq('(', repeat(choice($._param_type_nested, /[^)]/)), ')'),
      seq('[', repeat(choice($._param_type_nested, /[^\]]/)), ']'),
      seq('{', repeat(choice($._param_type_nested, /[^}]/)), '}'),
      seq('<', repeat(choice($._param_type_nested, '->', '=>', /[^>]/)), '>')
    ),

    comment_block: ($) =>
      seq($.open_comment, $.comment_content, $.close_comment),
    comment_content: (_) => token(/([^*]|\*+[^@])*/),

    // endregion

    _block: ($) =>
      choice(
        $.component_tag,
        seq(
          $.start_symbol,
          choice(
            $.raw_block,
            $.child_content_directive,
            $.use_directive,
            $.rust_block,
            $._rust_stmt,
            $.fn_directive,
            $.rust_expr_paren,
            $.continue_,
            $.break_,
            $.rust_expr_simple,
          ),
        ),
      ),

    // region rust_expr_simple
    rust_expr_simple: ($) =>
      seq(
        optional($.hash_symbol),
        field("expr", alias($.rust_expr_simple_content, $.rust_text)),
      ),

    rust_expr_simple_content: ($) =>
      seq(
        repeat("&"),
        $._rust_identifier,
        repeat(
          choice(
            seq(choice("&", ".", "::"), $._rust_identifier),
            $._chain_segment,
          ),
        ),
      ),

    _chain_segment: ($) =>
      prec(
        4,
        choice(
          seq("(", repeat(choice($._nested_content, /[^)]/)), ")"),
          seq("[", repeat(choice($._nested_content, /[^\]]/)), "]"),
        ),
      ),

    _nested_content: ($) =>
      choice(
        seq("(", repeat(choice($._nested_content, /[^)]/)), ")"),
        seq("[", repeat(choice($._nested_content, /[^\]]/)), "]"),
        $._string_line,
      ),
    // endregion

    // region rust_expr_paren
    rust_expr_paren: ($) =>
      seq(
        optional($.hash_symbol),
        $.open_paren,
        field(
          "expr",
          alias(repeat(choice($._nested_expression, /[^)]/)), $.rust_text),
        ),
        $.close_paren,
      ),
    _nested_expression: ($) =>
      choice(
        seq("(", repeat(choice($._nested_expression, /[^)]/)), ")"),
        seq("{", repeat(choice($._nested_expression, /[^}]/)), "}"),
        seq("[", repeat(choice($._nested_expression, /[^\]]/)), "]"),
      ),
    // endregion

    // region rust_stmt
    _rust_stmt: ($) =>
      choice(
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

    if_stmt: ($) =>
      seq(
        field("head", alias($.if_, $.rust_text)),
        $._inner_template,
        optional($.else_clause),
      ),
    else_clause: ($) =>
      seq(
        field("head", alias($.else_, $.rust_text)),
        choice($._inner_template, $.if_stmt),
      ),

    for_stmt: ($) =>
      seq(field("head", alias($.for_, $.rust_text)), $._inner_template),

    while_stmt: ($) =>
      seq(field("head", alias($.while_, $.rust_text)), $._inner_template),

    match_stmt: ($) =>
      seq(
        field("head", alias($.match_, $.rust_text)),
        $.open_brace,
        repeat1($.match_stmt_arm),
        $.close_brace,
      ),
    match_stmt_arm: ($) =>
      seq(
        field("pattern", alias($.match_arm_pattern, $.rust_text)),
        $.fat_arrow,
        field(
          "expr",
          choice(
            $._inner_template,
            $.continue_,
            $.break_,
            $.rust_expr_paren,
            $.rust_expr_simple,
            $.match_text,
          ),
        ),
        $.match_arm_end,
      ),
    match_text: ($) => field("text", alias($._match_inner_text, $.html_text)),
    // endregion

    // region raw_block
    raw_block: ($) =>
      seq(
        $.raw_,
        $.open_brace,
        field("content", alias(repeat($._raw_nested_content), $.html_text)),
        $.close_brace,
      ),
    _raw_nested_content: ($) =>
      choice(seq("{", repeat($._raw_nested_content), "}"), $._raw_text),
    // endregion

    // region rust_block
    rust_block: ($) =>
      seq(
        $.open_brace,
        field("content", alias(repeat($._rust_block_content), $.rust_text)),
        $.close_brace,
      ),

    _rust_block_content: ($) => choice($._nested_block, $._rust_code),
    // endregion

    // region rust_code
    _nested_block: ($) => seq("{", repeat($._rust_block_content), "}"),
    _rust_code: ($) =>
      choice(
        seq($._line_comment_start, $._line_comment, token.immediate(/[\r\n]/)),
        seq($._block_comment_start, $._block_comment, token.immediate("*/")),
        $._rust_code_string,
        $._inner_rust,
      ),
    _inner_rust: (_) =>
      token(prec(-2, /([^@{}'"r/]|\/[^/*]|r[^#"]|r#[^"]|'.[^'])+/)),
    _line_comment_start: (_) => token("//"),
    _line_comment: (_) => token(prec(-1, /[^\r\n]+/)),
    _block_comment_start: (_) => token("/*"),
    _block_comment: (_) => token(prec(-1, /([^*]|\*[^\/])+/)),
    _rust_code_string: (_) =>
      token(
        prec(
          -1,
          choice(
            SINGLE_QUOTED_CHAR,
            DOUBLE_QUOTED_STRING,
            /r"[^"]*"/,
            /r#"([^"]|"[^#])*"#/,
          ),
        ),
      ),
    // endregion

    // endregion

    /// / ///

    // region child_content_directive
    child_content_directive: ($) =>
      seq($.child_content_, optional(seq($.open_paren, $.close_paren))),
    // endregion

    // region use_directive
    use_directive: ($) =>
      seq(
        $.use_,
        token(/[ \t]*/),
        field("path", $.string_line),
        optional($.as_clause),
        optional($.semicolon),
      ),
    as_clause: ($) =>
      seq($.as_, field("alias", $.component_tag_identifier)),
    // endregion

    // region component_tag
    component_tag: ($) =>
      seq(
        $.tag_open,
        field("name", $.component_tag_identifier),
        repeat($.component_tag_parameter),
        choice(
          $.tag_self_close,
          seq(
            $.tag_close,
            field("body", repeat(alias($._template, $.component_tag_body))),
            $.tag_end_open,
            field("name_close", $.component_tag_identifier),
            $.tag_close,
          ),
        ),
      ),

    component_tag_parameter: ($) =>
      seq(
        field("name", $.rust_identifier),
        optional(
          seq(
            $.equals,
            choice(
              $.bool,
              $.number,
              $.string_line,
              seq($.start_symbol, $.rust_expr_paren),
              seq($.start_symbol, $.rust_expr_simple),
              $._inner_template,
            ),
          ),
        ),
      ),

    bool: (_) => token(/true|false/),
    number: (_) =>
      token(
        seq(optional("-"), seq(ASCII_DIGITS, optional(seq(".", ASCII_DIGITS)))),
      ),

    // endregion

    // region fn_directive

    fn_directive: ($) => seq(
      alias(seq($.fn_head, $._params), $.rust_text),
      $._inner_template
    ),
    fn_head: ($) => seq($.fn_, token(/[ \t]+/), $.rust_identifier)

    // endregion
  },
});
