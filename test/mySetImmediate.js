"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../index"));
const source_map_support_1 = require("source-map-support");
source_map_support_1.install();
function mySetImmediate(cb) {
    return setTimeout(cb, 0);
}
index_1.default.group("mySetImmediate", () => {
    index_1.default("Executes callback", () => {
        return new Promise((resolve, reject) => {
            mySetImmediate(() => {
                resolve(true);
            });
        });
    });
    index_1.default("May be cancelled with clearTimeout", (resolve, reject) => {
        let timeoutId = mySetImmediate(() => reject(new Error(`Callback executed`)));
        clearTimeout(timeoutId);
        setTimeout(() => resolve(true), 100);
    });
});
index_1.default.run().then(result => {
    console.log(result.report);
    // console.log(result);
});
//# sourceMappingURL=mySetImmediate.js.map