define("amd-module-multiple-parameters", ["amd-no-parameters", "amd-data", "amd-anonymous-empty-parameters"], (...parameters: [any]) => ({
    name: "amd-module-multiple-parameters",
    type: "module",
    parameters,
}));