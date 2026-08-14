import api from "./api";
const aiChatService = {
    getStatus: () => {
        return api.get(
            "/client/ai/status"
        );
    },

    sendMessage: ({
        message,
        previousResponseId = null,
    }) => {
        return api.post(
            "/client/ai/chat",
            {
                message,

                previous_response_id:
                    previousResponseId,
            }
        );
    },
};

export default aiChatService;