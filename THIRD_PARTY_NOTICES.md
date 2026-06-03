# Third Party Notices

Stand: 2026-06-01

Diese zentrale Drittanbieter-Lizenzübersicht wurde aus `package-lock.json` erzeugt. Sie enthält die tatsächlich aufgelösten npm-Pakete, die über die Workspace-Abhängigkeiten von `output-api`, `output-ui` und `output-interfaces` erreichbar sind. Interne Workspace-Pakete sind nicht als Drittanbieter-Komponenten aufgeführt.

## Verteilungshinweise

- Diese Datei muss bei der Distribution der Anwendung und insbesondere beim Ausliefern des Frontend-Bundles zusammen mit den Distributionsartefakten verfügbar sein.
- Für Pakete unter Apache-2.0, MIT, BSD-2-Clause, BSD-3-Clause, ISC, Python-2.0, CC-BY-3.0 und CC-BY-4.0 müssen die jeweiligen Copyright-, Lizenz- und Attributionshinweise mitgeführt werden. Diese Übersicht benennt die betroffenen Pakete; die vollständigen Lizenztexte bzw. Paket-LICENSE-Dateien sind beim Packaging beizulegen, wenn sie nicht bereits im Artefakt enthalten sind.
- `NOASSERTION` bedeutet: Im Lockfile und bei der manuellen Prüfung wurde kein belastbarer Lizenzhinweis gefunden. Solche Pakete sollten vor einer Distribution ersetzt, entfernt oder rechtlich geprüft werden.

## Manuell geprüfte Pakete ohne `license`-Feld im Lockfile

| Paket | App | Ergebnis | Hinweis |
| --- | --- | --- | --- |
| busboy@1.6.0 | output-api | MIT | Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei. |
| passport-local@1.0.0 | output-api | MIT | Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei. |
| passport-strategy@1.0.0 | output-api | MIT | Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei. |
| pause@0.0.1 | output-api | MIT | Manuell geprüft: Readme.md enthält MIT-Lizenztext. |
| streamsearch@1.1.0 | output-api | MIT | Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei. |
| daemon@1.1.0 | output-ui | MIT | Manuell geprüft: LICENSE-Datei enthält MIT-Lizenztext. |
| service@0.1.4 | output-ui | NOASSERTION | Manuell geprüft: package.json und README.md enthalten kein Lizenzfeld bzw. keinen Lizenzhinweis. |

## Lizenzübersicht

