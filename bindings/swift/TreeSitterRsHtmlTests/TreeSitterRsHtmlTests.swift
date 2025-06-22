import XCTest
import SwiftTreeSitter
import TreeSitterRshtml

final class TreeSitterRshtmlTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_rshtml())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading RsHtml grammar")
    }
}
