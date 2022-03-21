export default {
  input: "src/main.js",
  watch: {
    include: "./src/**",
    clearScreen: false,
  },
  output: {
    file: "public/bundle.js",
    format: "es",
  },
  plugins: [],
};
