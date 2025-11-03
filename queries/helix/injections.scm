((html_text) @injection.content
  (#set! injection.language "html")
  (#set! injection.include-children)
  (#set! injection.combined))

((rust_text) @injection.content
   (#set! injection.language "rust")
   (#set! injection.include-children))

((comment_block) @injection.content
  (#set! injection.language "comment"))
