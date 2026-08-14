import api from "./api";

const contactService = {
    getOptions: () => {
        return api.get(
            "/client/contact/options"
        );
    },

    sendRequest: (data) => {
        return api.post(
            "/client/contact",
            data
        );
    },
};

export default contactService;