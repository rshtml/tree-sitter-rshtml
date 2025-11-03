#include <tree_sitter/parser.h>
#include <string.h>

#include "../node_modules/tree-sitter-html/src/scanner.c"

void *tree_sitter_rshtml_external_scanner_create() {
    return tree_sitter_html_external_scanner_create();
}

void tree_sitter_rshtml_external_scanner_destroy(void *payload) {
    tree_sitter_html_external_scanner_destroy(payload);
}

unsigned tree_sitter_rshtml_external_scanner_serialize(void *payload, char *buffer) {
    return tree_sitter_html_external_scanner_serialize(payload, buffer);
}

void tree_sitter_rshtml_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
    tree_sitter_html_external_scanner_deserialize(payload, buffer, length);
}

bool tree_sitter_rshtml_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    if (valid_symbols[START_TAG_NAME]){
        if (lexer->lookahead >= 'A' && lexer->lookahead <= 'Z') {
            return false;
        }
    }

    return tree_sitter_html_external_scanner_scan(payload, lexer, valid_symbols);
}
