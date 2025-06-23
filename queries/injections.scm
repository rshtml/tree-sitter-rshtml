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