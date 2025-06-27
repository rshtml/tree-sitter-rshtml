/**
 * @file RsHtml Template Parser
 * @author mehmetkesik
 * @license MIT & Apache-2.0
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// rust_expr_simple: $ => token(seq(
//     optional(choice('#', repeat1('&'))),
//     RUST_IDENTIFIER,
//     repeat(choice(
//         seq(
//             choice('.', '::', '&'),
//             RUST_IDENTIFIER
//         ),
//         seq('(', $._nested_content, ')'),
//         seq('[', $._nested_content, ']')
//     ))
// )),
// )),
//
//     _nested_content: $ => choice(
//     seq('(', repeat($._nested_content), ')'),
//     seq('[', repeat($._nested_content), ']'),
//     $._line_string,
//     $._expression_boundary
// ),
//
//     _line_string: _ => choice(
//     DOUBLE_QUOTED_STRING,
//     SINGLE_QUOTED_STRING
// ),
//
//     _expression_boundary: $ => choice(
//     prec(1, /[^<{@)\]\n\r]+/),
//     prec(2, /<\/?[\p{L}_]/u)
// ),

const RUST_IDENTIFIER = /[a-zA-Z_][a-zA-Z0-9_]*/;
const COMPONENT_TAG_IDENTIFIER = /[A-Z][a-zA-Z0-9_]*(\.[A-Z][a-zA-Z0-9_]*)*/;

