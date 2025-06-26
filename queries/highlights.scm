(start_symbol) @operator
(hash_symbol) @operator
(hash_symbol) @punctuation.special

(open_paren) @punctuation.bracket
(close_paren) @punctuation.bracket
(open_brace) @punctuation.bracket
(close_brace) @punctuation.bracket
;(open_bracket) @punctuation.bracket
;(close_bracket) @punctuation.bracket

;(comma) @punctuation.delimiter
(fat_arrow) @operator
(colon) @punctuation.delimiter
(semicolon) @punctuation.delimiter
(at_colon) @operator

(string_line) @string

(comment_block) @comment
(open_comment) @operetor
(close_comment) @operetor

(continue_) @keyword
(break_) @keyword

(extends_) @keyword
(raw_) @keyword

(include_) @keyword
(render_) @keyword
(render_body_) @keyword
(child_content_) @keyword

(use_) @keyword
(as_) @keyword

(number) @number
(bool) @boolean

(component
  name: (rust_identifier) @type)

(component_parameter
  name: (rust_identifier) @parameter)

(as_clause
  alias: (rust_identifier) @type)