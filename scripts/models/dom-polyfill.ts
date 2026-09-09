// xacro-parser and three's Collada parser expect a browser DOM. xmldom is
// enough for both: DOMParser, XMLSerializer and the Node constants. Import
// this module first, for its side effect, in every model script.
import { DOMParser, Node, XMLSerializer } from '@xmldom/xmldom';

const g = globalThis as unknown as Record<string, unknown>;
g.DOMParser ??= DOMParser;
g.XMLSerializer ??= XMLSerializer;
g.Node ??= Node;

export {};
