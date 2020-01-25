define("amd-module-parameter", ["amd-no-parameters"], (...parameters: [any]) => ({
    name: "amd-module-parameters",
    type: "module",
    parameters,
}));