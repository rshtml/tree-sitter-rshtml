/**
 * @file RsHtml Template Parser
 * @author mehmetkesik
 * @license MIT & Apache-2.0
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-nocheck

// commands
/*
tree-sitter query queries/injections.scm  views/if_else.rs.html
 */

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
const AT_COLON = "@:";
const SEMICOLON = ";";
const EQUALS = "=";

const STMT_HEAD_COND = /\s*[^@{}\s][^@{}]*/; // /\s*[^@{}\s][^@{}]*/; // /[^@{}]+/;
const ASCII_DIGITS = /[0-9]+/;
const COMPONENT_TAG_IDENTIFIER = /[A-Z][a-zA-Z0-9_]*(\.[A-Z][a-zA-Z0-9_]*)*/;
// endregion

module.exports = grammar({
  name: "rshtml",

  extras: (_) => [/\s+/],

  conflicts: ($) => [[$.rust_block], [$.rust_identifier, $._rust_identifier]],

  rules: {
    source_file: ($) =>
      seq(
        optional("\u{FEFF}"), // BOM
        optional($.extends_directive),
        optional(repeat($._template)),
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
    at_colon: (_) => token(AT_COLON),
    equals: (_) => token(EQUALS),

    open_comment: (_) => token("@*"),
    close_comment: (_) => token("*@"),

    _escaped: (_) => token("@@"),

    _text: (_) => token(prec(-1, /([^@<]|<[^A-Z\/]|<\/[^A-Z])+/)),
    _inner_text: (_) => token(prec(-1, /([^@<}]|<[^A-Z\/]|<\/[^A-Z])+/)),

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

    extends_: (_) => token(prec(5, "extends")),
    raw_: (_) => token(prec(5, "raw")),
    _raw_text: ($) => token(/[^{}]+/),

    _text_line: (_) => token(repeat1(choice(/[^@\r\n]/, "@@"))),
    _text_multiline: (_) =>
      token(
        repeat1(
          choice(
            /[^@<]|<[^\/]|<\/[^t]|<\/t[^e]|<\/te[^x]|<\/tex[^t]|<\/text[^>]/,
            "@@",
          ),
        ),
      ),

    include_: (_) => token(prec(5, "include")),
    render_: (_) => token(prec(0, "render")),
    render_body_: (_) => token(prec(0, "render_body")),
    child_content_: (_) => token(prec(0, "child_content")),
    use_: (_) => token(prec(0, "use")),
    as_: (_) => token("as"),
    section_: (_) => token("section"),

    // region errors
    if_error: (_) => token(prec(5, seq("if", /\s*/, "{"))),
    for_error: (_) => token(prec(5, seq("for", /\s*/, "{"))),
    while_error: (_) => token(prec(5, seq("while", /\s*/, "{"))),
    match_error: (_) => token(prec(5, seq("match", /\s*/, "{"))),
    // endregion

    // endregion

    // region top_definition
    _template: ($) => choice($.comment_block, $._block, $.html_text),

    _inner_template: ($) =>
      seq(
        $.open_brace,
        field(
          "body",
          optional(
            repeat(choice($.comment_block, $._block, $.html_inner_text)),
          ),
        ),
        $.close_brace,
      ),

    html_text: ($) =>
      field("text", alias(choice($._escaped, $._text), $.source_file)),
    html_inner_text: ($) =>
      field("text", alias(choice($._escaped, $._inner_text), $.source_file)),

    extends_directive: ($) =>
      seq(
        $.start_symbol,
        $.extends_,
        choice(
          seq(
            $.open_paren,
            optional(field("path", $.string_line)),
            $.close_paren,
          ),
          /\s/,
        ),
      ),

    comment_block: ($) =>
      seq($.open_comment, token(/([^*]|\*+[^@])*/), $.close_comment),
    // endregion

    _block: ($) =>
      choice(
        $.component_tag,
        seq(
          $.start_symbol,
          choice(
            $.raw_block,
            $.render_body_directive,
            $.render_directive,
            $.child_content_directive,
            $.include_directive,
            $.section_directive,
            $.section_block,
            $.use_directive,
            $.component,
            $.rust_block,
            $._rust_stmt,
            $.rust_expr_paren,
            $.continue_,
            $.break_,
            $.rust_expr_simple,
          ),
        ),
      ),

    // region rust_expr_simple
    rust_expr_simple: ($) =>
      prec(
        -1,
        seq(
          optional($.hash_symbol),
          field("expr", alias($.rust_expr_simple_content, $.source_file)),
        ),
      ),

    rust_expr_simple_content: ($) =>
      seq(
        seq(
          optional(repeat1("&")),
          $._rust_identifier,
          optional(
            repeat1(
              choice(
                seq(choice("&", ".", "::"), $._rust_identifier),
                $._chain_segment,
              ),
            ),
          ),
        ),
        //optional(repeat1($._chain_segment))
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
        optional(field("expr", alias($.rust_expr_paren_body, $.source_file))),
        $.close_paren,
      ),
    rust_expr_paren_body: ($) => repeat1(choice($._nested_expression, /[^)]/)),
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
        field("head", alias($.if_, $.source_file)),
        $._inner_template,
        optional($.else_clause),
      ),
    else_clause: ($) =>
      seq(
        field("head", alias($.else_, $.source_file)),
        choice($._inner_template, $.if_stmt),
      ),

    for_stmt: ($) =>
      seq(field("head", alias($.for_, $.source_file)), $._inner_template),

    while_stmt: ($) =>
      seq(field("head", alias($.while_, $.source_file)), $._inner_template),

    match_stmt: ($) =>
      seq(
        field("head", alias($.match_, $.source_file)),
        $.open_brace,
        repeat1($.match_stmt_arm),
        $.close_brace,
      ),
    match_stmt_arm: ($) =>
      seq(
        field("pattern", alias($.match_arm_pattern, $.source_file)),
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
    match_text: ($) => field("text", alias($._match_inner_text, $.source_file)),
    // endregion

    // region raw_block
    raw_block: ($) =>
      seq($.raw_, $.open_brace, optional($.raw_content), $.close_brace),
    raw_content: ($) =>
      field("content", alias(repeat1($._raw_nested_content), $.source_file)),
    _raw_nested_content: ($) =>
      choice(
        seq("{", optional(repeat1($._raw_nested_content)), "}"),
        $._raw_text,
      ),
    // endregion

    // region rust_block
    rust_block: ($) =>
      seq(
        $.open_brace,
        field("content", alias(optional($._rust_block_content), $.source_file)),
        $.close_brace,
      ),

    _rust_block_content: ($) =>
      repeat1(
        choice(
          $.text_line_directive,
          $.text_block_tag,
          $._nested_block,
          $._rust_code,
        ),
      ),

    // region text_line_directive
    text_line_directive: ($) =>
      seq(
        $.at_colon,
        repeat(choice($.text_line, seq($.start_symbol, $.rust_expr_simple))),
        token.immediate(/[\r\n]/),
      ),
    text_line: ($) => field("text", alias($._text_line, $.source_file)),
    // endregion

    // region text_block_tag
    text_block_tag: ($) =>
      seq(
        $.text_block_tag_open,
        repeat(
          choice($.text_multiline, seq($.start_symbol, $.rust_expr_simple)),
        ),
        $.text_block_tag_close,
      ),
    text_block_tag_open: ($) => token(prec(4, "<text>")),
    text_block_tag_close: ($) => token(prec(4, "</text>")),
    text_multiline: ($) =>
      field("text", alias($._text_multiline, $.source_file)),
    // endregion

    // region rust_code
    _nested_block: ($) => seq("{", optional($._rust_block_content), "}"),
    _rust_code: ($) =>
      repeat1(
        choice(
          seq(
            $._line_comment_start,
            $._line_comment,
            token.immediate(/[\r\n]/),
          ),
          seq($._block_comment_start, $._block_comment, token.immediate("*/")),
          $._rust_code_string,
          $._inner_rust,
        ),
      ),
    _inner_rust: (_) =>
      token(prec(-2, /([^@{}'"r\/]|\/[^\/*]|r[^#"]|r#[^"]|'.[^'])+/)),
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

    // region include_directive
    include_directive: ($) =>
      seq(
        $.include_,
        $.open_paren,
        field("path", $.string_line),
        $.close_paren,
      ),
    // endregion

    // region render_directive
    render_directive: ($) =>
      seq($.render_, $.open_paren, field("path", $.string_line), $.close_paren),
    // endregion

    // region render_body_directive
    render_body_directive: ($) =>
      prec(
        1,
        seq(
          $.render_body_,
          choice(seq($.open_paren, $.close_paren), token(/\s/)),
        ),
      ),
    // endregion

    // region child_content_directive
    child_content_directive: ($) =>
      seq(
        $.child_content_,
        choice(seq($.open_paren, $.close_paren), token(/\s/)),
      ),
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
      seq($.as_, token(/[ \t]+/), field("alias", $.rust_identifier)),
    // endregion

    // region component_block
    component: ($) =>
      seq(
        field("name", $.rust_identifier),
        $.open_paren,
        repeat(
          seq($.component_parameter, repeat(seq(",", $.component_parameter))),
        ),
        $.close_paren,
        $._inner_template,
      ),
    component_parameter: ($) =>
      seq(
        field("name", $.rust_identifier),
        $.colon,
        choice(
          $.bool,
          $.number,
          $.string_line,
          seq($.start_symbol, $.rust_expr_paren),
          seq($.start_symbol, $.rust_expr_simple),
          $._inner_template,
        ),
      ),
    bool: (_) => token(/true|false/),
    number: (_) =>
      token(
        seq(optional("-"), seq(ASCII_DIGITS, optional(seq(".", ASCII_DIGITS)))),
      ),

    // endregion

    // region component_tag
    component_tag: ($) =>
      seq(
        $.tag_open,
        field("name", $.component_tag_identifier),
        optional(
          seq(token.immediate(/\s+/), repeat($.component_tag_parameter)),
        ),
        choice(
          $.tag_self_close,
          seq(
            $.tag_close,
            field("body", repeat($._template)),
            $.tag_end_open,
            field("name_close", $.component_tag_identifier),
            $.tag_close,
          ),
        ),
      ),

    tag_open: (_) => token(prec(-1, "<")),
    tag_self_close: (_) => token("/>"),
    tag_close: (_) => token(">"),
    tag_end_open: (_) => token(prec(-1, "</")),

    component_tag_parameter: ($) =>
      seq(
        field("name", $.rust_identifier),
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
    component_tag_identifier: ($) => token.immediate(COMPONENT_TAG_IDENTIFIER),
    // endregion

    // region section_directive
    section_directive: ($) =>
      seq(
        $.section_,
        $.open_paren,
        field("name", $.string_line),
        $.comma,
        field("value", choice($.string_line, $.rust_expr_simple)),
        $.close_paren,
      ),
    // endregion

    // region section_block
    section_block: ($) =>
      seq($.section_, field("name", $.rust_identifier), $._inner_template),
    // endregion
  },
});