module.exports = grammar({
    name: 'rshtml',

    // sonra kullanılacak
    component_tag_identifier: $ => token(/[A-Z][a-zA-Z0-9]*(\.[A-Z][a-zA-Z0-9]*)*/), // endregion


    extras: $ => [
        /\s/, // Boşluk, tab, yeni satır karakterleri
        $.comment_block // Yorumlar da her yerde olabilir.
    ],

    // Çatışma çözümleri. tree-sitter'a hangi kuralın öncelikli olduğunu söyleriz.
    conflicts: $ => [
        // `component` kuralı (@Comp(...)) ve `rust_expr_simple` (@Comp) çakışabilir.
        // Parantezli olanın daha spesifik ve öncelikli olduğunu belirtiyoruz.
        [$.component, $.rust_expr_simple],
    ],

    rules: {
        // 1. Kök Kural: Dosya, bir dizi ifadeden oluşur.
        template: $ => seq(
            optional('\u{FEFF}'), // BOM
            optional($.extends_directive),
            repeat($._template_content)
        ),

        // 2. Ana İçerik Kuralı: Bir içerik, ya bir bloktur ya da metindir.
        // Pest'teki `template_content`'in karşılığı.
        _template_content: $ => choice(
            $.block,
            $.text
        ),

        _inner_template: $ => optional(repeat(choice($.block, $.inner_text))),

        // 3. Metin Kuralı (`text`): "Zeki" yaklaşım burada başlıyor.
        // `text`, diğer daha spesifik kuralların (`block`) başlamadığı
        // her şeydir. `token` ve `prec` ile bunu sağlıyoruz.
        text: $ => token(prec(-1, repeat1(
            choice(
                '@@', // Kaçış karakteri
                /[^@]/ // @ dışındaki herhangi bir karakter
            )
        ))),

        // `inner_text` ve `tag_template` gibi varyasyonlar için context'e özgü kurallar.
        // Pest'teki `inner_template`'in karşılığı.
        inner_text: $ => token(prec(-1, repeat1(
            choice(
                '@@',
                /[^@{}]/ // @, { veya } dışındaki her şey
            )
        ))),

        // Pest'teki `tag_template`'in karşılığı.
        _tag_template: $ => repeat(choice($.block, $.tag_text)),
        tag_text: $ => token(prec(-1, repeat1(
            choice(
                '@@',
                /[^@<]/ // @ veya < dışındaki her şey
            )
        ))),

        // 4. Yorum Bloğu
        // `extras`'a eklediğimiz için her yerde olabilir.
        comment_block: $ => seq(
            '@*',
            // `*@` dizilimine kadar olan her şey.
            token.immediate(prec(1, /([^*]|\*+[^@])*/)),
            '*@'
        ),

        // 5. Blok Tipleri: Pest'teki `block` kuralı.
        // `component_tag` veya `@` ile başlayan bir blok.
        block: $ => choice(
            $.component_tag,
            seq(
                '@',
                choice(
                    // Direktifler ve özel bloklar
                    $.raw_block, $.render_directive, $.include_directive, $.section_block, $.section_directive,
                    $.render_body_directive, $.child_content_directive, $.component, $.use_directive,
                    // Rust yapıları
                    $.rust_block, $.rust_expr, $.rust_expr_paren, $.match_expr, $.continue_directive, $.break_directive,
                    // En son, basit rust ifadesi (fallback)
                    $.rust_expr_simple
                )
            )
        ),

        // --- Rust Kuralları (Pest'ten adapte edilmiştir) ---

        // 6. @if, @for, @while...
        rust_expr: $ => prec.left(repeat1(
            seq(
                field('head', $.rust_expr_head),
                '{',
                field('body', optional(repeat(choice($.block, $.inner_text)))),
                '}'
            )
        )),
        rust_expr_head: $ => choice(
            seq(
                choice('if', seq('else', 'if'), 'for', 'while'),
                field('condition', /[^@{}]*/) // `{` veya `@` veya `}` görene kadar oku.
            ),
            'else'
        ),

        // 7. Basit Rust İfadesi: @user.name, @my_func()
        // Pest'teki negatif lookahead'i, tree-sitter'da `prec` ile yönetiyoruz.
        // Bu kural, diğer @ anahtar kelimelerinden daha düşük önceliğe sahip.
        rust_expr_simple: $ => prec(-1, seq(
            optional(choice('#', repeat1('&'))),
            $.rust_identifier,
            repeat($._chain_segment)
        )),

        _chain_segment: $ => choice(
            // Kural 1: Alan erişimi veya yol segmenti
            // Örnek: .name, ::Path, &borrow
            seq(
                choice('.', '::', '&'),
                $.rust_identifier
            ),

            // Kural 2: Parantezli gruplar (fonksiyon çağrıları vb.)
            // Özyinelemeli olarak `_chain_segment`'i ve diğer karakterleri çağırır.
            seq(
                '(',
                repeat(
                    choice(
                        $.rust_expr_simple, // İçeride başka bir basit ifade olabilir
                        ',',               // Virgül olabilir
                        $._chain_segment,  // İçeride zincirleme olabilir (örn: func(a.b))
                        /[^()]*?/         // Parantez dışındaki diğer karakterler
                    )
                ),
                ')'
            ),

            // Kural 3: Köşeli parantezli gruplar (dizi erişimi vb.)
            // Aynı şekilde, iç içe yapıları çözmek için özyineleme kullanır.
            seq(
                '[',
                repeat(
                    choice(
                        $.rust_expr_simple,
                        ',',
                        $._chain_segment,
                        /[^\[\]]*?/ // Köşeli parantez dışındaki diğer karakterler
                    )
                ),
                ']'
            )
        ),

        // 8. Parantezli İfade: @( ... )
        rust_expr_paren: $ => seq(
            optional('#'),
            '(',
            // `)` görene kadar olan her şey.
            /[^)]*/,
            ')'
        ),

        // 9. Rust Kod Bloğu: @{ ... }
        rust_block: $ => seq('{', field('code', /[^}]*/), '}'),
        // `rust_block_content` içindeki `@:` gibi yapılar için ayrı kurallar gerekir.
        // Şimdilik basitleştiriyoruz.

        // 10. Match İfadesi: @match ...
        match_expr: $ => seq(
            'match',
            field('value', /[^@{}]*/),
            '{',
            repeat($.match_expr_arm),
            '}'
        ),
        match_expr_arm: $ => seq(
            field('pattern', /[^=]*/), // `=>` görene kadar
            '=>',
            field('body', optional(repeat(choice($.block, $.inner_text)))),
            optional(',')
        ),

        // 11. continue ve break
        continue_directive: $ => 'continue',
        break_directive: $ => 'break',

        // 12. raw block
        raw_block: $ => seq('raw', '{', /[^}]*/, '}'),

        // --- Direktif Kuralları (Pest'ten adapte edilmiştir) ---

        string_literal: $ => token(choice(
            /"[^"]*"/,
            /'[^']*'/
        )),

        include_directive: $ => seq('include', '(', field('path', $.string_literal), ')'),
        extends_directive: $ => seq('extends', '(', field('path', $.string_literal), ')'),

        section_block: $ => seq('section', field('name', $.rust_identifier), '{', optional(repeat(choice($.block, $.inner_text))), '}'),
        section_directive: $ => seq('section', '(', field('name', $.string_literal), ',', field('content', $.string_literal), ')'),

        render_directive: $ => seq('render', '(', field('name', $.string_literal), ')'),

        render_body_directive: $ => seq('render_body', optional(seq('(', ')'))),
        child_content_directive: $ => seq('child_content', optional(seq('(', ')'))),

        use_directive: $ => seq('use', field('path', $.string_literal), optional(seq('as', field('alias', $.rust_identifier)))),

        // --- Component Kuralları ---

        // 13. Component Bloğu: @Comp(...) { ... }
        component: $ => prec(1, seq(
            field('name', $.rust_identifier),
            '(',
            sepBy(',', $.component_parameter),
            ')',
            '{', field('body', optional(repeat(choice($.block, $.inner_text)))), '}'
        )),
        component_parameter: $ => seq(
            field('name', $.rust_identifier),
            ':',
            field('value', $._attribute_value)
        ),

        // 14. Component Tag: <Comp ...> ... </Comp>
        // HTML tag'i yok, sadece component tag'i var.
        component_tag: $ => seq(
            '<',
            field('name', $.component_tag_name),
            repeat($.attribute),
            choice(
                '/>',
                seq('>', field('body', repeat(choice($.block, $.tag_text))),
                    '</', $.component_tag_name, '>')
            )
        ),
        attribute: $ => seq(
            field('name', /[a-zA-Z\-_]+/),
            optional(seq('=', field('value', $._attribute_value)))
        ),
        _attribute_value: $ => choice(
            'true', 'false',
            token(/-?\d+(\.\d+)?/), // number
            $.string_literal,
            $.block, // @ifadesi veya { ... } bloğu
        ),
        component_tag_name: $ => token.immediate(COMPONENT_TAG_IDENTIFIER),

        // --- Yardımcı Kurallar ---
        rust_identifier: $ => token(RUST_IDENTIFIER)
    }
});

// Virgülle ayrılmış listeler için bir yardımcı fonksiyon.
function sepBy(sep, rule) {
    return optional(seq(rule, repeat(seq(sep, rule)), optional(sep)));
}