| Paket | Version | Lizenz | Scope / App | Lockfile-Pfad(e) | Hinweise |
| --- | --- | --- | --- | --- | --- |
| @algolia/abtesting | 1.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/abtesting |  |
| @algolia/client-abtesting | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/client-abtesting |  |
| @algolia/client-analytics | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/client-analytics |  |
| @algolia/client-common | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/client-common |  |
| @algolia/client-insights | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/client-insights |  |
| @algolia/client-personalization | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/client-personalization |  |
| @algolia/client-query-suggestions | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/client-query-suggestions |  |
| @algolia/client-search | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/client-search |  |
| @algolia/ingestion | 1.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/ingestion |  |
| @algolia/monitoring | 1.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/monitoring |  |
| @algolia/recommend | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/recommend |  |
| @algolia/requester-browser-xhr | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/requester-browser-xhr |  |
| @algolia/requester-fetch | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/requester-fetch |  |
| @algolia/requester-node-http | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/@algolia/requester-node-http |  |
| @ampproject/remapping | 2.3.0 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/@ampproject/remapping |  |
| @angular-devkit/architect | 0.2003.22 | MIT | output-ui (transitive) | output-ui/node_modules/@angular-devkit/architect |  |
| @angular-devkit/architect | 0.2003.23 | MIT | output-ui (transitive) | output-ui/node_modules/@angular/build/node_modules/@angular-devkit/architect |  |
| @angular-devkit/core | 19.2.23 | MIT | output-api (transitive) | output-api/node_modules/@angular-devkit/core |  |
| @angular-devkit/core | 20.3.22 | MIT | output-ui (transitive) | output-ui/node_modules/@angular-devkit/core |  |
| @angular-devkit/core | 20.3.23 | MIT | output-ui (transitive) | output-ui/node_modules/@angular/build/node_modules/@angular-devkit/core |  |
| @angular-devkit/schematics | 19.2.23 | MIT | output-api (transitive) | output-api/node_modules/@angular-devkit/schematics |  |
| @angular-devkit/schematics | 20.3.22 | MIT | output-ui (transitive) | output-ui/node_modules/@angular-devkit/schematics |  |
| @angular-devkit/schematics-cli | 19.2.23 | MIT | output-api (transitive) | output-api/node_modules/@angular-devkit/schematics-cli |  |
| @angular/animations | 20.3.18 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/animations |  |
| @angular/build | 20.3.23 | MIT | output-ui (dev) | output-ui/node_modules/@angular/build |  |
| @angular/cdk | 20.2.14 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/cdk |  |
| @angular/cli | 20.3.22 | MIT | output-ui (dev) | output-ui/node_modules/@angular/cli |  |
| @angular/common | 20.3.18 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/common |  |
| @angular/compiler | 20.3.18 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/compiler |  |
| @angular/compiler-cli | 20.3.18 | MIT | output-ui (dev) | output-ui/node_modules/@angular/compiler-cli |  |
| @angular/core | 20.3.18 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/core |  |
| @angular/forms | 20.3.18 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/forms |  |
| @angular/localize | 20.3.18 | MIT | output-ui (dev) | output-ui/node_modules/@angular/localize |  |
| @angular/material | 20.2.14 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/material |  |
| @angular/material-moment-adapter | 20.2.14 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/material-moment-adapter |  |
| @angular/platform-browser | 20.3.18 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/platform-browser |  |
| @angular/platform-browser-dynamic | 20.3.18 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/platform-browser-dynamic |  |
| @angular/router | 20.3.18 | MIT | output-ui (runtime) | output-ui/node_modules/@angular/router |  |
| @babel/code-frame | 7.29.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/code-frame<br>output-ui/node_modules/@babel/code-frame |  |
| @babel/compat-data | 7.29.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/compat-data<br>output-ui/node_modules/@babel/compat-data |  |
| @babel/core | 7.28.3 | MIT | output-ui (transitive) | output-ui/node_modules/@babel/core |  |
| @babel/core | 7.29.0 | MIT | output-api (transitive) | output-api/node_modules/@babel/core |  |
| @babel/generator | 7.29.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/generator<br>output-ui/node_modules/@babel/generator |  |
| @babel/helper-annotate-as-pure | 7.27.3 | MIT | output-ui (transitive) | output-ui/node_modules/@babel/helper-annotate-as-pure |  |
| @babel/helper-compilation-targets | 7.28.6 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/helper-compilation-targets<br>output-ui/node_modules/@babel/helper-compilation-targets |  |
| @babel/helper-globals | 7.28.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/helper-globals<br>output-ui/node_modules/@babel/helper-globals |  |
| @babel/helper-module-imports | 7.28.6 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/helper-module-imports<br>output-ui/node_modules/@babel/helper-module-imports |  |
| @babel/helper-module-transforms | 7.28.6 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/helper-module-transforms<br>output-ui/node_modules/@babel/helper-module-transforms |  |
| @babel/helper-plugin-utils | 7.28.6 | MIT | output-api (transitive) | output-api/node_modules/@babel/helper-plugin-utils |  |
| @babel/helper-split-export-declaration | 7.24.7 | MIT | output-ui (transitive) | output-ui/node_modules/@babel/helper-split-export-declaration |  |
| @babel/helper-string-parser | 7.27.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/helper-string-parser<br>output-ui/node_modules/@babel/helper-string-parser |  |
| @babel/helper-validator-identifier | 7.28.5 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/helper-validator-identifier<br>output-ui/node_modules/@babel/helper-validator-identifier |  |
| @babel/helper-validator-option | 7.27.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/helper-validator-option<br>output-ui/node_modules/@babel/helper-validator-option |  |
| @babel/helpers | 7.29.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/helpers<br>output-ui/node_modules/@babel/helpers |  |
| @babel/parser | 7.29.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/parser<br>output-ui/node_modules/@babel/parser |  |
| @babel/plugin-syntax-async-generators | 7.8.4 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-async-generators |  |
| @babel/plugin-syntax-bigint | 7.8.3 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-bigint |  |
| @babel/plugin-syntax-class-properties | 7.12.13 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-class-properties |  |
| @babel/plugin-syntax-class-static-block | 7.14.5 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-class-static-block |  |
| @babel/plugin-syntax-import-attributes | 7.28.6 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-import-attributes |  |
| @babel/plugin-syntax-import-meta | 7.10.4 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-import-meta |  |
| @babel/plugin-syntax-json-strings | 7.8.3 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-json-strings |  |
| @babel/plugin-syntax-jsx | 7.28.6 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-jsx |  |
| @babel/plugin-syntax-logical-assignment-operators | 7.10.4 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-logical-assignment-operators |  |
| @babel/plugin-syntax-nullish-coalescing-operator | 7.8.3 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-nullish-coalescing-operator |  |
| @babel/plugin-syntax-numeric-separator | 7.10.4 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-numeric-separator |  |
| @babel/plugin-syntax-object-rest-spread | 7.8.3 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-object-rest-spread |  |
| @babel/plugin-syntax-optional-catch-binding | 7.8.3 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-optional-catch-binding |  |
| @babel/plugin-syntax-optional-chaining | 7.8.3 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-optional-chaining |  |
| @babel/plugin-syntax-private-property-in-object | 7.14.5 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-private-property-in-object |  |
| @babel/plugin-syntax-top-level-await | 7.14.5 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-top-level-await |  |
| @babel/plugin-syntax-typescript | 7.28.6 | MIT | output-api (transitive) | output-api/node_modules/@babel/plugin-syntax-typescript |  |
| @babel/template | 7.28.6 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/template<br>output-ui/node_modules/@babel/template |  |
| @babel/traverse | 7.29.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/traverse<br>output-ui/node_modules/@babel/traverse |  |
| @babel/types | 7.29.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/types<br>output-ui/node_modules/@babel/types |  |
| @bcoe/v8-coverage | 0.2.3 | MIT | output-api (transitive) | output-api/node_modules/@bcoe/v8-coverage |  |
| @borewit/text-codec | 0.2.2 | MIT | output-api (transitive) | node_modules/@borewit/text-codec |  |
| @colors/colors | 1.5.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@colors/colors<br>output-ui/node_modules/@colors/colors |  |
| @cspotcode/source-map-support | 0.8.1 | MIT | output-api (transitive) | output-api/node_modules/@cspotcode/source-map-support |  |
| @e965/xlsx | 0.20.3 | Apache-2.0 | output-api (runtime)<br>output-ui (runtime) | output-api/node_modules/xlsx<br>output-ui/node_modules/xlsx |  |
| @epic-web/invariant | 1.0.0 | MIT | output-api (transitive) | output-api/node_modules/@epic-web/invariant |  |
| @esbuild/win32-x64 | 0.25.9 | MIT | output-ui (transitive) | output-ui/node_modules/@esbuild/win32-x64 |  |
| @esbuild/win32-x64 | 0.27.7 | MIT | output-ui (transitive) | output-ui/node_modules/@angular/build/node_modules/@esbuild/win32-x64 |  |
| @eslint-community/eslint-utils | 4.9.1 | MIT | output-api (transitive) | output-api/node_modules/@eslint-community/eslint-utils |  |
| @eslint-community/regexpp | 4.12.2 | MIT | output-api (transitive) | output-api/node_modules/@eslint-community/regexpp |  |
| @eslint/config-array | 0.23.3 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@eslint/config-array |  |
| @eslint/config-helpers | 0.5.3 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@eslint/config-helpers |  |
| @eslint/core | 1.1.1 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@eslint/core |  |
| @eslint/js | 10.0.1 | MIT | output-api (dev) | output-api/node_modules/@eslint/js |  |
| @eslint/object-schema | 3.0.3 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@eslint/object-schema |  |
| @eslint/plugin-kit | 0.6.1 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@eslint/plugin-kit |  |
| @gar/promise-retry | 1.0.3 | MIT | output-ui (transitive) | output-ui/node_modules/@gar/promise-retry |  |
| @hono/node-server | 1.19.13 | MIT | output-ui (transitive) | output-ui/node_modules/@hono/node-server |  |
| @humanfs/core | 0.19.1 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@humanfs/core |  |
| @humanfs/node | 0.16.7 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@humanfs/node |  |
| @humanwhocodes/module-importer | 1.0.1 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@humanwhocodes/module-importer |  |
| @humanwhocodes/retry | 0.4.3 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@humanwhocodes/retry |  |
| @inquirer/ansi | 1.0.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/ansi<br>output-ui/node_modules/@inquirer/ansi |  |
| @inquirer/checkbox | 4.3.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/checkbox<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/checkbox |  |
| @inquirer/confirm | 5.1.14 | MIT | output-ui (transitive) | output-ui/node_modules/@angular/build/node_modules/@inquirer/confirm |  |
| @inquirer/confirm | 5.1.21 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/confirm<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/confirm |  |
| @inquirer/core | 10.3.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/core<br>output-ui/node_modules/@angular/build/node_modules/@inquirer/core<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/core |  |
| @inquirer/editor | 4.2.23 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/editor<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/editor |  |
| @inquirer/expand | 4.0.23 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/expand<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/expand |  |
| @inquirer/external-editor | 1.0.3 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/external-editor<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/external-editor |  |
| @inquirer/figures | 1.0.15 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/figures<br>output-ui/node_modules/@inquirer/figures |  |
| @inquirer/input | 4.3.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/input<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/input |  |
| @inquirer/number | 3.0.23 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/number<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/number |  |
| @inquirer/password | 4.0.23 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/password<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/password |  |
| @inquirer/prompts | 7.10.1 | MIT | output-api (transitive) | output-api/node_modules/@inquirer/prompts |  |
| @inquirer/prompts | 7.3.2 | MIT | output-api (transitive) | output-api/node_modules/@angular-devkit/schematics-cli/node_modules/@inquirer/prompts |  |
| @inquirer/prompts | 7.8.2 | MIT | output-ui (transitive) | output-ui/node_modules/@angular/cli/node_modules/@inquirer/prompts |  |
| @inquirer/rawlist | 4.1.11 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/rawlist<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/rawlist |  |
| @inquirer/search | 3.2.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/search<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/search |  |
| @inquirer/select | 4.4.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/select<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/select |  |
| @inquirer/type | 3.0.10 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@inquirer/type<br>output-ui/node_modules/@angular/build/node_modules/@inquirer/type<br>output-ui/node_modules/@angular/cli/node_modules/@inquirer/type |  |
| @isaacs/cliui | 8.0.2 | ISC | output-api (transitive) | output-api/node_modules/@isaacs/cliui |  |
| @isaacs/fs-minipass | 4.0.1 | ISC | output-ui (transitive) | output-ui/node_modules/@isaacs/fs-minipass |  |
| @istanbuljs/load-nyc-config | 1.1.0 | ISC | output-api (transitive) | output-api/node_modules/@istanbuljs/load-nyc-config |  |
| @istanbuljs/schema | 0.1.3 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@istanbuljs/schema<br>output-ui/node_modules/@istanbuljs/schema |  |
| @jest/console | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/console |  |
| @jest/core | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/core |  |
| @jest/diff-sequences | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/diff-sequences |  |
| @jest/environment | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/environment |  |
| @jest/expect | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/expect |  |
| @jest/expect-utils | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/expect-utils |  |
| @jest/fake-timers | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/fake-timers |  |
| @jest/get-type | 30.1.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/get-type |  |
| @jest/globals | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/globals |  |
| @jest/pattern | 30.0.1 | MIT | output-api (transitive) | output-api/node_modules/@jest/pattern |  |
| @jest/reporters | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/reporters |  |
| @jest/schemas | 30.0.5 | MIT | output-api (transitive) | output-api/node_modules/@jest/schemas |  |
| @jest/snapshot-utils | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/snapshot-utils |  |
| @jest/source-map | 30.0.1 | MIT | output-api (transitive) | output-api/node_modules/@jest/source-map |  |
| @jest/test-result | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/test-result |  |
| @jest/test-sequencer | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/test-sequencer |  |
| @jest/transform | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/transform |  |
| @jest/types | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/@jest/types |  |
| @jridgewell/gen-mapping | 0.3.13 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@jridgewell/gen-mapping<br>output-ui/node_modules/@jridgewell/gen-mapping |  |
| @jridgewell/remapping | 2.3.5 | MIT | output-api (transitive) | output-api/node_modules/@jridgewell/remapping |  |
| @jridgewell/resolve-uri | 3.1.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@jridgewell/resolve-uri<br>output-ui/node_modules/@jridgewell/resolve-uri |  |
| @jridgewell/source-map | 0.3.11 | MIT | output-api (transitive) | output-api/node_modules/@jridgewell/source-map |  |
| @jridgewell/sourcemap-codec | 1.5.5 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@jridgewell/sourcemap-codec<br>output-ui/node_modules/@jridgewell/sourcemap-codec |  |
| @jridgewell/trace-mapping | 0.3.31 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@jridgewell/trace-mapping<br>output-ui/node_modules/@jridgewell/trace-mapping |  |
| @jridgewell/trace-mapping | 0.3.9 | MIT | output-api (transitive) | output-api/node_modules/@cspotcode/source-map-support/node_modules/@jridgewell/trace-mapping |  |
| @listr2/prompt-adapter-inquirer | 3.0.1 | MIT | output-ui (transitive) | output-ui/node_modules/@angular/cli/node_modules/@listr2/prompt-adapter-inquirer |  |
| @lmdb/lmdb-win32-x64 | 3.4.2 | MIT | output-ui (transitive) | output-ui/node_modules/@lmdb/lmdb-win32-x64 |  |
| @lukeed/csprng | 1.1.0 | MIT | output-api (transitive) | node_modules/@lukeed/csprng |  |
| @microsoft/tsdoc | 0.16.0 | MIT | output-api (transitive) | node_modules/@microsoft/tsdoc |  |
| @modelcontextprotocol/sdk | 1.26.0 | MIT | output-ui (transitive) | output-ui/node_modules/@modelcontextprotocol/sdk |  |
| @msgpackr-extract/msgpackr-extract-win32-x64 | 3.0.3 | MIT | output-ui (transitive) | output-ui/node_modules/@msgpackr-extract/msgpackr-extract-win32-x64 |  |
| @napi-rs/nice | 1.1.1 | MIT | output-ui (transitive) | output-ui/node_modules/@napi-rs/nice |  |
| @napi-rs/nice-win32-x64-msvc | 1.1.1 | MIT | output-ui (transitive) | output-ui/node_modules/@napi-rs/nice-win32-x64-msvc |  |
| @nestjs/axios | 4.0.1 | MIT | output-api (runtime) | output-api/node_modules/@nestjs/axios |  |
| @nestjs/cli | 11.0.18 | MIT | output-api (runtime) | output-api/node_modules/@nestjs/cli |  |
| @nestjs/common | 11.1.19 | MIT | output-api (runtime) | node_modules/@nestjs/common |  |
| @nestjs/config | 4.0.4 | MIT | output-api (runtime) | node_modules/@nestjs/config |  |
| @nestjs/core | 11.1.19 | MIT | output-api (runtime) | node_modules/@nestjs/core |  |
| @nestjs/jwt | 11.0.2 | MIT | output-api (runtime) | output-api/node_modules/@nestjs/jwt |  |
| @nestjs/mapped-types | 2.1.1 | MIT | output-api (transitive) | node_modules/@nestjs/mapped-types |  |
| @nestjs/passport | 11.0.5 | MIT | output-api (runtime) | output-api/node_modules/@nestjs/passport |  |
| @nestjs/platform-express | 11.1.18 | MIT | output-api (runtime) | output-api/node_modules/@nestjs/platform-express |  |
| @nestjs/schedule | 6.1.1 | MIT | output-api (runtime) | output-api/node_modules/@nestjs/schedule |  |
| @nestjs/schematics | 11.0.10 | MIT | output-api (transitive) | output-api/node_modules/@nestjs/schematics |  |
| @nestjs/serve-static | 5.0.5 | MIT | output-api (runtime) | node_modules/@nestjs/serve-static |  |
| @nestjs/swagger | 11.4.2 | MIT | output-api (runtime) | node_modules/@nestjs/swagger |  |
| @nestjs/testing | 11.1.18 | MIT | output-api (dev) | output-api/node_modules/@nestjs/testing |  |
| @nestjs/typeorm | 11.0.1 | MIT | output-api (runtime) | output-api/node_modules/@nestjs/typeorm |  |
| @ng-bootstrap/ng-bootstrap | 19.0.1 | MIT | output-ui (runtime) | output-ui/node_modules/@ng-bootstrap/ng-bootstrap |  |
| @ngrx/store | 20.1.0 | MIT | output-ui (runtime) | output-ui/node_modules/@ngrx/store |  |
| @ngrx/store-devtools | 20.1.0 | MIT | output-ui (runtime) | output-ui/node_modules/@ngrx/store-devtools |  |
| @npmcli/agent | 4.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/agent |  |
| @npmcli/fs | 5.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/fs |  |
| @npmcli/git | 7.0.2 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/git |  |
| @npmcli/installed-package-contents | 4.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/installed-package-contents |  |
| @npmcli/node-gyp | 5.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/node-gyp |  |
| @npmcli/package-json | 7.0.5 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/package-json |  |
| @npmcli/promise-spawn | 9.0.1 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/promise-spawn |  |
| @npmcli/redact | 4.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/redact |  |
| @npmcli/run-script | 10.0.4 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/run-script |  |
| @nuxt/opencollective | 0.4.1 | MIT | output-api (transitive) | node_modules/@nuxt/opencollective |  |
| @parcel/watcher | 2.5.6 | MIT | output-ui (transitive) | output-ui/node_modules/@parcel/watcher |  |
| @parcel/watcher-win32-x64 | 2.5.6 | MIT | output-ui (transitive) | output-ui/node_modules/@parcel/watcher-win32-x64 |  |
| @pkgjs/parseargs | 0.11.0 | MIT | output-api (transitive) | output-api/node_modules/@pkgjs/parseargs |  |
| @pkgr/core | 0.2.9 | MIT | output-api (transitive) | output-api/node_modules/@pkgr/core |  |
| @popperjs/core | 2.11.8 | MIT | output-ui (runtime) | output-ui/node_modules/@popperjs/core |  |
| @rollup/rollup-win32-x64-gnu | 4.59.0 | MIT | output-ui (transitive) | output-ui/node_modules/@rollup/rollup-win32-x64-gnu |  |
| @rollup/rollup-win32-x64-msvc | 4.59.0 | MIT | output-ui (transitive) | output-ui/node_modules/@rollup/rollup-win32-x64-msvc |  |
| @scarf/scarf | 1.4.0 | Apache-2.0 | output-api (transitive) | node_modules/@scarf/scarf |  |
| @schematics/angular | 20.3.22 | MIT | output-ui (transitive) | output-ui/node_modules/@schematics/angular |  |
| @sigstore/bundle | 4.0.0 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/@sigstore/bundle |  |
| @sigstore/core | 3.2.0 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/@sigstore/core |  |
| @sigstore/protobuf-specs | 0.5.1 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/@sigstore/protobuf-specs |  |
| @sigstore/sign | 4.1.1 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/@sigstore/sign |  |
| @sigstore/tuf | 4.0.2 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/@sigstore/tuf |  |
| @sigstore/verify | 3.1.0 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/@sigstore/verify |  |
| @sinclair/typebox | 0.34.49 | MIT | output-api (transitive) | output-api/node_modules/@sinclair/typebox |  |
| @sinonjs/commons | 3.0.1 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/@sinonjs/commons |  |
| @sinonjs/fake-timers | 15.2.1 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/@sinonjs/fake-timers |  |
| @socket.io/component-emitter | 3.1.2 | MIT | output-ui (transitive) | output-ui/node_modules/@socket.io/component-emitter |  |
| @sqltools/formatter | 1.2.5 | MIT | output-api (transitive) | output-api/node_modules/@sqltools/formatter |  |
| @tokenizer/inflate | 0.4.1 | MIT | output-api (transitive) | node_modules/@tokenizer/inflate |  |
| @tokenizer/token | 0.3.0 | MIT | output-api (transitive) | node_modules/@tokenizer/token |  |
| @tsconfig/node10 | 1.0.12 | MIT | output-api (transitive) | output-api/node_modules/@tsconfig/node10 |  |
| @tsconfig/node12 | 1.0.11 | MIT | output-api (transitive) | output-api/node_modules/@tsconfig/node12 |  |
| @tsconfig/node14 | 1.0.3 | MIT | output-api (transitive) | output-api/node_modules/@tsconfig/node14 |  |
| @tsconfig/node16 | 1.0.4 | MIT | output-api (transitive) | output-api/node_modules/@tsconfig/node16 |  |
| @tufjs/canonical-json | 2.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/@tufjs/canonical-json |  |
| @tufjs/models | 4.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/@tufjs/models |  |
| @types/babel__core | 7.20.5 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@types/babel__core<br>output-ui/node_modules/@types/babel__core |  |
| @types/babel__generator | 7.27.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@types/babel__generator<br>output-ui/node_modules/@types/babel__generator |  |
| @types/babel__template | 7.4.4 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@types/babel__template<br>output-ui/node_modules/@types/babel__template |  |
| @types/babel__traverse | 7.28.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@types/babel__traverse<br>output-ui/node_modules/@types/babel__traverse |  |
| @types/body-parser | 1.19.6 | MIT | output-api (transitive) | output-api/node_modules/@types/body-parser |  |
| @types/connect | 3.4.38 | MIT | output-api (transitive) | output-api/node_modules/@types/connect |  |
| @types/cookie-parser | 1.4.10 | MIT | output-api (dev) | output-api/node_modules/@types/cookie-parser |  |
| @types/cors | 2.8.19 | MIT | output-ui (transitive) | output-ui/node_modules/@types/cors |  |
| @types/eslint | 9.6.1 | MIT | output-api (transitive) | output-api/node_modules/@types/eslint |  |
| @types/eslint-scope | 3.7.7 | MIT | output-api (transitive) | output-api/node_modules/@types/eslint-scope |  |
| @types/esrecurse | 4.3.1 | MIT | output-api (transitive) | output-api/node_modules/@types/esrecurse |  |
| @types/estree | 1.0.8 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@types/estree<br>output-ui/node_modules/@types/estree |  |
| @types/express | 5.0.6 | MIT | output-api (transitive) | output-api/node_modules/@types/express |  |
| @types/express-serve-static-core | 5.1.1 | MIT | output-api (transitive) | output-api/node_modules/@types/express-serve-static-core |  |
| @types/http-errors | 2.0.5 | MIT | output-api (transitive) | output-api/node_modules/@types/http-errors |  |
| @types/istanbul-lib-coverage | 2.0.6 | MIT | output-api (transitive) | output-api/node_modules/@types/istanbul-lib-coverage |  |
| @types/istanbul-lib-report | 3.0.3 | MIT | output-api (transitive) | output-api/node_modules/@types/istanbul-lib-report |  |
| @types/istanbul-reports | 3.0.4 | MIT | output-api (transitive) | output-api/node_modules/@types/istanbul-reports |  |
| @types/jasmine | 5.1.15 | MIT | output-ui (dev) | output-ui/node_modules/@types/jasmine |  |
| @types/jest | 30.0.0 | MIT | output-api (dev) | output-api/node_modules/@types/jest |  |
| @types/json-schema | 7.0.15 | MIT | output-api (transitive) | output-api/node_modules/@types/json-schema |  |
| @types/jsonwebtoken | 9.0.10 | MIT | output-api (transitive) | output-api/node_modules/@types/jsonwebtoken |  |
| @types/luxon | 3.7.1 | MIT | output-api (transitive) | output-api/node_modules/@types/luxon |  |
| @types/ms | 2.1.0 | MIT | output-api (transitive) | output-api/node_modules/@types/ms |  |
| @types/multer | 2.1.0 | MIT | output-api (dev) | output-api/node_modules/@types/multer |  |
| @types/node | 12.20.55 | MIT | output-ui (dev) | output-ui/node_modules/@types/node |  |
| @types/node | 25.5.2 | MIT | output-api (dev) | output-api/node_modules/@types/node |  |
| @types/qs | 6.15.0 | MIT | output-api (transitive) | output-api/node_modules/@types/qs |  |
| @types/range-parser | 1.2.7 | MIT | output-api (transitive) | output-api/node_modules/@types/range-parser |  |
| @types/send | 1.2.1 | MIT | output-api (transitive) | output-api/node_modules/@types/send |  |
| @types/serve-static | 2.2.0 | MIT | output-api (transitive) | output-api/node_modules/@types/serve-static |  |
| @types/stack-utils | 2.0.3 | MIT | output-api (transitive) | output-api/node_modules/@types/stack-utils |  |
| @types/validator | 13.15.10 | MIT | output-api (transitive) | node_modules/@types/validator |  |
| @types/ws | 8.18.1 | MIT | output-ui (transitive) | output-ui/node_modules/@types/ws |  |
| @types/yargs | 17.0.35 | MIT | output-api (transitive) | output-api/node_modules/@types/yargs |  |
| @types/yargs-parser | 21.0.3 | MIT | output-api (transitive) | output-api/node_modules/@types/yargs-parser |  |
| @typescript-eslint/eslint-plugin | 8.58.1 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/eslint-plugin |  |
| @typescript-eslint/parser | 8.58.1 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/parser |  |
| @typescript-eslint/project-service | 8.58.1 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/project-service |  |
| @typescript-eslint/scope-manager | 8.58.1 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/scope-manager |  |
| @typescript-eslint/tsconfig-utils | 8.58.1 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/tsconfig-utils |  |
| @typescript-eslint/type-utils | 8.58.1 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/type-utils |  |
| @typescript-eslint/types | 8.58.1 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/types |  |
| @typescript-eslint/typescript-estree | 8.58.1 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/typescript-estree |  |
| @typescript-eslint/utils | 8.58.1 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/utils |  |
| @typescript-eslint/visitor-keys | 8.58.1 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/visitor-keys |  |
| @ungap/structured-clone | 1.3.0 | ISC | output-api (transitive) | output-api/node_modules/@ungap/structured-clone |  |
| @unrs/resolver-binding-win32-x64-msvc | 1.11.1 | MIT | output-api (transitive) | output-api/node_modules/@unrs/resolver-binding-win32-x64-msvc |  |
| @vitejs/plugin-basic-ssl | 2.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/@angular/build/node_modules/@vitejs/plugin-basic-ssl |  |
| @webassemblyjs/ast | 1.14.1 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/ast |  |
| @webassemblyjs/floating-point-hex-parser | 1.13.2 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/floating-point-hex-parser |  |
| @webassemblyjs/helper-api-error | 1.13.2 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/helper-api-error |  |
| @webassemblyjs/helper-buffer | 1.14.1 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/helper-buffer |  |
| @webassemblyjs/helper-numbers | 1.13.2 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/helper-numbers |  |
| @webassemblyjs/helper-wasm-bytecode | 1.13.2 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/helper-wasm-bytecode |  |
| @webassemblyjs/helper-wasm-section | 1.14.1 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/helper-wasm-section |  |
| @webassemblyjs/ieee754 | 1.13.2 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/ieee754 |  |
| @webassemblyjs/leb128 | 1.13.2 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@webassemblyjs/leb128 |  |
| @webassemblyjs/utf8 | 1.13.2 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/utf8 |  |
| @webassemblyjs/wasm-edit | 1.14.1 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/wasm-edit |  |
| @webassemblyjs/wasm-gen | 1.14.1 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/wasm-gen |  |
| @webassemblyjs/wasm-opt | 1.14.1 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/wasm-opt |  |
| @webassemblyjs/wasm-parser | 1.14.1 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/wasm-parser |  |
| @webassemblyjs/wast-printer | 1.14.1 | MIT | output-api (transitive) | output-api/node_modules/@webassemblyjs/wast-printer |  |
| @xtuc/ieee754 | 1.2.0 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/@xtuc/ieee754 |  |
| @xtuc/long | 4.2.2 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@xtuc/long |  |
| @yarnpkg/lockfile | 1.1.0 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/@yarnpkg/lockfile |  |
| abbrev | 4.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/abbrev |  |
| accepts | 1.3.8 | MIT | output-ui (transitive) | output-ui/node_modules/socket.io/node_modules/accepts |  |
| accepts | 2.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/accepts |  |
| acorn | 8.16.0 | MIT | output-api (transitive) | output-api/node_modules/acorn |  |
| acorn-import-phases | 1.0.4 | MIT | output-api (transitive) | output-api/node_modules/acorn-import-phases |  |
| acorn-jsx | 5.3.2 | MIT | output-api (transitive) | output-api/node_modules/acorn-jsx |  |
| acorn-walk | 8.3.5 | MIT | output-api (transitive) | output-api/node_modules/acorn-walk |  |
| agent-base | 7.1.4 | MIT | output-ui (transitive) | output-ui/node_modules/agent-base |  |
| ajv | 6.14.0 | MIT | output-api (transitive) | output-api/node_modules/eslint/node_modules/ajv<br>output-api/node_modules/schema-utils/node_modules/ajv |  |
| ajv | 8.18.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/ajv<br>output-ui/node_modules/ajv |  |
| ajv-formats | 2.1.1 | MIT | output-api (transitive) | output-api/node_modules/terser-webpack-plugin/node_modules/ajv-formats<br>output-api/node_modules/webpack/node_modules/ajv-formats |  |
| ajv-formats | 3.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/ajv-formats<br>output-ui/node_modules/ajv-formats |  |
| ajv-keywords | 3.5.2 | MIT | output-api (transitive) | output-api/node_modules/schema-utils/node_modules/ajv-keywords |  |
| ajv-keywords | 5.1.0 | MIT | output-api (transitive) | output-api/node_modules/ajv-keywords |  |
| algoliasearch | 5.35.0 | MIT | output-ui (transitive) | output-ui/node_modules/algoliasearch |  |
| ansi-colors | 4.1.3 | MIT | output-api (transitive) | output-api/node_modules/ansi-colors |  |
| ansi-escapes | 4.3.2 | MIT | output-api (transitive) | output-api/node_modules/ansi-escapes |  |
| ansi-escapes | 7.3.0 | MIT | output-ui (transitive) | output-ui/node_modules/ansi-escapes |  |
| ansi-regex | 5.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/ansi-regex<br>output-ui/node_modules/@angular/build/node_modules/ansi-regex<br>output-ui/node_modules/@angular/cli/node_modules/ansi-regex<br>output-ui/node_modules/karma/node_modules/ansi-regex |  |
| ansi-regex | 6.2.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@isaacs/cliui/node_modules/ansi-regex<br>output-ui/node_modules/ansi-regex |  |
| ansi-styles | 4.3.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/ansi-styles<br>output-ui/node_modules/@angular/build/node_modules/ansi-styles<br>output-ui/node_modules/@angular/cli/node_modules/ansi-styles<br>output-ui/node_modules/karma/node_modules/ansi-styles |  |
| ansi-styles | 5.2.0 | MIT | output-api (transitive) | output-api/node_modules/pretty-format/node_modules/ansi-styles |  |
| ansi-styles | 6.2.3 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@isaacs/cliui/node_modules/ansi-styles<br>output-ui/node_modules/ansi-styles |  |
| ansis | 4.2.0 | ISC | output-api (transitive) | output-api/node_modules/ansis |  |
| anymatch | 3.1.3 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/anymatch<br>output-ui/node_modules/anymatch |  |
| app-root-path | 3.1.0 | MIT | output-api (transitive) | output-api/node_modules/app-root-path |  |
| append-field | 1.0.0 | MIT | output-api (transitive) | output-api/node_modules/append-field |  |
| arg | 4.1.3 | MIT | output-api (transitive) | output-api/node_modules/arg |  |
| argparse | 1.0.10 | MIT | output-api (transitive) | output-api/node_modules/@istanbuljs/load-nyc-config/node_modules/argparse |  |
| argparse | 2.0.1 | Python-2.0 | output-api (transitive) | node_modules/argparse |  |
| array-timsort | 1.0.3 | MIT | output-api (transitive) | output-api/node_modules/array-timsort |  |
| asynckit | 0.4.0 | MIT | output-api (transitive) | output-api/node_modules/asynckit |  |
| available-typed-arrays | 1.0.7 | MIT | output-api (transitive) | output-api/node_modules/available-typed-arrays |  |
| axios | 1.16.0 | MIT | output-api (runtime) | output-api/node_modules/axios |  |
| babel-jest | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/babel-jest |  |
| babel-plugin-istanbul | 7.0.1 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/babel-plugin-istanbul |  |
| babel-plugin-jest-hoist | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/babel-plugin-jest-hoist |  |
| babel-preset-current-node-syntax | 1.2.0 | MIT | output-api (transitive) | output-api/node_modules/babel-preset-current-node-syntax |  |
| babel-preset-jest | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/babel-preset-jest |  |
| balanced-match | 1.0.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@jest/reporters/node_modules/balanced-match<br>output-api/node_modules/fork-ts-checker-webpack-plugin/node_modules/balanced-match<br>output-api/node_modules/jest-config/node_modules/balanced-match<br>output-api/node_modules/jest-runtime/node_modules/balanced-match<br>output-api/node_modules/test-exclude/node_modules/balanced-match<br>output-api/node_modules/typeorm/node_modules/balanced-match<br>output-ui/node_modules/balanced-match |  |
| balanced-match | 4.0.4 | MIT | output-api (transitive)<br>output-ui (transitive)<br>output-interfaces (transitive) | output-api/node_modules/balanced-match<br>output-interfaces/node_modules/rimraf/node_modules/glob/node_modules/minimatch/node_modules/brace-expansion/node_modules/balanced-match<br>output-ui/node_modules/@npmcli/package-json/node_modules/balanced-match<br>output-ui/node_modules/@tufjs/models/node_modules/balanced-match<br>output-ui/node_modules/cacache/node_modules/balanced-match<br>output-ui/node_modules/ignore-walk/node_modules/balanced-match |  |
| base64-js | 1.5.1 | MIT | output-api (transitive) | output-api/node_modules/base64-js |  |
| base64id | 2.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/base64id |  |
| baseline-browser-mapping | 2.10.13 | Apache-2.0 | output-api (transitive) | output-api/node_modules/baseline-browser-mapping |  |
| baseline-browser-mapping | 2.10.16 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/baseline-browser-mapping |  |
| beasties | 0.3.5 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/beasties |  |
| bignumber.js | 9.0.0 | MIT | output-api (transitive) | output-api/node_modules/bignumber.js |  |
| binary-extensions | 2.3.0 | MIT | output-ui (transitive) | output-ui/node_modules/binary-extensions |  |
| bl | 4.1.0 | MIT | output-api (transitive) | output-api/node_modules/bl |  |
| body-parser | 1.20.5 | MIT | output-ui (transitive) | output-ui/node_modules/karma/node_modules/body-parser |  |
| body-parser | 2.2.2 | MIT | output-api (runtime)<br>output-ui (transitive) | node_modules/body-parser |  |
| boolbase | 1.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/boolbase |  |
| bootstrap | 5.3.8 | MIT | output-ui (runtime) | output-ui/node_modules/bootstrap |  |
| brace-expansion | 1.1.13 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/fork-ts-checker-webpack-plugin/node_modules/brace-expansion<br>output-api/node_modules/test-exclude/node_modules/brace-expansion<br>output-ui/node_modules/brace-expansion |  |
| brace-expansion | 2.0.3 | MIT | output-api (transitive) | output-api/node_modules/@jest/reporters/node_modules/brace-expansion<br>output-api/node_modules/jest-config/node_modules/brace-expansion<br>output-api/node_modules/jest-runtime/node_modules/brace-expansion<br>output-api/node_modules/typeorm/node_modules/brace-expansion |  |
| brace-expansion | 5.0.6 | MIT | output-api (transitive)<br>output-ui (transitive)<br>output-interfaces (transitive) | output-api/node_modules/minimatch/node_modules/brace-expansion<br>output-interfaces/node_modules/rimraf/node_modules/glob/node_modules/minimatch/node_modules/brace-expansion<br>output-ui/node_modules/@npmcli/package-json/node_modules/minimatch/node_modules/brace-expansion<br>output-ui/node_modules/@tufjs/models/node_modules/minimatch/node_modules/brace-expansion<br>output-ui/node_modules/cacache/node_modules/minimatch/node_modules/brace-expansion<br>output-ui/node_modules/ignore-walk/node_modules/minimatch/node_modules/brace-expansion |  |
| braces | 3.0.3 | MIT | output-ui (transitive) | output-ui/node_modules/braces |  |
| browserslist | 4.28.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/browserslist<br>output-ui/node_modules/browserslist |  |
| bs-logger | 0.2.6 | MIT | output-api (transitive) | output-api/node_modules/bs-logger |  |
| bser | 2.1.1 | Apache-2.0 | output-api (transitive) | output-api/node_modules/bser |  |
| buffer | 5.7.1 | MIT | output-api (transitive) | output-api/node_modules/buffer |  |
| buffer | 6.0.3 | MIT | output-api (transitive) | output-api/node_modules/typeorm/node_modules/buffer |  |
| buffer-equal-constant-time | 1.0.1 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/buffer-equal-constant-time |  |
| buffer-from | 1.1.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/buffer-from<br>output-ui/node_modules/buffer-from |  |
| busboy | 1.6.0 | MIT | output-api (transitive) | output-api/node_modules/busboy | Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei. |
| bytes | 3.1.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/bytes |  |
| cacache | 20.0.4 | ISC | output-ui (transitive) | output-ui/node_modules/cacache |  |
| call-bind | 1.0.8 | MIT | output-api (transitive) | output-api/node_modules/call-bind |  |
| call-bind-apply-helpers | 1.0.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/call-bind-apply-helpers |  |
| call-bound | 1.0.4 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/call-bound |  |
| callsites | 3.1.0 | MIT | output-api (transitive) | output-api/node_modules/callsites |  |
| camelcase | 5.3.1 | MIT | output-api (transitive) | output-api/node_modules/camelcase |  |
| camelcase | 6.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-validate/node_modules/camelcase |  |
| caniuse-lite | 1.0.30001784 | CC-BY-4.0 | output-api (transitive) | output-api/node_modules/caniuse-lite |  |
| caniuse-lite | 1.0.30001787 | CC-BY-4.0 | output-ui (transitive) | output-ui/node_modules/caniuse-lite |  |
| chalk | 4.1.2 | MIT | output-api (transitive) | output-api/node_modules/chalk |  |
| chalk | 5.6.2 | MIT | output-ui (transitive) | output-ui/node_modules/chalk |  |
| char-regex | 1.0.2 | MIT | output-api (transitive) | output-api/node_modules/char-regex |  |
| chardet | 2.1.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/chardet<br>output-ui/node_modules/chardet |  |
| chokidar | 3.6.0 | MIT | output-ui (transitive) | output-ui/node_modules/karma/node_modules/chokidar |  |
| chokidar | 4.0.3 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/chokidar<br>output-ui/node_modules/chokidar |  |
| chownr | 3.0.0 | BlueOak-1.0.0 | output-ui (transitive) | output-ui/node_modules/chownr |  |
| chrome-trace-event | 1.0.4 | MIT | output-api (transitive) | output-api/node_modules/chrome-trace-event |  |
| ci-info | 4.4.0 | MIT | output-api (transitive) | output-api/node_modules/ci-info |  |
| cjs-module-lexer | 2.2.0 | MIT | output-api (transitive) | output-api/node_modules/cjs-module-lexer |  |
| class-transformer | 0.5.1 | MIT | output-api (runtime) | node_modules/class-transformer |  |
| class-validator | 0.15.1 | MIT | output-api (runtime) | node_modules/class-validator |  |
| cli-cursor | 3.1.0 | MIT | output-api (transitive) | output-api/node_modules/cli-cursor |  |
| cli-cursor | 5.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/cli-cursor |  |
| cli-spinners | 2.9.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/cli-spinners<br>output-ui/node_modules/cli-spinners |  |
| cli-table3 | 0.6.5 | MIT | output-api (transitive) | output-api/node_modules/cli-table3 |  |
| cli-truncate | 4.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/cli-truncate |  |
| cli-width | 4.1.0 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/cli-width<br>output-ui/node_modules/cli-width |  |
| cliui | 7.0.4 | ISC | output-ui (transitive) | output-ui/node_modules/karma/node_modules/cliui |  |
| cliui | 8.0.1 | ISC | output-api (transitive) | output-api/node_modules/cliui |  |
| cliui | 9.0.1 | ISC | output-ui (transitive) | output-ui/node_modules/cliui |  |
| clone | 1.0.4 | MIT | output-api (transitive) | output-api/node_modules/clone |  |
| co | 4.6.0 | MIT | output-api (transitive) | output-api/node_modules/co |  |
| collect-v8-coverage | 1.0.3 | MIT | output-api (transitive) | output-api/node_modules/collect-v8-coverage |  |
| color-convert | 2.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/color-convert<br>output-ui/node_modules/color-convert |  |
| color-name | 1.1.4 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/color-name<br>output-ui/node_modules/color-name |  |
| colorette | 2.0.20 | MIT | output-ui (transitive) | output-ui/node_modules/colorette |  |
| combined-stream | 1.0.8 | MIT | output-api (transitive) | output-api/node_modules/combined-stream |  |
| commander | 2.20.3 | MIT | output-api (transitive) | output-api/node_modules/terser/node_modules/commander |  |
| commander | 4.1.1 | MIT | output-api (transitive) | output-api/node_modules/commander |  |
| comment-json | 4.6.2 | MIT | output-api (transitive) | output-api/node_modules/comment-json |  |
| concat-map | 0.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/concat-map<br>output-ui/node_modules/concat-map |  |
| concat-stream | 2.0.0 | MIT | output-api (transitive) | output-api/node_modules/concat-stream |  |
| connect | 3.7.0 | MIT | output-ui (transitive) | output-ui/node_modules/connect |  |
| consola | 3.4.2 | MIT | output-api (transitive) | node_modules/consola |  |
| content-disposition | 1.1.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/content-disposition |  |
| content-type | 1.0.5 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/content-type |  |
| convert-source-map | 1.9.0 | MIT | output-ui (transitive) | output-ui/node_modules/convert-source-map |  |
| convert-source-map | 2.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/convert-source-map<br>output-ui/node_modules/@babel/core/node_modules/convert-source-map |  |
| cookie | 0.7.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/cookie |  |
| cookie-parser | 1.4.7 | MIT | output-api (runtime) | output-api/node_modules/cookie-parser |  |
| cookie-signature | 1.0.6 | MIT | output-api (transitive) | output-api/node_modules/cookie-signature |  |
| cookie-signature | 1.2.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/cookie-signature |  |
| core-util-is | 1.0.3 | MIT | output-api (transitive) | output-api/node_modules/core-util-is |  |
| cors | 2.8.6 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/cors<br>output-ui/node_modules/cors |  |
| cosmiconfig | 8.3.6 | MIT | output-api (transitive) | output-api/node_modules/cosmiconfig |  |
| create-require | 1.1.1 | MIT | output-api (transitive) | output-api/node_modules/create-require |  |
| cron | 4.4.0 | MIT | output-api (transitive) | output-api/node_modules/cron |  |
| cross-env | 10.1.0 | MIT | output-api (runtime) | output-api/node_modules/cross-env |  |
| cross-spawn | 7.0.6 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/cross-spawn<br>output-ui/node_modules/cross-spawn |  |
| css-select | 6.0.0 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/css-select |  |
| css-what | 7.0.0 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/css-what |  |
| custom-event | 1.0.1 | MIT | output-ui (transitive) | output-ui/node_modules/custom-event |  |
| daemon | 1.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/daemon | Manuell geprüft: LICENSE-Datei enthält MIT-Lizenztext. |
| date-format | 4.0.14 | MIT | output-ui (transitive) | output-ui/node_modules/date-format |  |
| dayjs | 1.11.20 | MIT | output-api (transitive) | output-api/node_modules/dayjs |  |
| debug | 2.6.9 | MIT | output-ui (transitive) | output-ui/node_modules/connect/node_modules/debug<br>output-ui/node_modules/karma/node_modules/debug |  |
| debug | 4.4.3 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/debug |  |
| dedent | 1.7.2 | MIT | output-api (transitive) | output-api/node_modules/dedent |  |
| deep-is | 0.1.4 | MIT | output-api (transitive) | output-api/node_modules/deep-is |  |
| deepmerge | 4.3.1 | MIT | output-api (transitive) | output-api/node_modules/deepmerge |  |
| defaults | 1.0.4 | MIT | output-api (transitive) | output-api/node_modules/defaults |  |
| define-data-property | 1.1.4 | MIT | output-api (transitive) | output-api/node_modules/define-data-property |  |
| delayed-stream | 1.0.0 | MIT | output-api (transitive) | output-api/node_modules/delayed-stream |  |
| depd | 2.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/depd |  |
| destroy | 1.2.0 | MIT | output-ui (transitive) | output-ui/node_modules/destroy |  |
| detect-libc | 2.1.2 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/detect-libc |  |
| detect-newline | 3.1.0 | MIT | output-api (transitive) | output-api/node_modules/detect-newline |  |
| di | 0.0.1 | MIT | output-ui (transitive) | output-ui/node_modules/di |  |
| diff | 4.0.4 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/diff |  |
| dom-serialize | 2.2.1 | MIT | output-ui (transitive) | output-ui/node_modules/dom-serialize |  |
| dom-serializer | 2.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/dom-serializer |  |
| domelementtype | 2.3.0 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/domelementtype |  |
| domhandler | 5.0.3 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/domhandler |  |
| domutils | 3.2.2 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/domutils |  |
| dotenv | 16.6.1 | BSD-2-Clause | output-api (transitive) | node_modules/dotenv-expand/node_modules/dotenv<br>output-api/node_modules/typeorm/node_modules/dotenv |  |
| dotenv | 17.4.1 | BSD-2-Clause | output-api (transitive) | node_modules/dotenv |  |
| dotenv-expand | 12.0.3 | BSD-2-Clause | output-api (transitive) | node_modules/dotenv-expand |  |
| dunder-proto | 1.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/dunder-proto |  |
| eastasianwidth | 0.2.0 | MIT | output-api (transitive) | output-api/node_modules/eastasianwidth |  |
| ecdsa-sig-formatter | 1.0.11 | Apache-2.0 | output-api (transitive) | output-api/node_modules/ecdsa-sig-formatter |  |
| echarts | 6.0.0 | Apache-2.0 | output-ui (runtime) | output-ui/node_modules/echarts |  |
| ee-first | 1.1.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/ee-first |  |
| electron-to-chromium | 1.5.330 | ISC | output-api (transitive) | output-api/node_modules/electron-to-chromium |  |
| electron-to-chromium | 1.5.333 | ISC | output-ui (transitive) | output-ui/node_modules/electron-to-chromium |  |
| emittery | 0.13.1 | MIT | output-api (transitive) | output-api/node_modules/emittery |  |
| emoji-regex | 10.6.0 | MIT | output-ui (transitive) | output-ui/node_modules/emoji-regex |  |
| emoji-regex | 8.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/emoji-regex<br>output-ui/node_modules/@angular/build/node_modules/emoji-regex<br>output-ui/node_modules/@angular/cli/node_modules/emoji-regex<br>output-ui/node_modules/karma/node_modules/emoji-regex |  |
| emoji-regex | 9.2.2 | MIT | output-api (transitive) | output-api/node_modules/@isaacs/cliui/node_modules/emoji-regex |  |
| encodeurl | 1.0.2 | MIT | output-ui (transitive) | output-ui/node_modules/connect/node_modules/encodeurl |  |
| encodeurl | 2.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/encodeurl |  |
| engine.io | 6.6.8 | MIT | output-ui (transitive) | output-ui/node_modules/socket.io/node_modules/engine.io |  |
| engine.io-parser | 5.2.3 | MIT | output-ui (transitive) | output-ui/node_modules/engine.io-parser |  |
| enhanced-resolve | 5.20.1 | MIT | output-api (transitive) | output-api/node_modules/enhanced-resolve |  |
| ent | 2.2.2 | MIT | output-ui (transitive) | output-ui/node_modules/ent |  |
| entities | 4.5.0 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/entities |  |
| entities | 6.0.1 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/parse5-html-rewriting-stream/node_modules/entities<br>output-ui/node_modules/parse5/node_modules/entities |  |
| entities | 7.0.1 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/htmlparser2/node_modules/entities |  |
| env-paths | 2.2.1 | MIT | output-ui (transitive) | output-ui/node_modules/env-paths |  |
| environment | 1.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/environment |  |
| err-code | 2.0.3 | MIT | output-ui (transitive) | output-ui/node_modules/err-code |  |
| error-ex | 1.3.4 | MIT | output-api (transitive) | output-api/node_modules/error-ex |  |
| es-define-property | 1.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/es-define-property |  |
| es-errors | 1.3.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/es-errors |  |
| es-module-lexer | 2.0.0 | MIT | output-api (transitive) | output-api/node_modules/es-module-lexer |  |
| es-object-atoms | 1.1.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/es-object-atoms |  |
| es-set-tostringtag | 2.1.0 | MIT | output-api (transitive) | output-api/node_modules/es-set-tostringtag |  |
| esbuild | 0.25.9 | MIT | output-ui (transitive) | output-ui/node_modules/esbuild |  |
| esbuild | 0.27.7 | MIT | output-ui (transitive) | output-ui/node_modules/@angular/build/node_modules/vite/node_modules/esbuild |  |
| escalade | 3.2.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/escalade<br>output-ui/node_modules/escalade |  |
| escape-html | 1.0.3 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/escape-html |  |
| escape-string-regexp | 2.0.0 | MIT | output-api (transitive) | output-api/node_modules/stack-utils/node_modules/escape-string-regexp |  |
| escape-string-regexp | 4.0.0 | MIT | output-api (transitive) | output-api/node_modules/escape-string-regexp |  |
| eslint | 10.1.0 | MIT | output-api (dev) | output-api/node_modules/eslint |  |
| eslint-scope | 5.1.1 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/webpack/node_modules/eslint-scope |  |
| eslint-scope | 9.1.2 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/eslint-scope |  |
| eslint-visitor-keys | 3.4.3 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys |  |
| eslint-visitor-keys | 5.0.1 | Apache-2.0 | output-api (transitive) | output-api/node_modules/eslint-visitor-keys |  |
| espree | 11.2.0 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/espree |  |
| esprima | 4.0.1 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/esprima |  |
| esquery | 1.7.0 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/esquery |  |
| esrecurse | 4.3.0 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/esrecurse |  |
| estraverse | 4.3.0 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/webpack/node_modules/estraverse |  |
| estraverse | 5.3.0 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/estraverse |  |
| esutils | 2.0.3 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/esutils |  |
| etag | 1.8.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/etag |  |
| eventemitter3 | 4.0.7 | MIT | output-ui (transitive) | output-ui/node_modules/eventemitter3 |  |
| eventemitter3 | 5.0.4 | MIT | output-ui (transitive) | output-ui/node_modules/listr2/node_modules/eventemitter3 |  |
| events | 3.3.0 | MIT | output-api (transitive) | output-api/node_modules/events |  |
| eventsource | 3.0.7 | MIT | output-ui (transitive) | output-ui/node_modules/eventsource |  |
| eventsource-parser | 3.0.6 | MIT | output-ui (transitive) | output-ui/node_modules/eventsource-parser |  |
| execa | 5.1.1 | MIT | output-api (transitive) | output-api/node_modules/execa |  |
| exit-x | 0.2.2 | MIT | output-api (transitive) | output-api/node_modules/exit-x |  |
| expect | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/expect |  |
| exponential-backoff | 3.1.3 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/exponential-backoff |  |
| express | 5.2.1 | MIT | output-api (runtime)<br>output-ui (transitive) | node_modules/express |  |
| express-rate-limit | 8.5.1 | MIT | output-ui (transitive) | node_modules/express-rate-limit |  |
| extend | 3.0.2 | MIT | output-ui (transitive) | output-ui/node_modules/extend |  |
| fast-deep-equal | 3.1.3 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/fast-deep-equal<br>output-ui/node_modules/fast-deep-equal |  |
| fast-json-stable-stringify | 2.1.0 | MIT | output-api (transitive) | output-api/node_modules/fast-json-stable-stringify |  |
| fast-levenshtein | 2.0.6 | MIT | output-api (transitive) | output-api/node_modules/fast-levenshtein |  |
| fast-safe-stringify | 2.1.1 | MIT | output-api (transitive) | node_modules/fast-safe-stringify |  |
| fast-uri | 3.1.2 | BSD-3-Clause | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/ajv/node_modules/fast-uri<br>output-ui/node_modules/ajv/node_modules/fast-uri |  |
| fb-watchman | 2.0.2 | Apache-2.0 | output-api (transitive) | output-api/node_modules/fb-watchman |  |
| fdir | 6.5.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/fdir<br>output-ui/node_modules/fdir |  |
| file-entry-cache | 8.0.0 | MIT | output-api (transitive) | output-api/node_modules/file-entry-cache |  |
| file-type | 21.3.4 | MIT | output-api (transitive) | node_modules/file-type |  |
| fill-range | 7.1.1 | MIT | output-ui (transitive) | output-ui/node_modules/fill-range |  |
| finalhandler | 1.1.2 | MIT | output-ui (transitive) | output-ui/node_modules/connect/node_modules/finalhandler |  |
| finalhandler | 2.1.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/finalhandler |  |
| find-up | 4.1.0 | MIT | output-api (transitive) | output-api/node_modules/@istanbuljs/load-nyc-config/node_modules/find-up<br>output-api/node_modules/pkg-dir/node_modules/find-up |  |
| find-up | 5.0.0 | MIT | output-api (transitive) | output-api/node_modules/find-up |  |
| flat-cache | 4.0.1 | MIT | output-api (transitive) | output-api/node_modules/flat-cache |  |
| flatted | 3.4.2 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/flatted<br>output-ui/node_modules/flatted |  |
| follow-redirects | 1.16.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/follow-redirects |  |
| for-each | 0.3.5 | MIT | output-api (transitive) | output-api/node_modules/for-each |  |
| foreground-child | 3.3.1 | ISC | output-api (transitive) | output-api/node_modules/foreground-child |  |
| fork-ts-checker-webpack-plugin | 9.1.0 | MIT | output-api (transitive) | output-api/node_modules/fork-ts-checker-webpack-plugin |  |
| form-data | 4.0.5 | MIT | output-api (transitive) | output-api/node_modules/form-data |  |
| forwarded | 0.2.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/forwarded |  |
| fresh | 2.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/fresh |  |
| fs-extra | 10.1.0 | MIT | output-api (transitive) | output-api/node_modules/fs-extra |  |
| fs-extra | 8.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/fs-extra |  |
| fs-minipass | 3.0.3 | ISC | output-ui (transitive) | output-ui/node_modules/fs-minipass |  |
| fs-monkey | 1.1.0 | Unlicense | output-api (transitive) | output-api/node_modules/fs-monkey |  |
| fs.realpath | 1.0.0 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/fs.realpath<br>output-ui/node_modules/fs.realpath |  |
| fsevents | 2.3.3 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/fsevents |  |
| function-bind | 1.1.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/function-bind |  |
| gensync | 1.0.0-beta.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/gensync<br>output-ui/node_modules/gensync |  |
| get-caller-file | 2.0.5 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/get-caller-file<br>output-ui/node_modules/get-caller-file |  |
| get-east-asian-width | 1.5.0 | MIT | output-ui (transitive) | output-ui/node_modules/get-east-asian-width |  |
| get-intrinsic | 1.3.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/get-intrinsic |  |
| get-package-type | 0.1.0 | MIT | output-api (transitive) | output-api/node_modules/get-package-type |  |
| get-proto | 1.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/get-proto |  |
| get-stream | 6.0.1 | MIT | output-api (transitive) | output-api/node_modules/get-stream |  |
| glob | 10.5.0 | ISC | output-api (transitive) | output-api/node_modules/@jest/reporters/node_modules/glob<br>output-api/node_modules/jest-config/node_modules/glob<br>output-api/node_modules/jest-runtime/node_modules/glob<br>output-api/node_modules/typeorm/node_modules/glob |  |
| glob | 13.0.6 | BlueOak-1.0.0 | output-api (transitive)<br>output-ui (transitive)<br>output-interfaces (transitive) | output-api/node_modules/glob<br>output-interfaces/node_modules/rimraf/node_modules/glob<br>output-ui/node_modules/@npmcli/package-json/node_modules/glob<br>output-ui/node_modules/cacache/node_modules/glob |  |
| glob | 7.2.3 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/test-exclude/node_modules/glob<br>output-ui/node_modules/glob |  |
| glob-parent | 5.1.2 | ISC | output-ui (transitive) | output-ui/node_modules/glob-parent |  |
| glob-parent | 6.0.2 | ISC | output-api (transitive) | output-api/node_modules/glob-parent |  |
| glob-to-regexp | 0.4.1 | BSD-2-Clause | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/glob-to-regexp<br>output-ui/node_modules/glob-to-regexp |  |
| globals | 17.4.0 | MIT | output-api (dev) | output-api/node_modules/globals |  |
| gopd | 1.2.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/gopd |  |
| graceful-fs | 4.2.11 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/graceful-fs<br>output-ui/node_modules/graceful-fs |  |
| handlebars | 4.7.9 | MIT | output-api (transitive) | output-api/node_modules/handlebars |  |
| has-flag | 4.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/has-flag<br>output-ui/node_modules/has-flag |  |
| has-property-descriptors | 1.0.2 | MIT | output-api (transitive) | output-api/node_modules/has-property-descriptors |  |
| has-symbols | 1.1.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/has-symbols |  |
| has-tostringtag | 1.0.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/has-tostringtag<br>output-ui/node_modules/has-tostringtag |  |
| hasown | 2.0.3 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/hasown |  |
| hono | 4.12.18 | MIT | output-ui (transitive) | node_modules/hono |  |
| hosted-git-info | 9.0.2 | ISC | output-ui (transitive) | output-ui/node_modules/hosted-git-info |  |
| html-escaper | 2.0.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/html-escaper<br>output-ui/node_modules/html-escaper |  |
| htmlparser2 | 10.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/htmlparser2 |  |
| http-cache-semantics | 4.2.0 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/http-cache-semantics |  |
| http-errors | 2.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/http-errors |  |
| http-proxy | 1.18.1 | MIT | output-ui (transitive) | output-ui/node_modules/http-proxy |  |
| http-proxy-agent | 7.0.2 | MIT | output-ui (transitive) | output-ui/node_modules/http-proxy-agent |  |
| https | 1.0.0 | ISC | output-api (runtime) | output-api/node_modules/https |  |
| https-proxy-agent | 7.0.6 | MIT | output-ui (transitive) | output-ui/node_modules/https-proxy-agent |  |
| human-signals | 2.1.0 | Apache-2.0 | output-api (transitive) | output-api/node_modules/human-signals |  |
| iconv-lite | 0.4.24 | MIT | output-ui (transitive) | output-ui/node_modules/karma/node_modules/iconv-lite |  |
| iconv-lite | 0.7.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/iconv-lite |  |
| ieee754 | 1.2.1 | BSD-3-Clause | output-api (transitive) | node_modules/ieee754 |  |
| ignore | 5.3.2 | MIT | output-api (transitive) | output-api/node_modules/ignore |  |
| ignore | 7.0.5 | MIT | output-api (transitive) | output-api/node_modules/@typescript-eslint/eslint-plugin/node_modules/ignore |  |
| ignore-walk | 8.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/ignore-walk |  |
| immutable | 5.1.5 | MIT | output-ui (transitive) | output-ui/node_modules/immutable |  |
| import-fresh | 3.3.1 | MIT | output-api (transitive) | output-api/node_modules/import-fresh |  |
| import-local | 3.2.0 | MIT | output-api (transitive) | output-api/node_modules/import-local |  |
| imurmurhash | 0.1.4 | MIT | output-api (transitive) | output-api/node_modules/imurmurhash |  |
| inflight | 1.0.6 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/inflight<br>output-ui/node_modules/inflight |  |
| inherits | 2.0.4 | ISC | output-api (transitive)<br>output-ui (transitive) | node_modules/inherits |  |
| ini | 5.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/ini |  |
| ini | 6.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/git/node_modules/ini |  |
| ip-address | 10.2.0 | MIT | output-ui (transitive) | node_modules/ip-address |  |
| ipaddr.js | 1.9.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/ipaddr.js |  |
| is-arrayish | 0.2.1 | MIT | output-api (transitive) | output-api/node_modules/is-arrayish |  |
| is-binary-path | 2.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/is-binary-path |  |
| is-callable | 1.2.7 | MIT | output-api (transitive) | output-api/node_modules/is-callable |  |
| is-core-module | 2.16.1 | MIT | output-ui (transitive) | output-ui/node_modules/is-core-module |  |
| is-extglob | 2.1.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/is-extglob<br>output-ui/node_modules/is-extglob |  |
| is-fullwidth-code-point | 3.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/is-fullwidth-code-point<br>output-ui/node_modules/@angular/build/node_modules/is-fullwidth-code-point<br>output-ui/node_modules/@angular/cli/node_modules/is-fullwidth-code-point<br>output-ui/node_modules/karma/node_modules/is-fullwidth-code-point |  |
| is-fullwidth-code-point | 4.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/is-fullwidth-code-point |  |
| is-fullwidth-code-point | 5.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/log-update/node_modules/is-fullwidth-code-point |  |
| is-generator-fn | 2.1.0 | MIT | output-api (transitive) | output-api/node_modules/is-generator-fn |  |
| is-glob | 4.0.3 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/is-glob<br>output-ui/node_modules/is-glob |  |
| is-interactive | 1.0.0 | MIT | output-api (transitive) | output-api/node_modules/is-interactive |  |
| is-interactive | 2.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/is-interactive |  |
| is-number | 7.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/is-number |  |
| is-promise | 4.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/is-promise |  |
| is-regex | 1.2.1 | MIT | output-ui (transitive) | output-ui/node_modules/is-regex |  |
| is-stream | 2.0.1 | MIT | output-api (transitive) | output-api/node_modules/is-stream |  |
| is-typed-array | 1.1.15 | MIT | output-api (transitive) | output-api/node_modules/is-typed-array |  |
| is-unicode-supported | 0.1.0 | MIT | output-api (transitive) | output-api/node_modules/is-unicode-supported |  |
| is-unicode-supported | 1.3.0 | MIT | output-ui (transitive) | output-ui/node_modules/log-symbols/node_modules/is-unicode-supported |  |
| is-unicode-supported | 2.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/is-unicode-supported |  |
| isarray | 1.0.0 | MIT | output-api (transitive) | output-api/node_modules/mysql/node_modules/isarray |  |
| isarray | 2.0.5 | MIT | output-api (transitive) | output-api/node_modules/isarray |  |
| isbinaryfile | 4.0.10 | MIT | output-ui (transitive) | output-ui/node_modules/isbinaryfile |  |
| isexe | 2.0.0 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/isexe<br>output-ui/node_modules/isexe |  |
| isexe | 4.0.0 | BlueOak-1.0.0 | output-ui (transitive) | output-ui/node_modules/@npmcli/git/node_modules/isexe<br>output-ui/node_modules/@npmcli/promise-spawn/node_modules/isexe<br>output-ui/node_modules/node-gyp/node_modules/isexe |  |
| istanbul-lib-coverage | 3.2.2 | BSD-3-Clause | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/istanbul-lib-coverage<br>output-ui/node_modules/istanbul-lib-coverage |  |
| istanbul-lib-instrument | 5.2.1 | BSD-3-Clause | output-ui (transitive) | output-ui/node_modules/karma-coverage/node_modules/istanbul-lib-instrument |  |
| istanbul-lib-instrument | 6.0.3 | BSD-3-Clause | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/istanbul-lib-instrument<br>output-ui/node_modules/istanbul-lib-instrument |  |
| istanbul-lib-report | 3.0.1 | BSD-3-Clause | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/istanbul-lib-report<br>output-ui/node_modules/istanbul-lib-report |  |
| istanbul-lib-source-maps | 4.0.1 | BSD-3-Clause | output-ui (transitive) | output-ui/node_modules/istanbul-lib-source-maps |  |
| istanbul-lib-source-maps | 5.0.6 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/istanbul-lib-source-maps |  |
| istanbul-reports | 3.2.0 | BSD-3-Clause | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/istanbul-reports<br>output-ui/node_modules/istanbul-reports |  |
| iterare | 1.2.1 | ISC | output-api (transitive) | node_modules/iterare |  |
| jackspeak | 3.4.3 | BlueOak-1.0.0 | output-api (transitive) | output-api/node_modules/jackspeak |  |
| jasmine-core | 4.6.1 | MIT | output-ui (transitive) | output-ui/node_modules/karma-jasmine/node_modules/jasmine-core |  |
| jasmine-core | 5.12.1 | MIT | output-ui (dev) | output-ui/node_modules/jasmine-core |  |
| jest | 30.3.0 | MIT | output-api (dev) | output-api/node_modules/jest |  |
| jest-changed-files | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-changed-files |  |
| jest-circus | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-circus |  |
| jest-cli | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-cli |  |
| jest-config | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-config |  |
| jest-diff | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-diff |  |
| jest-docblock | 30.2.0 | MIT | output-api (transitive) | output-api/node_modules/jest-docblock |  |
| jest-each | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-each |  |
| jest-environment-node | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-environment-node |  |
| jest-haste-map | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-haste-map |  |
| jest-leak-detector | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-leak-detector |  |
| jest-matcher-utils | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-matcher-utils |  |
| jest-message-util | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-message-util |  |
| jest-mock | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-mock |  |
| jest-pnp-resolver | 1.2.3 | MIT | output-api (transitive) | output-api/node_modules/jest-pnp-resolver |  |
| jest-regex-util | 30.0.1 | MIT | output-api (transitive) | output-api/node_modules/jest-regex-util |  |
| jest-resolve | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-resolve |  |
| jest-resolve-dependencies | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-resolve-dependencies |  |
| jest-runner | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-runner |  |
| jest-runtime | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-runtime |  |
| jest-snapshot | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-snapshot |  |
| jest-util | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-util |  |
| jest-validate | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-validate |  |
| jest-watcher | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-watcher |  |
| jest-worker | 27.5.1 | MIT | output-api (transitive) | output-api/node_modules/terser-webpack-plugin/node_modules/jest-worker |  |
| jest-worker | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/jest-worker |  |
| jiti | 2.6.1 | MIT | output-api (runtime) | output-api/node_modules/jiti |  |
| jose | 6.2.2 | MIT | output-ui (transitive) | output-ui/node_modules/jose |  |
| js-tokens | 4.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/js-tokens<br>output-ui/node_modules/js-tokens |  |
| js-yaml | 3.14.2 | MIT | output-api (transitive) | output-api/node_modules/@istanbuljs/load-nyc-config/node_modules/js-yaml |  |
| js-yaml | 4.1.1 | MIT | output-api (transitive) | node_modules/js-yaml |  |
| jsesc | 3.1.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/jsesc<br>output-ui/node_modules/jsesc |  |
| json-buffer | 3.0.1 | MIT | output-api (transitive) | output-api/node_modules/json-buffer |  |
| json-parse-even-better-errors | 2.3.1 | MIT | output-api (transitive) | output-api/node_modules/json-parse-even-better-errors |  |
| json-parse-even-better-errors | 5.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/json-parse-even-better-errors |  |
| json-schema-traverse | 0.4.1 | MIT | output-api (transitive) | output-api/node_modules/eslint/node_modules/json-schema-traverse<br>output-api/node_modules/schema-utils/node_modules/json-schema-traverse |  |
| json-schema-traverse | 1.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/json-schema-traverse<br>output-ui/node_modules/json-schema-traverse |  |
| json-schema-typed | 8.0.2 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/json-schema-typed |  |
| json-stable-stringify-without-jsonify | 1.0.1 | MIT | output-api (transitive) | output-api/node_modules/json-stable-stringify-without-jsonify |  |
| json5 | 2.2.3 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/json5<br>output-ui/node_modules/json5 |  |
| jsonata | 2.1.0 | MIT | output-api (runtime) | output-api/node_modules/jsonata |  |
| jsonc-parser | 3.3.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/jsonc-parser<br>output-ui/node_modules/jsonc-parser |  |
| jsonfile | 4.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/jsonfile |  |
| jsonfile | 6.2.0 | MIT | output-api (transitive) | output-api/node_modules/jsonfile |  |
| jsonparse | 1.3.1 | MIT | output-ui (transitive) | output-ui/node_modules/jsonparse |  |
| jsonwebtoken | 9.0.3 | MIT | output-api (transitive) | output-api/node_modules/jsonwebtoken |  |
| jwa | 2.0.1 | MIT | output-api (transitive) | output-api/node_modules/jwa |  |
| jws | 4.0.1 | MIT | output-api (transitive) | output-api/node_modules/jws |  |
| karma | 6.4.4 | MIT | output-ui (dev) | output-ui/node_modules/karma |  |
| karma-chrome-launcher | 3.2.0 | MIT | output-ui (dev) | output-ui/node_modules/karma-chrome-launcher |  |
| karma-coverage | 2.2.1 | MIT | output-ui (dev) | output-ui/node_modules/karma-coverage |  |
| karma-jasmine | 5.1.0 | MIT | output-ui (dev) | output-ui/node_modules/karma-jasmine |  |
| karma-jasmine-html-reporter | 1.7.0 | MIT | output-ui (dev) | output-ui/node_modules/karma-jasmine-html-reporter |  |
| keyv | 4.5.4 | MIT | output-api (transitive) | output-api/node_modules/keyv |  |
| leven | 3.1.0 | MIT | output-api (transitive) | output-api/node_modules/leven |  |
| levn | 0.4.1 | MIT | output-api (transitive) | output-api/node_modules/levn |  |
| libphonenumber-js | 1.12.43 | MIT | output-api (transitive) | node_modules/libphonenumber-js |  |
| lines-and-columns | 1.2.4 | MIT | output-api (transitive) | output-api/node_modules/lines-and-columns |  |
| listr2 | 9.0.1 | MIT | output-ui (transitive) | output-ui/node_modules/listr2 |  |
| lmdb | 3.4.2 | MIT | output-ui (transitive) | output-ui/node_modules/lmdb |  |
| load-esm | 1.0.3 | MIT | output-api (transitive) | node_modules/load-esm |  |
| loader-runner | 4.3.1 | MIT | output-api (transitive) | output-api/node_modules/loader-runner |  |
| locate-path | 5.0.0 | MIT | output-api (transitive) | output-api/node_modules/@istanbuljs/load-nyc-config/node_modules/locate-path<br>output-api/node_modules/pkg-dir/node_modules/locate-path |  |
| locate-path | 6.0.0 | MIT | output-api (transitive) | output-api/node_modules/locate-path |  |
| lodash | 4.18.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/lodash |  |
| lodash.includes | 4.3.0 | MIT | output-api (transitive) | output-api/node_modules/lodash.includes |  |
| lodash.isboolean | 3.0.3 | MIT | output-api (transitive) | output-api/node_modules/lodash.isboolean |  |
| lodash.isinteger | 4.0.4 | MIT | output-api (transitive) | output-api/node_modules/lodash.isinteger |  |
| lodash.isnumber | 3.0.3 | MIT | output-api (transitive) | output-api/node_modules/lodash.isnumber |  |
| lodash.isplainobject | 4.0.6 | MIT | output-api (transitive) | output-api/node_modules/lodash.isplainobject |  |
| lodash.isstring | 4.0.1 | MIT | output-api (transitive) | output-api/node_modules/lodash.isstring |  |
| lodash.memoize | 4.1.2 | MIT | output-api (transitive) | output-api/node_modules/lodash.memoize |  |
| lodash.once | 4.1.1 | MIT | output-api (transitive) | output-api/node_modules/lodash.once |  |
| log-symbols | 4.1.0 | MIT | output-api (transitive) | output-api/node_modules/log-symbols |  |
| log-symbols | 6.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/log-symbols |  |
| log-update | 6.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/log-update |  |
| log4js | 6.9.1 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/log4js |  |
| lru-cache | 10.4.3 | ISC | output-api (transitive) | output-api/node_modules/@jest/reporters/node_modules/lru-cache<br>output-api/node_modules/jest-config/node_modules/lru-cache<br>output-api/node_modules/jest-runtime/node_modules/lru-cache<br>output-api/node_modules/typeorm/node_modules/lru-cache |  |
| lru-cache | 11.2.7 | BlueOak-1.0.0 | output-api (transitive) | output-api/node_modules/path-scurry/node_modules/lru-cache |  |
| lru-cache | 11.3.2 | BlueOak-1.0.0 | output-ui (transitive) | output-ui/node_modules/@npmcli/agent/node_modules/lru-cache<br>output-ui/node_modules/@npmcli/git/node_modules/lru-cache<br>output-ui/node_modules/cacache/node_modules/lru-cache<br>output-ui/node_modules/hosted-git-info/node_modules/lru-cache<br>output-ui/node_modules/path-scurry/node_modules/lru-cache |  |
| lru-cache | 11.3.6 | BlueOak-1.0.0 | output-interfaces (transitive) | output-interfaces/node_modules/rimraf/node_modules/glob/node_modules/path-scurry/node_modules/lru-cache |  |
| lru-cache | 5.1.1 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/lru-cache<br>output-ui/node_modules/lru-cache |  |
| luxon | 3.7.2 | MIT | output-api (transitive) | output-api/node_modules/luxon |  |
| magic-string | 0.30.17 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/magic-string<br>output-ui/node_modules/magic-string |  |
| make-dir | 4.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/make-dir<br>output-ui/node_modules/make-dir |  |
| make-error | 1.3.6 | ISC | output-api (transitive) | output-api/node_modules/make-error |  |
| make-fetch-happen | 15.0.5 | ISC | output-ui (transitive) | output-ui/node_modules/make-fetch-happen |  |
| makeerror | 1.0.12 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/makeerror |  |
| math-intrinsics | 1.1.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/math-intrinsics |  |
| media-typer | 0.3.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/multer/node_modules/media-typer<br>output-ui/node_modules/karma/node_modules/media-typer |  |
| media-typer | 1.1.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/media-typer |  |
| memfs | 3.5.3 | Unlicense | output-api (transitive) | output-api/node_modules/memfs |  |
| merge-descriptors | 2.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/merge-descriptors |  |
| merge-stream | 2.0.0 | MIT | output-api (transitive) | output-api/node_modules/merge-stream |  |
| mime | 2.6.0 | MIT | output-ui (transitive) | output-ui/node_modules/mime |  |
| mime-db | 1.52.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/form-data/node_modules/mime-db<br>output-api/node_modules/multer/node_modules/mime-db<br>output-api/node_modules/webpack/node_modules/mime-db<br>output-ui/node_modules/karma/node_modules/mime-db<br>output-ui/node_modules/socket.io/node_modules/mime-db |  |
| mime-db | 1.54.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/mime-db |  |
| mime-types | 2.1.35 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/form-data/node_modules/mime-types<br>output-api/node_modules/multer/node_modules/mime-types<br>output-api/node_modules/webpack/node_modules/mime-types<br>output-ui/node_modules/karma/node_modules/mime-types<br>output-ui/node_modules/socket.io/node_modules/mime-types |  |
| mime-types | 3.0.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/mime-types |  |
| mimic-fn | 2.1.0 | MIT | output-api (transitive) | output-api/node_modules/mimic-fn |  |
| mimic-function | 5.0.1 | MIT | output-ui (transitive) | output-ui/node_modules/mimic-function |  |
| minimatch | 10.2.5 | BlueOak-1.0.0 | output-api (transitive)<br>output-ui (transitive)<br>output-interfaces (transitive) | output-api/node_modules/minimatch<br>output-interfaces/node_modules/rimraf/node_modules/glob/node_modules/minimatch<br>output-ui/node_modules/@npmcli/package-json/node_modules/minimatch<br>output-ui/node_modules/@tufjs/models/node_modules/minimatch<br>output-ui/node_modules/cacache/node_modules/minimatch<br>output-ui/node_modules/ignore-walk/node_modules/minimatch |  |
| minimatch | 3.1.5 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/fork-ts-checker-webpack-plugin/node_modules/minimatch<br>output-api/node_modules/test-exclude/node_modules/minimatch<br>output-ui/node_modules/minimatch |  |
| minimatch | 9.0.9 | ISC | output-api (transitive) | output-api/node_modules/@jest/reporters/node_modules/minimatch<br>output-api/node_modules/jest-config/node_modules/minimatch<br>output-api/node_modules/jest-runtime/node_modules/minimatch<br>output-api/node_modules/typeorm/node_modules/minimatch |  |
| minimist | 1.2.8 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/minimist<br>output-ui/node_modules/minimist |  |
| minipass | 3.3.6 | ISC | output-ui (transitive) | output-ui/node_modules/minipass-flush/node_modules/minipass<br>output-ui/node_modules/minipass-pipeline/node_modules/minipass |  |
| minipass | 7.1.3 | BlueOak-1.0.0 | output-api (transitive)<br>output-ui (transitive)<br>output-interfaces (transitive) | output-api/node_modules/minipass<br>output-interfaces/node_modules/rimraf/node_modules/glob/node_modules/minipass<br>output-ui/node_modules/minipass |  |
| minipass-collect | 2.0.1 | ISC | output-ui (transitive) | output-ui/node_modules/minipass-collect |  |
| minipass-fetch | 5.0.2 | MIT | output-ui (transitive) | output-ui/node_modules/minipass-fetch |  |
| minipass-flush | 1.0.7 | BlueOak-1.0.0 | output-ui (transitive) | output-ui/node_modules/minipass-flush |  |
| minipass-pipeline | 1.2.4 | ISC | output-ui (transitive) | output-ui/node_modules/minipass-pipeline |  |
| minipass-sized | 2.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/minipass-sized |  |
| minizlib | 3.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/minizlib |  |
| mkdirp | 0.5.6 | MIT | output-ui (transitive) | output-ui/node_modules/mkdirp |  |
| moment | 2.30.1 | MIT | output-api (runtime)<br>output-ui (runtime) | output-api/node_modules/moment<br>output-ui/node_modules/moment |  |
| mrmime | 2.0.1 | MIT | output-ui (transitive) | output-ui/node_modules/mrmime |  |
| ms | 2.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/connect/node_modules/ms<br>output-ui/node_modules/karma/node_modules/ms |  |
| ms | 2.1.3 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/ms |  |
| msgpackr | 1.11.9 | MIT | output-ui (transitive) | output-ui/node_modules/msgpackr |  |
| msgpackr-extract | 3.0.3 | MIT | output-ui (transitive) | output-ui/node_modules/msgpackr-extract |  |
| multer | 2.1.1 | MIT | output-api (transitive) | output-api/node_modules/multer |  |
| mute-stream | 2.0.0 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/mute-stream<br>output-ui/node_modules/mute-stream |  |
| mysql | 2.18.1 | MIT | output-api (runtime) | output-api/node_modules/mysql |  |
| nanoid | 3.3.12 | MIT | output-ui (transitive) | node_modules/nanoid |  |
| napi-postinstall | 0.3.4 | MIT | output-api (transitive) | output-api/node_modules/napi-postinstall |  |
| natural-compare | 1.4.0 | MIT | output-api (transitive) | output-api/node_modules/natural-compare |  |
| negotiator | 0.6.3 | MIT | output-ui (transitive) | output-ui/node_modules/socket.io/node_modules/negotiator |  |
| negotiator | 1.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/negotiator |  |
| neo-async | 2.6.2 | MIT | output-api (transitive) | output-api/node_modules/neo-async |  |
| ngx-cookie-service | 20.1.1 | MIT | output-ui (runtime) | output-ui/node_modules/ngx-cookie-service |  |
| ngx-echarts | 20.0.2 | MIT | output-ui (runtime) | output-ui/node_modules/ngx-echarts |  |
| node | 25.8.2 | MIT | output-api (runtime) | output-api/node_modules/node |  |
| node-abort-controller | 3.1.1 | MIT | output-api (transitive) | output-api/node_modules/node-abort-controller |  |
| node-addon-api | 6.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/node-addon-api |  |
| node-addon-api | 7.1.1 | MIT | output-ui (transitive) | output-ui/node_modules/@parcel/watcher/node_modules/node-addon-api |  |
| node-bin-setup | 1.1.4 | ISC | output-api (transitive) | output-api/node_modules/node-bin-setup |  |
| node-emoji | 1.11.0 | MIT | output-api (transitive) | output-api/node_modules/node-emoji |  |
| node-gyp | 12.2.0 | MIT | output-ui (transitive) | output-ui/node_modules/node-gyp |  |
| node-gyp-build-optional-packages | 5.2.2 | MIT | output-ui (transitive) | output-ui/node_modules/node-gyp-build-optional-packages |  |
| node-int64 | 0.4.0 | MIT | output-api (transitive) | output-api/node_modules/node-int64 |  |
| node-releases | 2.0.36 | MIT | output-api (transitive) | output-api/node_modules/node-releases |  |
| node-releases | 2.0.37 | MIT | output-ui (transitive) | output-ui/node_modules/node-releases |  |
| nopt | 9.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/nopt |  |
| normalize-path | 3.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/normalize-path<br>output-ui/node_modules/normalize-path |  |
| npm-bundled | 5.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/npm-bundled |  |
| npm-install-checks | 8.0.0 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/npm-install-checks |  |
| npm-normalize-package-bin | 5.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/npm-normalize-package-bin |  |
| npm-package-arg | 13.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/npm-package-arg |  |
| npm-packlist | 10.0.4 | ISC | output-ui (transitive) | output-ui/node_modules/npm-packlist |  |
| npm-pick-manifest | 11.0.3 | ISC | output-ui (transitive) | output-ui/node_modules/npm-pick-manifest |  |
| npm-registry-fetch | 19.1.1 | ISC | output-ui (transitive) | output-ui/node_modules/npm-registry-fetch |  |
| npm-run-path | 4.0.1 | MIT | output-api (transitive) | output-api/node_modules/npm-run-path |  |
| nth-check | 2.1.1 | BSD-2-Clause | output-ui (transitive) | output-ui/node_modules/nth-check |  |
| object-assign | 4.1.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/object-assign<br>output-ui/node_modules/object-assign |  |
| object-inspect | 1.13.4 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/object-inspect |  |
| on-finished | 2.3.0 | MIT | output-ui (transitive) | output-ui/node_modules/connect/node_modules/on-finished |  |
| on-finished | 2.4.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/on-finished |  |
| once | 1.4.0 | ISC | output-api (transitive)<br>output-ui (transitive) | node_modules/once |  |
| onetime | 5.1.2 | MIT | output-api (transitive) | output-api/node_modules/onetime |  |
| onetime | 7.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/onetime |  |
| optionator | 0.9.4 | MIT | output-api (transitive) | output-api/node_modules/optionator |  |
| ora | 5.4.1 | MIT | output-api (transitive) | output-api/node_modules/ora |  |
| ora | 8.2.0 | MIT | output-ui (transitive) | output-ui/node_modules/ora |  |
| ordered-binary | 1.6.1 | MIT | output-ui (transitive) | output-ui/node_modules/ordered-binary |  |
| p-limit | 2.3.0 | MIT | output-api (transitive) | output-api/node_modules/@istanbuljs/load-nyc-config/node_modules/p-limit<br>output-api/node_modules/pkg-dir/node_modules/p-limit |  |
| p-limit | 3.1.0 | MIT | output-api (transitive) | output-api/node_modules/p-limit |  |
| p-locate | 4.1.0 | MIT | output-api (transitive) | output-api/node_modules/@istanbuljs/load-nyc-config/node_modules/p-locate<br>output-api/node_modules/pkg-dir/node_modules/p-locate |  |
| p-locate | 5.0.0 | MIT | output-api (transitive) | output-api/node_modules/p-locate |  |
| p-map | 7.0.4 | MIT | output-ui (transitive) | output-ui/node_modules/p-map |  |
| p-try | 2.2.0 | MIT | output-api (transitive) | output-api/node_modules/p-try |  |
| package-json-from-dist | 1.0.1 | BlueOak-1.0.0 | output-api (transitive)<br>output-interfaces (transitive) | output-api/node_modules/package-json-from-dist<br>output-interfaces/node_modules/rimraf/node_modules/package-json-from-dist |  |
| pacote | 21.0.4 | ISC | output-ui (transitive) | output-ui/node_modules/pacote |  |
| papaparse | 5.5.3 | MIT | output-api (runtime) | output-api/node_modules/papaparse |  |
| parent-module | 1.0.1 | MIT | output-api (transitive) | output-api/node_modules/parent-module |  |
| parse-json | 5.2.0 | MIT | output-api (transitive) | output-api/node_modules/parse-json |  |
| parse5 | 8.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/parse5 |  |
| parse5-html-rewriting-stream | 8.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/parse5-html-rewriting-stream |  |
| parse5-sax-parser | 8.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/parse5-sax-parser |  |
| parseurl | 1.3.3 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/parseurl |  |
| passport | 0.7.0 | MIT | output-api (runtime) | output-api/node_modules/passport |  |
| passport-local | 1.0.0 | MIT | output-api (runtime) | output-api/node_modules/passport-local | Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei. |
| passport-strategy | 1.0.0 | MIT | output-api (transitive) | output-api/node_modules/passport-strategy | Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei. |
| path-exists | 4.0.0 | MIT | output-api (transitive) | output-api/node_modules/path-exists |  |
| path-is-absolute | 1.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/path-is-absolute<br>output-ui/node_modules/path-is-absolute |  |
| path-key | 3.1.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/path-key<br>output-ui/node_modules/path-key |  |
| path-parse | 1.0.7 | MIT | output-ui (transitive) | output-ui/node_modules/path-parse |  |
| path-scurry | 1.11.1 | BlueOak-1.0.0 | output-api (transitive) | output-api/node_modules/@jest/reporters/node_modules/path-scurry<br>output-api/node_modules/jest-config/node_modules/path-scurry<br>output-api/node_modules/jest-runtime/node_modules/path-scurry<br>output-api/node_modules/typeorm/node_modules/path-scurry |  |
| path-scurry | 2.0.2 | BlueOak-1.0.0 | output-api (transitive)<br>output-ui (transitive)<br>output-interfaces (transitive) | output-api/node_modules/path-scurry<br>output-interfaces/node_modules/rimraf/node_modules/glob/node_modules/path-scurry<br>output-ui/node_modules/path-scurry |  |
| path-to-regexp | 8.4.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/path-to-regexp |  |
| path-type | 4.0.0 | MIT | output-api (transitive) | output-api/node_modules/path-type |  |
| pause | 0.0.1 | MIT | output-api (transitive) | output-api/node_modules/pause | Manuell geprüft: Readme.md enthält MIT-Lizenztext. |
| pg | 8.20.0 | MIT | output-api (runtime) | output-api/node_modules/pg |  |
| pg-cloudflare | 1.3.0 | MIT | output-api (transitive) | output-api/node_modules/pg-cloudflare |  |
| pg-connection-string | 2.12.0 | MIT | output-api (transitive) | output-api/node_modules/pg-connection-string |  |
| pg-int8 | 1.0.1 | ISC | output-api (transitive) | output-api/node_modules/pg-int8 |  |
| pg-pool | 3.13.0 | MIT | output-api (transitive) | output-api/node_modules/pg-pool |  |
| pg-protocol | 1.13.0 | MIT | output-api (transitive) | output-api/node_modules/pg-protocol |  |
| pg-types | 2.2.0 | MIT | output-api (transitive) | output-api/node_modules/pg-types |  |
| pgpass | 1.0.5 | MIT | output-api (transitive) | output-api/node_modules/pgpass |  |
| picocolors | 1.1.1 | ISC | output-api (transitive)<br>output-ui (transitive) | node_modules/picocolors |  |
| picomatch | 2.3.2 | MIT | output-ui (transitive) | output-ui/node_modules/anymatch/node_modules/picomatch<br>output-ui/node_modules/karma/node_modules/picomatch |  |
| picomatch | 4.0.4 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/picomatch<br>output-ui/node_modules/picomatch |  |
| pirates | 4.0.7 | MIT | output-api (transitive) | output-api/node_modules/pirates |  |
| piscina | 5.1.3 | MIT | output-ui (transitive) | output-ui/node_modules/piscina |  |
| pkce-challenge | 5.0.1 | MIT | output-ui (transitive) | output-ui/node_modules/pkce-challenge |  |
| pkg-dir | 4.2.0 | MIT | output-api (transitive) | output-api/node_modules/pkg-dir |  |
| pluralize | 8.0.0 | MIT | output-api (transitive) | output-api/node_modules/pluralize |  |
| possible-typed-array-names | 1.1.0 | MIT | output-api (transitive) | output-api/node_modules/possible-typed-array-names |  |
| postcss | 8.5.14 | MIT | output-ui (transitive) | node_modules/postcss |  |
| postcss-media-query-parser | 0.2.3 | MIT | output-ui (transitive) | output-ui/node_modules/postcss-media-query-parser |  |
| postgres-array | 2.0.0 | MIT | output-api (transitive) | output-api/node_modules/postgres-array |  |
| postgres-bytea | 1.0.1 | MIT | output-api (transitive) | output-api/node_modules/postgres-bytea |  |
| postgres-date | 1.0.7 | MIT | output-api (transitive) | output-api/node_modules/postgres-date |  |
| postgres-interval | 1.2.0 | MIT | output-api (transitive) | output-api/node_modules/postgres-interval |  |
| prelude-ls | 1.2.1 | MIT | output-api (transitive) | output-api/node_modules/prelude-ls |  |
| pretty-format | 30.3.0 | MIT | output-api (transitive) | output-api/node_modules/pretty-format |  |
| proc-log | 5.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/proc-log |  |
| proc-log | 6.1.0 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/git/node_modules/proc-log<br>output-ui/node_modules/@npmcli/package-json/node_modules/proc-log<br>output-ui/node_modules/@npmcli/run-script/node_modules/proc-log<br>output-ui/node_modules/@sigstore/sign/node_modules/proc-log<br>output-ui/node_modules/make-fetch-happen/node_modules/proc-log<br>output-ui/node_modules/node-gyp/node_modules/proc-log<br>output-ui/node_modules/npm-packlist/node_modules/proc-log<br>output-ui/node_modules/npm-registry-fetch/node_modules/proc-log<br>output-ui/node_modules/pacote/node_modules/proc-log |  |
| process-nextick-args | 2.0.1 | MIT | output-api (transitive) | output-api/node_modules/process-nextick-args |  |
| promise-retry | 2.0.1 | MIT | output-ui (transitive) | output-ui/node_modules/promise-retry |  |
| proxy-addr | 2.0.7 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/proxy-addr |  |
| proxy-from-env | 2.1.0 | MIT | output-api (transitive) | output-api/node_modules/proxy-from-env |  |
| punycode | 1.4.1 | MIT | output-ui (transitive) | output-ui/node_modules/punycode |  |
| punycode | 2.3.1 | MIT | output-api (transitive) | output-api/node_modules/punycode |  |
| pure-rand | 7.0.1 | MIT | output-api (transitive) | output-api/node_modules/pure-rand |  |
| qjobs | 1.2.0 | MIT | output-ui (transitive) | output-ui/node_modules/qjobs |  |
| qs | 6.15.2 | BSD-3-Clause | output-api (transitive)<br>output-ui (transitive) | node_modules/body-parser/node_modules/qs<br>node_modules/express/node_modules/qs<br>output-ui/node_modules/karma/node_modules/body-parser/node_modules/qs |  |
| range-parser | 1.2.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/range-parser |  |
| raw-body | 2.5.3 | MIT | output-ui (transitive) | output-ui/node_modules/karma/node_modules/raw-body |  |
| raw-body | 3.0.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/raw-body |  |
| react-is | 18.3.1 | MIT | output-api (transitive) | output-api/node_modules/react-is |  |
| readable-stream | 2.3.7 | MIT | output-api (transitive) | output-api/node_modules/mysql/node_modules/readable-stream |  |
| readable-stream | 3.6.2 | MIT | output-api (transitive) | output-api/node_modules/readable-stream |  |
| readdirp | 3.6.0 | MIT | output-ui (transitive) | output-ui/node_modules/karma/node_modules/readdirp |  |
| readdirp | 4.1.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/readdirp<br>output-ui/node_modules/readdirp |  |
| reflect-metadata | 0.2.2 | Apache-2.0 | output-api (runtime)<br>output-ui (transitive) | node_modules/reflect-metadata |  |
| require-directory | 2.1.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/require-directory<br>output-ui/node_modules/require-directory |  |
| require-from-string | 2.0.2 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/require-from-string<br>output-ui/node_modules/require-from-string |  |
| requires-port | 1.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/requires-port |  |
| resolve | 1.22.10 | MIT | output-ui (transitive) | output-ui/node_modules/resolve |  |
| resolve-cwd | 3.0.0 | MIT | output-api (transitive) | output-api/node_modules/resolve-cwd |  |
| resolve-from | 4.0.0 | MIT | output-api (transitive) | output-api/node_modules/resolve-from |  |
| resolve-from | 5.0.0 | MIT | output-api (transitive) | output-api/node_modules/@istanbuljs/load-nyc-config/node_modules/resolve-from<br>output-api/node_modules/resolve-cwd/node_modules/resolve-from |  |
| restore-cursor | 3.1.0 | MIT | output-api (transitive) | output-api/node_modules/restore-cursor |  |
| restore-cursor | 5.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/restore-cursor |  |
| retry | 0.12.0 | MIT | output-ui (transitive) | output-ui/node_modules/retry |  |
| rfdc | 1.4.1 | MIT | output-ui (transitive) | output-ui/node_modules/rfdc |  |
| rimraf | 3.0.2 | ISC | output-ui (transitive) | output-ui/node_modules/rimraf |  |
| rimraf | 6.1.3 | BlueOak-1.0.0 | output-api (dev)<br>output-interfaces (dev) | output-api/node_modules/rimraf<br>output-interfaces/node_modules/rimraf |  |
| rollup | 4.59.0 | MIT | output-ui (transitive) | output-ui/node_modules/rollup |  |
| router | 2.2.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/router |  |
| rxjs | 7.5.7 | Apache-2.0 | output-ui (runtime) | output-ui/node_modules/rxjs |  |
| rxjs | 7.8.1 | Apache-2.0 | output-api (transitive) | output-api/node_modules/@angular-devkit/core/node_modules/rxjs<br>output-api/node_modules/@angular-devkit/schematics/node_modules/rxjs |  |
| rxjs | 7.8.2 | Apache-2.0 | output-api (runtime)<br>output-ui (transitive) | node_modules/rxjs<br>output-ui/node_modules/@angular-devkit/architect/node_modules/rxjs<br>output-ui/node_modules/@angular-devkit/core/node_modules/rxjs<br>output-ui/node_modules/@angular-devkit/schematics/node_modules/rxjs<br>output-ui/node_modules/@angular/build/node_modules/rxjs |  |
| safe-buffer | 5.1.2 | MIT | output-api (transitive) | output-api/node_modules/mysql/node_modules/safe-buffer |  |
| safe-buffer | 5.2.1 | MIT | output-api (transitive) | output-api/node_modules/safe-buffer |  |
| safe-regex-test | 1.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/safe-regex-test |  |
| safer-buffer | 2.1.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/safer-buffer |  |
| sass | 1.90.0 | MIT | output-ui (transitive) | output-ui/node_modules/sass |  |
| sax | 1.6.0 | BlueOak-1.0.0 | output-api (transitive) | output-api/node_modules/sax |  |
| schema-utils | 3.3.0 | MIT | output-api (transitive) | output-api/node_modules/schema-utils |  |
| schema-utils | 4.3.3 | MIT | output-api (transitive) | output-api/node_modules/terser-webpack-plugin/node_modules/schema-utils<br>output-api/node_modules/webpack/node_modules/schema-utils |  |
| semver | 6.3.1 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@babel/core/node_modules/semver<br>output-api/node_modules/@babel/helper-compilation-targets/node_modules/semver<br>output-ui/node_modules/@babel/core/node_modules/semver<br>output-ui/node_modules/@babel/helper-compilation-targets/node_modules/semver<br>output-ui/node_modules/karma-coverage/node_modules/semver |  |
| semver | 7.7.2 | ISC | output-ui (transitive) | output-ui/node_modules/semver |  |
| semver | 7.7.4 | ISC | output-api (transitive) | output-api/node_modules/semver |  |
| send | 1.2.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/send |  |
| serve-static | 2.2.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/serve-static |  |
| service | 0.1.4 | NOASSERTION | output-ui (runtime) | output-ui/node_modules/service | Manuell geprüft: package.json und README.md enthalten kein Lizenzfeld bzw. keinen Lizenzhinweis. |
| set-function-length | 1.2.2 | MIT | output-api (transitive) | output-api/node_modules/set-function-length |  |
| setprototypeof | 1.2.0 | ISC | output-api (transitive)<br>output-ui (transitive) | node_modules/setprototypeof |  |
| sha.js | 2.4.12 | (MIT AND BSD-3-Clause) | output-api (transitive) | output-api/node_modules/sha.js |  |
| shebang-command | 2.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/shebang-command<br>output-ui/node_modules/shebang-command |  |
| shebang-regex | 3.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/shebang-regex<br>output-ui/node_modules/shebang-regex |  |
| side-channel | 1.1.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/side-channel |  |
| side-channel-list | 1.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/side-channel-list |  |
| side-channel-map | 1.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/side-channel-map |  |
| side-channel-weakmap | 1.0.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/side-channel-weakmap |  |
| signal-exit | 3.0.7 | ISC | output-api (transitive) | output-api/node_modules/execa/node_modules/signal-exit<br>output-api/node_modules/restore-cursor/node_modules/signal-exit |  |
| signal-exit | 4.1.0 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/signal-exit<br>output-ui/node_modules/signal-exit |  |
| sigstore | 4.1.0 | Apache-2.0 | output-ui (transitive) | output-ui/node_modules/sigstore |  |
| slash | 3.0.0 | MIT | output-api (transitive) | output-api/node_modules/slash |  |
| slice-ansi | 5.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/slice-ansi |  |
| slice-ansi | 7.1.2 | MIT | output-ui (transitive) | output-ui/node_modules/log-update/node_modules/slice-ansi |  |
| smart-buffer | 4.2.0 | MIT | output-ui (transitive) | output-ui/node_modules/smart-buffer |  |
| socket.io | 4.8.3 | MIT | output-ui (transitive) | output-ui/node_modules/socket.io |  |
| socket.io-adapter | 2.5.7 | MIT | output-ui (transitive) | output-ui/node_modules/socket.io/node_modules/socket.io-adapter |  |
| socket.io-parser | 4.2.6 | MIT | output-ui (transitive) | output-ui/node_modules/socket.io-parser |  |
| socks | 2.8.7 | MIT | output-ui (transitive) | output-ui/node_modules/socks |  |
| socks-proxy-agent | 8.0.5 | MIT | output-ui (transitive) | output-ui/node_modules/socks-proxy-agent |  |
| source-map | 0.6.1 | BSD-3-Clause | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/handlebars/node_modules/source-map<br>output-api/node_modules/source-map-support/node_modules/source-map<br>output-api/node_modules/terser/node_modules/source-map<br>output-ui/node_modules/istanbul-lib-source-maps/node_modules/source-map<br>output-ui/node_modules/karma/node_modules/source-map<br>output-ui/node_modules/source-map-support/node_modules/source-map |  |
| source-map | 0.7.4 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/source-map |  |
| source-map | 0.7.6 | BSD-3-Clause | output-ui (transitive) | output-ui/node_modules/source-map |  |
| source-map-js | 1.2.1 | BSD-3-Clause | output-ui (transitive) | node_modules/source-map-js |  |
| source-map-support | 0.5.13 | MIT | output-api (transitive) | output-api/node_modules/source-map-support |  |
| source-map-support | 0.5.21 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/terser/node_modules/source-map-support<br>output-ui/node_modules/source-map-support |  |
| spdx-exceptions | 2.5.0 | CC-BY-3.0 | output-ui (transitive) | output-ui/node_modules/spdx-exceptions |  |
| spdx-expression-parse | 4.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/spdx-expression-parse |  |
| spdx-license-ids | 3.0.23 | CC0-1.0 | output-ui (transitive) | output-ui/node_modules/spdx-license-ids |  |
| split2 | 4.2.0 | ISC | output-api (transitive) | output-api/node_modules/split2 |  |
| sprintf-js | 1.0.3 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/sprintf-js |  |
| sql-highlight | 6.1.0 | MIT | output-api (transitive) | output-api/node_modules/sql-highlight |  |
| sqlstring | 2.3.1 | MIT | output-api (transitive) | output-api/node_modules/sqlstring |  |
| ssri | 13.0.1 | ISC | output-ui (transitive) | output-ui/node_modules/ssri |  |
| stack-utils | 2.0.6 | MIT | output-api (transitive) | output-api/node_modules/stack-utils |  |
| statuses | 1.5.0 | MIT | output-ui (transitive) | output-ui/node_modules/connect/node_modules/statuses |  |
| statuses | 2.0.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/statuses |  |
| stdin-discarder | 0.2.2 | MIT | output-ui (transitive) | output-ui/node_modules/stdin-discarder |  |
| streamroller | 3.1.5 | MIT | output-ui (transitive) | output-ui/node_modules/streamroller |  |
| streamsearch | 1.1.0 | MIT | output-api (transitive) | output-api/node_modules/streamsearch | Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei. |
| string_decoder | 1.1.1 | MIT | output-api (transitive) | output-api/node_modules/mysql/node_modules/string_decoder |  |
| string_decoder | 1.3.0 | MIT | output-api (transitive) | output-api/node_modules/string_decoder |  |
| string-length | 4.0.2 | MIT | output-api (transitive) | output-api/node_modules/string-length |  |
| string-width | 4.2.3 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/string-width<br>output-api/node_modules/string-width-cjs<br>output-ui/node_modules/@angular/build/node_modules/string-width<br>output-ui/node_modules/@angular/cli/node_modules/string-width<br>output-ui/node_modules/karma/node_modules/string-width |  |
| string-width | 5.1.2 | MIT | output-api (transitive) | output-api/node_modules/@isaacs/cliui/node_modules/string-width |  |
| string-width | 7.2.0 | MIT | output-ui (transitive) | output-ui/node_modules/string-width |  |
| strip-ansi | 6.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/strip-ansi<br>output-api/node_modules/strip-ansi-cjs<br>output-ui/node_modules/@angular/build/node_modules/strip-ansi<br>output-ui/node_modules/@angular/cli/node_modules/strip-ansi<br>output-ui/node_modules/karma/node_modules/strip-ansi |  |
| strip-ansi | 7.2.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/@isaacs/cliui/node_modules/strip-ansi<br>output-ui/node_modules/strip-ansi |  |
| strip-bom | 3.0.0 | MIT | output-api (transitive) | output-api/node_modules/tsconfig-paths/node_modules/strip-bom |  |
| strip-bom | 4.0.0 | MIT | output-api (transitive) | output-api/node_modules/strip-bom |  |
| strip-final-newline | 2.0.0 | MIT | output-api (transitive) | output-api/node_modules/strip-final-newline |  |
| strip-json-comments | 3.1.1 | MIT | output-api (transitive) | output-api/node_modules/strip-json-comments |  |
| strtok3 | 10.3.5 | MIT | output-api (transitive) | node_modules/strtok3 |  |
| supports-color | 7.2.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/supports-color<br>output-ui/node_modules/supports-color |  |
| supports-color | 8.1.1 | MIT | output-api (transitive) | output-api/node_modules/jest-worker/node_modules/supports-color<br>output-api/node_modules/terser-webpack-plugin/node_modules/supports-color |  |
| supports-preserve-symlinks-flag | 1.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/supports-preserve-symlinks-flag |  |
| swagger-ui-dist | 5.32.4 | Apache-2.0 | output-api (transitive) | node_modules/swagger-ui-dist |  |
| swagger-ui-express | 5.0.1 | MIT | output-api (runtime) | output-api/node_modules/swagger-ui-express |  |
| symbol-observable | 4.0.0 | MIT | output-api (transitive) | output-api/node_modules/symbol-observable |  |
| synckit | 0.11.12 | MIT | output-api (transitive) | output-api/node_modules/synckit |  |
| tapable | 2.3.2 | MIT | output-api (transitive) | output-api/node_modules/tapable |  |
| tar | 7.5.13 | BlueOak-1.0.0 | output-ui (transitive) | output-ui/node_modules/tar |  |
| terser | 5.46.1 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/terser |  |
| terser-webpack-plugin | 5.4.0 | MIT | output-api (transitive) | output-api/node_modules/terser-webpack-plugin |  |
| test-exclude | 6.0.0 | ISC | output-api (transitive) | output-api/node_modules/test-exclude |  |
| tinyglobby | 0.2.14 | MIT | output-ui (transitive) | output-ui/node_modules/tinyglobby |  |
| tinyglobby | 0.2.16 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/tinyglobby<br>output-ui/node_modules/@angular/build/node_modules/vite/node_modules/tinyglobby |  |
| tmp | 0.2.7 | MIT | output-ui (transitive) | output-ui/node_modules/karma/node_modules/tmp |  |
| tmpl | 1.0.5 | BSD-3-Clause | output-api (transitive) | output-api/node_modules/tmpl |  |
| to-buffer | 1.2.2 | MIT | output-api (transitive) | output-api/node_modules/to-buffer |  |
| to-regex-range | 5.0.1 | MIT | output-ui (transitive) | output-ui/node_modules/to-regex-range |  |
| toidentifier | 1.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/toidentifier |  |
| token-types | 6.1.2 | MIT | output-api (transitive) | node_modules/token-types |  |
| ts-api-utils | 2.5.0 | MIT | output-api (transitive) | output-api/node_modules/ts-api-utils |  |
| ts-jest | 29.4.6 | MIT | output-api (dev) | output-api/node_modules/ts-jest |  |
| ts-node | 10.9.2 | MIT | output-api (dev) | output-api/node_modules/ts-node |  |
| tsconfig-paths | 4.2.0 | MIT | output-api (transitive) | output-api/node_modules/tsconfig-paths |  |
| tsconfig-paths-webpack-plugin | 4.2.0 | MIT | output-api (transitive) | output-api/node_modules/tsconfig-paths-webpack-plugin |  |
| tslib | 2.3.0 | 0BSD | output-ui (transitive) | output-ui/node_modules/echarts/node_modules/tslib<br>output-ui/node_modules/zrender/node_modules/tslib |  |
| tslib | 2.8.1 | 0BSD | output-api (transitive)<br>output-ui (runtime) | node_modules/tslib |  |
| tuf-js | 4.1.0 | MIT | output-ui (transitive) | output-ui/node_modules/tuf-js |  |
| type-check | 0.4.0 | MIT | output-api (transitive) | output-api/node_modules/type-check |  |
| type-detect | 4.0.8 | MIT | output-api (transitive) | output-api/node_modules/type-detect |  |
| type-fest | 0.21.3 | (MIT OR CC0-1.0) | output-api (transitive) | output-api/node_modules/type-fest |  |
| type-fest | 4.41.0 | (MIT OR CC0-1.0) | output-api (transitive) | output-api/node_modules/ts-jest/node_modules/type-fest |  |
| type-is | 1.6.18 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/multer/node_modules/type-is<br>output-ui/node_modules/karma/node_modules/type-is |  |
| type-is | 2.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/type-is |  |
| typed-array-buffer | 1.0.3 | MIT | output-api (transitive) | output-api/node_modules/typed-array-buffer |  |
| typedarray | 0.0.6 | MIT | output-api (transitive) | output-api/node_modules/typedarray |  |
| typeorm | 0.3.28 | MIT | output-api (runtime) | output-api/node_modules/typeorm |  |
| typescript | 5.9.3 | Apache-2.0 | output-api (dev)<br>output-ui (dev)<br>output-interfaces (dev) | node_modules/typescript |  |
| typescript-eslint | 8.58.1 | MIT | output-api (dev) | output-api/node_modules/typescript-eslint |  |
| ua-parser-js | 0.7.41 | MIT | output-ui (transitive) | output-ui/node_modules/ua-parser-js |  |
| uglify-js | 3.19.3 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/uglify-js |  |
| uid | 2.0.2 | MIT | output-api (transitive) | node_modules/uid |  |
| uint8array-extras | 1.5.0 | MIT | output-api (transitive) | node_modules/uint8array-extras |  |
| undici-types | 7.18.2 | MIT | output-api (transitive) | output-api/node_modules/undici-types |  |
| universalify | 0.1.2 | MIT | output-ui (transitive) | output-ui/node_modules/universalify |  |
| universalify | 2.0.1 | MIT | output-api (transitive) | output-api/node_modules/universalify |  |
| unpipe | 1.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/unpipe |  |
| unrs-resolver | 1.11.1 | MIT | output-api (transitive) | output-api/node_modules/unrs-resolver |  |
| update-browserslist-db | 1.2.3 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/update-browserslist-db<br>output-ui/node_modules/update-browserslist-db |  |
| uri-js | 4.4.1 | BSD-2-Clause | output-api (transitive) | output-api/node_modules/uri-js |  |
| util-deprecate | 1.0.2 | MIT | output-api (transitive) | output-api/node_modules/util-deprecate |  |
| utils-merge | 1.0.1 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/utils-merge<br>output-ui/node_modules/utils-merge |  |
| uuid | 11.1.1 | MIT | output-api (transitive) | output-api/node_modules/uuid |  |
| v8-compile-cache-lib | 3.0.1 | MIT | output-api (transitive) | output-api/node_modules/v8-compile-cache-lib |  |
| v8-to-istanbul | 9.3.0 | ISC | output-api (transitive) | output-api/node_modules/v8-to-istanbul |  |
| validate-npm-package-name | 6.0.2 | ISC | output-ui (transitive) | output-ui/node_modules/validate-npm-package-name |  |
| validator | 13.15.35 | MIT | output-api (transitive) | node_modules/validator |  |
| vary | 1.1.2 | MIT | output-api (transitive)<br>output-ui (transitive) | node_modules/vary |  |
| vite | 7.3.2 | MIT | output-ui (transitive) | output-ui/node_modules/@angular/build/node_modules/vite |  |
| void-elements | 2.0.1 | MIT | output-ui (transitive) | output-ui/node_modules/void-elements |  |
| walker | 1.0.8 | Apache-2.0 | output-api (transitive) | output-api/node_modules/walker |  |
| watchpack | 2.4.4 | MIT | output-ui (transitive) | output-ui/node_modules/watchpack |  |
| watchpack | 2.5.1 | MIT | output-api (transitive) | output-api/node_modules/watchpack |  |
| wcwidth | 1.0.1 | MIT | output-api (transitive) | output-api/node_modules/wcwidth |  |
| weak-lru-cache | 1.2.2 | MIT | output-ui (transitive) | output-ui/node_modules/weak-lru-cache |  |
| webpack | 5.105.4 | MIT | output-api (transitive) | output-api/node_modules/webpack |  |
| webpack-node-externals | 3.0.0 | MIT | output-api (transitive) | output-api/node_modules/webpack-node-externals |  |
| webpack-sources | 3.3.4 | MIT | output-api (transitive) | output-api/node_modules/webpack-sources |  |
| which | 1.3.1 | ISC | output-ui (transitive) | output-ui/node_modules/karma-chrome-launcher/node_modules/which |  |
| which | 2.0.2 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/which<br>output-ui/node_modules/which |  |
| which | 6.0.1 | ISC | output-ui (transitive) | output-ui/node_modules/@npmcli/git/node_modules/which<br>output-ui/node_modules/@npmcli/promise-spawn/node_modules/which<br>output-ui/node_modules/node-gyp/node_modules/which |  |
| which-typed-array | 1.1.20 | MIT | output-api (transitive) | output-api/node_modules/which-typed-array |  |
| word-wrap | 1.2.5 | MIT | output-api (transitive) | output-api/node_modules/word-wrap |  |
| wordwrap | 1.0.0 | MIT | output-api (transitive) | output-api/node_modules/wordwrap |  |
| wrap-ansi | 6.2.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/wrap-ansi<br>output-ui/node_modules/@angular/build/node_modules/wrap-ansi<br>output-ui/node_modules/@angular/cli/node_modules/wrap-ansi |  |
| wrap-ansi | 7.0.0 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/cliui/node_modules/wrap-ansi<br>output-api/node_modules/wrap-ansi-cjs<br>output-ui/node_modules/karma/node_modules/wrap-ansi |  |
| wrap-ansi | 8.1.0 | MIT | output-api (transitive) | output-api/node_modules/@isaacs/cliui/node_modules/wrap-ansi |  |
| wrap-ansi | 9.0.2 | MIT | output-ui (transitive) | output-ui/node_modules/wrap-ansi |  |
| wrappy | 1.0.2 | ISC | output-api (transitive)<br>output-ui (transitive) | node_modules/wrappy |  |
| write-file-atomic | 5.0.1 | ISC | output-api (transitive) | output-api/node_modules/write-file-atomic |  |
| ws | 8.20.1 | MIT | output-ui (transitive) | output-ui/node_modules/socket.io/node_modules/engine.io/node_modules/ws<br>output-ui/node_modules/socket.io/node_modules/socket.io-adapter/node_modules/ws |  |
| xml-js | 1.6.11 | MIT | output-api (runtime) | output-api/node_modules/xml-js |  |
| xtend | 4.0.2 | MIT | output-api (transitive) | output-api/node_modules/xtend |  |
| y18n | 5.0.8 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/y18n<br>output-ui/node_modules/y18n |  |
| yallist | 3.1.1 | ISC | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/yallist<br>output-ui/node_modules/yallist |  |
| yallist | 4.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/minipass-flush/node_modules/yallist<br>output-ui/node_modules/minipass-pipeline/node_modules/yallist |  |
| yallist | 5.0.0 | BlueOak-1.0.0 | output-ui (transitive) | output-ui/node_modules/tar/node_modules/yallist |  |
| yargs | 16.2.0 | MIT | output-ui (transitive) | output-ui/node_modules/karma/node_modules/yargs |  |
| yargs | 17.7.2 | MIT | output-api (transitive) | output-api/node_modules/yargs |  |
| yargs | 18.0.0 | MIT | output-ui (transitive) | output-ui/node_modules/yargs |  |
| yargs-parser | 20.2.9 | ISC | output-ui (transitive) | output-ui/node_modules/karma/node_modules/yargs-parser |  |
| yargs-parser | 21.1.1 | ISC | output-api (transitive) | output-api/node_modules/yargs-parser |  |
| yargs-parser | 22.0.0 | ISC | output-ui (transitive) | output-ui/node_modules/yargs-parser |  |
| yn | 3.1.1 | MIT | output-api (transitive) | output-api/node_modules/yn |  |
| yocto-queue | 0.1.0 | MIT | output-api (transitive) | output-api/node_modules/yocto-queue |  |
| yoctocolors-cjs | 2.1.3 | MIT | output-api (transitive)<br>output-ui (transitive) | output-api/node_modules/yoctocolors-cjs<br>output-ui/node_modules/yoctocolors-cjs |  |
| zod | 4.1.13 | MIT | output-ui (transitive) | output-ui/node_modules/zod |  |
| zod | 4.3.6 | MIT | output-api (runtime) | output-api/node_modules/zod |  |
| zod-to-json-schema | 3.25.2 | ISC | output-ui (transitive) | output-ui/node_modules/zod-to-json-schema |  |
| zone.js | 0.15.1 | MIT | output-ui (runtime) | output-ui/node_modules/zone.js |  |
| zrender | 6.0.0 | BSD-3-Clause | output-ui (transitive) | output-ui/node_modules/zrender |  |

## Pakete ohne `license`-Feld in `package-lock.json`

- output-api: output-api/node_modules/busboy@1.6.0
- output-api: output-api/node_modules/passport-local@1.0.0
- output-api: output-api/node_modules/passport-strategy@1.0.0
- output-api: output-api/node_modules/pause@0.0.1
- output-api: output-api/node_modules/streamsearch@1.1.0
- output-ui: output-ui/node_modules/daemon@1.1.0
- output-ui: output-ui/node_modules/service@0.1.4

## Pakete ohne ermittelbare Lizenz

- service@0.1.4 (output-ui (runtime))

