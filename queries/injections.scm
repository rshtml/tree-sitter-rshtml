(html_text
  text: (source_file) @html)

(html_inner_text
  text: (source_file) @html)

(rust_expr_simple
  expr: (source_file) @rust)

(rust_expr_paren
  expr: (source_file) @rust)

(if_stmt
  head: (source_file) @rust)
(else_clause
  head: (source_file) @rust)

(for_stmt
  head: (source_file) @rust)

(while_stmt
  head: (source_file) @rust)

(match_stmt
  head: (source_file) @rust)
(match_stmt_arm
  pattern: (source_file) @rust)

(match_text
  text: (source_file) @html)

(raw_content
  content: (source_file) @html)

(rust_block
  content: (source_file) @rust)

(text_multiline
  text: (source_file) @html)

(text_line
  text: (source_file) @html)