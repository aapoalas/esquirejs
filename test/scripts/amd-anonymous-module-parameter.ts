define("amd-anonymous-module-parameter", ["amd-anonymous-empty-parameters"], (...parameters: [any]) => ({
    name: "amd-anonymous-module-parameter",
    type: "module",
    parameters,
}));