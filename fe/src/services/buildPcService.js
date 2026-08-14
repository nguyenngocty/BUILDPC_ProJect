import api from "./api";

const buildPcService = {
    getPartTypes: () => {
        return api.get("/client/builds/part-types");
    },

    getParts: (params = {}) => {
        return api.get("/client/builds/parts", {
            params,
        });
    },

    getPartsByType: (typeId) => {
        return api.get(
            `/client/builds/parts/type/${typeId}`
        );
    },
};

export default buildPcService;