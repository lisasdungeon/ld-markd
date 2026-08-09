import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

export default {
  input: "scripts/main.js",
  output: {
    file: "dist/bundle.js",
    format: "esm"
  },
  plugins: [nodeResolve(), terser()]
};
