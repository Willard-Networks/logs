import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [{
    ignores: ["dist/*", "coverage/*", "**/*.d.ts", "src/public/", "src/types/"],
}, {
    files: ["**/*.ts"],
    languageOptions: {
        parser: tsParser,
        parserOptions: {
            ecmaVersion: 2018,
            sourceType: "module",
        },
    },
    plugins: {
        "@typescript-eslint": tsPlugin
    },
    rules: {
        ...tsPlugin.configs.recommended.rules,
        semi: ["error", "always"],
        quotes: ["error", "double"],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-explicit-any": 1,
        "@typescript-eslint/no-inferrable-types": ["warn", {
            ignoreParameters: true,
        }],
        "@typescript-eslint/no-unused-vars": "warn",
    },
}];
