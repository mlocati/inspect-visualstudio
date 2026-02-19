import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const config = {
  input: "src/index.ts",
  output: {
    esModule: true,
    file: "dist/index.js",
    format: "es",
    sourcemap: false,
  },
  plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()],
  context: undefined,
  moduleContext: undefined,
  onwarn(
    warning: { code: string },
    handler: (warning: { code: string }) => void,
  ) {
    if (
      warning.code === "THIS_IS_UNDEFINED" ||
      warning.code === "CIRCULAR_DEPENDENCY"
    ) {
      return;
    }
    handler(warning);
  },
};

export default config;
